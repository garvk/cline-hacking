#!/bin/bash
set -e

echo "Starting Cline build process..."

# Build CLI
echo "Building CLI..."
npm run compile-cli

# Build standalone
echo "Building standalone..."
npm run compile-standalone:single

# Build frontend
echo "Building frontend..."
cd webview-ui
npm run build
cd ..

echo "Build completed successfully!"