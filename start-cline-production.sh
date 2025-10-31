#!/bin/bash

# Optimized Cline Production Startup Script for Replit Deployment
# Faster startup by skipping build steps and using pre-built artifacts

# Kill existing processes on ports
lsof -ti:26041 | xargs kill -9 2>/dev/null
lsof -ti:8080 | xargs kill -9 2>/dev/null
lsof -ti:5000 | xargs kill -9 2>/dev/null
sleep 1

# Verify required files exist
if [ ! -f "cli/bin/cline-host" ] || [ ! -f "dist-standalone/cline-core.js" ]; then
    echo "ERROR: Required files not found. Build artifacts missing."
    exit 1
fi

# Start Hostbridge
./cli/bin/cline-host --port 26041 --verbose > /tmp/hostbridge.log 2>&1 &
HOSTBRIDGE_PID=$!
sleep 2

# Start Cline Core
cd dist-standalone
node cline-core.js --port 8080 --host-bridge-port 26041 > /tmp/cline-core.log 2>&1 &
CLINE_CORE_PID=$!
cd ..
sleep 2

# Start Frontend on port 5000 (Replit webview requirement)
cd webview-ui
PLATFORM=standalone npx vite --host 0.0.0.0 --port 5000 > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo "Services started successfully"
echo "Hostbridge PID: $HOSTBRIDGE_PID"
echo "Cline Core PID: $CLINE_CORE_PID"
echo "Frontend PID: $FRONTEND_PID"

# Cleanup on exit
cleanup() {
    kill $FRONTEND_PID $CLINE_CORE_PID $HOSTBRIDGE_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

wait
