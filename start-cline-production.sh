#!/bin/bash
set -e

echo "Starting Cline Production Services..."

# Quick cleanup
pkill -f cline-host 2>/dev/null || true
pkill -f cline-core 2>/dev/null || true
pkill -f "node prod-server" 2>/dev/null || true
sleep 1

# CRITICAL: Start health check server FIRST and IMMEDIATELY
echo "Starting health check server on port 5000..."
cd webview-ui || { echo "ERROR: webview-ui directory not found"; exit 1; }

# Create production server with IMMEDIATE health check response
cat > prod-server.cjs << 'SERVEREOF'
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5000;
const BUILD_DIR = path.join(__dirname, 'build');

console.log('[prod-server] Starting on port', PORT);

const server = http.createServer((req, res) => {
  // IMMEDIATE health check response - no delays
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache'
    });
    res.end('OK\n');
    return;
  }
  
  // Serve static files
  let filePath = path.join(BUILD_DIR, req.url === '/' ? 'index.html' : req.url);
  
  if (!fs.existsSync(filePath)) {
    filePath = path.join(BUILD_DIR, 'index.html');
  }
  
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
  };
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      console.error('[prod-server] 404:', req.url);
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(200, { 
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600'
      });
      res.end(content);
    }
  });
});

server.on('error', (err) => {
  console.error('[prod-server] Server error:', err);
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('[prod-server] Listening on 0.0.0.0:' + PORT);
  console.log('[prod-server] Ready to accept connections');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[prod-server] Received SIGTERM, closing server...');
  server.close(() => {
    console.log('[prod-server] Server closed');
    process.exit(0);
  });
});
SERVEREOF

# Start the server
node prod-server.cjs 2>&1 &
FRONTEND_PID=$!
cd ..

# Give server a moment to bind to port
sleep 2

# Verify health check is responding
echo "Verifying health check..."
HEALTH_OK=0
for i in {1..15}; do
    if curl -f -s -m 2 http://localhost:5000/health > /dev/null 2>&1; then
        echo "✓ Health check responding (attempt $i)"
        HEALTH_OK=1
        break
    fi
    echo "  Waiting for health check... ($i/15)"
    sleep 1
done

if [ $HEALTH_OK -eq 0 ]; then
    echo "ERROR: Health check not responding after 15 seconds"
    echo "Frontend log:"
    tail -20 /tmp/frontend.log 2>/dev/null || echo "No log available"
    exit 1
fi

# Now start backend services
echo "Starting Hostbridge..."
if [ ! -f "./cli/bin/cline-host" ]; then
    echo "ERROR: cline-host binary not found"
    exit 1
fi

./cli/bin/cline-host --port 26041 > /tmp/hostbridge.log 2>&1 &
HOSTBRIDGE_PID=$!

sleep 2

echo "Starting Cline Core..."
if [ ! -f "dist-standalone/cline-core.js" ]; then
    echo "ERROR: cline-core.js not found"
    exit 1
fi

cd dist-standalone
node cline-core.js --port 8080 --host-bridge-port 26041 > /tmp/cline-core.log 2>&1 &
CLINE_CORE_PID=$!
cd ..

# Verify all processes are running
sleep 2
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "ERROR: Frontend process died"
    exit 1
fi

if ! kill -0 $HOSTBRIDGE_PID 2>/dev/null; then
    echo "ERROR: Hostbridge process died"
    exit 1
fi

if ! kill -0 $CLINE_CORE_PID 2>/dev/null; then
    echo "ERROR: Cline Core process died"
    exit 1
fi

echo ""
echo "✓ All services started successfully:"
echo "  Frontend PID: $FRONTEND_PID (port 5000) - Health check: OK"
echo "  Hostbridge PID: $HOSTBRIDGE_PID (port 26041)"
echo "  Cline Core PID: $CLINE_CORE_PID (port 8080)"
echo ""
echo "Application is ready to accept traffic"
echo ""
echo "Logs available at:"
echo "  Frontend: tail -f /tmp/frontend.log"
echo "  Hostbridge: tail -f /tmp/hostbridge.log"
echo "  Cline Core: tail -f /tmp/cline-core.log"

# Cleanup handler
cleanup() {
    echo ""
    echo "Shutting down services..."
    kill $FRONTEND_PID $CLINE_CORE_PID $HOSTBRIDGE_PID 2>/dev/null || true
    wait 2>/dev/null || true
    echo "Shutdown complete"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Keep script running and monitor processes
echo "Monitoring services... (Ctrl+C to stop)"
while true; do
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "ERROR: Frontend died unexpectedly"
        exit 1
    fi
    if ! kill -0 $HOSTBRIDGE_PID 2>/dev/null; then
        echo "ERROR: Hostbridge died unexpectedly"
        exit 1
    fi
    if ! kill -0 $CLINE_CORE_PID 2>/dev/null; then
        echo "ERROR: Cline Core died unexpectedly"
        exit 1
    fi
    sleep 10
done