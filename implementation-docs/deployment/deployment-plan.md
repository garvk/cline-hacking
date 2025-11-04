


# CLINE STANDALONE WEB DEPLOYMENT - ARCHITECTURE DOCUMENT

**Status**: Deployment Design Phase  
**Version**: 1.0  
**Last Updated**: October 28, 2025

## Executive Summary

Cline will be deployed as a cloud-hosted web application (agent.in5.com) with a **local-first, privacy-respecting architecture**. User data (conversations, API keys, settings) remains on their device in encrypted browser storage. The cloud backend provides orchestration, API proxying, and billing only—not state management.

---

in5-core
Deployments:
- webviewui - ()
- cline-core + hostbridge

 - core-HrLegal

in5-sdk

- 

## 1. Architecture Overview

### 1.1 High-Level Design

```
┌──────────────────────────────────────────────────────────┐
│                  agent.in5.com                           │
│               (React SPA in Browser)                      │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Local State Layer (IndexedDB + Encryption)        │ │
│  │ • API Keys (encrypted)                            │ │
│  │ • Conversations & History                         │ │
│  │ • User Settings & Preferences                     │ │
│  │ • MCP Server Registry                             │ │
│  │ • Task Checkpoints                                │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Local Execution Layer                             │ │
│  │ • FileSystem API (read/write local files)         │ │
│  │ • WebContainer / Local Runtime                    │ │
│  │ • MCP Client (local server discovery)             │ │
│  │ • Browser Automation                              │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────┬───────────────────────────────────────────┘
               │ HTTPS (Auth Token + Request)
        ┌──────▼──────────────────────┐
        │  Cloud Backend (Replit VM)   │
        ├──────────────────────────────┤
        │ • Auth Verification          │
        │ • API Request Proxying       │
        │ (OpenAI, Claude, etc)        │
        │ • Token Tracking & Billing   │
        │ • Cloud MCP Registry         │
        │ • Audit/Security Logs        │
        └──────────────────────────────┘
```

### 1.2 Multi-Tenancy Support

```
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  Browser Tab 1 │  │  Browser Tab 2 │  │  Browser Tab 3 │
│ (agent.in5.com)│  │ (agent.in5.com)│  │ (agent.in5.com)│
├────────────────┤  ├────────────────┤  ├────────────────┤
│ Local State    │  │ Local State    │  │ Local State    │
│ (IndexedDB)    │  │ (IndexedDB)    │  │ (IndexedDB)    │
│ User 1 Data    │  │ User 2 Data    │  │ User N Data    │
└────────┬───────┘  └────────┬───────┘  └────────┬───────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │ HTTPS
                    ┌────────▼────────┐
                    │  Cloud Backend   │
                    │  (Replit VM)     │
                    │ Shared Services  │
                    └──────────────────┘
```

---

## 2. Core Components

### 2.1 Frontend (Browser)

**Responsibility**: UI, local state management, local execution

**Key Features**:
- React SPA with TypeScript
- IndexedDB for persistent local storage
- Encrypted API key storage
- Session-based JWT authentication
- FileSystem API for file operations
- Local MCP server discovery
- Direct integration with local resources

**Storage Structure**:
```
IndexedDB {
  conversations: [{ id, title, messages, createdAt }]
  apiKeys: [{ id, provider, encryptedKey, algorithm }]
  userSettings: { theme, defaultModel, mcp_servers }
  mcp_registry: [{ name, type, connectionString, local: bool }]
  checkpoints: [{ taskId, timestamp, fileState }]
  taskHistory: [{ id, title, startedAt, completedAt, status }]
}
```

**Session Storage**:
```
SessionStorage {
  authToken: JWT (short-lived, 1hr)
  refreshToken: JWT (long-lived, 7 days)
  userPassword: Decrypted only during session (cleared on logout)
  decryptedApiKeys: Cache (cleared periodically)
}
```

### 2.2 Cloud Backend

**Responsibility**: Authentication, API proxying, billing, audit logging

**Deployment**: Replit VM (Node.js/Express or similar)

**Core Endpoints**:

```typescript
// Authentication
POST /auth/login
  Input: { email, ssoProvider }
  Output: { accessToken, refreshToken, expiresIn }

POST /auth/refresh
  Input: { refreshToken }
  Output: { accessToken, expiresIn }

// API Proxying
POST /api/chat-completion
  Input: { authToken, model, messages, temperature, apiKey }
  Output: { response, tokensUsed, cost }

POST /api/mcp/call
  Input: { authToken, toolName, params }
  Output: { result }

// Usage Tracking
POST /api/usage/track
  Input: { authToken, taskId, tokensIn, tokensOut, model }
  Output: { success, remainingBalance, cost }

GET /api/mcp-registry
  Output: [{ name, type, docs, cloudHosted: bool }]

// Health Check
GET /health
  Output: { status, uptime }
```

### 2.3 MCP Server Architecture

**Local MCP Servers**:
- User configures in manifest file (e.g., `.cline-mcp.json`)
- Browser discovers via local registry
- Direct connection (no cloud proxying)

**Cloud MCP Servers**:
- Optional pre-configured servers in registry
- Listed in backend `/api/mcp-registry` endpoint
- Users opt-in to use them

**MCP Registry Format**:
```json
{
  "local": [
    {
      "name": "filesystem",
      "type": "stdio",
      "command": "node",
      "args": ["./mcp-servers/filesystem.js"]
    },
    {
      "name": "git",
      "type": "stdio",
      "command": "npx",
      "args": ["@modelcontextprotocol/server-git"]
    }
  ],
  "cloud": [
    {
      "name": "weather-api",
      "type": "http",
      "endpoint": "https://weather.api.backend.com",
      "requires_auth": true
    }
  ]
}
```

---

## 3. Security Model

### 3.1 Authentication Flow

```
1. User lands on agent.in5.com
   ↓
2. SSO Login (Google/GitHub/etc via cloud backend)
   ↓
3. Backend verifies identity → issues JWT tokens
   ↓
4. Browser stores tokens in sessionStorage (HttpOnly if possible)
   ↓
5. Browser uses JWT for API requests to backend
   ↓
6. Backend proxies to LLM APIs (with user's API key from request)
   ↓
7. Response returned to browser (no keys stored server-side)
```

### 3.2 API Key Security

| Layer | Security Approach |
|-------|-------------------|
| **At Rest** | Encrypted IndexedDB with user's password |
| **In Transit** | TLS 1.3 (HTTPS only) |
| **In Memory** | Decrypted only when needed, cleared after use |
| **Protection** | User confirms password before using encrypted keys |

**Encryption Algorithm**:
- Algorithm: XChaCha20-Poly1305
- Library: TweetNaCl.js or libsodium.js
- Key Derivation: Argon2id (user password → encryption key)
- Nonce: Random, stored with ciphertext

### 3.3 Browser Security

| Threat | Mitigation |
|--------|-----------|
| **XSS Attacks** | Content Security Policy (no inline scripts), input sanitization |
| **Session Hijacking** | JWT with short expiry (1hr), secure HttpOnly cookies |
| **CSRF** | SameSite cookies, CSRF tokens on state-changing requests |
| **Man-in-the-Middle** | TLS 1.3, HSTS headers, optional certificate pinning |
| **Local Storage Forensics** | All sensitive data encrypted, cleared on logout |

**CSP Header**:
```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' https://trusted-cdn.com;
  style-src 'self' https://trusted-cdn.com;
  img-src 'self' data: https:;
  connect-src 'self' https://api.backend.com https://api.openai.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self'
```

### 3.4 Cloud Backend Security

| Layer | Security Approach |
|-------|-------------------|
| **API Authentication** | JWT verification on all endpoints |
| **Rate Limiting** | Per-user, per-endpoint rate limits |
| **Logging** | All requests logged (with redacted API keys) |
| **Secrets Management** | Environment variables, never hardcoded |
| **API Key Handling** | Never stored; passed through request headers only |

---

## 4. Data Flow

### 4.1 Chat Completion Flow

```
Browser                          Cloud Backend                  LLM Provider
  │                                    │                              │
  ├─ POST /api/chat-completion ───────→│                              │
  │  { messages, model, apiKey }       │                              │
  │                                    ├─ Verify JWT ✓                │
  │                                    ├─ Track tokens                │
  │                                    ├─ POST to OpenAI/Claude ─────→│
  │                                    │                              ├─ Process
  │                                    │                              ├─ Return
  │                                    │←───── Response ───────────────│
  │                                    ├─ Log usage                    │
  │←────── Response + cost ─────────────│                              │
  │                                    │                              │
  └─ Update local conversation        │                              │
    & calculate cost locally           │                              │
```

### 4.2 File Operations Flow

```
Browser (Local)                  Cloud Backend
  │                                    │
  ├─ FileSystem API                   │
  │  (read/write user files)          │
  │  ↓                                │
  ├─ Generate diff/manifest          │
  │  ↓                                │
  ├─ POST /api/usage/track ──────────→│
  │  { filesModified, size }          ├─ Update billing
  │  ↓                                │
  └─ Continue execution              │
     (no file syncing needed)         │
```

---

## 5. Challenges & Solutions

### 5.1 Browser Storage Limits

**Challenge**: IndexedDB quota (~50MB on most browsers)

**Solutions**:
- Implement storage quota management
- Archive old conversations to local JSON exports
- Offer encrypted cloud backup option (user-controlled)
- Cleanup strategy for old checkpoints

### 5.2 Browser Filesystem Access Limitations

**Challenge**: FileSystem API requires permissions, limited sandboxing

**Solutions**:
- Modern FileSystem Access API (Chromium browsers)
- Fallback to drag-drop for other browsers
- Show clear file access permissions to users
- Tauri/Electron wrapper as future option (no installation for MVP)

### 5.3 MCP Server Discovery

**Challenge**: How users find/register local MCP servers?

**Solutions**:
- Manifest-based config (`.cline-mcp.json` in project)
- Port scanning for standard MCP ports (optional)
- Cloud backend provides registry of public servers
- Manual connection string input in UI

### 5.4 Cross-Device Sync

**Challenge**: Users want conversations on multiple devices

**Solution** (Phase 2):
- Optional encrypted cloud backup
- User controls sync on/off
- Manual export/import of conversations
- Future: Device-to-device sync via cloud (all encrypted)

---

## 6. Billing & Usage Tracking

### 6.1 Model

**Approach**: 20% markup on LLM token costs + optional subscription

**Tracking**:
- Every API call tracked on backend
- Tokens (input + output) recorded
- Cost calculated: `(tokensUsed * modelPrice) * 1.2`
- Usage history stored in backend

**Billing Endpoint**:
```typescript
POST /api/usage/track
  Input: {
    authToken,
    taskId,
    model,
    tokensIn,
    tokensOut,
    apiProvider,
    timestamp
  }
  Output: {
    success,
    costCharred,
    userBalance,
    remainingQuota
  }
```

---

## 7. Deployment

### 7.1 Environment

- **Frontend**: Hosted at agent.in5.com (CDN)
- **Backend**: Replit VM (Node.js/Express)
- **Database**: PostgreSQL (for usage tracking, user accounts)
- **Secrets**: Environment variables (API keys, encryption keys)

### 7.2 Infrastructure

```
Replit VM
├── Node.js backend (Express)
├── PostgreSQL database
├── Redis (optional, for caching)
└── Logs/Monitoring
```

---

## 8. Phased Implementation

### Phase 1: MVP (Weeks 1-3)
- [ ] React SPA setup with IndexedDB
- [ ] SSO integration (Google OAuth)
- [ ] JWT authentication flow
- [ ] API key encryption (TweetNaCl.js)
- [ ] Cloud backend (auth + API proxying)
- [ ] Basic token tracking
- [ ] Manual MCP server registration

### Phase 2: UX & Features (Weeks 4-5)
- [ ] Conversation persistence
- [ ] Settings/preferences storage
- [ ] Auto-discovery of local MCP servers
- [ ] Checkpoint management
- [ ] Usage dashboard
- [ ] Export conversations

### Phase 3: Production Ready (Weeks 6-7)
- [ ] Security hardening (CSP, XSS testing)
- [ ] Performance optimization
- [ ] Monitoring & analytics
- [ ] Billing system integration
- [ ] Error handling & recovery
- [ ] Documentation

---

## 9. File Structure (Frontend)

```
webview-ui/src/
├── components/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── SSO.tsx
│   ├── chat/
│   │   ├── ChatView.tsx
│   │   └── MessageList.tsx
│   ├── settings/
│   │   ├── APIKeyManagement.tsx
│   │   └── MCPServerConfig.tsx
│   └── layout/
│       ├── Navbar.tsx
│       └── Sidebar.tsx
├── context/
│   ├── AuthContext.tsx
│   ├── StorageContext.tsx
│   └── MCPContext.tsx
├── hooks/
│   ├── useIndexedDB.ts
│   ├── useEncryption.ts
│   ├── useMCPServers.ts
│   └── useAPI.ts
├── services/
│   ├── encryption.ts
│   ├── indexedDB.ts
│   ├── mcp-discovery.ts
│   └── api-client.ts
├── utils/
│   ├── security.ts
│   ├── validation.ts
│   └── storage.ts
└── App.tsx
```

---

## 10. File Structure (Backend)

```
backend/
├── src/
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── api-proxy.ts
│   │   ├── usage.ts
│   │   └── mcp.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── rateLimit.ts
│   │   └── logging.ts
│   ├── services/
│   │   ├── jwt.ts
│   │   ├── apiProxy.ts
│   │   ├── billing.ts
│   │   └── mcp-registry.ts
│   ├── database/
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── Usage.ts
│   │   │   └── MCPServer.ts
│   │   └── migrations/
│   └── config/
│       ├── env.ts
│       └── constants.ts
└── server.ts
```

---

## 11. Next Steps

1. **Review & Approval**: Validate architecture with stakeholders
2. **Security Review**: Engage security team for threat modeling
3. **MVP Planning**: Define detailed sprint tasks for Phase 1
4. **Dev Environment Setup**: Configure development tools & CI/CD
5. **Prototyping**: Build proof-of-concepts for key components

---

## Appendix A: Technology Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| State Management | Context API + IndexedDB |
| Encryption | TweetNaCl.js (XChaCha20-Poly1305) |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Authentication | JWT + SSO (Google OAuth) |
| API | REST + WebSocket (for real-time) |
| Hosting | Replit (MVP), Future: Docker/K8s |

---

Once you toggle to Act mode, I'll create this file in the repository for you.