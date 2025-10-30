#!/bin/bash

# Simple Cline Startup Script
echo "========================================"
echo "Starting Cline Services"
echo "========================================"

# Kill existing processes on ports
echo "Cleaning up existing processes..."
lsof -ti:26041 | xargs kill -9 2>/dev/null
lsof -ti:8080 | xargs kill -9 2>/dev/null
lsof -ti:25463 | xargs kill -9 2>/dev/null
sleep 2

# Build if needed
if [ ! -f "cli/bin/cline-host" ]; then
    echo "Building CLI..."
    npm run build:cli
fi

if [ ! -d "dist-standalone/extension" ]; then
    echo "Building standalone..."
    npm run compile-standalone:single
    
    echo "Extracting standalone..."
    cd dist-standalone
    unzip -o standalone.zip
    mv standalone/extension . 2>/dev/null || true
    cd ..
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

# Start Frontend
echo "Starting Frontend on port 25463..."
cd webview-ui
PLATFORM=standalone npm run dev -- --host > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
sleep 5

echo ""
echo "========================================"
echo "✓ Services Started!"
echo "========================================"
echo "Hostbridge:  http://localhost:26041 (PID: $HOSTBRIDGE_PID)"
echo "Cline Core:  http://localhost:8080 (PID: $CLINE_CORE_PID)"
echo "Frontend:    http://localhost:25463 (PID: $FRONTEND_PID)"
echo ""
echo "Access Cline at: http://localhost:25463"
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
