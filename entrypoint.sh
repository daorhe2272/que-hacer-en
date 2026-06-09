#!/bin/sh
set -e

echo "=== Locating Next.js server.js ==="
find /app -name "server.js" -not -path "*/node_modules/*" 2>/dev/null

# Start API
node /app/packages/api/dist/index.js &

# Start Next.js
PORT=4000 node /app/packages/web/packages/web/server.js &

# Start nginx in foreground (PID 1)
exec nginx -g "daemon off;"