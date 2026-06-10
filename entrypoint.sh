#!/bin/sh
set -e

# Start API
node /app/packages/api/dist/index.js &

# Start Next.js — unset HOSTNAME so it binds to 0.0.0.0 instead of the container IP
env -u HOSTNAME PORT=4000 node /app/packages/web/packages/web/server.js &

# Wait for both to start then show listening ports
sleep 10
echo "=== Listening ports ==="
netstat -tlnp || echo "netstat not available"

# Start nginx in foreground (PID 1)
exec nginx -g "daemon off;"
