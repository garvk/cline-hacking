# Cline on Replit - Setup Instructions

## Overview
This Replit project runs Cline (AI coding assistant) in standalone mode with three main services:
1. **Hostbridge** - gRPC service on port 26041
2. **Cline Core** - Main backend service on port 8080
3. **Frontend** - Web interface on port 5000

## Current Status
✅ All components are built and installed
✅ Workflow is configured and running
✅ Services are starting successfully

## Environment Variables
The following environment variables are configured in `.replit`:
- `CLINE_DIR`: `/home/runner/$REPL_SLUG/.cline-data`
- `INDIANKANOON_API_TOKEN`: Your Indian Kanoon API token
- `POSTHOG_TELEMETRY_ENABLED`: `false`

## Services

### 1. Hostbridge (Port 26041)
The gRPC host bridge service that provides system integration.

### 2. Cline Core (Port 8080)
The main Cline backend service that handles:
- AI model interactions
- File system operations
- Task management
- WebSocket connections

### 3. Frontend (Port 5000)
The React-based web interface built with Vite.
- Configured for standalone mode
- Runs on port 5000 (required for Replit webview)

## How to Run

The workflow "Cline Services" is already configured and will automatically start when you run the Repl. The startup script `start-cline-replit.sh` handles:

1. Cleaning up any existing processes
2. Building the MCP server (if present)
3. Verifying CLI and standalone builds
4. Starting all three services

## Accessing Cline

Once all services are running, access Cline at:
- **Public URL**: Your Replit project URL
- **Local**: `http://localhost:5000`

## Logs

View service logs:
```bash
# Hostbridge logs
tail -f /tmp/hostbridge.log

# Cline Core logs
tail -f /tmp/cline-core.log

# Frontend logs
tail -f /tmp/frontend.log
```

## Building from Scratch

If you need to rebuild:

```bash
# Install dependencies
npm install
cd webview-ui && npm install && cd ..

# Build protocol buffers
npm run protos

# Build CLI (requires Go)
export PATH="$PATH:/home/runner/go/bin"
cd cli && GO111MODULE=on go build -o bin/cline-host ./cmd/cline-host
cd cli && GO111MODULE=on go build -o bin/cline ./cmd/cline

# Build standalone version
npm run compile-standalone:single
```

## Troubleshooting

### Services won't start
1. Check that all builds completed successfully
2. Ensure ports 26041, 8080, and 5000 are available
3. Review logs in `/tmp/` directory

### Frontend stuck on "Loading..."
This is currently being investigated. The frontend is loading but having issues communicating with the backend services.

### Missing dependencies
Install system dependencies:
- lsof (already installed)
- Node.js 20 (already installed)
- Go 1.21 (already installed)

## File Structure

```
.
├── cli/                    # Go-based CLI tools
│   └── bin/               # Built binaries
├── dist-standalone/       # Standalone build output
│   ├── cline-core.js     # Main backend service
│   └── extension/        # Extension files
├── webview-ui/           # React frontend
├── mcp-servers/          # MCP server integrations
├── start-cline-replit.sh # Startup script
└── .replit               # Replit configuration (managed by system)
```

## Notes

- The project uses Nix for package management
- Git operations are restricted in this environment
- This is a development environment; for production, additional security measures would be needed
