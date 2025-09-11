# Multi-stage build for full-stack app
FROM node:22-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm@8.15.0

# Set working directory
WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package.json files for each package
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/
COPY packages/web/package.json ./packages/web/
COPY packages/app/package.json ./packages/app/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder

# Define build arguments for Next.js environment variables
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WEB_URL

# Set environment variables for the build
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WEB_URL=$NEXT_PUBLIC_WEB_URL

# Copy all source code
COPY . .

# Build all packages
RUN pnpm --filter @que-hacer-en/shared run build
RUN pnpm --filter @que-hacer-en/api run build
RUN pnpm --filter @que-hacer-en/web run build

# Production stage
FROM node:22-alpine AS production

# Install pnpm and process manager
RUN npm install -g pnpm@8.15.0 pm2

WORKDIR /app

# Copy package files for production install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/
COPY packages/web/package.json ./packages/web/
COPY packages/app/package.json ./packages/app/

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts and source
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/web/.next ./packages/web/.next
COPY --from=builder /app/packages/web/public ./packages/web/public
COPY --from=builder /app/packages/web/package.json ./packages/web/package.json
COPY --from=builder /app/packages/web/next.config.js ./packages/web/next.config.js

# Copy package.json files for runtime
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/api/package.json ./packages/api/package.json

# Create PM2 ecosystem file
COPY <<EOF /app/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'api',
      cwd: '/app/packages/api',
      script: 'pnpm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.API_PORT || 4001
      }
    },
    {
      name: 'web',
      cwd: '/app/packages/web',
      script: 'pnpm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.WEB_PORT || 4000
      }
    }
  ]
};
EOF

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

# Change ownership
RUN chown -R appuser:nodejs /app
USER appuser

# Expose both ports
EXPOSE 4000 4001

# Health check for both services
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4001/api/health && \
        wget --no-verbose --tries=1 --spider http://localhost:4000 || exit 1

# Start both services with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]