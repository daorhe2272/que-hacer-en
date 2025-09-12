# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Development Commands

### Setup & Installation
```powershell
# Install dependencies
pnpm install

# Setup database (migrate + seed)
pnpm --filter @que-hacer-en/api db:setup
```

### Development
```powershell
# Start all services in development
pnpm dev

# Start individual services
pnpm --filter @que-hacer-en/api dev     # API on port 4001
$env:PORT="4000"; pnpm --filter @que-hacer-en/web dev  # Web on port 4000
pnpm --filter @que-hacer-en/app start    # Mobile app
```

### Building & Testing
```powershell
# Build all packages
pnpm build

# Lint all packages
pnpm lint

# Run unit tests
pnpm test
pnpm --filter @que-hacer-en/api test:coverage

# Run E2E tests (web)
pnpm --filter @que-hacer-en/web e2e
pnpm --filter @que-hacer-en/web e2e:headed  # With UI
```

### Database Operations
```powershell
# Setup database from scratch
pnpm --filter @que-hacer-en/api db:setup

# Run migrations only
pnpm --filter @que-hacer-en/api db:migrate

# Seed database only
pnpm --filter @que-hacer-en/api db:seed
```

## Architecture Overview

This is a TypeScript monorepo using pnpm workspaces with the following packages:

- **`/packages/api`**: Node.js/Express REST API with PostgreSQL (Supabase)
- **`/packages/web`**: Next.js SSR application with Tailwind CSS  
- **`/packages/app`**: Expo React Native mobile app
- **`/packages/shared`**: Shared types, utilities, and constants

### Key Architectural Patterns

**Database Strategy**: PostgreSQL via Supabase with Session Pooler (port 6543). The `events.json` file is retained for seeding and test fallbacks only.

**Authentication**: Supabase Auth with Google OAuth, JWT middleware in API, role-based authorization (`attendee`, `organizer`, `admin`).

**API Design**: RESTful endpoints with:
- Pagination (page, limit, total, totalPages)  
- Stable sorting with deterministic tie-breaking
- Correlation IDs (`x-correlation-id`) for request traceability
- Rate limiting (100 req/min under `/api/`)
- In-memory caching (15s TTL, disabled in tests)

**SEO Strategy**: Next.js SSR for city-specific pages (`/eventos/[city]`) with comprehensive meta tags, sitemaps, and JSON-LD schema.

## Development Standards

### File Organization
```
packages/
├── api/src/
│   ├── routes/          # API route handlers
│   ├── middleware/      # Auth, validation middleware
│   ├── db/             # Database migrations, seeds
│   └── types/          # API-specific types
├── web/src/
│   ├── app/            # Next.js app router
│   ├── components/     # Reusable React components
│   ├── lib/            # Client utilities, Supabase config
│   └── types/          # Web-specific types
├── shared/src/
│   ├── categories.ts   # Master category definitions
│   └── index.ts        # Exported shared utilities
```

### Key Technologies & Patterns

**TypeScript**: Strict mode enabled across all packages with shared types in `/packages/shared`.

**Styling**: Tailwind CSS with comprehensive design system defined in `DESIGN.json`. Uses system fonts for performance, mobile-first responsive design.

**Testing**: 
- Jest unit tests for API with PostgreSQL via Testcontainers
- Playwright E2E tests for web across Chromium/Firefox/WebKit
- High coverage thresholds enforced in CI

**Package Management**: Always use `pnpm` with workspace filters:
```powershell
pnpm --filter @que-hacer-en/web add react-query
pnpm --filter @que-hacer-en/api add joi
```

### Environment Variables

**API (packages/api)**:
- `DATABASE_URL`: PostgreSQL connection (Session Pooler 6543)
- `CORS_ORIGINS`: CSV of allowed origins (empty = allow all)
- `ENABLE_AUTH`: Set to 'true' to require auth for protected routes
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: For JWT verification

**Web (packages/web)**:
- `NEXT_PUBLIC_API_URL`: API base URL (e.g., http://localhost:4001)
- `NEXT_PUBLIC_WEB_URL`: Web app URL (e.g., http://localhost:4000)  
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Client auth
- `E2E`, `CI`: Test environment flags

## Project Workflow Requirements

### Before Starting New Work
1. **Always** read `OVERVIEW.md` for current project context
2. Check `TASKS.md` for existing task status and priorities
3. Consult `DESIGN.json` for any UI/frontend work
4. Review cursor rules in `.cursor/rules/rules.mdc` for coding standards

### During Development
- Add new tasks/discoveries to `TASKS.md`  
- Follow naming conventions: `kebab-case.ts`, `PascalCase.tsx` for components
- Implement comprehensive tests (unit + E2E) for new features
- All user-facing content must be in Spanish
- Use established design system from `DESIGN.json`

### Task Completion Protocol
When user asks to "wrap up work":
1. Update `TASKS.md` with current status
2. Ensure code quality meets professional standards
3. Create/update relevant tests and verify they pass
4. Run linting: `pnpm lint`
5. Add and commit changes with conventional commit format
6. Push to appropriately named remote branch

## Testing Strategy

### Unit Testing (API)
- Focus on validation, pagination, sorting, error handling
- Run against PostgreSQL with Testcontainers when needed
- High coverage requirements enforced in CI

### E2E Testing (Web)
- Playwright tests against production builds
- Cover core user flows: search, filtering, navigation, auth
- Use accessible selectors (ARIA), minimal `data-testid`
- Tests run on Linux in CI with artifact uploads

### Test Commands
```powershell
# API unit tests with coverage
pnpm --filter @que-hacer-en/api test:coverage

# Web E2E tests
pnpm --filter @que-hacer-en/web e2e

# Single test file
pnpm --filter @que-hacer-en/api test -- --testNamePattern="events"
```

## Common Gotchas

- **Windows Environment**: Use PowerShell syntax for command line instructions
- **Package Boundaries**: Never directly import from other packages' internal modules
- **Database**: Always use `DATABASE_URL` with Session Pooler port 6543 for Supabase
- **File Length**: Never create files longer than 800 lines; refactor into modules
- **Design System**: Always consult `DESIGN.json`; never create custom colors/animations outside the established system
- **Environment**: Real `.env` files are not committed; use `.env.example` for documentation