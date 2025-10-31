#!/bin/bash
set -e

echo "Starting Cline deployment build process..."

# Build protobuf files (JavaScript only, skip Go)
echo "Building protobuf files..."
npm run protos

# Build CLI binaries with PATH fix for Go tools
echo "Building CLI..."
export PATH="$PATH:/home/runner/go/bin"
cd cli
GO111MODULE=on go build -o bin/cline ./cmd/cline 
echo '✓ cli/bin/cline built'
GO111MODULE=on go build -o bin/cline-host ./cmd/cline-host
echo '✓ cli/bin/cline-host built'
cd ..

# Copy necessary files for standalone
mkdir -p dist-standalone/extension
cp package.json dist-standalone/extension 

# Build standalone
echo "Building standalone..."
npm run check-types
npm run lint
node esbuild.mjs --standalone
SINGLE_PLATFORM=true node scripts/package-standalone.mjs

# Build frontend
echo "Building frontend..."
cd webview-ui
npm run build
cd ..

echo "Build completed successfully!"