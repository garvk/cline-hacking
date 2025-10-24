# Chat Streaming Issues - Chrome Extension

## Problem Summary

The Chrome extension side panel loads successfully and connects to the backend via WebSocket, but chat messages don't stream properly and navigating to past chats from history doesn't work.

## Errors Observed

### 1. "Invalid timestamp in partial message: [object Object]"
- **Location**: `cline-app.js:1003` (React app bundled code)
- **When it occurs**: During streaming AI responses and when loading chat history
- **Impact**: Prevents message streaming and blocks navigation to past chats

### 2. "Long class not found, timestamps may not work correctly"
- **Location**: `sidepanel.js` (Extension controller)
- **When it occurs**: After vendor.js bundle loads
- **Impact**: Unable to properly convert timestamps

## Root Cause

The issue is a **timestamp serialization mismatch** between backend and frontend:

1. **Backend sends timestamps as numbers** via WebSocket (`web-server.ts` line 287-295)
   ```typescript
   const serializedMessage = JSON.stringify(message)
   ws.send(serializedMessage)
   ```

2. **JSON.stringify() converts all values** including any protobuf Long objects to plain JavaScript objects:
   ```javascript
   { low: 12345, high: 0, unsigned: false }
   ```

3. **React app expects real Long instances** from the protobuf library for timestamp validation

4. **Conversion attempts failed** because:
   - `window.Long` is undefined after vendor.js loads
   - Long class is bundled as a module, not globally exposed
   - Creating plain objects `{low, high, unsigned}` doesn't satisfy protobuf's instanceof checks

## Technical Details

### Message Flow
```
Backend (web-server.ts)
  ↓ sends numeric timestamp via WebSocket
  ↓ JSON.stringify() converts to plain object
  
Chrome Extension (sidepanel.js)
  ↓ receives via WebSocket onmessage
  ↓ attempts to convert to Long object
  ↓ fails because Long class unavailable
  
React App (cline-app.js)
  ↓ receives message via window.postMessage
  ↓ validates timestamp
  ↓ fails instanceof Long check
  ✗ throws "Invalid timestamp" error
```

### What We Tried

1. **Timestamp conversion in sidepanel.js**
   - Added `processMessageTimestamps()` function
   - Tried creating plain objects with `{low, high, unsigned}`
   - **Result**: React still rejected them (not real Long instances)

2. **Detecting Long class after vendor.js loads**
   - Checked `window.Long` after loading vendor bundle
   - **Result**: undefined - Long is not globally exposed

3. **Using Long.fromNumber() if available**
   - Added fallback logic to use Long class if found
   - **Result**: Never found, always used plain object fallback

4. **Creating Long polyfill (aborted)**
   - Attempted to add standalone Long.js implementation
   - **Reason for abort**: Adding another layer of complexity

## Why Modifiying backend is a risk

The backend (`src/standalone/web-server.ts`) is shared between:
- Chrome extension (WebSocket connection)
- Standalone web browser version (also WebSocket)
- HTTP fallback mode

Modifying the backend's serialization would risk breaking the web browser or VS code version.

## Potential Solutions (Not Yet Implemented)

### Option 1: Fix in Backend (Risky)
Modify `web-server.ts` to send timestamps as strings or properly serialize Long objects:
```typescript
// Before sending
if (message.ts && typeof message.ts === 'object') {
  message.ts = message.ts.toString()
}
ws.send(JSON.stringify(message))
```

**Pros**: Fixes at source
**Cons**: May break web browser version

### Option 2: Import Long in Extension Bundle
Add Long.js as explicit dependency and bundle it with the extension:
```javascript
// In webpack.extension.config.js
entry: {
  'shared/long': 'long'
}
```

**Pros**: Clean module-based solution
**Cons**: Requires webpack configuration changes

### Option 3: Extract Long from Vendor Bundle
After vendor.js loads, search for and extract the Long class:
```javascript
// Try various possible locations
this.LongClass = window.Long || 
                 window.protobuf?.Long || 
                 window.protobufjs?.Long ||
                 require('long')
```

**Pros**: Uses existing Long from bundle
**Cons**: Fragile, depends on bundle internals

### Option 4: Server-Side Timestamp Normalization
Add a special endpoint or WebSocket message type for Chrome extension that pre-converts timestamps:
```typescript
// In web-server.ts
if (isChrome Extension) {
  message = normalizeTimestamps(message)
}
```

**Pros**: Encapsulates fix server-side
**Cons**: Adds platform-specific logic

## Current State

- ✅ Extension loads without errors
- ✅ WebSocket connects successfully  
- ✅ Backend services running (cline-core on 8001, hostbridge on 26041)
- ✅ Initial state fetches correctly
- ❌ Message streaming doesn't work (timestamp error)
- ❌ Can't navigate to past chats (same timestamp error)
- ⚠️ Long class not available for proper conversion

## Files Modified

1. **chrome-extension/sidepanel/sidepanel.html**
   - Removed hardcoded script tags for vendor.js and cline-app.js
   - Scripts now loaded dynamically after WebSocket ready

2. **chrome-extension/sidepanel/sidepanel.js**
   - Added WebSocket connection promise (`webSocketReady`)
   - Added `processMessageTimestamps()` for conversion attempts
   - Added `loadScript()` for dynamic script loading
   - Added Long class detection (currently fails)

3. **chrome-extension/FIXES_APPLIED.md**
   - Documentation of race condition fixes
   - Timestamp conversion approach (incomplete)

## Next Steps

The fundamental issue requires one of these paths:

1. **Path A - Backend Modification**: Accept that backend needs platform-specific handling
2. **Path B - Proper Long Import**: Configure webpack to bundle Long separately  
3. **Path C - Alternative Serialization**: Use different timestamp format (strings, ISO dates)
4. **Path D - Frontend Tolerance**: Make React app accept plain timestamp objects

Each path has trade-offs between complexity, risk, and maintainability.

## Console Logs Reference

### Backend Logs (when message sent)
```
[WebServer] Received WebSocket message: { type: 'grpc_request', ... }
[WebServer] State update intercepted, broadcasting to clients...
[WebServer] State broadcast sent to 1 clients
[TaskCheckpointManager] Failed to save checkpoint...
```

### Frontend Logs (Chrome DevTools)
```
[SidePanel] 📨 Received WebSocket message type: grpc_response
[SidePanel] 🔄 Converted timestamp at grpc_response.message.ts: 1234567890 -> Long
[SidePanel] ✅ Converted 3 timestamps in message
cline-app.js:1003 Invalid timestamp in partial message: [object Object]
```

The "Invalid timestamp" error indicates the conversion attempt created an object but it's not a valid Long instance that passes React's validation.

---

**Document created**: October 22, 2025, 5:23 PM IST  
**Status**: Issue diagnosed, solution pending decision
