#!/bin/bash
set -e

echo "Optimized deployment build (minimal size)..."

# Set up Go environment
export GOPATH="/home/runner/go"
export PATH="$PATH:$GOPATH/bin"

# Check if CLI binaries exist
if [ ! -f "cli/bin/cline-host" ] || [ ! -f "cli/bin/cline" ]; then
    echo "Building CLI binaries..."
    cd cli
    # Build with stripped symbols to reduce size
    GO111MODULE=on go build -ldflags="-s -w" -o bin/cline ./cmd/cline &
    GO111MODULE=on go build -ldflags="-s -w" -o bin/cline-host ./cmd/cline-host &
    wait
    cd ..
    echo "✓ CLI binaries built and stripped"
else
    echo "✓ Using cached CLI binaries"
fi

# Build core
echo "Building Cline core..."
npm run protos 2>&1 | tail -3
node esbuild.mjs --standalone

# Create MINIMAL distribution directory
echo "Creating minimal distribution..."

# IMPORTANT: Remove old dist completely to avoid bloat
rm -rf dist-standalone
mkdir -p dist-standalone

# Copy ONLY the essential production files
echo "  Copying cline-core.js..."
cp dist-standalone-temp/cline-core.js dist-standalone/

echo "  Copying extension files..."
if [ -d "dist-standalone-temp/extension" ]; then
    cp -r dist-standalone-temp/extension dist-standalone/
fi

# Remove source maps (they're huge and not needed in production)
echo "  Removing source maps..."
find dist-standalone -name "*.map" -type f -delete 2>/dev/null || true

# Clean up temporary build artifacts
echo "  Cleaning up temporary files..."
rm -rf dist-standalone-temp

# Check if frontend is already built and recent
FRONTEND_BUILT=0
if [ -d "webview-ui/build" ] && [ -f "webview-ui/build/index.html" ]; then
    BUILD_AGE=$(($(date +%s) - $(stat -c %Y "webview-ui/build/index.html" 2>/dev/null || stat -f %m "webview-ui/build/index.html" 2>/dev/null || echo 0)))
    if [ $BUILD_AGE -lt 3600 ]; then
        FRONTEND_BUILT=1
        echo "✓ Using cached frontend build ($(($BUILD_AGE / 60)) minutes old)"
    fi
fi

if [ $FRONTEND_BUILT -eq 0 ]; then
    echo "Building frontend..."
    cd webview-ui
    
    # Clean old build
    rm -rf build
    
    # Build WITHOUT source maps to save space
    export NODE_ENV=production
    export GENERATE_SOURCEMAP=false
    
    npm run build
    
    # Remove any source maps that were generated anyway
    find build -name "*.map" -type f -delete 2>/dev/null || true
    
    cd ..
    echo "✓ Frontend built (source maps removed)"
fi

# Verify required files exist
echo ""
echo "Verifying build output..."
if [ ! -f "dist-standalone/cline-core.js" ]; then
    echo "ERROR: cline-core.js not found!"
    exit 1
fi

if [ ! -f "cli/bin/cline-host" ]; then
    echo "ERROR: cline-host binary not found!"
    exit 1
fi

if [ ! -f "webview-ui/build/index.html" ]; then
    echo "ERROR: Frontend build/index.html not found!"
    exit 1
fi

echo "✓ All required files present"
echo ""
echo "✓ Build completed!"
echo ""
echo "Build sizes:"
echo "  Distribution:  $(du -sh dist-standalone 2>/dev/null | cut -f1)"
echo "  Frontend:      $(du -sh webview-ui/build 2>/dev/null | cut -f1)"
echo "  CLI binaries:  $(du -sh cli/bin 2>/dev/null | cut -f1)"
echo ""
echo "Total deployment size: $(du -shc dist-standalone webview-ui/build cli/bin 2>/dev/null | tail -1 | cut -f1)"