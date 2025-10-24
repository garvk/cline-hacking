# Chrome Extension Fixes Applied

**Date:** October 22, 2025  
**Version:** 3.32.6

## Summary

Fixed 5 critical issues preventing the Chrome extension from working properly with the backend services. All fixes were made **extension-side only** to avoid breaking the web browser version of Cline.

---

## Issues Fixed

### 1. ✅ Race Condition: postMessage Not Found

**Problem:**
- React app loaded before WebSocket connection was established
- `chromeExtensionPostMessage` function was still the stub version
- Caused "Chrome extension postMessage not found" errors

**Solution:**
- Added `webSocketReady` Promise that resolves when WebSocket connects
- Modified `loadClineApp()` to `await this.webSocketReady` before loading React
- React app now loads only after WebSocket is confirmed ready

**Code Location:** `chrome-extension/sidepanel/sidepanel.js` - `initializeMessageBridge()` and `loadClineApp()`

---

### 2. ✅ Invalid Timestamp in Partial Messages

**Problem:**
- Backend sends timestamps as plain numbers (Unix milliseconds)
- React app expects protobuf Long objects with `low`, `high`, `unsigned` properties
- Caused "Invalid timestamp in partial message: [object Object]" errors

**Solution:**
- Added `processMessageTimestamps()` method to convert numeric timestamps to Long-like objects
- Recursively processes all nested objects and arrays
- Converts any `ts` field from number to `{ low, high, unsigned }` format
- Applied to all incoming WebSocket messages

**Code Location:** `chrome-extension/sidepanel/sidepanel.js` - `processMessageTimestamps()` method

---

### 3. ✅ Task Reload Loop

**Problem:**
- Clicking a task in history repeatedly reloaded the same task
- Each reload disposed terminals and recreated Task instance
- Created infinite loop of state updates triggering more reloads

**Solution:**
- Added `currentTaskId` tracker to remember loaded task
- Added `taskLoadInProgress` flag to prevent concurrent loads
- Skip reload if same task is already loaded
- Added 2-second debounce window after task load

**Code Location:** `chrome-extension/sidepanel/sidepanel.js` - Constructor and `handleTaskLoadRequest()` method

---

### 4. ✅ Chat Messages Not Streaming

**Problem:**
- Backend was broadcasting state updates correctly
- Messages were arriving via WebSocket
- But React app wasn't receiving/displaying them properly

**Solution:**
- Fixed message format handling in `ws.onmessage`
- Added timestamp processing before dispatching to React
- Ensured proper MessageEvent format for window.dispatchEvent
- WebSocket connection waits before React app loads

**Code Location:** `chrome-extension/sidepanel/sidepanel.js` - `initializeMessageBridge()` WebSocket handlers

---

### 5. ✅ Unable to Send Messages to Existing Chat

**Problem:**
- Messages were being sent to backend successfully
- Backend processed and responded correctly
- But frontend wasn't updating to show responses

**Solution:**
- Fixed by addressing issues #1-4 above
- WebSocket now properly connected before React loads
- Timestamps properly converted for streaming messages
- State updates now flow correctly from backend to frontend

---

## Files Modified

### 1. `chrome-extension/sidepanel/sidepanel.js`

**Key Changes:**
- Added `webSocketReady` Promise for connection tracking
- Added `processMessageTimestamps()` method
- Added `currentTaskId` and `taskLoadInProgress` tracking
- Modified `loadClineApp()` to wait for WebSocket
- Added `handleTaskLoadRequest()` with debouncing
- Improved WebSocket reconnection logic

**Lines of Code Changed:** ~150 lines added/modified

---

## Testing Instructions

### Prerequisites
1. Backend services running:
   ```bash
   # Terminal 1 - Cline Core
   cd dist-standalone
   node cline-core.js --port 8001 --host-bridge-port 26041
   
   # Terminal 2 - Hostbridge
   cd dist-standalone/extension
   ./cli/bin/cline-host --port 26041 --verbose
   ```

2. Extension rebuilt:
   ```bash
   npm run build:extension
   ```

3. Extension loaded in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Reload" on Cline extension
   - Open side panel

### Test Cases

#### ✅ Test 1: No More "postMessage not found" Errors
1. Open Chrome DevTools (F12)
2. Check Console tab
3. Should see:
   ```
   [SidePanel] ⏳ Waiting for WebSocket to be ready...
   [SidePanel] ✅ WebSocket ready, proceeding with React app load
   [SidePanel] React app loaded successfully
   ```
4. **No errors** about "postMessage not found"

#### ✅ Test 2: Chat Messages Stream Properly
1. Start a new chat
2. Type a message and send
3. Should see AI response streaming in real-time
4. Check DevTools Console for:
   ```
   [SidePanel] 📨 Received WebSocket message type: grpc_response
   ```
5. **No "Invalid timestamp" errors**

#### ✅ Test 3: Open Existing Chat from History
1. Click "History" button
2. Click on a previous chat
3. Chat should load **once** (not repeatedly)
4. Check DevTools Console:
   ```
   [SidePanel] Loading task 1761129355929...
   [SidePanel] Task load completed for 1761129355929
   ```
5. If you click same chat again:
   ```
   [SidePanel] Task 1761129355929 already loaded, skipping reload
   ```

#### ✅ Test 4: Send Message to Existing Chat
1. Open an existing chat from history
2. Wait for it to fully load
3. Type a new message and send
4. Should see:
   - Your message appears immediately
   - AI response starts streaming
   - No page reloads or errors

#### ✅ Test 5: WebSocket Reconnection
1. Stop backend (Ctrl+C in terminal)
2. Extension should show "Backend disconnected - Reconnecting..."
3. Restart backend
4. Extension should reconnect automatically
5. Should see in Console:
   ```
   [SidePanel] 🔄 Reconnecting in XXXms...
   [SidePanel] ✅ WebSocket connected - streaming enabled!
   ```

---

## What Was NOT Changed

To preserve compatibility with the web browser version:

- ❌ No changes to backend (`src/standalone/web-server.ts`)
- ❌ No changes to React app (`webview-ui/`)
- ❌ No changes to protobuf definitions (`proto/`)
- ❌ No changes to core extension logic (`src/core/`)

All fixes were contained within the Chrome extension wrapper code.

---

## Known Limitations

1. **Bundle Size Warnings:** The React app bundle is 9.33 MB. This is expected and doesn't affect functionality.

2. **Initial Load Time:** May take 3-5 seconds for React app to load after WebSocket connects.

3. **Timestamp Conversion:** Adds slight processing overhead to each message, but negligible impact on performance.

---

## Next Steps

If you encounter any issues:

1. **Check Backend Logs:** Look for "State broadcast sent to X clients"
2. **Check DevTools Console:** Look for WebSocket connection messages
3. **Verify Ports:** Ensure backend is on 8001, hostbridge on 26041
4. **Clear Cache:** Reload extension and hard-refresh (Cmd+Shift+R)

## Success Metrics

All 5 critical issues should now be resolved:
- ✅ No "postMessage not found" errors
- ✅ Messages stream in real-time
- ✅ Can open chats from history without loops
- ✅ Can send messages to existing chats
- ✅ No invalid timestamp errors

The Chrome extension should now have feature parity with the web browser version for core chat functionality.
