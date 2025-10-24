# Milestone 2 Testing Guide - Chrome Extension Real-Time Streaming

**Date:** October 17, 2025  
**Status:** Implementation Complete - Ready for Testing

---

## 🎯 What We Implemented

### Backend (web-server.ts)
- ✅ Added SSE (Server-Sent Events) endpoint at `/events`
- ✅ Real-time state broadcasting to SSE clients
- ✅ Task event broadcasting (created, cancelled, cleared, deleted)
- ✅ Automatic client cleanup and reconnection handling
- ✅ Clear comments marking Chrome Extension specific code

### Chrome Extension
- ✅ SSE connection in backend-connector.js
- ✅ Event broadcasting in background.js
- ✅ Event handling in sidepanel.js
- ✅ Automatic reconnection with exponential backoff
- ✅ Fallback to storage API if direct messaging fails

---

## 📋 Pre-Testing Setup

### 1. Build the Backend
```bash
# From project root
npm run build
```

### 2. Start Backend Services

**Terminal 1 - Cline Core (with SSE support):**
```bash
cd dist-standalone
node cline-core.js --port 8001 --host-bridge-port 26041
```

**Expected output:**
```
[WebServer] HTTP server listening on http://localhost:8001
[WebServer] WebSocket server listening on ws://localhost:8001/ws
[WebServer] SSE endpoint available at http://localhost:8001/events (Chrome Extension)
```

**Terminal 2 - Hostbridge:**
```bash
cd dist-standalone/extension
./cli/bin/cline-host --port 26041 --verbose
```

### 3. Verify Backend Health

```bash
# Test HTTP health endpoint
curl http://localhost:8001/health

# Expected: {"status":"ok","timestamp":"..."}
```

### 4. Load Extension

1. Open Chrome
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle top-right)
4. Click "Load unpacked"
5. Select `dist-extension` folder
6. Click extension icon to open side panel

---

## ✅ Test Checklist

### Phase 1: Connection Tests

#### Test 1.1: Backend Connection
**Steps:**
1. Open extension side panel
2. Observe backend status bar

**Expected:**
- 🟢 Green status: "Backend connected - Full functionality available"
- No "Retry" or "Setup" buttons visible

**Debug:**
- Check browser console (F12 on side panel)
- Look for: `[BackendConnector] Health check: 200 OK`

#### Test 1.2: SSE Connection
**Steps:**
1. Open background service worker console:
   - Go to `chrome://extensions/`
   - Click "Inspect views: background page"

**Expected Logs:**
```
[BackendConnector] 🔌 Connecting to SSE stream...
[BackendConnector] ✅ SSE connection established
[WebServer] 🔌 SSE client connecting (Chrome Extension)...
[WebServer] ✅ SSE client connected: sse_... (total: 1)
```

#### Test 1.3: Initial State Delivery
**Steps:**
1. Open side panel console (F12)
2. Look for state fetch logs

**Expected Logs:**
```
[SidePanel] 🚀 Fetching initial state proactively...
[SidePanel] ✅ Initial state fetched successfully!
[SidePanel] ✅ Initial state dispatched to window
```

---

### Phase 2: Service Tests

#### Test 2.1: StateService
**Test:** Get latest state

**Steps:**
1. Extension should auto-fetch on load
2. Check console for state retrieval

**Expected:**
- State JSON received
- Version, messages count, task history visible in logs

#### Test 2.2: ModelsService  
**Test:** Get OpenRouter models

**Manual test via background console:**
```javascript
// In background service worker console
chrome.runtime.sendMessage({
  type: "GRPC_REQUEST",
  data: {
    type: "grpc_request",
    grpc_request: {
      service: "cline.ModelsService",
      method: "subscribeToOpenRouterModels",
      message: {},
      request_id: "test_models",
      is_streaming: false
    }
  }
}, (response) => console.log(response))
```

**Expected:**
- Response with models list
- HTTP 200 status
- Success: true

#### Test 2.3: TaskService
**Test:** Create a new task

**Manual test via background console:**
```javascript
chrome.runtime.sendMessage({
  type: "GRPC_REQUEST",
  data: {
    type: "grpc_request",
    grpc_request: {
      service: "cline.TaskService",
      method: "newTask",
      message: {
        text: "Test task from Chrome extension",
        images: [],
        files: []
      },
      request_id: "test_task",
      is_streaming: false
    }
  }
}, (response) => console.log(response))
```

**Expected:**
- Task created with unique ID
- SSE event broadcasted: `task_created`
- Side panel receives update

---

### Phase 3: Real-Time Streaming Tests

#### Test 3.1: State Update Streaming
**Steps:**
1. Keep side panel open
2. Keep background console open
3. Create a task (via test above)

**Expected:**
- Background console: `[Background] 📡 Received SSE event: TASK_CREATED`
- Side panel console: `[SidePanel] 📡 Handling SSE event: TASK_CREATED`
- React app receives state update in real-time

#### Test 3.2: Task Cancellation Streaming
**Test cancelling a running task**

**Manual test:**
```javascript
chrome.runtime.sendMessage({
  type: "GRPC_REQUEST",
  data: {
    type: "grpc_request",
    grpc_request: {
      service: "cline.TaskService",
      method: "cancelTask",
      message: {},
      request_id: "test_cancel",
      is_streaming: false
    }
  }
}, (response) => console.log(response))
```

**Expected:**
- SSE event: `task_cancelled`
- Real-time notification in side panel
- State updates immediately

#### Test 3.3: Reconnection Test
**Test SSE reconnection after disconnect**

**Steps:**
1. Stop backend (Ctrl+C in Terminal 1)
2. Wait 5 seconds
3. Restart backend
4. Check background console

**Expected:**
```
[BackendConnector] ❌ SSE connection error
[BackendConnector] 🔄 Reconnecting SSE in 1000ms (attempt 1/5)
[BackendConnector] ✅ SSE connection established
```

---

### Phase 4: Settings Persistence Tests

#### Test 4.1: API Configuration
**Test saving API settings**

**Manual test:**
```javascript
chrome.runtime.sendMessage({
  type: "GRPC_REQUEST",
  data: {
    type: "grpc_request",
    grpc_request: {
      service: "cline.ModelsService",
      method: "updateApiConfigurationProto",
      message: {
        apiConfiguration: {
          apiProvider: "anthropic",
          apiKey: "test-key-12345",
          planModeApiProvider: "anthropic",
          actModeApiProvider: "anthropic"
        }
      },
      request_id: "test_api_config",
      is_streaming: false
    }
  }
}, (response) => console.log(response))
```

**Expected:**
```
[WebServer] ⚙️ Updating API configuration
[WebServer] 🔑 API Key being saved: [MASKED]
[WebServer] ✅ Successfully updated API configuration
[WebServer] 📡 Posted updated state to webview after API config change
```

#### Test 4.2: Verify Persistence
**Steps:**
1. Set API configuration (test above)
2. Reload extension
3. Check if settings persisted

**Expected:**
- Settings restored after reload
- API key masked in logs
- Provider selections maintained

---

### Phase 5: Error Handling Tests

#### Test 5.1: Backend Unavailable
**Steps:**
1. Stop backend services
2. Open side panel
3. Try to create a task

**Expected:**
- Status bar shows: "Backend disconnected"
- "Retry Connection" button visible
- "Show Setup" button visible
- Graceful error messages

#### Test 5.2: Network Timeout
**Test handling slow network**

**Steps:**
1. Use browser DevTools Network throttling
2. Try operations with throttled connection

**Expected:**
- Requests timeout after 30 seconds
- Error messages displayed
- No crashes or hangs

---

## 🐛 Common Issues & Solutions

### Issue 1: SSE Not Connecting
**Symptoms:** No SSE logs in background console

**Debug Steps:**
1. Check backend is running on port 8001
2. Test SSE endpoint directly:
```bash
curl -N http://localhost:8001/events
```
3. Check CORS headers are present
4. Verify no proxy blocking SSE

**Solution:**
- Restart backend services
- Check firewall settings
- Verify port 8001 is not in use

### Issue 2: State Not Updating
**Symptoms:** Side panel shows stale state

**Debug Steps:**
1. Check background console for SSE events
2. Check side panel console for event handling
3. Verify React app is loaded

**Solution:**
- Reload extension
- Check message passing logs
- Verify handleSSEEvent is called

### Issue 3: Reconnection Fails
**Symptoms:** SSE doesn't reconnect after backend restart

**Debug Steps:**
1. Check reconnection attempt logs
2. Verify max attempts not exceeded
3. Check backend health endpoint

**Solution:**
- Reload extension to reset reconnection counter
- Check backend logs for connection rejections
- Verify SSE endpoint is responding

---

## 📊 Success Criteria

### Milestone 2 Complete When:
- ✅ Backend SSE endpoint functional
- ✅ Extension connects to SSE on startup
- ✅ Real-time state updates working
- ✅ All 7 services responding correctly
- ✅ Task events broadcast in real-time
- ✅ Settings persist across reloads
- ✅ Reconnection works after disconnect
- ✅ Error handling graceful

---

## 📝 Testing Logs Location

**Backend Logs:**
- Terminal 1: Cline core service
- Terminal 2: Hostbridge service

**Extension Logs:**
- Background: `chrome://extensions/` → Inspect views → background page
- Side Panel: F12 on side panel → Console tab

**Network Logs:**
- F12 on side panel → Network tab
- Filter: `events` to see SSE connection
- Filter: `message` to see HTTP POST requests

---

## 🎉 Next Steps After Testing

Once all tests pass:

1. **Document any issues found**
   - Create bug reports with logs
   - Include reproduction steps
   - Note Chrome version and OS

2. **Performance testing**
   - Monitor CPU usage
   - Check memory leaks
   - Test with multiple tasks

3. **User acceptance testing**
   - Real-world task creation
   - Extended use sessions
   - Multiple browser windows

4. **Prepare for Milestone 3**
   - Advanced features
   - UI/UX improvements
   - Additional MCP integrations

---

## 🔗 Related Documentation

- `milestone1-chrome.md` - Architecture overview
- `cline-chrome-extension-roadmap.md` - Full roadmap
- `TESTING-GUIDE.md` - Detailed testing instructions
- `WEB_SERVER_REFACTORING_SUGGESTIONS.md` - Future improvements

---

## ✉️ Report Issues

When reporting issues, please include:

1. **Environment:**
   - Chrome version
   - OS version
   - Extension version

2. **Logs:**
   - Background console logs
   - Side panel console logs
   - Backend terminal logs

3. **Steps to reproduce:**
   - Exact sequence of actions
   - Expected vs actual behavior
   - Screenshots if applicable

---

**Good luck testing! 🚀**
