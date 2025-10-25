# Web Server Refactoring Suggestions

## Current State Analysis

The `web-server.ts` file is currently **1,100+ lines** and handles:
- HTTP server setup
- WebSocket server (web browser)
- SSE server (Chrome extension)
- 7 gRPC service handlers
- State broadcasting
- Request routing

## Refactoring Recommendations

### Option 1: Service Handler Extraction (Recommended)

**Split service handlers into separate files:**

```
src/standalone/
├── web-server.ts (core server setup ~200 lines)
├── services/
│   ├── state-service-handler.ts
│   ├── ui-service-handler.ts
│   ├── task-service-handler.ts
│   ├── mcp-service-handler.ts
│   ├── models-service-handler.ts
│   ├── account-service-handler.ts
│   └── file-service-handler.ts
```

**Benefits:**
- Each service handler is ~100-150 lines
- Easy to locate and modify specific service logic
- Better separation of concerns
- Each file can be tested independently

**Example structure:**

```typescript
// src/standalone/services/task-service-handler.ts
import { Controller } from "../../core/controller"

export async function handleTaskService(
    controller: Controller,
    method: string,
    requestData: any,
    broadcast: (event: string, data: any) => void
): Promise<any> {
    switch (method) {
        case "newTask":
            // Implementation
        case "cancelTask":
            // Implementation
        // ... etc
    }
}
```

**web-server.ts would then import and delegate:**

```typescript
import { handleTaskService } from "./services/task-service-handler"

private async routeGrpcRequest(...) {
    switch (service) {
        case "cline.TaskService":
            return await handleTaskService(
                this.controller,
                method,
                requestData,
                this.broadcastSSEEvent.bind(this)
            )
        // ... other services
    }
}
```

### Option 2: Transport Layer Extraction

**Separate WebSocket and SSE logic:**

```
src/standalone/
├── web-server.ts (main orchestrator)
├── transports/
│   ├── websocket-transport.ts (WebSocket logic)
│   └── sse-transport.ts (SSE logic)
```

**Benefits:**
- Cleaner separation between transport mechanisms
- Each transport can be tested independently
- Easier to add new transports (e.g., long-polling)

### Option 3: Full Modularization (Most Maintainable)

**Complete separation:**

```
src/standalone/
├── web-server.ts (main entry point ~150 lines)
├── http-server.ts (Express setup)
├── transports/
│   ├── websocket-transport.ts
│   └── sse-transport.ts
├── services/
│   ├── state-service-handler.ts
│   ├── task-service-handler.ts
│   ├── ... (other services)
├── middleware/
│   ├── cors.ts
│   ├── logging.ts
│   └── static-files.ts
└── types.ts (shared types)
```

**Benefits:**
- Maximum modularity
- Each component is single-responsibility
- Easiest to test
- Most maintainable long-term

**Downsides:**
- More files to navigate
- Slightly more complex initial setup

---

## Recommendation: Start with Option 1

**Why Option 1?**
- Minimal disruption to current architecture
- Immediate ~50% reduction in file size
- Easy to implement incrementally
- Can upgrade to Option 3 later if needed

**Implementation Order:**
1. Extract service handlers first (biggest win)
2. Keep transports in main file for now
3. Consider transport extraction later if file is still too large

---

## Additional Improvements

### 1. Type Safety

Add proper TypeScript interfaces for service handlers:

```typescript
// src/standalone/types.ts
export interface ServiceHandler {
    (
        controller: Controller,
        method: string,
        requestData: any,
        broadcast: BroadcastFunction
    ): Promise<any>
}

export type BroadcastFunction = (eventType: string, data: any) => void
```

### 2. Error Handling

Create centralized error handler:

```typescript
// src/standalone/error-handler.ts
export class ServiceError extends Error {
    constructor(
        public service: string,
        public method: string,
        message: string
    ) {
        super(`[${service}.${method}] ${message}`)
    }
}

export function handleServiceError(error: unknown): ErrorResponse {
    if (error instanceof ServiceError) {
        return { error: error.message, service: error.service }
    }
    return { error: String(error) }
}
```

### 3. Logging

Consider structured logging:

```typescript
// src/standalone/logger.ts
export const logger = {
    info: (service: string, message: string, meta?: any) => {
        console.log(`[${service}] ℹ️ ${message}`, meta || '')
    },
    error: (service: string, message: string, error?: any) => {
        console.error(`[${service}] ❌ ${message}`, error || '')
    },
    // ... etc
}
```

---

## Migration Path

### Phase 1: Extract Service Handlers (1-2 hours)
- Create `services/` directory
- Extract each service handler to its own file
- Update imports in web-server.ts
- Test thoroughly

### Phase 2: Add Type Safety (30 minutes)
- Create `types.ts` with interfaces
- Add type annotations to service handlers
- Add type annotations to transports

### Phase 3: Improve Error Handling (30 minutes)
- Create centralized error handler
- Update service handlers to use it
- Add better error messages

### Phase 4: Optional Transport Extraction (1 hour)
- Extract WebSocket logic
- Extract SSE logic
- Keep only orchestration in web-server.ts

---

## Best Practices Going Forward

1. **Keep web-server.ts < 300 lines** - It should only orchestrate, not implement
2. **One service per file** - Makes code easier to find and maintain
3. **Shared types** - Define interfaces once, use everywhere
4. **Centralized broadcasting** - Don't duplicate broadcast logic
5. **Consistent logging** - Use structured logging with emojis for visual parsing
6. **Error boundaries** - Catch errors at service level, not route level

---

## Current File Is Acceptable For Now

**Important Note:** The current 1,100-line file is **working correctly** and follows a clear structure with good comments. The refactoring suggestions above are for **future maintainability**, not urgent fixes.

**When to refactor:**
- When adding new services (makes it easier to add)
- When fixing bugs (isolated files are easier to debug)
- When onboarding new developers (smaller files are easier to understand)
- When you have time for improvements (not urgent)

The SSE additions we just made are **well-commented** and **clearly separated**, so they won't cause confusion. The current structure is fine for the short-to-medium term.
