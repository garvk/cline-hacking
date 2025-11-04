# Phase 1: Core Foundation - **6-8 weeks**

[← Back to Overview](./web-milestone2-plan-overview.md)

## Goal

Deploy a working web application with MCP server integration and multi-tab browser control capabilities.

## Timeline

**Duration:** 6-8 weeks
- **Weeks 1-3:** MCP Server Integration
- **Weeks 4-7:** Multi-Tab Browser Control  
- **Week 8:** Web App Deployment

## Features Included

| Priority | Feature | Timeline | Status |
|----------|---------|----------|--------|
| **1** | MCP Server Integration | 2-3 weeks | 🟡 Partial |
| **2** | Multi-Tab Browser Control | 3-4 weeks | 🔴 Not Started |
| **3** | Web App Deployment | 1 week | 🟢 Ready |

---

## Feature 1.1: MCP Server Integration (Priority 1)

### Overview

**Timeline:** 2-3 weeks (Weeks 1-3)
**Status:** 🟡 Partial implementation exists

The Model Context Protocol (MCP) allows Cline to connect to external servers that provide additional tools and resources. This is the foundation for extensibility.

### Current State

✅ **Existing:**
- `McpHub` class in `src/services/mcp/McpHub.ts`
- Basic MCP routing in `web-server.ts`
- MCP server discovery

⚠️ **Missing:**
- Full server lifecycle management
- Complete tool execution pipeline
- Resource access implementation
- Frontend UI components
- Error recovery mechanisms

### Implementation Tasks

#### 1.1.1 Backend MCP Service Handler (Week 1)

**File:** `src/standalone/web-server.ts`

```typescript
private async handleMcpService(method: string, requestData: any, isStreaming: boolean) {
  switch (method) {
    case "subscribeToMcpServers":
      // Stream server status updates in real-time
      return this.mcpHub.getAllServersWithStatus();
      
    case "connectMcpServer":
      // Start MCP server process (stdio or SSE)
      await this.mcpHub.connectServer(requestData.serverConfig);
      return { success: true, serverId: requestData.serverConfig.name };
      
    case "disconnectMcpServer":
      // Gracefully shut down MCP server
      await this.mcpHub.disconnectServer(requestData.serverName);
      return { success: true };
      
    case "restartMcpServer":
      // Disconnect and reconnect
      await this.mcpHub.disconnectServer(requestData.serverName);
      await this.mcpHub.connectServer(requestData.serverConfig);
      return { success: true };
      
    case "callMcpTool":
      // Execute tool and return result
      const result = await this.mcpHub.callTool(
        requestData.serverName,
        requestData.toolName,
        requestData.arguments
      );
      return { result };
      
    case "accessMcpResource":
      // Access resource (file, API data, etc.)
      const resource = await this.mcpHub.getResource(
        requestData.serverName,
        requestData.resourceUri
      );
      return { resource };
      
    case "listMcpTools":
      // List all tools provided by a server
      const tools = await this.mcpHub.listTools(requestData.serverName);
      return { tools };
      
    case "listMcpResources":
      // List all resources provided by a server
      const resources = await this.mcpHub.listResources(requestData.serverName);
      return { resources };
      
    case "updateMcpServerConfig":
      // Update server configuration
      await this.mcpHub.updateServerConfig(
        requestData.serverName,
        requestData.config
      );
      return { success: true };
  }
}
```

**Testing:**
```bash
# Test MCP server connection
npm run test src/standalone/services/__tests__/mcp.test.ts

# Test with real MCP servers
npm run test:integration -- --mcp
```

#### 1.1.2 Frontend MCP Components (Week 2)

**Component 1: MCP Server List**

**File:** `webview-ui/src/components/mcp/MCPServerList.tsx`

```typescript
import { useState, useEffect } from 'react';
import { McpServiceClient } from '../../services/grpc';

interface McpServer {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  toolCount: number;
  resourceCount: number;
  lastError?: string;
}

export function MCPServerList() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to server updates
    const subscription = McpServiceClient.subscribeToMcpServers({})
      .subscribe({
        next: (response) => {
          setServers(response.servers);
          setLoading(false);
        },
        error: (err) => console.error('MCP subscription error:', err)
      });

    return () => subscription.cancel();
  }, []);

  const handleConnect = async (serverName: string) => {
    try {
      await McpServiceClient.connectMcpServer({ 
        serverConfig: { name: serverName } 
      });
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  const handleDisconnect = async (serverName: string) => {
    try {
      await McpServiceClient.disconnectMcpServer({ 
        serverName 
      });
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  if (loading) return <div>Loading MCP servers...</div>;

  return (
    <div className="mcp-server-list">
      <h3>MCP Servers</h3>
      {servers.map(server => (
        <div key={server.name} className="mcp-server-item">
          <div className="server-info">
            <h4>{server.name}</h4>
            <StatusBadge status={server.status} />
            <div className="server-stats">
              {server.toolCount} tools • {server.resourceCount} resources
            </div>
            {server.lastError && (
              <div className="error-message">{server.lastError}</div>
            )}
          </div>
          <div className="server-actions">
            {server.status === 'connected' ? (
              <button onClick={() => handleDisconnect(server.name)}>
                Disconnect
              </button>
            ) : (
              <button onClick={() => handleConnect(server.name)}>
                Connect
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Component 2: MCP Tool Inspector**

**File:** `webview-ui/src/components/mcp/MCPToolInspector.tsx`

```typescript
export function MCPToolInspector({ serverName }: { serverName: string }) {
  const [tools, setTools] = useState<McpTool[]>([]);
  const [selectedTool, setSelectedTool] = useState<McpTool | null>(null);

  useEffect(() => {
    McpServiceClient.listMcpTools({ serverName })
      .then(response => setTools(response.tools));
  }, [serverName]);

  const handleTestTool = async (tool: McpTool) => {
    try {
      const result = await McpServiceClient.callMcpTool({
        serverName,
        toolName: tool.name,
        arguments: tool.testArguments || {}
      });
      console.log('Tool result:', result);
    } catch (error) {
      console.error('Tool execution failed:', error);
    }
  };

  return (
    <div className="mcp-tool-inspector">
      <div className="tool-list">
        {tools.map(tool => (
          <div 
            key={tool.name}
            className="tool-item"
            onClick={() => setSelectedTool(tool)}
          >
            <h4>{tool.name}</h4>
            <p>{tool.description}</p>
          </div>
        ))}
      </div>
      
      {selectedTool && (
        <div className="tool-details">
          <h3>{selectedTool.name}</h3>
          <p>{selectedTool.description}</p>
          
          <div className="tool-parameters">
            <h4>Parameters:</h4>
            <pre>{JSON.stringify(selectedTool.inputSchema, null, 2)}</pre>
          </div>
          
          <button onClick={() => handleTestTool(selectedTool)}>
            Test Tool
          </button>
        </div>
      )}
    </div>
  );
}
```

#### 1.1.3 MCP Server Lifecycle Management (Week 3)

**Error Recovery:**
```typescript
// src/services/mcp/McpHub.ts
export class McpHub {
  private reconnectAttempts = new Map<string, number>();
  private maxReconnectAttempts = 3;

  async connectServer(config: McpServerConfig) {
    try {
      // Attempt connection
      await this.startMcpServer(config);
      this.reconnectAttempts.set(config.name, 0);
    } catch (error) {
      const attempts = this.reconnectAttempts.get(config.name) || 0;
      
      if (attempts < this.maxReconnectAttempts) {
        // Exponential backoff
        const delay = Math.pow(2, attempts) * 1000;
        setTimeout(() => {
          this.reconnectAttempts.set(config.name, attempts + 1);
          this.connectServer(config);
        }, delay);
      } else {
        // Max attempts reached, notify user
        throw new Error(`Failed to connect to ${config.name} after ${attempts} attempts`);
      }
    }
  }

  async monitorServerHealth() {
    setInterval(async () => {
      for (const [name, server] of this.servers) {
        try {
          await server.ping();
        } catch (error) {
          console.warn(`Server ${name} is unresponsive, attempting reconnect...`);
          await this.restartServer(name);
        }
      }
    }, 30000); // Check every 30 seconds
  }
}
```

### Deliverables

- ✅ Complete MCP service handler with all methods
- ✅ Frontend MCP UI components
- ✅ Server lifecycle management (connect, disconnect, restart)
- ✅ Tool execution pipeline
- ✅ Resource access system
- ✅ Error recovery and health monitoring
- ✅ Integration tests with real MCP servers

### Testing Strategy

**Unit Tests:**
```typescript
describe('MCP Service', () => {
  test('connects to stdio MCP server', async () => {
    const config = {
      name: 'test-server',
      command: 'node',
      args: ['server.js']
    };
    await mcpHub.connectServer(config);
    expect(mcpHub.isServerConnected('test-server')).toBe(true);
  });

  test('executes MCP tool', async () => {
    const result = await mcpHub.callTool(
      'filesystem',
      'read_file',
      { path: '/test.txt' }
    );
    expect(result).toBeDefined();
  });
});
```

**Integration Tests:**
- Test with GitHub MCP server
- Test with filesystem MCP server
- Test with custom MCP server
- Test error scenarios (server crash, timeout)

---

## Feature 1.2: Multi-Tab Browser Control (Priority 2)

### Overview

**Timeline:** 3-4 weeks (Weeks 4-7)
**Status:** 🔴 Not Started

Enable Cline to control multiple browser tabs using Puppeteer, allowing interaction with web applications, UX analysis, and automated testing.

### Use Cases

1. **Development Server Testing**
   - Start frontend (localhost:3000)
   - Start backend (localhost:4000)
   - Test API connections
   - Verify responses

2. **UX/Accessibility Analysis**
   - Load webpage
   - Run accessibility audit
   - Generate report
   - Suggest improvements

3. **Form Testing**
   - Fill login form
   - Submit form
   - Verify navigation
   - Check for errors

### Implementation Tasks

#### 1.2.1 Browser Automation Service (Week 4-5)

**File:** `src/standalone/services/BrowserAutomationService.ts`

```typescript
import puppeteer, { Browser, Page } from 'puppeteer';
import { ulid } from 'ulid';

interface BrowserTab {
  id: string;
  page: Page;
  url: string;
  title: string;
  createdAt: number;
}

export class BrowserAutomationService {
  private browser: Browser | null = null;
  private tabs = new Map<string, BrowserTab>();
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    this.browser = await puppeteer.launch({
      headless: false, // Show browser for user visibility
      defaultViewport: { width: 1920, height: 1080 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    this.initialized = true;
    console.log('[BrowserAutomation] Initialized successfully');
  }

  async openTab(url: string): Promise<string> {
    if (!this.browser) await this.initialize();

    const page = await this.browser!.newPage();
    
    // Set up console logging
    page.on('console', msg => {
      console.log(`[Browser Console] ${msg.text()}`);
    });

    // Navigate to URL
    await page.goto(url, { waitUntil: 'networkidle2' });

    const tabId = ulid();
    this.tabs.set(tabId, {
      id: tabId,
      page,
      url,
      title: await page.title(),
      createdAt: Date.now()
    });

    console.log(`[BrowserAutomation] Opened tab ${tabId} at ${url}`);
    return tabId;
  }

  async click(tabId: string, selector: string): Promise<void> {
    const tab = this.getTab(tabId);
    
    // Wait for element to be visible
    await tab.page.waitForSelector(selector, { visible: true });
    
    // Click element
    await tab.page.click(selector);
    
    // Wait for navigation if it occurs
    await Promise.race([
      tab.page.waitForNavigation({ waitUntil: 'networkidle2' }),
      new Promise(resolve => setTimeout(resolve, 1000))
    ]);

    console.log(`[BrowserAutomation] Clicked ${selector} in tab ${tabId}`);
  }

  async fill(tabId: string, selector: string, value: string): Promise<void> {
    const tab = this.getTab(tabId);
    await tab.page.waitForSelector(selector);
    await tab.page.type(selector, value);
    console.log(`[BrowserAutomation] Filled ${selector} with value in tab ${tabId}`);
  }

  async screenshot(tabId: string, fullPage = false): Promise<Buffer> {
    const tab = this.getTab(tabId);
    return await tab.page.screenshot({ fullPage });
  }

  async evaluateScript(tabId: string, script: string): Promise<any> {
    const tab = this.getTab(tabId);
    return await tab.page.evaluate(script);
  }

  // UX Analysis
  async analyzeAccessibility(tabId: string): Promise<AccessibilityReport> {
    const tab = this.getTab(tabId);
    
    // Inject axe-core
    await tab.page.addScriptTag({
      url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js'
    });

    // Run accessibility audit
    const results = await tab.page.evaluate(() => {
      return (window as any).axe.run();
    });

    return {
      violations: results.violations,
      passes: results.passes,
      score: this.calculateAccessibilityScore(results)
    };
  }

  async analyzePerformance(tabId: string): Promise<PerformanceMetrics> {
    const tab = this.getTab(tabId);
    const metrics = await tab.page.metrics();
    
    const performanceData = await tab.page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0] as any;
      return {
        domContentLoaded: perf.domContentLoadedEventEnd - perf.fetchStart,
        loadComplete: perf.loadEventEnd - perf.fetchStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0
      };
    });

    return {
      ...performanceData,
      jsHeapSize: metrics.JSHeapUsedSize / 1024 / 1024, // MB
      domNodes: metrics.Nodes
    };
  }

  // Smart element finding
  async findElements(tabId: string, criteria: ElementCriteria): Promise<ElementInfo[]> {
    const tab = this.getTab(tabId);
    
    return await tab.page.evaluate((criteria) => {
      const elements: ElementInfo[] = [];
      
      // Find by text content
      if (criteria.text) {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null
        );
        
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (node.textContent?.includes(criteria.text)) {
            const element = node.parentElement;
            if (element) {
              elements.push({
                selector: getUniqueSelector(element),
                text: element.textContent || '',
                tagName: element.tagName,
                attributes: getAttributes(element)
              });
            }
          }
        }
      }
      
      // Find by aria-label
      if (criteria.ariaLabel) {
        const ariaElements = document.querySelectorAll(`[aria-label*="${criteria.ariaLabel}"]`);
        ariaElements.forEach(el => {
          elements.push({
            selector: getUniqueSelector(el as HTMLElement),
            text: el.textContent || '',
            tagName: el.tagName,
            attributes: getAttributes(el as HTMLElement)
          });
        });
      }
      
      return elements;
      
      // Helper functions
      function getUniqueSelector(element: HTMLElement): string {
        if (element.id) return `#${element.id}`;
        if (element.className) return `.${element.className.split(' ')[0]}`;
        return element.tagName.toLowerCase();
      }
      
      function getAttributes(element: HTMLElement): Record<string, string> {
        const attrs: Record<string, string> = {};
        for (const attr of element.attributes) {
          attrs[attr.name] = attr.value;
        }
        return attrs;
      }
    }, criteria);
  }

  async closeTab(tabId: string): Promise<void> {
    const tab = this.tabs.get(tabId);
    if (tab) {
      await tab.page.close();
      this.tabs.delete(tabId);
      console.log(`[BrowserAutomation] Closed tab ${tabId}`);
    }
  }

  async closeAll(): Promise<void> {
    for (const [tabId, tab] of this.tabs) {
      await tab.page.close();
      this.tabs.delete(tabId);
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.initialized = false;
    }
  }

  private getTab(tabId: string): BrowserTab {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      throw new Error(`Tab ${tabId} not found`);
    }
    return tab;
  }

  private calculateAccessibilityScore(results: any): number {
    const totalIssues = results.violations.reduce((sum: number, v: any) => sum + v.nodes.length, 0);
    const totalPasses = results.passes.reduce((sum: number, p: any) => sum + p.nodes.length, 0);
    return Math.round((totalPasses / (totalPasses + totalIssues)) * 100);
  }
}

interface ElementCriteria {
  text?: string;
  ariaLabel?: string;
  role?: string;
  testId?: string;
}

interface ElementInfo {
  selector: string;
  text: string;
  tagName: string;
  attributes: Record<string, string>;
}

interface AccessibilityReport {
  violations: any[];
  passes: any[];
  score: number;
}

interface PerformanceMetrics {
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  jsHeapSize: number;
  domNodes: number;
}
```

#### 1.2.2 Web Server Integration (Week 6)

**File:** `src/standalone/web-server.ts`

```typescript
private async handleBrowserService(method: string, requestData: any) {
  const browserService = this.browserAutomationService;

  switch (method) {
    case "openTab":
      const tabId = await browserService.openTab(requestData.url);
      return { tabId };

    case "click":
      await browserService.click(requestData.tabId, requestData.selector);
      return { success: true };

    case "fill":
      await browserService.fill(
        requestData.tabId,
        requestData.selector,
        requestData.value
      );
      return { success: true };

    case "screenshot":
      const screenshot = await browserService.screenshot(
        requestData.tabId,
        requestData.fullPage
      );
      return { image: screenshot.toString('base64') };

    case "analyzeAccessibility":
      const report = await browserService.analyzeAccessibility(requestData.tabId);
      return { report };

    case "analyzePerformance":
      const metrics = await browserService.analyzePerformance(requestData.tabId);
      return { metrics };

    case "findElements":
      const elements = await browserService.findElements(
        requestData.tabId,
        requestData.criteria
      );
      return { elements };

    case "closeTab":
      await browserService.closeTab(requestData.tabId);
      return { success: true };
  }
}
```

#### 1.2.3 Tool Integration (Week 7)

Add browser tools to Cline's available tools in system prompt:

```typescript
const browserTools = [
  {
    name: "browser_open_tab",
    description: "Open a new browser tab at the specified URL. Use this to test web applications or analyze websites.",
    parameters: {
      url: {
        type: "string",
        description: "The URL to open (e.g., http://localhost:3000, https://example.com)"
      }
    }
  },
  {
    name: "browser_click",
    description: "Click an element in a browser tab",
    parameters: {
      tabId: {
        type: "string",
        description: "The tab ID returned from browser_open_tab"
      },
      selector: {
        type: "string",
        description: "CSS selector or description of the element (e.g., '#login-button', 'button with text Login')"
      }
    }
  },
  {
    name: "browser_fill_form",
    description: "Fill a form field in a browser tab",
    parameters: {
      tabId: "string",
      selector: "string - CSS selector of the input field",
      value: "string - Value to fill"
    }
  },
  {
    name: "browser_screenshot",
    description: "Take a screenshot of a browser tab",
    parameters: {
      tabId: "string",
      fullPage: "boolean - Whether to capture the full page (default: false)"
    }
  },
  {
    name: "browser_analyze_ux",
    description: "Analyze UX and accessibility of a webpage",
    parameters: {
      tabId: "string"
    }
  }
];
```

### Example Workflows

**Workflow 1: Login Flow Testing**
```
User: "Test the login on localhost:3000"

Cline:
1. browser_open_tab(url: "http://localhost:3000")
   → Returns: { tabId: "01HN6..." }

2. browser_screenshot(tabId: "01HN6...", fullPage: false)
   → Analyzes page, identifies login form

3. browser_fill_form(tabId: "01HN6...", selector: "#email", value: "test@example.com")
4. browser_fill_form(tabId: "01HN6...", selector: "#password", value: "testpass123")
5. browser_click(tabId: "01HN6...", selector: "#login-button")
6. browser_screenshot(tabId: "01HN6...", fullPage: false)
   → Verifies successful login

Response: "Login flow tested successfully! Dashboard loaded correctly."
```

**Workflow 2: Accessibility Audit**
```
User: "Check accessibility issues on my site"

Cline:
1. browser_open_tab(url: "http://localhost:3000")
2. browser_analyze_ux(tabId: "01HN6...")
   → Returns: {
       score: 78,
       violations: [
         { id: "image-alt", nodes: 3 },
         { id: "color-contrast", nodes: 1 }
       ]
     }

Response: "Found 4 accessibility issues (Score: 78/100):
- 3 images missing alt text
- 1 element with low color contrast

Shall I fix these in the code?"
```

### Deliverables

- ✅ Browser automation service with Puppeteer
- ✅ Multi-tab management
- ✅ Element interaction (click, fill, etc.)
- ✅ Screenshot capability
- ✅ Accessibility analysis
- ✅ Performance metrics
- ✅ Smart element finding
- ✅ Tool integration in Cline

---

## Feature 1.3: Web App Deployment (Priority 3)

### Overview

**Timeline:** 1 week (Week 8)
**Status:** 🟢 Ready (needs finalization)

Set up production deployment infrastructure with Docker, CI/CD, and multiple deployment options.

### Implementation Tasks

#### 1.3.1 Build Configuration

**File:** `package.json`

```json
{
  "scripts": {
    "build:backend": "tsc && esbuild src/standalone/index.ts --bundle --platform=node --outfile=dist/standalone/index.js",
    "build:frontend": "cd webview-ui && npm run build",
    "build:web": "npm run build:backend && npm run build:frontend",
    "start:web": "node dist/standalone/index.js --port 3000",
    "docker:build": "docker build -t cline-web:latest .",
    "docker:run": "docker run -p 3000:3000 -p 3001:3001 cline-web:latest"
  }
}
```

#### 1.3.2 Docker Configuration

**File:** `Dockerfile`

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY webview-ui/package*.json ./webview-ui/
RUN npm ci
RUN cd webview-ui && npm ci

# Build backend and frontend
COPY . .
RUN npm run build:web

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/webview-ui/dist ./webview-ui/dist
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm ci --production

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/standalone/index.js"]
```

**File:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  cline-web:
    build: .
    ports:
      - "3000:3000"
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - WEBSOCKET_PORT=3001
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./workspaces:/app/workspaces
      - ./data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - cline-web
    restart: unless-stopped
```

#### 1.3.3 CI/CD Pipeline

**File:** `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build:web

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: cline/web:latest,cline/web:${{ github.sha }}
