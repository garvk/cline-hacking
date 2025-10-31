# Overview

Cline is an autonomous AI coding assistant that operates as both a VSCode extension and a standalone web application. It provides AI-powered code generation, editing, and project management capabilities with support for multiple LLM providers (Anthropic, OpenRouter, AWS Bedrock, etc.). The system uses gRPC for communication between components and supports the Model Context Protocol (MCP) for extensibility.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Components

### 1. Multi-Platform Architecture
- **VSCode Extension Mode**: Traditional VSCode extension running in the extension host
- **Standalone Web Mode**: Browser-based application with Node.js backend server
- **Platform Abstraction Layer**: `PLATFORM_CONFIG` system handles different deployment targets
- **Shared Core Logic**: Common business logic works across both VSCode and web platforms

### 2. Communication Layer
- **Protocol Buffers**: Strongly-typed API definitions in `/proto` directory
- **gRPC Services**: Bidirectional communication between frontend and backend
- **Protobus**: Internal message bus for service-to-service communication
- **WebSocket Support**: Real-time updates in standalone web mode

### 3. Frontend Architecture
- **React 18.3.1**: Component-based UI framework
- **Vite**: Modern build tool for development and production
- **TypeScript**: Type-safe frontend code
- **Context API**: State management via `ExtensionStateContext`
- **Platform-Agnostic UI**: Components work in both VSCode webview and browser

### 4. Backend Services

#### Task Management
- **Task Controller**: Orchestrates AI conversation flow and tool execution
- **State Manager**: Persists task history and user preferences
- **Checkpoint System**: Git-based snapshots for rollback capability

#### AI Provider Integration
- **Multi-Provider Support**: Anthropic, OpenRouter, AWS Bedrock, Google Vertex AI, OpenAI-compatible APIs
- **Streaming Responses**: Real-time token streaming from LLMs
- **Prompt Caching**: Optimized context management for reduced costs
- **Custom System Prompts**: Extensible prompt engineering

#### File System Operations
- **File Context Tracking**: Monitors file changes during tasks
- **AST Analysis**: Code structure understanding via tree-sitter
- **Diff Generation**: Precise code editing with diff patches
- **Monaco Editor Integration**: In-browser code editing with syntax highlighting

#### Browser Automation
- **Playwright Integration**: Headless browser control for web development tasks
- **Screenshot Capture**: Visual debugging and validation
- **Console Log Monitoring**: Runtime error detection

#### MCP (Model Context Protocol)
- **Server Management**: Dynamic loading of MCP servers for extended capabilities
- **Tool Registry**: Automatic tool discovery from MCP servers
- **Resource Access**: File and data resource exposure to LLMs
- **Remote Server Support**: HTTP/SSE-based MCP servers

### 5. Testing Infrastructure
- **E2E Testing**: Playwright-based integration tests
- **Unit Testing**: Mocha + Chai test suite
- **Evaluation System**: Benchmark framework in `/evals` directory
- **Test Platform**: Spec-based testing harness for gRPC services

### 6. Storage Strategy
- **VSCode Mode**: Uses VSCode's `globalState` and `secretStorage` APIs
- **Standalone Mode**: SQLite database via better-sqlite3
- **Task History**: JSON files per task with conversation and file changes
- **Git Integration**: Leverages Git for checkpoint management

### 7. Authentication
- **Firebase Auth**: User authentication in web mode
- **API Key Management**: Secure storage of LLM provider credentials
- **Session Management**: Token refresh and validation

## Build System

### Development Workflow
- **TypeScript Compilation**: Separate configs for extension, standalone, and tests
- **esbuild**: Fast bundling for production builds
- **Protobuf Generation**: Automated code generation from `.proto` files
- **Path Aliases**: TypeScript path mapping for clean imports (`@core/*`, `@services/*`)

### Deployment Targets
- **VSCode Marketplace**: Traditional VSIX package
- **Standalone Bundle**: Self-contained Node.js application in `dist-standalone/`
- **Web Server**: Express-based HTTP server with gRPC backend

## Design Patterns

### Service Locator Pattern
- `HostProvider` abstracts platform-specific implementations
- Enables dependency injection across platforms

### Event-Driven Architecture
- WebSocket and gRPC streaming for real-time updates
- Observable state changes via context providers

### Strategy Pattern
- Platform-specific message handlers
- Pluggable AI provider implementations

### Repository Pattern
- `StateManager` abstracts storage layer
- Consistent API across VSCode and SQLite backends

# External Dependencies

## Core Infrastructure
- **@grpc/grpc-js**: gRPC runtime for Node.js
- **@bufbuild/protobuf**: Protocol Buffers implementation
- **better-sqlite3**: Embedded database for standalone mode
- **express**: HTTP server framework for web mode
- **vscode**: VSCode extension API (VSCode mode only)

## AI/LLM Providers
- **@anthropic-ai/sdk**: Claude API client
- **@anthropic-ai/vertex-sdk**: GCP Vertex AI Claude integration
- **@aws-sdk/client-bedrock-runtime**: AWS Bedrock API
- **@google-cloud/vertexai**: Google Cloud AI services
- **@mistralai/mistralai**: Mistral AI API
- **@sap-ai-sdk**: SAP AI Core integration

## Browser Automation
- **@playwright/test**: Headless browser testing
- **chrome-launcher**: Chrome DevTools Protocol integration
- **chrome-devtools-mcp**: MCP server for browser automation

## Development Tools
- **Vite**: Frontend build tool
- **esbuild**: JavaScript bundler
- **ts-node**: TypeScript execution for scripts
- **Mocha**: Test framework
- **Chai**: Assertion library

## Model Context Protocol
- **@modelcontextprotocol/sdk**: MCP client implementation
- Custom MCP server integration framework

## Utilities
- **axios**: HTTP client
- **execa**: Process execution
- **archiver**: File compression
- **cheerio**: HTML parsing
- **diff**: Text diffing
- **uuid**: Unique identifier generation

## Telemetry & Monitoring
- **@sentry/browser**: Error tracking
- **@opentelemetry/api**: Observability instrumentation
- PostHog integration for analytics

## Firebase (Web Mode)
- Firebase Authentication
- Firebase Storage (planned)
- Firestore integration (planned)