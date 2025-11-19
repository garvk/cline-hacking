#!/bin/bash

# Cline Standalone Complete Setup and Start Script
# This script handles cleanup, building, and starting all services

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "========================================"
echo "  Cline Standalone Setup & Starter"
echo "========================================"
echo ""

# Function to print colored messages
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to kill process on port
kill_port() {
    local port=$1
    local service_name=$2
    
    if lsof -ti:$port > /dev/null 2>&1; then
        print_warning "Port $port ($service_name) is in use. Killing process..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 1
        print_success "Port $port freed"
    else
        print_status "Port $port is available"
    fi
}

# Step 1: Clean up ports
echo ""
print_status "Step 1: Cleaning up ports..."
echo "----------------------------"
kill_port 26041 "Hostbridge"
kill_port 8080 "Cline Core"
kill_port 25463 "Frontend"

# Step 2: Clean up old builds
echo ""
print_status "Step 2: Cleaning up old builds..."
echo "----------------------------"
if [ -d "dist-standalone" ]; then
    print_warning "Removing old dist-standalone directory..."
    rm -rf dist-standalone
    print_success "Old build removed"
else
    print_status "No old build to clean"
fi

# Step 3: Install dependencies (if needed)
echo ""
print_status "Step 3: Checking dependencies..."
echo "----------------------------"
if [ ! -d "node_modules" ] || [ ! -d "webview-ui/node_modules" ]; then
    print_warning "Dependencies missing. Installing..."
    npm run install:all
    print_success "Dependencies installed"
else
    print_status "Dependencies already installed"
fi

# Step 4: Build CLI binaries
echo ""
print_status "Step 4: Building CLI binaries (hostbridge)..."
echo "----------------------------"
if [ ! -f "cli/bin/cline-host" ]; then
    npm run compile-cli
    print_success "CLI binaries built"
else
    print_warning "CLI binaries exist. Rebuilding..."
    npm run compile-cli
    print_success "CLI binaries rebuilt"
fi

# Step 5: Build standalone package
echo ""
print_status "Step 5: Building standalone package..."
echo "----------------------------"
npm run compile-standalone:single
print_success "Standalone package built"

# Step 6: Extract standalone package
echo ""
print_status "Step 6: Extracting standalone package..."
echo "----------------------------"
cd dist-standalone
if [ -f "standalone.zip" ]; then
    unzip -q -o standalone.zip
    
    # Check for different possible structures
    if [ -d "standalone/extension" ]; then
        print_status "Found structure: standalone/extension"
        mv standalone/extension . 2>/dev/null || true
        rm -rf standalone 2>/dev/null || true
        print_success "Standalone package extracted"
    elif [ -d "extension" ]; then
        print_status "Found structure: extension (already in place)"
        print_success "Standalone package extracted"
    elif [ -f "cline-core.js" ]; then
        print_status "Found flat structure (files extracted directly)"
        print_success "Standalone package extracted"
    else
        print_warning "Unexpected structure after extraction. Listing contents..."
        ls -la
        print_error "Failed to find expected files after extraction"
        cd ..
        exit 1
    fi
else
    print_error "standalone.zip not found!"
    cd ..
    exit 1
fi
cd ..

# Step 7: Start services
echo ""
echo "========================================"
echo "  Starting Cline Services"
echo "========================================"
echo ""

print_status "Starting Hostbridge on port 26041..."
./cli/bin/cline-host --port 26041 --verbose > /tmp/cline-hostbridge.log 2>&1 &
HOSTBRIDGE_PID=$!
sleep 3

# Verify hostbridge started
if ps -p $HOSTBRIDGE_PID > /dev/null 2>&1; then
    print_success "Hostbridge started (PID: $HOSTBRIDGE_PID)"
else
    print_error "Hostbridge failed to start"
    echo "Check logs: tail -f /tmp/cline-hostbridge.log"
    exit 1
fi

print_status "Starting Cline Core on port 8080..."
cd dist-standalone
node cline-core.js --port 8080 --host-bridge-port 26041 > /tmp/cline-core.log 2>&1 &
CLINE_CORE_PID=$!
cd ..
sleep 3

# Verify core started
if ps -p $CLINE_CORE_PID > /dev/null 2>&1; then
    print_success "Cline Core started (PID: $CLINE_CORE_PID)"
else
    print_error "Cline Core failed to start"
    echo "Check logs: tail -f /tmp/cline-core.log"
    kill $HOSTBRIDGE_PID 2>/dev/null
    exit 1
fi

print_status "Starting Frontend on port 25463..."
cd webview-ui
PLATFORM=standalone npm run dev -- --host > /tmp/cline-frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
sleep 5

# Verify frontend started
if ps -p $FRONTEND_PID > /dev/null 2>&1; then
    print_success "Frontend started (PID: $FRONTEND_PID)"
else
    print_warning "Frontend may have failed to start"
    echo "Check logs: tail -f /tmp/cline-frontend.log"
fi

# Save PIDs for later cleanup
echo "$HOSTBRIDGE_PID" > /tmp/cline-services.pid
echo "$CLINE_CORE_PID" >> /tmp/cline-services.pid
echo "$FRONTEND_PID" >> /tmp/cline-services.pid

# Final status
echo ""
echo "========================================"
echo -e "${GREEN}✓ Cline Standalone Started!${NC}"
echo "========================================"
echo ""
echo "Services Running:"
echo "  • Hostbridge:  http://localhost:26041 (PID: $HOSTBRIDGE_PID)"
echo "  • Cline Core:  http://localhost:8080  (PID: $CLINE_CORE_PID)"
echo "  • Frontend:    http://localhost:25463 (PID: $FRONTEND_PID)"
echo ""
echo -e "${GREEN}🚀 Access Cline at: http://localhost:25463${NC}"
echo ""
echo "Log Files:"
echo "  • tail -f /tmp/cline-hostbridge.log"
echo "  • tail -f /tmp/cline-core.log"
echo "  • tail -f /tmp/cline-frontend.log"
echo ""
echo "To stop all services:"
echo "  • Press Ctrl+C"
echo "  • Or run: pkill -f 'cline-host|cline-core.js|vite'"
echo ""
echo "Press Ctrl+C to stop all services..."

# Cleanup function
cleanup() {
    echo ""
    print_warning "Stopping all services..."
    
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null && print_success "Frontend stopped"
    fi
    
    if [ -n "$CLINE_CORE_PID" ]; then
        kill $CLINE_CORE_PID 2>/dev/null && print_success "Cline Core stopped"
    fi
    
    if [ -n "$HOSTBRIDGE_PID" ]; then
        kill $HOSTBRIDGE_PID 2>/dev/null && print_success "Hostbridge stopped"
    fi
    
    rm -f /tmp/cline-services.pid
    print_success "All services stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Keep script running
wait
