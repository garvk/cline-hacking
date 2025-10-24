# Chrome Extension Streaming Fix Analysis

## Current Status
Date: October 23, 2025, 12:46 PM IST

## What We Know

### 1. The Error
Frontend receives a message with `ts: 0` during subscription initialization, which causes:
```
[FRONTEND DEBUG] Received partial message: Object ts: 0
[FRONTEND ERROR] Invalid timestamp in partial message
[DEBUG] partialMessage subscription completed
```

### 2. Architecture
- **Sidepanel**: Uses WebSocket (ws://localhost:8080/ws)
- **Web Server**: Handles WebSocket messages via `handleGrpcRequest`
- **Backend Handler**: `subscribeToPartialMessage.ts` - used by ALL versions (VSCode, web, Chrome)

### 3. What We Fixed
- ✅ `web-server.ts` now throws error if `subscribeToPartialMessage` is called via HTTP (line 737)
- This ensures only WebSocket path is used

### 4. What Works
- ✅ Web browser version works (uses same web-server.ts and backend)
- ✅ Messages ARE being received by sidepanel (logs confirm)
- ✅ Backend logs show valid timestamps being sent

## The Mystery

**If web browser works and Chrome extension doesn't, but they use the SAME backend code, the issue must be:**

1. **Transport layer difference** (how WebSocket messages are handled)
2. **Frontend message processing difference** (how React receives messages)
3. **Initialization timing** (race condition in Chrome extension)

## Investigation Needed

### Check 1: Where does the ts:0 message come from?

The empty message happens during subscription initialization. Possible sources:
- Default protobuf object being sent
- Initial state synchronization
- Empty response from backend

### Check 2: Why does subscription complete immediately?

Frontend sees `onComplete()` called, which happens when:
```typescript
if (message.grpc_response.is_streaming === false) {
    callbacks.onComplete()
}
```

Something is sending `is_streaming: false` with the empty message.

## Hypothesis

The backend handler `subscribeToPartialMessage` returns immediately:
```typescript
export async function subscribeToPartialMessage(...): Promise<void> {
    activePartialMessageSubscriptions.add(responseStream)
    // ... register cleanup ...
    // Returns immediately - no await, no Promise that stays open
}
```

When this Promise resolves, `handleStreamingRequest` completes. Even though it doesn't send a final message, maybe the WebSocket layer or some middleware is interpreting the completed Promise as "stream ended" and sending a completion signal?

## Proposed Solution

**Option 1: Make backend handler return never-resolving Promise (RISKY)**
```typescript
export async function subscribeToPartialMessage(...): Promise<void> {
    // ... existing code ...
    return new Promise(() => {}) // Never resolves
}
```
❌ **Risk**: Could affect VSCode and web browser versions

**Option 2: Fix at WebSocket/transport layer (SAFER)**
- Investigate why Chrome extension gets empty message
- Fix message handling in sidepanel.js or web-server.ts WebSocket setup
- Ensure no empty initialization messages are sent

**Option 3: Fix frontend validation (SAFEST)**
- Make frontend ignore messages with invalid timestamps during init
- Don't close subscription on first invalid message
- Wait for real partial messages to arrive

## Next Steps

1. Add more diagnostic logging to identify exact source of ts:0 message
2. Check if VSCode extension has same issue (probably not)
3. Compare WebSocket message flow between web browser and Chrome extension
4. Test if the issue is timing-related (race condition)

## Key Files
- `src/standalone/web-server.ts` - WebSocket handling
- `src/core/controller/grpc-handler.ts` - gRPC request routing
- `src/core/controller/ui/subscribeToPartialMessage.ts` - Backend handler
- `chrome-extension/sidepanel/sidepanel.js` - WebSocket client
- `webview-ui/src/context/ExtensionStateContext.tsx` - Frontend subscription
