#!/bin/sh
set -e

# Start API
node /app/packages/api/dist/index.js &

# Start Next.js
node /app/packages/web/server.js &

# Start nginx in foreground (PID 1)
exec nginx -g "daemon off;"