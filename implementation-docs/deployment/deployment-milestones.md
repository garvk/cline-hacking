
# COMPLETE IMPLEMENTATION PLAN: IN5 AGENT
## Phases 1-3: Development Setup Through Production

---

## PART 1: DEVELOPMENT SETUP & REPOSITORY STRUCTURE

### Repository Structure (Monorepo)

```
in5-agent/ (Main private repo)
├── frontend/              (React SPA, deployed to agent.in5.com)
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── utils/
│   ├── public/
│   ├── vite.config.ts
│   ├── tailwind.config.mjs
│   ├── tsconfig.json
│   └── package.json
│
├── backend/               (Node.js/Express, deployed to api.in5.com)
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── models/
│   │   ├── config/
│   │   └── index.ts
│   ├── Dockerfile
│   ├── tsconfig.json
│   └── package.json
│
├── .gitignore
├── .env.example
├── docker-compose.yml
├── package.json (root)
└── README.md
```

### Initial Setup Steps (Before Any Coding)

**Step 1: Create Repository**
- Initialize new GitHub repository: `in5-agent` (private)
- Clone to local machine
- Create `frontend/` and `backend/` directories

**Step 2: Root package.json Setup**
- Add workspace configuration to root package.json
- Configure scripts for monorepo management:
  - `npm run install:all` - Install dependencies in both frontend and backend
  - `npm run dev:frontend` - Run frontend dev server
  - `npm run dev:backend` - Run backend dev server
  - `npm run dev` - Run both in parallel
  - `npm run build:frontend` - Build frontend
  - `npm run build:backend` - Build backend

**Step 3: Environment Configuration**
- Create `.env.example` at root with template variables:
  - `FRONTEND_PORT=5173`
  - `BACKEND_PORT=3000`
  - `DATABASE_URL=postgresql://...`
  - `JWT_SECRET=...`
  - `OPENAI_API_KEY_PLACEHOLDER=...`
  - `BACKEND_URL=http://localhost:3000`
  - `FRONTEND_URL=http://localhost:5173`
- Create `.env.local` from template (add to .gitignore)

**Step 4: Docker Setup**
- Create `docker-compose.yml` with services:
  - PostgreSQL database (port 5432)
  - Backend service (port 3000)
  - Frontend service (port 5173 for development)
  - Optional: Redis for caching (port 6379)
- Add `backend/Dockerfile` for containerization
- Add `.dockerignore` files

**Step 5: Git Configuration**
- Add comprehensive `.gitignore` excluding:
  - Node modules, dist, build directories
  - Environment files (.env.local)
  - IDE settings (.vscode, .idea)
  - Cline-specific files (src/extension.ts, src/core/, cli/, etc.)
- Create `.gitattributes` for consistent line endings

### Development Environment Setup

**Prerequisites Installation:**
1. Node.js v18+ (verify with `node -v`)
2. npm v9+ (verify with `npm -v`)
3. PostgreSQL 15+ (local or via Docker)
4. Docker & Docker Compose
5. Git

**Initial Project Setup (Terminal Commands):**
1. Clone repository: `git clone https://github.com/in5/in5-agent.git`
2. Navigate to directory: `cd in5-agent`
3. Install root dependencies: `npm install`
4. Install frontend dependencies: `cd frontend && npm install && cd ..`
5. Install backend dependencies: `cd backend && npm install && cd ..`
6. Create `.env.local` from `.env.example`
7. Start Docker services: `docker-compose up -d postgres redis`
8. Run database migrations: `npm run db:migrate`

**Verification Steps:**
- Frontend dev server: `npm run dev:frontend` (should open http://localhost:5173)
- Backend dev server: `npm run dev:backend` (should log "Server running on port 3000")
- Database connection: Check logs for successful PostgreSQL connection
- Browser console: No errors in frontend

---

## PART 2: PHASE 1 IMPLEMENTATION PLAN (Weeks 1-3)

### Phase 1 Goal
Deploy full UI to production with graceful backend unavailability handling. Establish local state management infrastructure and backend foundation.

### Week 1: Frontend Deployment & UI Setup

**Task 1.1: Frontend Project Structure**
- Copy Cline's webview-ui into frontend/ directory
- Add `.gitignore` to exclude non-web files:
  - `src/extension.ts`
  - `src/core/`
  - `src/hosts/`
  - `cli/`
  - `chrome-extension/`
- Update `vite.config.ts` to build as standalone SPA
- Ensure Tailwind CSS configured for styling
- Set up environment variable loading for API endpoints

**Task 1.2: Authentication UI Components**
- Create `frontend/src/components/auth/LoginPage.tsx` component
- Implement Google OAuth redirect button
- Add form for email input
- Create loading state during SSO redirect
- Style with Tailwind for responsive design

**Task 1.3: Chat Interface UI**
- Create `frontend/src/components/chat/ChatView.tsx` component
- Build message display component showing conversation history
- Create message input form with send button
- Add typing indicator for pending responses
- Implement placeholder for when no conversations exist

**Task 1.4: Settings UI**
- Create `frontend/src/components/settings/APIKeyManagement.tsx`
- Build form for API key input (OpenAI, Claude, Gemini)
- Add password protection UI (password confirmation before using keys)
- Create settings panel for model selection, temperature, etc.

**Task 1.5: Layout Components**
- Create `frontend/src/components/layout/Navbar.tsx` with user menu
- Create `frontend/src/components/layout/Sidebar.tsx` with conversation list
- Add responsive design for mobile viewing
- Implement theme toggle (light/dark mode)

**Task 1.6: Error Handling UI**
- Create error boundary component
- Add "Backend Unavailable" state display
- Create retry logic for failed requests
- Display user-friendly error messages

**Task 1.7: Build & Deploy to Production**
- Configure `vite.config.ts` for production build
- Run `npm run build:frontend` to generate dist folder
- Deploy to Vercel (recommended for simplicity):
  - Connect GitHub repository to Vercel
  - Set environment variables in Vercel dashboard
  - Point domain agent.in5.com to Vercel
  - Configure automatic deployments on push to main
- Verify deployment:
  - Navigate to agent.in5.com
  - Confirm all UI elements load
  - Confirm no console errors

**Deliverables Week 1:**
- ✓ Full UI deployed to agent.in5.com
- ✓ All components visible and functional
- ✓ No backend required (graceful degradation)
- ✓ Users can see interface without backend calls

---

### Week 2: Local State Management (IndexedDB)

**Task 2.1: IndexedDB Service Implementation**
- Create `frontend/src/services/indexedDB.ts`
- Initialize database with version control
- Define object stores with proper indexes:
  - conversations: keyPath 'id', index by 'createdAt'
  - apiKeys: keyPath 'id', index by 'provider'
  - userSettings: keyPath 'id'
  - mcp_registry: keyPath 'id', indexes by 'type' and 'local'
  - taskHistory: keyPath 'id', index by 'completedAt'
  - checkpoints: keyPath 'id', index by 'taskId'
- Implement methods:
  - `initDB()` - Initialize database connection
  - `saveConversation()` - Store conversation to IndexedDB
  - `getAllConversations()` - Retrieve all conversations
  - `deleteConversation()` - Remove conversation
  - `clearAllData()` - Wipe all local data (for logout)

**Task 2.2: Encryption Service**
- Create `frontend/src/services/encryption.ts`
- Implement TweetNaCl.js integration:
  - Install `tweetnacl` and `tweetnacl-util` packages
  - Create `deriveKeyFromPassword()` using Argon2id (or libsodium alternative)
  - Implement `encryptAPIKey()` using XChaCha20-Poly1305
  - Implement `decryptAPIKey()` for key retrieval
  - Add `generateNonce()` for unique encryption parameters
- Error handling for decryption failures
- Validate encryption algorithm strength

**Task 2.3: React Context for Storage**
- Create `frontend/src/context/StorageContext.tsx`
- Implement context provider with state:
  - `conversations: Conversation[]`
  - `apiKeys: Record<string, EncryptedAPIKey>`
  - `userSettings: UserSettings`
  - `loading: boolean`
- Implement context methods:
  - `saveConversation()` - Save to IndexedDB
  - `loadConversations()` - Fetch from IndexedDB on app load
  - `saveAPIKey()` - Encrypt and store API key
  - `getDecryptedAPIKey()` - Decrypt key (requires password confirmation)
  - `updateSettings()` - Save user preferences
- Add localStorage persistence for settings

**Task 2.4: Type Definitions**
- Create `frontend/src/types/index.ts` with interfaces:
  - `Conversation { id, title, messages, createdAt, updatedAt }`
  - `Message { id, role, content, timestamp }`
  - `APIKey { id, provider, encryptedKey, algorithm }`
  - `UserSettings { theme, defaultModel, temperature }`
  - `EncryptedData { ciphertext, nonce, algorithm }`

**Task 2.5: Local Authentication Simulation**
- Create `frontend/src/context/AuthContext.tsx`
- Implement mock JWT handling for local testing:
  - Store token in sessionStorage
  - Create mock `useAuth()` hook
  - Implement logout with data cleanup
- Add redirect to login when token missing

**Task 2.6: Integration Testing**
- Test IndexedDB operations in browser DevTools
- Verify encryption/decryption cycle works
- Test context provider integration with components
- Verify localStorage persistence
- Test logout clears sensitive data

**Task 2.7: Update UI Components**
- Integrate StorageContext into ChatView
- Add "Save Conversation" functionality
- Display conversation list from IndexedDB
- Show API key management interface
- Update settings to persist to storage

**Deliverables Week 2:**
- ✓ IndexedDB fully functional
- ✓ API key encryption/decryption working
- ✓ Conversations persist locally
- ✓ Settings saved to storage
- ✓ Local auth flow operational
- ✓ All data cleared on logout

---

### Week 3: Backend Foundation & Integration

**Task 3.1: Backend Project Setup**
- Initialize Node.js project in backend/ directory
- Install core dependencies:
  - express (web framework)
  - typescript, ts-node (development)
  - jsonwebtoken (JWT handling)
  - cors (cross-origin support)
  - dotenv (environment config)
  - pg (PostgreSQL driver)
  - helmet (security headers)
  - pino (logging)
  - axios (HTTP client for LLM APIs)
- Configure TypeScript: `tsconfig.json`
- Set up npm scripts:
  - `dev` - Run with ts-node
  - `build` - Compile TypeScript
  - `start` - Run compiled JS

**Task 3.2: Database Schema**
- Create PostgreSQL schema with migrations:
  - `users` table: id, email, sso_provider, created_at
  - `user_balance` table: user_id, balance, total_spent
  - `usage_logs` table: user_id, model, tokens_in, tokens_out, cost, created_at
  - `auth_tokens` table: user_id, refresh_token, expires_at
  - `mcp_registry` table: name, type, endpoint, requires_auth
- Create migration files in `backend/migrations/` directory
- Set up migration runner (e.g., node-pg-migrate)
- Run migrations: `npm run db:migrate`

**Task 3.3: Environment Configuration**
- Create `backend/src/config/env.ts`
- Define configuration variables:
  - Database connection string
  - JWT secret and expiration times
  - CORS origins
  - OAuth credentials (Google)
  - LLM API endpoints
  - Port number
  - Node environment (dev/prod)
- Validate required variables on startup

**Task 3.4: Authentication Routes**
- Create `backend/src/routes/auth.ts`
- Implement endpoints:
  - `POST /auth/login` - Accept email + SSO provider, generate tokens
  - `POST /auth/refresh` - Accept refresh token, issue new access token
  - `POST /auth/logout` - Invalidate refresh token
  - `GET /auth/user` - Get current user info (requires JWT)
- Add OAuth callback handler for Google
- Generate JWT tokens (access: 1hr, refresh: 7 days)
- Store refresh tokens in database

**Task 3.5: Authentication Middleware**
- Create `backend/src/middleware/auth.ts`
- Implement JWT verification middleware:
  - Check Authorization header for Bearer token
  - Verify JWT signature
  - Attach user info to request object
  - Return 401 if invalid/missing
- Add token refresh logic if expired

**Task 3.6: Basic API Proxy Route**
- Create `backend/src/routes/api.ts`
- Implement `POST /api/chat-completion` endpoint:
  - Verify JWT token
  - Validate request body (model, messages, apiKey)
  - Accept user's API key in request (do NOT store)
  - Route to appropriate LLM provider based on model name
  - Return response with token count and cost
  - Log response to PostgreSQL usage_logs table
  - Handle errors gracefully

**Task 3.7: LLM API Service**
- Create `backend/src/services/apiProxy.ts`
- Implement provider-specific handlers:
  - OpenAI (GPT-3.5, GPT-4, etc.)
  - Anthropic (Claude models)
  - Google (Gemini)
- Each handler should:
  - Accept user's API key and request parameters
  - Call corresponding LLM API
  - Parse response and extract token counts
  - Never store user's API key
  - Return standardized response format

**Task 3.8: Error Handling Middleware**
- Create `backend/src/middleware/errorHandler.ts`
- Implement centralized error handling:
  - Catch all errors and return JSON responses
  - Log errors with context
  - Return appropriate HTTP status codes
  - Never expose sensitive information in errors

**Task 3.9: Health Check Endpoint**
- Create `backend/src/routes/health.ts`
- Implement `GET /health` endpoint:
  - Return status and uptime
  - Check database connectivity
  - Return 200 if healthy, 503 if not

**Task 3.10: Main Server File**
- Create `backend/src/index.ts` (main entry point)
- Initialize Express application
- Load environment configuration
- Connect to PostgreSQL database
- Register middleware in order:
  - CORS configuration
  - Body parser (JSON)
  - Helmet for security headers
  - Request logging
  - Authentication middleware
  - Error handler
- Register route handlers
- Start server on configured port

**Task 3.11: Docker Configuration**
- Create `backend/Dockerfile`:
  - Use Node.js 18 alpine base image
  - Set working directory
  - Copy package files
  - Install dependencies
  - Copy source code
  - Build TypeScript
  - Expose port 3000
  - Define start command
- Create `.dockerignore` to exclude unnecessary files

**Task 3.12: Backend Deployment to Replit**
- Create Replit account and new project
- Connect GitHub repository to Replit
- Configure `.replit` file to run backend
- Set up environment variables in Replit dashboard
- Add run script to start backend
- Verify backend accessible at Replit URL

**Task 3.13: Frontend Integration**
- Update `frontend/.env.local`:
  - Set `VITE_BACKEND_URL=` to Replit backend URL
- Create `frontend/src/services/api-client.ts`:
  - Implement `loginWithSSO()` function
  - Implement `refreshToken()` function
  - Implement `chatCompletion()` function
- Update AuthContext to use real backend endpoints
- Add API request error handling
- Test login flow end-to-end

**Task 3.14: End-to-End Testing**
- Test login flow:
  - User clicks login button
  - Redirected to backend OAuth flow
  - Returns auth tokens
  - Tokens stored in sessionStorage
- Test API proxy:
  - User inputs API key
  - Sends chat message
  - Backend receives request with JWT
  - Backend proxies to OpenAI (test with mock response first)
  - Frontend displays response
- Test error handling:
  - Invalid JWT rejected
  - Missing API key handled
  - LLM API errors displayed gracefully

**Deliverables Week 3:**
- ✓ Backend deployed to Replit
- ✓ Authentication endpoints working
- ✓ JWT tokens generated and verified
- ✓ API proxy endpoint functional (test with mock)
- ✓ Database schema created
- ✓ End-to-end login working
- ✓ Frontend and backend integrated

---

## PART 3: PHASE 2 IMPLEMENTATION PLAN (Weeks 4-6)

### Phase 2 Goal
Full end-to-end working system with real LLM calls, file operations, and MCP server support.

### Week 4: Live LLM Integration & Billing

**Task 4.1: Real LLM API Integration**
- Update backend LLM service handlers to call real APIs
- Test with sample requests to ensure token counting works
- Implement response streaming (optional for MVP):
  - Set up streaming endpoint for real-time responses
  - Implement frontend WebSocket connection
  - Display streamed tokens as they arrive
- Add retry logic for failed API calls with exponential backoff
- Implement API key validation before sending requests

**Task 4.2: Token Counting & Cost Calculation**
- Create `backend/src/services/billing.ts`
- Implement token counting for each LLM provider:
  - Store token pricing per model in configuration
  - Calculate input tokens used
  - Calculate output tokens used
  - Apply 20% markup for platform fee
- Create `calculateCost()` function accepting model, input tokens, output tokens
- Store calculation in response for frontend display

**Task 4.3: Usage Tracking**
- Create `POST /api/usage/track` endpoint
- Accept usage data from frontend:
  - model, tokensIn, tokensOut, timestamp
- Insert into `usage_logs` table
- Update user balance in `user_balance` table:
  - Deduct cost from balance
  - Add to total_spent
- Return updated balance to frontend

**Task 4.4: User Dashboard Endpoint**
- Create `GET /api/user/dashboard` endpoint
- Return user statistics:
  - Current balance
  - Total spent this month
  - Most used model
  - Total conversations
  - Usage breakdown by model

**Task 4.5: Frontend Dashboard Component**
- Create `frontend/src/components/dashboard/UsageDashboard.tsx`
- Display statistics from backend
- Show remaining balance prominently
- Display usage graph (month-to-date)
- List recent conversations with costs

**Task 4.6: Conversation Management UI**
- Add ability to name conversations
- Create delete conversation functionality
- Add export conversation as JSON
- Implement conversation search
- Show timestamp and total cost per conversation

**Task 4.7: Real-Time Cost Display**
- Update ChatView to show cost while typing
- Display estimated cost for current message
- Show running total for conversation
- Update balance live after each response

**Task 4.8: Billing Portal Endpoint**
- Create `GET /api/user/billing-history` endpoint
- Return paginated usage logs with filters:
  - Date range filter
  - Model filter
  - Sort by cost/date
- Implement pagination (20 items per page)

**Deliverables Week 4:**
- ✓ Real LLM API calls working
- ✓ Token counting accurate
- ✓ Cost calculation correct with 20% markup
- ✓ Usage tracked in database
- ✓ User balance updated
- ✓ Dashboard displaying statistics
- ✓ First paying users able to use system

---

### Week 5: File Operations & Terminal Output

**Task 5.1: FileSystem API Integration**
- Update frontend to request file system access on login
- Implement file dialog for project selection
- Create file browser component showing directory structure
- Implement file read functionality
- Implement file write functionality
- Add file permissions UI (show what access is granted)

**Task 5.2: File Operation Tracking**
- Create `frontend/src/services/filesystem.ts` service
- Implement methods:
  - `openProject()` - Open directory picker
  - `readFile()` - Read file contents
  - `writeFile()` - Write file contents
  - `listDirectory()` - List files in directory
  - `deleteFile()` - Delete file (optional)
- Add error handling for file access denied

**Task 5.3: Terminal Output Component**
- Create `frontend/src/components/terminal/TerminalOutput.tsx`
- Display terminal output in scrollable container
- Auto-scroll to latest output
- Add line numbers
- Implement syntax highlighting for common formats
- Show running/completed status

**Task 5.4: Terminal Service**
- Create `frontend/src/services/terminal.ts`
- Implement local terminal simulation (no actual execution yet):
  - Track command history
  - Store output locally
  - Display in TerminalOutput component

**Task 5.5: File Operation UI Integration**
- Add file browser panel to ChatView
- Show current project directory
- Allow clicking files to view/edit
- Integrate with chat (mention files in messages)

**Task 5.6: Chat Message Formatting**
- Update message display to handle:
  - File references (clickable)
  - Code blocks with syntax highlighting
  - Terminal output blocks
  - Structured data (JSON, tables)

**Task 5.7: File Change Tracking (Basic)**
- Create manifest of files touched during task
- Store file hashes to detect changes
- Display file change summary after chat

**Deliverables Week 5:**
- ✓ File operations working locally
- ✓ Terminal output displayed
- ✓ File browser integrated into UI
- ✓ Users can work on real projects
- ✓ File operations tracked for billing

---

### Week 6: MCP Server Integration

**Task 6.1: MCP Discovery Service**
- Create `frontend/src/services/mcp-discovery.ts`
- Implement local MCP server discovery:
  - Look for `.cline-mcp.json` in project root
  - Parse configuration
  - Return list of local MCP servers
- Add error handling for missing/invalid config

**Task 6.2: Cloud MCP Registry Endpoint**
- Create `GET /api/mcp-registry` endpoint on backend
- Return list of available cloud-hosted MCP servers
- Include metadata: name, type, docs link, auth requirements

**Task 6.3: MCP Tool Call Endpoint**
- Create `POST /api/mcp/call` endpoint on backend
- Accept: serverId, toolName, params
- Route to appropriate MCP server
- Handle authentication if required
- Return tool result

**Task 6.4: Frontend MCP Integration**
- Create `frontend/src/services/mcp-client.ts`
- Implement `callMCPTool()` function
- Call backend MCP endpoint with tool request
- Handle responses and errors

**Task 6.5: MCP Configuration UI**
- Create `frontend/src/components/settings/MCPServerConfig.tsx`
- Allow users to add local MCP servers
- Show available cloud MCP servers from registry
- Enable/disable MCP servers
- Display MCP server status

**Task 6.6: MCP Tool Discovery**
- Implement tool discovery from registered MCP servers
- Cache tool list for performance
- Display available tools in chat interface
- Allow auto-completion for MCP tool calls

**Task 6.7: MCP Results in Chat**
- Update ChatView to display MCP tool results
- Format results for readability
- Show tool name and parameters used
- Display execution time

**Task 6.8: Integration Testing**
- Test local MCP server connection
- Test cloud MCP server discovery
- Test tool invocation end-to-end
- Verify error handling

**Deliverables Week 6:**
- ✓ Local MCP server discovery working
- ✓ Cloud MCP registry integrated
- ✓ MCP tool calls functional
- ✓ Results displayed in chat
- ✓ Full end-to-end workflow complete
- ✓ Ready for public beta

---

## PART 4: PHASE 3 IMPLEMENTATION PLAN (Weeks 7-9)

### Phase 3 Goal
Production-grade deployment with security hardening, performance optimization, and advanced features.

### Week 7: Security Hardening

**Task 7.1: Content Security Policy**
- Implement CSP headers in backend
- Restrict script sources (no inline scripts)
- Restrict style sources (allow trusted CDNs)
- Restrict image sources (allow self, data, HTTPS)
- Restrict connection sources (backend, LLM APIs)
- Test CSP with browser DevTools

**Task 7.2: XSS Prevention**
- Implement input sanitization for all user inputs
- Use DOMPurify for HTML content
- Sanitize API responses before display
- Implement Content Security Policy for additional protection

**Task 7.3: API Key Security Verification**
- Audit encryption/decryption implementation
- Verify TweetNaCl.js usage correct
- Test key derivation strength (Argon2id parameters)
- Verify keys never logged or exposed in errors
- Test decryption confirmation requirement

**Task 7.4: CSRF Protection**
- Implement CSRF token generation
- Validate CSRF tokens on state-changing requests
- Add SameSite cookies configuration
- Test CSRF protection manually

**Task 7.5: Rate Limiting**
- Implement per-user rate limiting on backend
- Set limits:
  - Login attempts: 5 per 15 minutes
  - API calls: 100 per minute
  - File operations: 50 per minute
- Return 429 Too Many Requests when exceeded
- Store rate limit metrics in Redis (if available)

**Task 7.6: Audit Logging**
- Create comprehensive logging of all security events:
  - Login attempts (success/failure)
  - API key operations
  - File operations
  - MCP tool calls
  - Failed authentication
- Store logs in database with retention policy
- Implement log rotation

**Task 7.7: Secrets Management**
- Store all secrets in environment variables
- Implement secret rotation for JWT secret
- Add secrets validation on startup
- Ensure never logging secrets

**Task 7.8: Security Headers**
- Implement all security headers via Helmet:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection
  - Strict-Transport-Security (HSTS)
  - Referrer-Policy: no-referrer

**Deliverables Week 7:**
- ✓ CSP headers configured and tested
- ✓ XSS prevention implemented
- ✓ CSRF protection active
- ✓ Rate limiting enforced
- ✓ Audit logs comprehensive
- ✓ Security audit passed

---

### Week 8: Performance & Monitoring

**Task 8.1: Frontend Performance Optimization**
- Implement code splitting for components
- Lazy load non-critical routes
- Optimize IndexedDB queries with indexes
- Implement request deduplication
- Cache API responses appropriately
- Use React.memo for expensive components
- Run Lighthouse audit: target 90+ score

**Task 8.2: Backend Performance Optimization**
- Add database query indexes on frequently used columns
- Implement connection pooling for database
- Add caching layer (Redis) for frequently accessed data:
  - MCP registry cache (30 min TTL)
  - User balance cache (5 min TTL)
  - Token pricing cache (1 hour TTL)
- Optimize database queries:
  - Avoid N+1 queries
  - Use query result pagination
  - Archive old usage logs

**Task 8.3: Response Time Targets**
- Frontend: Page load < 2 seconds
- API calls: Response < 200ms (excluding LLM API time)
- Database queries: < 100ms
- Profile and optimize slow endpoints

**Task 8.4: Monitoring Setup**
- Implement application performance monitoring:
  - Track API response times by endpoint
  - Monitor error rates
  - Track user activity metrics
  - Database connection pool status
- Set up alerting for:
  - High error rates (> 1% errors)
  - High latency (API response > 1 second)
  - Database issues
  - Out of memory conditions

**Task 8.5: Logging Infrastructure**
- Implement structured logging with Pino
- Log all requests with:
  - Request ID (for tracing)
  - Method, path, status code
  - Response time
  - User ID (if authenticated)
- Send logs to file and console in development
- Send logs to centralized service in production (optional: Cloud Logging)

**Task 8.6: Database Maintenance**
- Create database backup strategy:
  - Daily backups to cloud storage (AWS S3)
  - Point-in-time recovery capability
- Implement database maintenance tasks:
  - Vacuum and analyze (PostgreSQL maintenance)
  - Archive old data
  - Update statistics

**Task 8.7: Frontend Error Tracking**
- Implement error boundary globally
- Send frontend errors to backend for logging
- Track JavaScript errors, performance issues
- Create error dashboard for monitoring

**Task 8.8: Load Testing**
- Create load testing scenario with k6 or Apache JMeter:
  - Simulate 100 concurrent users
  - Run for 10 minutes
  - Monitor response times and errors
- Target: No errors, response times < 500ms under load

**Deliverables Week 8:**
- ✓ Frontend Lighthouse score 90+
- ✓ API response times < 200ms
- ✓ Monitoring and alerting active
- ✓ Database optimized
- ✓ Load test passing
- ✓ Scalable to 1000+ concurrent users


---

### Week 9: Advanced Features & Multi-Device Sync

**Task 9.1: Device Registration**

- Create device identification system
- Generate unique device ID on first visit
- Store in browser localStorage
- Create `device_registry` table:


**Task 9.2: Sync Backup Infrastructure**
- Create `POST /api/sync/backup` endpoint on backend
- Accept encrypted backup blob from frontend
- Store in `sync_backups` table with:
  - user_id, device_id, encrypted_data, data_hash, sync_timestamp, sync_version
- Implement versioning to support rollback
- Store encrypted data only (server cannot decrypt)
- Return success/failure response

**Task 9.3: Sync Download Endpoint**
- Create `GET /api/sync/backup` endpoint
- Accept optional `deviceId` parameter
- Return latest encrypted backup for user
- Support device-specific backup download
- Add Last-Modified header for caching

**Task 9.4: Frontend Sync Service**
- Create `frontend/src/services/sync.ts`
- Implement sync key derivation from user password using Argon2id
- Create `initializeSync()` function requiring password confirmation
- Implement `createSyncBackup()`:
  - Read all IndexedDB data
  - Serialize to JSON
  - Encrypt with sync key using AES-256-GCM
  - Generate SHA-256 hash for integrity
  - Return encrypted blob
- Implement `uploadSyncBackup()`:
  - Call POST /api/sync/backup endpoint
  - Store backup on server (encrypted)
  - Handle upload failures gracefully
- Implement `downloadSyncBackup()`:
  - Call GET /api/sync/backup endpoint
  - Decrypt with sync key
  - Merge with local data using Last-Write-Wins strategy
  - Update IndexedDB with merged data

**Task 9.5: Sync Daemon**
- Implement automatic sync every 5 minutes when app is open
- Pause sync if user offline (no internet)
- Resume sync when connection restored
- Show sync status indicator in UI
- Allow manual sync via button in settings

**Task 9.6: Conflict Resolution**
- Implement Last-Write-Wins (LWW) strategy:
  - Track `updatedAt` timestamp on all records
  - When merging, keep record with latest timestamp
  - Preserve both versions in conflict log if needed
- Handle special cases:
  - Conversation deletion: Mark deleted but keep record
  - Settings: Merge recursively (prefer local for user-specific settings)
  - API keys: Never merge across devices (too sensitive)

**Task 9.7: Device Management UI**
- Create `frontend/src/components/settings/DeviceManagement.tsx`
- Display list of registered devices:
  - Device name, type, last sync time
  - Current device marked as "this device"
- Allow renaming devices
- Allow removing old devices
- Show sync status for each device

**Task 9.8: Sync Status UI**
- Add sync indicator to navbar:
  - Green: synced
  - Yellow: syncing
  - Gray: sync disabled
  - Red: sync error
- Show last sync timestamp
- Display sync conflicts if any
- Allow retry on error

**Task 9.9: User Preferences for Sync**
- Add settings option to enable/disable sync
- Allow users to delete all backups
- Option to export full backup as file
- Option to import backup from file
- Clear explanation of what data syncs

**Task 9.10: Database Migrations for Sync**
- Create migration for sync tables:
  - sync_backups
  - sync_deltas
  - device_registry
- Add foreign key constraints
- Add indexes on user_id, device_id, created_at
- Create trigger to clean old backups (keep last 30 days)

**Task 9.11: Testing Multi-Device Sync**
- Test scenario 1: Single device backup/restore
  - User creates conversation
  - Uploads backup
  - Clears browser storage
  - Downloads backup
  - Verifies conversation restored
- Test scenario 2: Two devices
  - Device A creates conversation
  - Device A syncs
  - Device B downloads sync
  - Device B has conversation
- Test scenario 3: Conflicts
  - Device A and B edit same conversation
  - Both sync
  - Last-Write-Wins applied
  - Verify consistent state
- Test scenario 4: Network failures
  - Interrupt upload midway
  - Verify retry works
  - Verify data integrity

**Deliverables Week 9:**
- ✓ Multi-device sync architecture complete
- ✓ Encryption end-to-end verified
- ✓ Device registration working
- ✓ Automatic sync every 5 minutes
- ✓ Conflict resolution implemented
- ✓ Device management UI operational
- ✓ All sync scenarios tested
- ✓ Production-ready system ready for scale

---

## PART 5: POST-PHASE 3 ROADMAP & OPERATIONS

### Beyond Week 9: Ongoing Operations

**Month 2: Scale & Reliability**

**Scaling Infrastructure:**
- Monitor Replit backend load
- If needed, migrate to Kubernetes (GKE/EKS)
- Implement auto-scaling for API servers
- Set up load balancing
- Implement database read replicas for scaling

**High Availability:**
- Set up database failover (hot standby)
- Implement redundant backend servers
- Configure health checks and auto-recovery
- Set up status page for uptime monitoring

**Disaster Recovery:**
- Implement automated daily backups to cloud storage
- Test recovery procedures monthly
- Maintain recovery time objective (RTO) of 1 hour
- Maintain recovery point objective (RPO) of 1 hour

**Month 3: Advanced Features**

**Conversation Sharing:**
- Add ability to share conversations with read-only link
- Implement password protection for shared links
- Create expiring links (7-day default)
- Show usage analytics for shared conversations

**Team Collaboration (Optional):**
- Add workspace/team concept
- Implement user invitations
- Add role-based access control (Admin, Member, Viewer)
- Shared conversation threads

**Advanced Billing:**
- Implement subscription tiers (Free, Pro, Enterprise)
- Add monthly billing cycle
- Create invoice generation and email
- Implement payment integration (Stripe)
- Add promotional codes/coupons

**Month 4: Analytics & Insights**

**Usage Analytics:**
- Track most popular models
- Track average conversation length
- Track user retention/churn
- Create dashboards for business metrics

**User Insights:**
- Identify inactive users
- Calculate customer lifetime value
- Segment users by behavior
- Create targeted campaigns

**Performance Analytics:**
- Track API response times over time
- Monitor error rate trends
- Identify slow endpoints
- Create performance report

**Month 5: Community & SDKs**

**Public SDK (in5-agent-sdk repository):**
- Create TypeScript SDK for backend integration
- Document API endpoints
- Create code examples
- Set up NPM package publishing

**Community Features:**
- User-created MCP servers registry
- Share prompts/templates with community
- Comment on shared conversations
- User reputation system

**Documentation:**
- API documentation with OpenAPI/Swagger
- User guide and tutorials
- Admin guide for server management
- Security best practices guide

**Ongoing Quarterly Tasks:**

**Maintenance:**
- Monthly security patches
- Quarterly dependency updates
- Review and optimize database queries
- Update documentation
- Cleanup old logs and archived data

**Compliance:**
- GDPR compliance verification
- Data retention policy enforcement
- Security audit (annual)
- Penetration testing (annual)

**User Support:**
- Community forum setup
- Help documentation
- Email support channel
- Bug tracking and triage

---

## COMPLETE PROJECT TIMELINE SUMMARY

```
Week 1  │ Frontend Deploy          │ ▓▓▓▓▓
Week 2  │ Local State Management   │ ▓▓▓▓▓
Week 3  │ Backend Foundation       │ ▓▓▓▓▓
        ├─ PHASE 1 COMPLETE ────────────────────────
Week 4  │ Live LLM Integration     │ ▓▓▓▓▓
Week 5  │ File Operations          │ ▓▓▓▓▓
Week 6  │ MCP Integration          │ ▓▓▓▓▓
        ├─ PHASE 2 COMPLETE ────────────────────────
Week 7  │ Security Hardening       │ ▓▓▓▓▓
Week 8  │ Performance Monitoring   │ ▓▓▓▓▓
Week 9  │ Multi-Device Sync        │ ▓▓▓▓▓
        ├─ PHASE 3 COMPLETE ────────────────────────
Month 2 │ Scale & Reliability      │ ▓▓▓
Month 3 │ Advanced Features        │ ▓▓▓
Month 4 │ Analytics & Insights     │ ▓▓▓
Month 5 │ Community & SDKs         │ ▓▓▓

Total MVP to Production: 9 weeks
Full feature roadmap: 5 months
```

---

## CRITICAL SUCCESS FACTORS

**Week 1 Deployment:**
- Must launch UI to production on schedule
- No backend required (graceful degradation)
- All UI components functional and styled
- Performance: < 3 second page load

**Phase 1 Integration (Week 3):**
- Backend and frontend must connect without issues
- JWT tokens must work end-to-end
- First user must complete login → chat flow successfully
- No data loss during integration

**Phase 2 Launch (Week 6):**
- Real LLM API working without errors
- File operations must not corrupt user files
- MCP tools must execute correctly
- Ready for limited beta users (5-10 people)

**Phase 3 Hardening (Week 9):**
- Security audit must pass
- Load test must handle 1000+ concurrent users
- Multi-device sync must be reliable
- Production-grade uptime (99.9%)

---

## DEPLOYMENT CHECKLIST

**Before Phase 1 Launch (Week 1):**
- [ ] Domain agent.in5.com registered and pointing to frontend
- [ ] Frontend built and deployed to Vercel
- [ ] Vercel environment variables configured
- [ ] UI tested in multiple browsers
- [ ] Mobile responsiveness verified
- [ ] SSL certificate installed (automatic with Vercel)
- [ ] Analytics tracking implemented (optional)

**Before Phase 1 Backend (Week 3):**
- [ ] Replit backend deployed
- [ ] PostgreSQL database created
- [ ] Database migrations run
- [ ] Backend environment variables configured
- [ ] OAuth Google app created and configured
- [ ] CORS origins configured correctly
- [ ] API endpoints tested with Postman/Thunder Client
- [ ] JWT token generation tested

**Before Phase 2 Public Beta (Week 6):**
- [ ] LLM API keys for testing
- [ ] Rate limiting active
- [ ] Error logging configured
- [ ] Monitoring and alerting set up
- [ ] Backup system tested
- [ ] Log rotation configured
- [ ] Database indexes created
- [ ] Performance baseline established

**Before Phase 3 Production (Week 9):**
- [ ] Security audit completed
- [ ] Penetration testing completed
- [ ] Load test passed
- [ ] Disaster recovery tested
- [ ] Encryption verified by security expert
- [ ] Documentation complete
- [ ] Status page deployed
- [ ] Support email configured

---

## TEAM & RESOURCE REQUIREMENTS

**Recommended Team:**
- 1 Fullstack Engineer (can do both frontend and backend)
- 1 DevOps/Infrastructure Engineer (handles deployment, databases, monitoring)
- 1 Product Manager (collects requirements, prioritizes features)

**Alternatively, One Person Can Do It:**
- Focus on Phase 1 (3 weeks) to get something live
- Outsource infrastructure setup to freelancer if needed
- Gradually add complexity in Phase 2 and 3

**Estimated Time Allocation:**
- Development: 70% (coding features)
- Testing: 15% (QA, load testing, security testing)
- Deployment/Ops: 10% (DevOps, monitoring, backups)
- Documentation: 5% (README, API docs, user guide)

---

## RISK MITIGATION

**Risk: Frontend deployment takes longer than expected**
- Mitigation: Pre-test Vercel deployment process in advance
- Fallback: Use GitHub Pages if Vercel has issues

**Risk: Backend doesn't connect properly**
- Mitigation: Use environment-based endpoints, easy to switch
- Fallback: Can debug locally before production deploy

**Risk: LLM API calls fail at scale**
- Mitigation: Implement retry logic with exponential backoff
- Fallback: Rate limit API calls to prevent cascade failures

**Risk: Database goes down**
- Mitigation: Daily automated backups, tested recovery
- Fallback: Have backup database ready for failover

**Risk: Security vulnerability discovered**
- Mitigation: Monthly security audits, automated dependency updates
- Fallback: Immediate patch and deploy, notify users

---

## SUCCESS METRICS

**Phase 1 Success:**
- UI deployed and accessible
- 0 errors in frontend console
- Page load time < 3 seconds
- Mobile responsive on 80%+ devices

**Phase 2 Success:**
- 50+ users onboarded
- First 10 conversations completed
- Average response time < 200ms
- 99% uptime

**Phase 3 Success:**
- 500+ users
- $5,000+ MRR (monthly recurring revenue)
- 99.9% uptime
- Zero security incidents

**Long-term Success:**
- 10,000+ users in 12 months
- $50,000+ MRR
- Profitable operations
- Strong community

---

## FINAL RECOMMENDATIONS

**Repository Strategy (CONFIRMED - Single Repo):**
- Keep frontend and backend in single monorepo: `in5-agent`
- Deploy frontend to Vercel (agent.in5.com)
- Deploy backend to Replit (api.in5.com or similar)
- Separate public SDK later if needed (in5-agent-sdk)
- Benefits:
  - Easier to manage versions
  - Simpler local development
  - Coordinated deployments
  - Shared TypeScript types

**Technology Stack Confirmation:**
- Frontend: React 18, TypeScript, Vite, TailwindCSS
- Backend: Node.js, Express.js, TypeScript
- Database: PostgreSQL 15
- Frontend Hosting: Vercel
- Backend Hosting: Replit (MVP), migrate to Docker/K8s later
- Encryption: TweetNaCl.js (XChaCha20-Poly1305)
- Auth: Google OAuth via backend

**Development Workflow:**
- Main branch represents production
- Dev branch for active development
- Feature branches for individual tasks
- PR reviews before merging to main
- Automated tests on PR
- Auto-deploy main to production

**Next Steps After Approval:**
1. Create GitHub repository `in5-agent` (private)
2. Set up monorepo structure
3. Configure environment files
4. Set up Docker Compose for local development
5. Begin Week 1 frontend work
6. Deploy skeleton to Vercel
7. Prepare for Week 2 state management

---
