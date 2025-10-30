#!/bin/bash

# Cline Startup Script for Replit
echo "========================================"
echo "Starting Cline Services on Replit"
echo "========================================"

# Kill existing processes on ports
echo "Cleaning up existing processes..."
lsof -ti:26041 | xargs kill -9 2>/dev/null
lsof -ti:8080 | xargs kill -9 2>/dev/null
lsof -ti:5000 | xargs kill -9 2>/dev/null
sleep 2

# Build MCP Server if it exists
if [ -d "mcp-servers/indian-kanoon-server" ]; then
    echo "Building Indian Kanoon MCP Server..."
    cd mcp-servers/indian-kanoon-server
    npm install
    npm run build
    cd ../..
    echo "✓ MCP Server built"
fi

# Check if CLI is built
if [ ! -f "cli/bin/cline-host" ]; then
    echo "ERROR: CLI not built. Please run: npm run compile-cli"
    exit 1
fi

# Check if standalone is built
if [ ! -f "dist-standalone/cline-core.js" ]; then
    echo "ERROR: Standalone not built. Please run: npm run compile-standalone:single"
    exit 1
fi

echo ""
echo "Starting services..."
echo ""

# Start Hostbridge
echo "Starting Hostbridge on port 26041..."
./cli/bin/cline-host --port 26041 --verbose > /tmp/hostbridge.log 2>&1 &
HOSTBRIDGE_PID=$!
sleep 3

# Start Cline Core
echo "Starting Cline Core on port 8080..."
cd dist-standalone
node cline-core.js --port 8080 --host-bridge-port 26041 > /tmp/cline-core.log 2>&1 &
CLINE_CORE_PID=$!
cd ..
sleep 3

# Start Frontend on port 5000 (required for Replit webview)
echo "Starting Frontend on port 5000..."
cd webview-ui
PLATFORM=standalone npx vite --host 0.0.0.0 --port 5000 > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
sleep 5

echo ""
echo "========================================"
echo "✓ Services Started!"
echo "========================================"
echo "Hostbridge:  http://localhost:26041 (PID: $HOSTBRIDGE_PID)"
echo "Cline Core:  http://localhost:8080 (PID: $CLINE_CORE_PID)"
echo "Frontend:    http://0.0.0.0:5000 (PID: $FRONTEND_PID)"
echo ""
echo "Access Cline at: https://${REPL_SLUG}.${REPL_OWNER}.repl.co"
echo ""
echo "Logs:"
echo "  tail -f /tmp/hostbridge.log"
echo "  tail -f /tmp/cline-core.log"
echo "  tail -f /tmp/frontend.log"
echo ""
echo "Press Ctrl+C to stop..."

# Cleanup on exit
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $FRONTEND_PID $CLINE_CORE_PID $HOSTBRIDGE_PID 2>/dev/null
    echo "Done!"
    exit 0
}

trap cleanup SIGINT SIGTERM

wait
