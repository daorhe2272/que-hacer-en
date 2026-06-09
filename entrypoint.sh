#!/bin/sh
set -e

# Start API
node /app/packages/api/dist/index.js &

# Start Next.js
PORT=4000 node /app/packages/web/packages/web/server.js &

# Wait for both to start then show listening ports
sleep 10
echo "=== Listening ports ==="
ss -tlnp || netstat -tlnp || echo "No ss or netstat available"

# Start nginx in foreground (PID 1)
exec nginx -g "daemon off;"