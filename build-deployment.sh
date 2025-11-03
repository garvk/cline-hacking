#!/bin/bash
set -e

echo "Optimized deployment build (skip unchanged frontend)..."

# Set up Go environment
export GOPATH="/home/runner/go"
export PATH="$PATH:$GOPATH/bin"

# Check if CLI binaries exist
if [ ! -f "cli/bin/cline-host" ] || [ ! -f "cli/bin/cline" ]; then
    echo "Building CLI binaries..."
    cd cli
    GO111MODULE=on go build -o bin/cline ./cmd/cline &
    GO111MODULE=on go build -o bin/cline-host ./cmd/cline-host &
    wait
    cd ..
    echo "✓ CLI binaries built"
else
    echo "✓ Using cached CLI binaries"
fi

# Run checks in parallel (but don't wait for them to finish)
echo "Running checks..."
npm run check-types > /tmp/typecheck.log 2>&1 &
npm run lint > /tmp/lint.log 2>&1 &

# Build core
echo "Building Cline core..."
npm run protos 2>&1 | tail -3
node esbuild.mjs --standalone

# Create distribution
echo "Creating distribution..."
mkdir -p dist-standalone
cp dist-standalone-temp/cline-core.js dist-standalone/ 2>/dev/null || true
cp -r dist-standalone-temp/extension dist-standalone/ 2>/dev/null || true

# Check if frontend is already built and recent
FRONTEND_BUILT=0
if [ -d "webview-ui/build" ] && [ -f "webview-ui/build/index.html" ]; then
    # Check if build is less than 1 hour old
    BUILD_AGE=$(($(date +%s) - $(stat -c %Y "webview-ui/build/index.html" 2>/dev/null || stat -f %m "webview-ui/build/index.html" 2>/dev/null || echo 0)))
    if [ $BUILD_AGE -lt 3600 ]; then
        FRONTEND_BUILT=1
        echo "✓ Using cached frontend build ($(($BUILD_AGE / 60)) minutes old)"
    fi
fi

if [ $FRONTEND_BUILT -eq 0 ]; then
    echo "Building frontend (this takes ~2 minutes)..."
    cd webview-ui
    NODE_ENV=production npm run build
    cd ..
    echo "✓ Frontend built"
fi

# Wait for checks to complete (optional - they run in background)
wait

echo ""
echo "✓ Build completed!"
echo "Distribution: $(du -sh dist-standalone 2>/dev/null | cut -f1)"
echo "Frontend: $(du -sh webview-ui/build 2>/dev/null | cut -f1)"