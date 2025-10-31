#!/bin/bash

# Cline Production Startup Script for Replit Autoscale Deployment
echo "Starting Cline Production Services..."

# Kill any existing processes
lsof -ti:26041 | xargs kill -9 2>/dev/null
lsof -ti:8080 | xargs kill -9 2>/dev/null
lsof -ti:5000 | xargs kill -9 2>/dev/null
sleep 1

# Start Hostbridge
echo "Starting Hostbridge..."
./cli/bin/cline-host --port 26041 --verbose > /tmp/hostbridge.log 2>&1 &
HOSTBRIDGE_PID=$!

# Start Cline Core
echo "Starting Cline Core..."
cd dist-standalone
node cline-core.js --port 8080 --host-bridge-port 26041 > /tmp/cline-core.log 2>&1 &
CLINE_CORE_PID=$!
cd ..

# Create a simple health check server on port 5000
echo "Starting Frontend Server with Health Check..."
cd webview-ui

# Create production server file
cat > prod-server.js << 'EOF'
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5000;
const BUILD_DIR = path.join(__dirname, 'build');

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Handle health check - MUST respond immediately
  if (req.url === '/' || req.url === '/health') {
    const indexPath = path.join(BUILD_DIR, 'index.html');
    
    // Check if index.html exists
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath);
      res.writeHead(200, { 
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    } else {
      // Return minimal HTML if build doesn't exist yet
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body>Cline is starting...</body></html>');
    }
    return;
  }

  // Serve static files
  let filePath = path.join(BUILD_DIR, req.url);
  
  // Default to index.html for client-side routing
  if (!fs.existsSync(filePath)) {
    filePath = path.join(BUILD_DIR, 'index.html');
  }
  
  // Get file extension
  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // Try serving index.html for client-side routing
        const indexPath = path.join(BUILD_DIR, 'index.html');
        fs.readFile(indexPath, (err, indexContent) => {
          if (err) {
            res.writeHead(404);
            res.end('Not found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(indexContent);
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 
        'Content-Type': mimeType,
        'Cache-Control': extname === '.html' ? 'no-cache' : 'public, max-age=3600'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend server running on http://0.0.0.0:${PORT}`);
  console.log('Health check ready at /');
});

// Handle shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
EOF

# Start the production server
node prod-server.js > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Give services a moment to start
sleep 2

# Verify health check works
echo "Testing health check..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/ | grep -q "200"; then
    echo "✓ Health check responding correctly"
else
    echo "⚠ Health check may not be ready yet"
fi

echo ""
echo "Services started:"
echo "  Hostbridge PID: $HOSTBRIDGE_PID"
echo "  Cline Core PID: $CLINE_CORE_PID"
echo "  Frontend PID: $FRONTEND_PID"
echo ""

# Cleanup function
cleanup() {
    echo "Shutting down services..."
    kill $FRONTEND_PID $CLINE_CORE_PID $HOSTBRIDGE_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Keep the script running
wait