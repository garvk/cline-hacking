# Chrome Extension Streaming Implementation - Investigation & Fix

## Problem Statement

The Chrome extension implementation of Cline had broken streaming functionality:
- Messages were being received from the backend WebSocket
- DevTools console showed messages arriving at `sidepanel.js`
- BUT the React UI components were not updating
- Actions like "start new task" and "check history" showed responses in console but no UI changes

## Investigation Process

### Step 1: Architecture Analysis

We examined the Chrome extension architecture:
```
Backend (localhost:8080) 
  ↓ WebSocket
chrome-extension/sidepanel/sidepanel.js (receives WebSocket messages)
  ↓ window.dispatchEvent(new MessageEvent('message', {data}))
webview-ui React App (listens to window 'message' events)
  ↓ ExtensionStateContext subscriptions
UI Components (should update via React state)
```

### Step 2: Message Flow Verification

**Finding 1: Messages reach sidepanel.js**
```
Console logs showed:
[SidePanel] 📨 Received message type: grpc_response (66 times for one "Hi" message)
```

**Finding 2: Window events are dispatched**
```javascript
// Test listener showed:
[TEST] Window message received: {
  requestId: '3b685c29-60a3-4e4b-80c2-e56cdbc813e1',
  isStreaming: true,
  hasMessage: true,
  messageType: 'object'
}
```

**Finding 3: React subscriptions complete immediately**
```
Console logs on page load:
mcpButtonClicked subscription completed
History button clicked subscription completed
[DEBUG] partialMessage subscription completed (this should not happen for long-lived subscriptions)
MCP servers subscription completed
Settings button clicked subscription completed
```

### Step 3: Subscription Lifecycle Analysis

In `webview-ui/src/services/grpc-client-base.ts`, subscriptions work like this:

```typescript
static makeStreamingRequest(...) {
    const handleResponse = (event: MessageEvent) => {
        const message = event.data
        if (message.grpc_response?.request_id === requestId) {
            if (message.grpc_response.message) {
                callbacks.onResponse(response)
            }
            // CRITICAL: Check if stream has ended
            if (message.grpc_response.is_streaming === false) {
                callbacks.onComplete()
                window.removeEventListener("message", handleResponse) // ← Removes listener!
            }
        }
    }
    window.addEventListener("message", handleResponse)
}
```

**Key insight:** When `is_streaming: false` is received, the subscription:
1. Calls `onComplete()`
2. Removes its event listener
3. Can no longer receive future messages

### Step 4: Comparing Web Browser vs Chrome Extension

We examined the working web browser implementation in `src/standalone/web-server.ts`:

**Web Browser Flow:**
```
Browser → WebSocket (ws://localhost:8080/ws) → Backend
                ↓
All requests (including subscriptions) go through WebSocket
Backend uses grpc-handler.ts which keeps streams open
```

**Chrome Extension Flow (BROKEN):**
```
Extension → Background Script → HTTP POST /message → Backend (initial setup)
Extension → WebSocket → Backend (subsequent messages)
```

### Step 5: Root Cause Identified

In `chrome-extension/sidepanel/sidepanel.js`, the `fetchAndDispatchInitialState` function:

```javascript
async fetchAndDispatchInitialState() {
    // This uses HTTP, NOT WebSocket!
    const response = await chrome.runtime.sendMessage({
        type: "GRPC_REQUEST",
        data: {
            type: "grpc_request",
            grpc_request: {
                service: "cline.StateService",
                method: "subscribeToState",
                message: {},
                request_id: "initial_state_preload",
                is_streaming: false,  // ← Incorrectly marked as non-streaming!
            }
        }
    })
}
```

This goes through:
1. `chrome-extension/background/background.js` → `handleGrpcRequest()`
2. `chrome-extension/background/backend-connector.js` → `handleRequest()`
3. HTTP POST to `http://localhost:8080/message`
4. `src/standalone/web-server.ts` → `handleMessage()` → `routeGrpcRequest()`

**The problem:** HTTP POST can only send ONE response, then the connection closes!

```typescript
// web-server.ts - HTTP endpoint (WRONG for subscriptions)
this.app.post("/message", async (req, res) => {
    const response = await this.handleMessage(req.body)
    res.json({ success: true, response })  // ← One response, connection closes
})
```

When `ExtensionStateContext.tsx` sets up subscriptions on mount:
1. Initial subscription requests go through HTTP (via `chrome.runtime.sendMessage`)
2. HTTP endpoint sends ONE response with `is_streaming: false` (or undefined)
3. `grpc-client-base.ts` sees the stream has ended → calls `onComplete()` → removes listener
4. Subsequent streaming messages arrive via WebSocket
5. BUT no one is listening anymore! (event listeners were removed)
6. UI doesn't update

### Step 6: Why Web Browser Works

The web browser version in `src/standalone/web-server.ts`:

```typescript
private setupWebSocket() {
    this.wss.on("connection", (ws) => {
        // ALL requests go through WebSocket
        ws.on("message", async (data) => {
            const message = JSON.parse(data.toString())
            
            // Uses grpc-handler which properly handles streaming
            await handleGrpcRequest(this.controller, postMessageToWebview, message.grpc_request)
        })
    })
}
```

The `grpc-handler.ts` correctly implements streaming:

```typescript
async function handleStreamingRequest(...) {
    const responseStream = async (response: any, isLast: boolean = false) => {
        await postMessageToWebview({
            type: "grpc_response",
            grpc_response: {
                message: response,
                request_id: request.request_id,
                is_streaming: !isLast,  // ← Only false when explicitly ended
            }
        })
    }

    await handler(controller, request.message, responseStream, request.request_id)
    
    // Don't send a final message - stream stays open for future updates
}
```

## Root Cause Summary

**Chrome Extension uses HTTP POST for initial subscription setup:**
- HTTP can only send one response
- Backend marks response with `is_streaming: false` (or undefined)
- React subscriptions see stream ended → remove event listeners
- Subsequent WebSocket messages have no listeners

**Web Browser uses WebSocket for everything:**
- WebSocket can send multiple responses
- Backend keeps stream open with `is_streaming: true`
- React subscriptions stay active
- All subsequent messages are received

## Solution

### Required Changes

1. **Remove HTTP fallback for subscriptions in `sidepanel.js`**
   - Delete `fetchAndDispatchInitialState()` HTTP call
   - Let all subscriptions go through WebSocket from the start
   - Wait for WebSocket connection before React app mounts

2. **Ensure WebSocket is connected before subscriptions**
   - WebSocket connection promise must resolve before React mounts
   - Initial state can come through WebSocket like web browser

3. **Remove Background Script proxy for gRPC requests**
   - Background script HTTP fallback creates the problem
   - All gRPC should go through WebSocket directly

### Implementation Plan

1. **Modify `chrome-extension/sidepanel/sidepanel.js`:**
   - Remove `fetchAndDispatchInitialState()` method
   - Ensure WebSocket connects before React initialization
   - Let React subscriptions handle initial state via WebSocket

2. **Update `chrome-extension/sidepanel/platform-init.js`:**
   - Ensure queue is properly flushed when WebSocket connects

3. **Verify `ExtensionStateContext.tsx` subscriptions:**
   - Subscriptions should work as-is once WebSocket is the primary transport
   - No changes needed to React code

4. **Test the fix:**
   - Verify subscriptions stay open
   - Confirm streaming messages reach UI
   - Test task creation, history, MCP servers, etc.

## Key Lessons

1. **HTTP is fundamentally incompatible with gRPC streaming subscriptions**
   - HTTP request/response = one request, one response
   - gRPC streaming = one request, multiple responses over time
   - Must use WebSocket or Server-Sent Events (SSE)

2. **Event listener lifecycle is critical**
   - When `is_streaming: false` is received, listeners are removed
   - If initial setup sends `is_streaming: false`, all future messages are lost
   - WebSocket transport must be established before first subscription

3. **Architecture consistency matters**
   - Web browser: 100% WebSocket ✅
   - Chrome extension: HTTP for initial, WebSocket for updates ❌
   - Solution: Chrome extension should match web browser architecture

## Implementation Complete ✅

### Changes Made

**File: `chrome-extension/sidepanel/sidepanel.js`**

1. **Removed `fetchAndDispatchInitialState()` method** - This was causing subscriptions to use HTTP instead of WebSocket
2. **Simplified `initialize()` method** - Now just waits for WebSocket connection before React mounts
3. **Updated logging** - Clearer messages about WebSocket being the primary transport

**Key changes:**
```javascript
// BEFORE (BROKEN):
async initialize() {
    this.initializeMessageBridge()
    await this.fetchAndDispatchInitialState()  // ❌ Uses HTTP via chrome.runtime.sendMessage
}

// AFTER (FIXED):
async initialize() {
    this.initializeMessageBridge()
    await this.webSocketReady  // ✅ Wait for WebSocket, React subscriptions use WebSocket
}
```

### How It Works Now

1. **Sidepanel loads** → `platform-init.js` creates stub postMessage
2. **SidePanelController initializes** → Starts WebSocket connection
3. **WebSocket connects** → Resolves `webSocketReady` promise
4. **React app mounts** → ExtensionStateContext creates subscriptions
5. **All subscriptions use WebSocket** → Streaming works correctly!

### Testing Instructions

1. **Rebuild the extension:**
   ```bash
   npm run build
   ```

2. **Reload the extension in Chrome:**
   - Go to `chrome://extensions`
   - Click reload on Cline extension
   - Open side panel

3. **Watch DevTools console for these logs:**
   ```
   [SidePanel] ✅ WebSocket connected - streaming enabled!
   [SidePanel] ✅ WebSocket ready - React app can now mount and create subscriptions
   [DEBUG] Received ... from gRPC stream  (These should NOT complete immediately)
   ```

4. **Test functionality:**
   - Try sending a message → Should see streaming responses in UI
   - Check task history → Should populate correctly
   - Open MCP servers → Should load server list
   - All UI actions should work and update in real-time

### What to Look For

**✅ Success indicators:**
- Subscriptions stay open (no "subscription completed" logs immediately after setup)
- Streaming messages appear in UI
- Task history, MCP servers, settings all populate
- Real-time updates work during AI responses

**❌ Failure indicators:**
- Subscriptions complete immediately
- Messages logged but UI doesn't update
- Features that worked in web browser don't work in extension

## Next Steps

1. ✅ Document this investigation
2. ✅ Implement the fix in `sidepanel.js`
3. 🔄 Test with Chrome DevTools
4. 🔄 Verify all features work (tasks, history, MCP, streaming responses)
5. 🔄 Clean up any remaining HTTP fallback code (if issues persist)
