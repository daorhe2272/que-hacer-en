# Stage 1: install dependencies
FROM node:22-alpine AS deps

RUN npm install -g pnpm@8.15.0

# Keep this so any transitive tooling does not pull a browser into the build layers
ENV PUPPETEER_SKIP_DOWNLOAD=true

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/
COPY packages/web/package.json ./packages/web/
# Reason: app's manifest is required for --frozen-lockfile to match the lockfile,
# but no app source is ever copied into the image (see .dockerignore).
COPY packages/app/package.json ./packages/app/

RUN pnpm install --frozen-lockfile

# Stage 2: build
FROM deps AS builder

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WEB_URL

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WEB_URL=$NEXT_PUBLIC_WEB_URL

COPY . .

RUN pnpm --filter @que-hacer-en/shared run build
RUN pnpm --filter @que-hacer-en/api run build
RUN pnpm --filter @que-hacer-en/web run build

# Stage 3: prune API to production-only dependencies
FROM builder AS prod-deps

RUN pnpm --filter=@que-hacer-en/api deploy --prod /app/deploy-api

# Stage 4: production image
FROM nginx:alpine AS production

# Chromium + the runtime libraries Puppeteer needs to launch it on Alpine (musl).
# nodejs runs the Express API and Next.js standalone server.
RUN apk add --no-cache \
    nodejs \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Point puppeteer-core at the system Chromium installed above.
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# API: copy the pruned, production-only deploy bundle (dist + prod node_modules).
COPY --from=prod-deps /app/deploy-api ./packages/api

# Next.js standalone output (self-contained, no node_modules needed)
COPY --from=builder /app/packages/web/.next/standalone ./packages/web
COPY --from=builder /app/packages/web/.next/static ./packages/web/packages/web/.next/static
COPY --from=builder /app/packages/web/public ./packages/web/packages/web/public

# nginx config and entrypoint
COPY nginx.conf /etc/nginx/nginx.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

CMD ["/entrypoint.sh"]