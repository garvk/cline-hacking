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
sleep 1

# Start Cline Core
cd dist-standalone
node cline-core.js --port 8080 --host-bridge-port 26041 > /tmp/cline-core.log 2>&1 &
CLINE_CORE_PID=$!
cd ..
sleep 1

# Build and serve Frontend on port 5000 (Replit webview requirement)
cd webview-ui

# Build the frontend if build directory doesn't exist or is empty
if [ ! -d "build" ] || [ -z "$(ls -A build 2>/dev/null)" ]; then
    echo "Building frontend..."
    PLATFORM=standalone NODE_ENV=production npm run build
    if [ $? -ne 0 ]; then
        echo "ERROR: Frontend build failed"
        exit 1
    fi
fi

# Serve the built frontend using vite preview
PLATFORM=standalone REPLIT_DEPLOYMENT=1 npx vite preview --host 0.0.0.0 --port 5000 --strictPort > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to be ready (critical for deployment health checks)
echo "Waiting for frontend to be ready on port 5000..."
for i in {1..30}; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/ | grep -q "200"; then
        echo "Frontend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "ERROR: Frontend failed to start within 30 seconds"
        exit 1
    fi
    sleep 1
done

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
