# Chrome Extension Development Mode Instructions

## Overview

The Chrome extension now supports true development mode that loads the UI directly from the Vite dev server. This enables:

- ✅ Hot Module Replacement (HMR) - changes reflect instantly
- ✅ Live reload on code changes
- ✅ Same code path as standalone browser version
- ✅ Unified bridge loading from backend
- ✅ Faster development cycle

## Prerequisites

Ensure you have the following running:

1. **Backend Server** - Provides gRPC API and standalone bridge
2. **Vite Dev Server** - Serves the React UI with HMR

## Step-by-Step Setup

### 1. Start the Backend Server

```bash
# From project root
npm run dev:standalone
```

This starts the backend on `http://localhost:8080` which provides:
- gRPC API endpoints
- WebSocket streaming
- `standalone-bridge.js` file

**Expected output:**
```
[Standalone] Backend server running on http://localhost:8080
[Standalone] WebSocket server ready for connections
```

### 2. Start the Vite Dev Server

```bash
# From project root
cd webview-ui && npm run dev
```

This starts Vite on `http://localhost:25463` with:
- React app with HMR
- Live reload on changes
- Source maps for debugging

**Expected output:**
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:25463/
➜  Network: use --host to expose
```

### 3. Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `chrome-extension/` directory from this project
5. The extension should now appear in your extensions list

### 4. Open the Extension

1. Click the Cline extension icon in Chrome toolbar
2. The side panel will open and show "DEV MODE" indicator
3. The UI is now loaded from Vite via iframe

**What you should see:**
- Orange "DEV MODE" indicator in top-right corner
- Full Cline UI loaded and functional
- Console logs showing connection to Vite and backend

## How It Works

### Dev Mode Detection

The extension automatically detects if it's running in development mode by checking the install type:

```javascript
// In background.js
async isDevMode() {
    const info = await chrome.management.getSelf()
    return info.installType === "development" // true for unpacked extensions
}
```

### File Loading

**Development Mode:**
- Loads: `sidepanel/sidepanel-dev.html`
- Contains iframe pointing to `http://localhost:25463/index.html`
- All UI served from Vite with HMR enabled

**Production Mode:**
- Loads: `sidepanel/sidepanel.html`
- Contains Vite-built bundle (will be created in Phase 2)
- Self-contained, no external dependencies

### Platform Configuration

Both dev and production use the same platform setting:

```javascript
// In platform-init.js
window.__PLATFORM__ = "standalone"
```

This ensures both modes share the exact same code path, guaranteeing behavioral parity.

### Bridge Loading

Both modes load the bridge from the backend:

```html
<script src="http://localhost:8080/standalone-bridge.js"></script>
```

This bridge establishes WebSocket connection and handles all message passing.

## Development Workflow

### Making Changes

1. Edit files in `webview-ui/src/`
2. Changes automatically hot-reload in the extension
3. No need to reload the extension manually

### Viewing Console Logs

Open Chrome DevTools for the extension:

1. Right-click on the extension side panel
2. Select **Inspect**
3. View logs in the Console tab

You should see logs from:
- `[Chrome Extension Dev]` - Dev mode wrapper
- `[Platform Init]` - Platform initialization
- `[Standalone Bridge]` - Bridge connection status
- React app logs

### Troubleshooting

#### Extension Shows "Development Server Not Running"

**Problem:** Vite dev server is not accessible

**Solutions:**
1. Ensure Vite is running: `cd webview-ui && npm run dev`
2. Check Vite is on port 25463: `curl http://localhost:25463`
3. Check for port conflicts

#### Backend Connection Failed

**Problem:** Can't connect to backend at localhost:8080

**Solutions:**
1. Ensure backend is running: `npm run dev:standalone`
2. Check backend is on port 8080: `curl http://localhost:8080/health`
3. Check console for CORS errors

#### Changes Not Reflecting

**Problem:** Code changes don't appear in extension

**Solutions:**
1. Check HMR is working in browser tab: `http://localhost:25463`
2. Hard refresh the extension side panel: `Cmd+Shift+R` (Mac) / `Ctrl+Shift+R` (Windows)
3. Reload the extension from `chrome://extensions/`

#### WebSocket Connection Issues

**Problem:** Messages not streaming

**Solutions:**
1. Check WebSocket connection in Network tab (filter: WS)
2. Ensure backend WebSocket endpoint is accessible
3. Check for firewall/proxy blocking WebSocket connections

## Console Log Reference

### Expected Logs on Successful Load

```
[Background] Extension install type: development
[Background] Setting up side panel in DEV mode
[Background] Loading: sidepanel/sidepanel-dev.html
[Chrome Extension Dev] Loading from Vite dev server at http://localhost:25463
[Chrome Extension Dev] Backend expected at http://localhost:8080
[Chrome Extension Dev] Vite app loaded successfully
[Platform Init] Chrome extension environment initialized (using standalone code path)
[Standalone Bridge] Initializing...
[Standalone Bridge] WebSocket connected
[Standalone Bridge] Bridge ready
```

### Error Logs to Watch For

```
❌ Failed to load Vite app
❌ WebSocket connection failed
❌ Backend unavailable
❌ CORS error loading standalone-bridge.js
```

## Comparison: Dev vs Production

| Feature | Dev Mode | Production Mode |
|---------|----------|-----------------|
| HTML File | `sidepanel-dev.html` | `sidepanel.html` |
| UI Source | Vite dev server (iframe) | Vite-built bundle |
| HMR | ✅ Enabled | ❌ Not available |
| Bridge Loading | From backend | From backend |
| Platform | "standalone" | "standalone" |
| Setup Required | Backend + Vite | Backend only |

## Next Steps

Once Phase 1 dev mode is validated, Phase 2 will implement production builds with Vite, eliminating webpack entirely.

## Testing Checklist

Before marking Phase 1 complete, verify:

- [ ] Extension loads in dev mode
- [ ] "DEV MODE" indicator appears
- [ ] UI loads from Vite dev server
- [ ] Code changes hot-reload
- [ ] Backend connection established
- [ ] WebSocket streaming works
- [ ] Messages sent and received
- [ ] Console logs show no errors
- [ ] Behavior matches standalone browser

## Support

If you encounter issues:

1. Check console logs in both extension and browser tab
2. Verify both servers are running
3. Check network tab for failed requests
4. Compare logs with standalone browser version

The goal is identical behavior - same logs, same functionality, same everything.
