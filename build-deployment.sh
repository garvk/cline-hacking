#!/bin/bash
set -e

echo "Starting Cline deployment build process..."

# Set up Go environment
echo "Setting up Go environment..."
export GOPATH="/home/runner/go"
export PATH="$PATH:$GOPATH/bin"

# Install Go protobuf tools if not already installed
echo "Installing Go protobuf tools..."
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Build protobuf files (JavaScript)
echo "Building JavaScript protobuf files..."
npm run protos

# Build protobuf files (Go)
echo "Building Go protobuf files..."
npm run protos-go

# Build CLI binaries
echo "Building CLI..."
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