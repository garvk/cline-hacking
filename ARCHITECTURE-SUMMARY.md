<invoke name="write_to_file">
<path>ARCHITECTURE-SUMMARY.md</path>
<content># Cline Architecture Summary: Standalone Web & Chrome Extension

## Overview

Cline operates in two distinct deployment modes, sharing a unified frontend codebase but with different backend and runtime environments:

- **Standalone Web**: Independent web application with Node.js backend
- **Chrome Extension**: Browser extension running within Chrome with background service worker

Both share the same React UI built with Vite and communicate via message-passing protocols.

---

## Standalone Web Browser Architecture

### Entry Points
- **Backend**: `src/standalone/web-server.ts` - Node.js HTTP server
- **Frontend**: `webview-ui/src/App.tsx` - React application
- **Build Output**: `dist/` directory

### Backend Services
```
Web Server (Node.js)
├── HTTP Server (listening on port, e.g., 3000)
├── WebSocket/Message Handler
├── API Integration Layer (Anthropic, OpenAI, etc.)
├── File System Access
├── Terminal Command Execution
├── Git-based Checkpoint System
└── MCP Server Management
```

### Frontend Communication (Web Mode)
- **Protocol**: HTTP + WebSocket or fetch-based messages
- **Communication Flow**: Browser → Web Server → API Providers
- **State Management**: React Context (ExtensionStateContext)
- **Message Types**: Text, tool execution, file operations, terminal commands

### Key Files
| File | Purpose |
|------|---------|
| `src/standalone/web-server.ts` | Node.js server initialization |
| `webview-ui/src/App.tsx` | Main React component |
| `webview-ui/vite.config.ts` | Vite config for web build |
| `package.json` | Node.js dependencies |

### Build & Run
```bash
# Build frontend
npm run build:web

# Run server
npm start:web
# or: node dist/standalone/web-server.js
```

### Runtime Environment
- **Process**: Node.js process
- **Lifecycle**: Manual start/stop by user
- **Persistence**: File-based (local filesystem)
- **Port**: Configurable (default: 3000)
- **Scope**: Full OS access (files, terminal, network)

---

## Chrome Extension Architecture

### Entry Points
- **Content Script**: `chrome-extension/sidepanel/sidepanel.html`
- **Background Service Worker**: `chrome-extension/background/background.js`
- **Manifest**: `chrome-extension/manifest.json`
- **Frontend**: Shared `webview-ui/` (built separately for extension)

### Extension Structure
```
Chrome Extension
├── Manifest (v3)
├── Sidepanel UI (React Frontend)
│   └── Rendered in chrome.sidePanel
├── Background Service Worker
│   └── Handles API requests, state persistence
├── Platform Initializer (platform-init.js)
│   └── Sets up Chrome APIs, messaging bridge
└── Assets & Icons
```

### Frontend Communication (Extension Mode)
- **Protocol**: Chrome Extension Message Passing API
- **Communication Flow**: Sidepanel UI → Background Worker → API Providers
- **State Management**: React Context (ExtensionStateContext) + Chrome Storage
- **Message Types**: Same as web (text, tools, files, terminal via backend-connector)

### Key Files
| File | Purpose |
|------|---------|
| `chrome-extension/manifest.json` | Extension configuration |
| `chrome-extension/sidepanel/sidepanel.html` | Sidepanel entry point |
| `chrome-extension/sidepanel/platform-init.js` | Chrome API bridge |
| `chrome-extension/background/background.js` | Service worker logic |
| `chrome-extension/background/backend-connector.js` | Backend communication |
| `webview-ui/vite.config.extension.ts` | Vite config for extension build |

### Build & Deploy
```bash
# Build extension
npm run build:extension

# Output: dist-extension/
# Manual installation: Load unpacked in Chrome
```

### Runtime Environment
- **Process**: Chrome browser + service worker
- **Lifecycle**: Installed/enabled in Chrome, auto-managed by browser
- **Persistence**: Chrome Storage API + file access via remote backend
- **Scope**: Limited to Chrome permissions (configurable)
- **Constraints**: Service worker restarts, no persistent Node.js runtime

---

## Build System (Vite Unification)

### Entry Points Configuration
```javascript
// vite.config.ts (Web)
entry: 'webview-ui/src/App.tsx'
output: 'dist/frontend/'

// vite.config.extension.ts (Extension)
entry: 'webview-ui/src/App.tsx'
output: 'dist-extension/sidepanel/'
```

### Build Process
1. **Single React Codebase** - `webview-ui/src/`
2. **Dual Vite Configs** - Separate configs for web vs. extension
3. **Asset Pipeline** - Icons, CSS, JavaScript compiled separately
4. **Output Separation**:
   - Web: `dist/` → Served by Node.js
   - Extension: `dist-extension/` → Packaged in extension

### Build Commands
```bash
npm run build              # Build all
npm run build:web         # Web only
npm run build:extension   # Extension only
npm run dev               # Dev server (web)
npm run dev:extension     # Dev server (extension)
```

---

## Communication Patterns

### Message Flow Comparison

#### Standalone Web
```
React UI
  ↓ fetch/WebSocket
Node.js Server (web-server.ts)
  ↓
API Handlers + Tool Execution
  ↓
External APIs / Local File System / Terminal
```

#### Chrome Extension
```
React UI (Sidepanel)
  ↓ chrome.runtime.sendMessage()
Background Service Worker (background.js)
  ↓ Message Router
Backend Connector → Remote Backend (if needed)
  ↓
API Handlers + Tool Execution
  ↓
External APIs / Backend Resources
```

### Message Types (Both Modes)
- **API Requests**: Anthropic, OpenRouter, etc.
- **Tool Execution**: File read/write, terminal commands, browser actions
- **State Updates**: Conversation history, task status
- **File Operations**: Create, update, delete with diff tracking
- **Terminal Output**: Real-time command execution and output
- **MCP Tool Calls**: External MCP server integrations

---

## Shared Components

### Frontend (React)
- `webview-ui/src/App.tsx` - Main application
- `webview-ui/src/context/ExtensionStateContext.tsx` - State management
- `webview-ui/src/components/` - Reusable UI components
- `webview-ui/src/services/` - API calls, utilities

### Common Services
- Message handlers for both platforms
- API provider integrations
- Tool execution logic
- State persistence utilities
- MCP hub integration

### Styling & Assets
- Tailwind CSS configuration (shared)
- Icons and theme assets (shared)
- Dark/light mode support

---

## Key Differences Matrix

| Aspect | Standalone Web | Chrome Extension |
|--------|---|---|
| **Runtime** | Node.js process | Chrome service worker |
| **Backend** | Embedded Node.js | Remote backend OR Chrome APIs |
| **File Access** | Full filesystem | Limited by permissions |
| **Terminal** | Full shell access | None (delegated to backend) |
| **Persistence** | File-based storage | Chrome Storage API |
| **Startup** | Manual (npm start) | Auto (installed in Chrome) |
| **Lifespan** | Controlled by user | Browser-managed |
| **Build Output** | Single `dist/` | Multiple in `dist-extension/` |
| **Deployment** | Host + run locally | Chrome Web Store / Load unpacked |
| **API Communication** | Direct | via background worker bridge |

---

## Data Flow Overview

### Standalone Web (Full Stack)
```
User Input (Sidepanel/UI)
    ↓
React State Management
    ↓
WebSocket/HTTP Request
    ↓
Node.js Server Handler
    ↓
Tool Execution Engine
    ├→ File System Operations
    ├→ Terminal Commands
    ├→ API Requests
    └→ MCP Tool Calls
    ↓
Response Stream
    ↓
React UI Update
    ↓
User Sees Result
```

### Chrome Extension (Limited Stack)
```
User Input (Sidepanel)
    ↓
React State Management
    ↓
chrome.runtime.sendMessage()
    ↓
Background Service Worker
    ↓
Backend Connector (if remote backend)
    OR
Chrome APIs / Storage
    ↓
Tool Execution / API Call
    ↓
Message Response
    ↓
React UI Update
    ↓
User Sees Result
```

---

## File Organization

```
cline-hacking/
├── src/
│   ├── standalone/
│   │   └── web-server.ts          # Web backend entry
│   ├── core/
│   │   ├── controller/            # Shared logic
│   │   ├── task/                  # Task execution
│   │   └── webview/               # WebviewProvider
│   ├── api/
│   │   └── providers/             # API integrations
│   └── services/
│       └── mcp/                   # MCP integration
├── webview-ui/                    # Shared React Frontend
│   ├── src/
│   │   ├── App.tsx
│   │   ├── context/
│   │   ├── components/
│   │   └── services/
│   ├── vite.config.ts             # Web build
│   └── vite.config.extension.ts   # Extension build
├── chrome-extension/              # Extension-specific
│   ├── manifest.json
│   ├── sidepanel/
│   │   ├── sidepanel.html
│   │   └── platform-init.js
│   └── background/
│       ├── background.js
│       └── backend-connector.js
├── dist/                          # Web build output
├── dist-extension/                # Extension build output
└── package.json
```

---

## Key Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts for both modes |
| `tsconfig.json` | TypeScript configuration (shared) |
| `webview-ui/vite.config.ts` | Web frontend build config |
| `webview-ui/vite.config.extension.ts` | Extension frontend build config |
| `chrome-extension/manifest.json` | Chrome extension metadata & permissions |
| `src/standalone/web-server.ts` | Web backend initialization |

---

## Development Workflow

### Web Mode
1. Edit source in `src/` or `webview-ui/src/`
2. Run `npm run dev` (starts web-server with HMR)
3. Changes auto-reload in browser
4. Build with `npm run build:web`

### Extension Mode
1. Edit source in `chrome-extension/` or `webview-ui/src/`
2. Run `npm run dev:extension` (Vite dev server)
3. Load in Chrome: chrome://extensions/ → Load unpacked → `dist-extension/`
4. Manual refresh on changes (or use Vite HMR if configured)
5. Build with `npm run build:extension`

---

## Summary Table

| Component | Web | Extension |
|-----------|-----|-----------|
| **Frontend** | React (shared) | React (shared) |
| **Backend** | Node.js (embedded) | Service Worker (lightweight) |
| **Build Tool** | Vite | Vite (unified config) |
| **Communication** | WebSocket/HTTP | Chrome Message API |
| **Storage** | Filesystem | Chrome Storage / Remote |
| **Deployment** | npm start | Load in Chrome |
| **Scope** | Full OS access | Chrome-sandboxed |

---

## Quick Start References

### Building
```bash
npm run build              # Build both web and extension
npm run build:web         # Web only
npm run build:extension   # Extension only
```

### Development
```bash
npm run dev               # Web dev mode
npm run dev:extension     # Extension dev mode
```

### Running
```bash
# Web: Server binary at dist/standalone/web-server.js
node dist/standalone/web-server.js

# Extension: Load dist-extension/ in Chrome manually
```

