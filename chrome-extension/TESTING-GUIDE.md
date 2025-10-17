# Chrome Extension Testing Guide

## 🚀 Quick Start - Load Extension in Chrome

### Step 1: Open Chrome Extensions Page
1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)

### Step 2: Load Unpacked Extension
1. Click **"Load unpacked"** button
2. Navigate to your project folder
3. Select the `dist-extension` folder
4. Click "Select" or "Open"

### Step 3: Verify Extension Loaded
You should see:
- ✅ Extension appears in the list
- ✅ Extension ID assigned
- ✅ No errors in the list
- ✅ Extension icon appears in Chrome toolbar

---

## 🧪 Testing Checklist

### Phase 1: Basic Extension Loading

- [ DONE] **Extension appears in chrome://extensions/**
  - Extension name: "Cline AI Assistant"
  - Version shown correctly
  - No errors displayed

- [ DONE] **Click extension icon in toolbar**
  - Side panel opens
  - No console errors (check with F12 → Console)

- [ DONE] **Check side panel structure**
  - Backend status bar visible at top
  - Should show "Checking connection..." initially
  - Main content area visible below

### Phase 2: React App Loading

- [ ] **Open side panel and check console** (F12 → Console tab)
  - Look for: `[PLATFORM_CONFIG] Build platform: chrome-extension`
  - Should see React mounting messages
  - No critical errors

- [ ] **Verify React UI appears**
  - Chat interface loads (not placeholder)
  - Sidebar navigation visible
  - Settings icon visible
  - No "React app bundle not loaded yet" message

- [ ] **Check Elements tab** (F12 → Elements)
  - `<div id="root">` contains React components
  - Look for `data-platform="chrome-extension"` attribute
  - React components rendered inside root

### Phase 3: Backend Connection

**Prerequisites:** Backend services must be running!

#### Terminal 1 - Start Hostbridge:
```bash
cd dist-standalone/extension
./cli/bin/cline-host --port 26041 --verbose
```

#### Terminal 2 - Start Cline Core:
```bash
cd dist-standalone
node cline-core.js --port 8001 --host-bridge-port 26041
```

#### Terminal 3 - Verify Backend Health:
```bash
curl http://localhost:8001/health
# Should return: {"status":"ok","timestamp":"..."}
```

**Then test:**

- [ ] **Backend status bar updates**
  - Status changes from "Checking..." to "Backend connected"
  - Status indicator turns green
  - "Full functionality available" message

- [ ] **Check background script console**
  - Right-click extension → "Inspect background page"
  - Look for: `[Background] Initializing extension...`
  - Look for: `[Background] Initial backend status: { connected: true }`
  - Check for connection monitoring logs

### Phase 4: Core Functionality

- [ ] **API Configuration**
  - Click settings icon
  - Can select API provider (Anthropic, OpenAI, etc.)
  - Can enter API key
  - Settings save successfully

- [ ] **Send a Test Message**
  - Type message in chat input
  - Click send or press Enter
  - Message appears in chat
  - Loading indicator shows
  - Backend processes request

- [ ] **Receive AI Response**
  - Response appears in chat
  - Streaming works (text appears gradually)
  - No errors in console
  - Response formatting correct

### Phase 5: Advanced Features

- [ ] **Task Creation**
  - Create a new task
  - Task appears in history
  - Task ID generated
  - State persists

- [ ] **Message History**
  - Previous messages persist
  - Can scroll through history
  - Timestamps correct
  - Can clear history

- [ ] **Settings Panel**
  - Can access all settings
  - Changes save
  - Settings persist on reload

---

## 🐛 Common Issues & Solutions

### Issue: Extension won't load
**Symptoms:** Red error badge on extension card
**Solutions:**
1. Check manifest.json for syntax errors
2. Verify all files exist in dist-extension/
3. Check Chrome console for specific error
4. Try: Remove extension → Clean → Rebuild → Reload

```bash
# Clean and rebuild
rm -rf dist-extension
npm run build:extension
```

### Issue: Side panel shows blank/white screen
**Symptoms:** Nothing appears in side panel
**Solutions:**
1. Open DevTools (F12) and check Console tab
2. Look for JavaScript errors
3. Verify in Elements tab that `<div id="root">` has React content
4. Check Network tab - ensure vendor.js and cline-app.js loaded (HTTP 200)

**Debug steps:**
```
F12 → Console → Look for errors
F12 → Network → Check if scripts loaded
F12 → Elements → Verify React rendered
```

### Issue: "React app bundle not loaded yet" placeholder
**Symptoms:** Seeing placeholder instead of Cline interface
**Solutions:**
1. Verify build completed successfully
2. Check files exist:
   - `dist-extension/sidepanel/cline-app.js`
   - `dist-extension/shared/vendor.js`
3. Rebuild extension: `npm run build:extension`
4. Reload extension in Chrome

### Issue: Backend connection fails
**Symptoms:** Status bar shows "Backend disconnected"
**Solutions:**
1. Verify backend services running:
   ```bash
   curl http://localhost:8001/health
   ```
2. Check backend console for errors
3. Verify ports: 8001 (cline-core), 26041 (hostbridge)
4. Check background script console:
   - Right-click extension → Inspect background page
   - Look for connection error messages

### Issue: Backend connected but messages don't send
**Symptoms:** Messages appear but no response
**Solutions:**
1. Check browser console for errors
2. Verify API key configured correctly
3. Check background script console for request/response logs
4. Verify gRPC message format in Network tab

### Issue: Extension permissions errors
**Symptoms:** Console shows permissions errors
**Solutions:**
1. Check manifest.json has correct permissions
2. For side panel: Chrome 114+ required
3. Reload extension after manifest changes

---

## 📊 What to Look For

### Success Indicators ✅

**In Side Panel:**
- Cline chat interface loads
- Status bar shows "Backend connected" (when backend running)
- Can type messages
- Settings accessible
- No error messages

**In Console (F12):**
```
[PLATFORM_CONFIG] Build platform: chrome-extension
[SidePanel] Initializing...
[SidePanel] Message bridge initialized
[SidePanel] React app loaded successfully
[BackendConnector] Health check: 200 OK
```

**In Background Script Console:**
```
[Background] Initializing extension...
[Background] Initial backend status: { connected: true }
[BackendConnector] Connection monitoring started
```

### Warning Signs ⚠️

**Console Errors:**
- `Cannot read property 'postMessage' of undefined` → Platform detection issue
- `Failed to fetch` → Backend connection issue
- `Uncaught TypeError` → React rendering issue
- `net::ERR_FILE_NOT_FOUND` → Missing bundle files

**Visual Issues:**
- Blank white screen → React not rendering
- Placeholder text → Bundle not loading
- Frozen UI → JavaScript error blocking execution

---

## 🔍 Debug Commands

### Check Extension Files
```bash
# List all extension files
ls -la dist-extension/

# Check sidepanel structure
ls -la dist-extension/sidepanel/

# Check shared vendor exists
ls -lh dist-extension/shared/vendor.js

# Verify HTML content
cat dist-extension/sidepanel/sidepanel.html | grep -A5 "script src"
```

### Check Backend Services
```bash
# Check if cline-core is running
curl http://localhost:8001/health

# Check if hostbridge is running
curl http://localhost:26041/health

# Check backend logs
# (look in terminal where you started the services)
```

### Rebuild Everything
```bash
# Full clean rebuild
rm -rf dist-extension
npm run build:extension

# Verify build output
ls -lh dist-extension/sidepanel/cline-app.js
ls -lh dist-extension/shared/vendor.js
```

---

## 📝 Testing Notes Template

Use this template to track your testing:

```markdown
## Test Session: [Date/Time]

### Environment
- Chrome Version: ___________
- Extension Version: ___________
- Backend Running: Yes / No
- Hostbridge Running: Yes / No

### Phase 1: Extension Loading
- [ ] Extension loads: ✅ / ❌
- Issues: ___________

### Phase 2: React App
- [ ] React UI appears: ✅ / ❌
- Console errors: ___________

### Phase 3: Backend Connection
- [ ] Backend connects: ✅ / ❌
- Status message: ___________

### Phase 4: Core Functionality
- [ ] Can send messages: ✅ / ❌
- [ ] Receives responses: ✅ / ❌
- Issues: ___________

### Notes
___________
```

---

## 🎯 Next Steps After Successful Testing

1. **Document any issues found**
2. **Test on different websites** (content script functionality)
3. **Test file operations** (File System Access API)
4. **Performance testing** (response times, memory usage)
5. **Security testing** (CSP compliance, permissions)

---

## 🆘 Getting Help

If you encounter issues:

1. **Check Console** (F12 → Console) - Most errors show here
2. **Check Background Script** (Right-click extension → Inspect background page)
3. **Check Network** (F12 → Network) - See what's loading
4. **Check Elements** (F12 → Elements) - Verify React rendered
5. **Review milestone1-chrome.md** for known issues

**Collect this info for debugging:**
- Chrome version (`chrome://version/`)
- Console errors (screenshot or copy)
- Network tab status (any failed requests?)
- Background script console output
- Steps to reproduce the issue
