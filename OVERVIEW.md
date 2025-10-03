# OVERVIEW.md

## 1. Project Purpose

"Qué hacer en..." is a web application designed to help users discover local events in their city. The platform enables users to browse, search, and save events, while organizers can create and manage their own events. The primary goal is to provide a simple, intuitive platform for finding entertainment and activities with a complete user management system. The project is built with future expansion in mind, allowing for a straightforward transition into native Android and iOS applications.

All user-facing content will be in Spanish.

## 2. General Architecture

The project is structured as a **TypeScript monorepo** managed with a package manager like `pnpm` or `yarn workspaces`. This approach enables maximum code reuse and a streamlined development process across different parts of the application.

The architecture is composed of three main packages:

*   `/api`: A **Node.js/Express.js** backend that serves as the central REST API for the application. It handles business logic and data retrieval.
*   `/web`: A **Next.js** application for the web frontend. It leverages Server-Side Rendering (SSR) to ensure optimal performance and SEO.
*   `/app`: An **Expo (React Native)** application for the native mobile clients (iOS & Android). This package will share a significant amount of UI components and logic with the `/web` package.

### SEO Strategy

A core architectural requirement is strong SEO performance. To achieve this, the `/web` application will use Next.js to generate dynamic, server-rendered pages for each city (e.g., `/eventos/bogota`). This ensures that search engine crawlers can fully index content-rich pages, significantly improving the chances of ranking for search terms like "Qué hacer en Bogotá?".

## 3. Tech Stack

*   **Language**: TypeScript
*   **Monorepo Manager**: pnpm / yarn
*   **Frontend (Web)**: React, Next.js
*   **Frontend (Mobile)**: React Native, Expo
*   **Backend**: Node.js, Express.js
*   **Database**: PostgreSQL (Supabase) with full migration and seeding system
*   **Authentication**: Supabase Auth with Google OAuth integration
*   **Styling**: Tailwind CSS for utility-first styling. The web package uses Tailwind CSS with PostCSS and Autoprefixer for optimal browser compatibility.
*   **Testing**: Jest for unit tests, Playwright for E2E testing

## 4. Development Roadmap

The project will be developed in phases:

1.  **Phase 1: Project Foundation & Backend (MVP)** ✅ *Complete*
    *   Set up the monorepo structure. ✅
    *   Develop the Node.js API with endpoints for fetching events. ✅
    *   Create a mock `events.json` database. ✅
2.  **Phase 2: Web App Frontend (MVP)** ✅ *Complete*
    *   Build the Next.js web application. ✅
    *   Create the landing page (city selection) and event listing pages. ✅
    *   Implement SSR for city-specific event pages. ✅
    *   Design and implement comprehensive UI/UX system. ✅
    *   Custom background image integration with gradient overlay. ✅
    *   Sticky navigation with search functionality. ✅
    *   System fonts implementation for optimal performance. ✅
    *   Responsive search component with enhanced width. ✅
3.  **Phase 3: Backend API Development** ✅ *Complete*
    *   Node.js/Express API implemented and connected to web frontend ✅
    *   In-memory response caching for list endpoints ✅
    *   CORS, rate limiting, correlation IDs, pagination, sorting, and filters ✅
4.  **Phase 4: Database & Authentication** ✅ *Complete*
    *   PostgreSQL database with Supabase integration ✅
    *   Database migrations and seeding system ✅
    *   Supabase Auth with Google OAuth ✅
    *   User management with role-based access control ✅
    *   JWT verification middleware ✅
5.  **Phase 5: User Features & Event Management** ✅ *Complete*
    *   User registration and login system ✅
    *   Event creation and management for organizers ✅
    *   Favorites/bookmarks functionality ✅
    *   User profiles and event management dashboards ✅
    *   Admin panel and statistics ✅
6.  **Phase 6: Testing & CI/CD** ✅ *Complete*
    *   Unit tests for API endpoints ✅
    *   E2E tests with Playwright ✅
    *   GitHub Actions CI/CD pipeline ✅
    *   Code coverage reporting ✅
7.  **Phase 7: Mobile App**
    *   Develop the Expo mobile app, reusing components from the web app.
    *   Adapt UI/UX for mobile devices.
    *   Implement mobile-specific features (push notifications, offline support)
8.  **Phase 8: Advanced Features**
    *   Geolocation, advanced filtering, map views
    *   Payment integration, analytics, and performance optimization
    *   Social features and event recommendations

## 5. Configuration & Environment Variables

- General
  - Real env files (`.env`, `.env.local`) are not committed.
  - Prefer per-package envs over root-level values.

- Web (`packages/web`)
  - `PORT` (default 4000)
  - `NEXT_PUBLIC_API_URL` (e.g., `http://localhost:4001`)
  - `NEXT_PUBLIC_WEB_URL` (e.g., `http://localhost:4000`)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `WEB_BASE_URL` (Playwright baseURL)
  - `E2E`, `CI` (flags)

- API (`packages/api`)
  - `PORT` (default 4001)
  - `CORS_ORIGINS` (CSV; empty = allow all)
  - `DATABASE_URL` (PostgreSQL connection string; uses Session Pooler 6543 on Supabase)
  - `HOST` (optional)
  - `NEXT_PUBLIC_SUPABASE_URL` (shared with web)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (shared with web)
  - `ENABLE_AUTH` (`true` to require auth for protected routes)

- App (`packages/app`)
  - `EXPO_PUBLIC_API_URL`
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

- Quick usage (PowerShell)
  - API (run): `pnpm --filter @que-hacer-en/api start`
  - API (DB setup: migrate + seed): `pnpm --filter @que-hacer-en/api db:setup`
  - Web: `$env:PORT="4000"; pnpm --filter @que-hacer-en/web start`
  - E2E: `pnpm --filter @que-hacer-en/web e2e`

Notes: prefer `CORS_ORIGINS`.

## 6. Styling & Conventions

### Styling

*   **Framework**: Tailwind CSS with comprehensive custom design system
*   **Design Philosophy**: Apple-level aesthetics with cultural relevance for Latin American markets
*   **Color System**: 
    *   Primary: Purple 600 (#6A3DE8) - main brand color
    *   Accent: Orange 400 (#FF6B35) - highlights and CTAs
    *   Complementary: Teal 500 (#00A9A5) - visual variety
    *   Extended color ramps with 50-900 shades for each color
    *   Dark purple gradient overlay (primary-700 to primary-900) for hero sections
*   **Typography**: System fonts with 150% line height for body text, 120% for headings
*   **Navigation**: Sticky top navigation with integrated search functionality
*   **Animations**: Custom fadeIn/slideIn animations with 0.3s ease-in-out timing
*   **Components**: Reusable component library with consistent shadows, borders, and interactions

### Conventions

*   **File Naming**: `kebab-case.ts` for general files, `PascalCase.tsx` for React components.
*   **Component Structure**: Components should be organized by feature. Shared components will reside in a common `components` directory within the `web` and `app` packages.
*   **Commits**: The [Conventional Commits](https://www.conventionalcommits.org/) standard should be followed (e.g., `feat:`, `fix:`, `docs:`, `chore:`).
*   **API**: All communication between the frontend and backend will be done via a RESTful API with clear and consistent JSON responses.
*   **Project Planning**: Comprehensive task tracking in `TASKS.md` and strategic questions in `QUESTIONS.md` guide development priorities and ensure professional-level quality.

## 7. API Architecture

### Three-Layer Pattern

All API endpoints follow a three-layer architecture:

1. **Express Backend** (`/packages/api/src/routes/`) - Handles business logic, validation, and database operations
2. **Next.js Proxy** (`/packages/web/src/app/api/`) - Forwards requests from client to backend using `createProxyHandler()` from `proxy-utils.ts`
3. **Client API** (`/packages/web/src/lib/api.ts`) - Provides typed functions for frontend components to call

This pattern ensures:
- Clean separation between frontend and backend
- Type-safe API calls with proper error handling
- Server-to-server communication in containerized deployments
- Consistent authentication header forwarding

### Authentication Integration

The API architecture integrates seamlessly with Supabase Auth:

- **JWT Verification**: Express middleware validates Supabase JWT tokens for protected routes
- **Role-Based Access**: User roles (attendee, organizer, admin) are enforced at the API level
- **Session Management**: Automatic token refresh and session validation
- **User Context**: Request objects are enriched with user information for authorization

## 8. Database Architecture

The platform uses PostgreSQL with Supabase as the database provider:

### Schema Design
- **Events**: Core entity with normalized relationships to cities and categories
- **Users**: User profiles with role-based permissions
- **Cities**: Location normalization with slug-based URLs
- **Categories**: Event categorization with hierarchical structure
- **Tags**: Flexible tagging system for events
- **Favorites**: Many-to-many relationship between users and events

### Database Features
- Full-text search with trigram indexing and accent normalization
- Timezone-aware event handling (America/Bogota)
- Database migrations with version control
- Automatic seeding from `events.json` for development
- Optimized queries with proper indexing

### Data Management
- Session pooler configuration for production
- Backup and recovery procedures
- Environment-specific database configurations
- Test database isolation with Testcontainers

## 9. Testing & CI/CD

The project enforces quality via automated pipelines:

- GitHub Actions runs lint, unit tests, build, and end-to-end tests with Node 22 and pnpm caching
- High test coverage thresholds are enforced in CI; coverage and E2E reports are uploaded as artifacts
- Unit tests focus on the API (validation, pagination, sorting, error handling, authentication) and run against PostgreSQL via Testcontainers where applicable

### E2E Strategy (Web)

- Playwright tests cover core user flows and run against a production build of the web app
- Browser matrix: Chromium, Firefox, WebKit
- Tests use accessible selectors (ARIA) and minimal `data-testid` only when necessary
- For CI/E2E scenarios, Next.js image optimization is disabled to avoid external fetches during tests
- Authentication flows tested with mock users and real OAuth integration

## 10. API Guarantees (High-Level)

- Pagination returns page, limit, total, and totalPages
- Sorting is stable; date sorting considers date+time with deterministic tie-breaking
- Requests and responses propagate `x-correlation-id` for traceability
- Standard rate-limit headers are included to communicate limits and remaining requests

### API Endpoints

#### Public Endpoints
- `GET /api/health`: health check
- `GET /api/events`: list with filters (`city`, `category`, `q`, `from`, `to`, `minPrice`, `maxPrice`, `page`, `limit`, `sort`, `order`) with in-memory caching
- `GET /api/events/:city`: events for a city
- `GET /api/events/id/:id`: event by legacy ID
- `GET /api/events/uuid/:id`: event by UUID

#### Authentication Required
- `GET /api/users/me`: get current user profile
- `POST /api/users/favorites`: add event to favorites
- `DELETE /api/users/favorites/:eventId`: remove event from favorites
- `GET /api/users/favorites`: get user's favorite events
- `GET /api/users/favorites/:eventId/status`: check if event is favorited

#### Organizer & Admin Endpoints
- `POST /api/events`: create new event (organizer role required)
- `PUT /api/events/manage/:id`: update event (owner or admin)
- `DELETE /api/events/manage/:id`: delete event (owner or admin)
- `GET /api/admin/stats`: get admin statistics (admin role required)

## 11. User Features & Interface

### Event Discovery
- City-based event browsing with SEO-friendly URLs
- Advanced filtering by category, date range, price, and location
- Full-text search with accent-insensitive matching
- Responsive grid layout with event cards
- Real-time search suggestions and filters

### User Interaction
- Favorites/bookmarks system with persistent storage
- Event sharing capabilities
- Mobile-first responsive design
- Loading states and error handling
- Accessible navigation and UI components

### Event Management
- Event creation form with validation and preview
- Image upload support with URL integration
- Organizer dashboard for managing events
- Event analytics and statistics for organizers
- Bulk operations and batch management

### Authentication Interface
- Multi-step authentication flow (choice → login/register → form)
- Google OAuth integration with redirect handling
- Password strength validation with real-time feedback
- Error messaging in Spanish with localization
- Session persistence and automatic logout handling

## 12. Environment & Configuration Notes

- Core variables include `NEXT_PUBLIC_API_URL`, `CORS_ORIGINS`, and `DATABASE_URL`, managed via `.env`
- An optional `E2E` flag can be used in test environments to adjust runtime behavior (e.g., image optimization)
- Supabase configuration requires both client and server environment variables

Backend behaviors:
- CORS allowlist via `CORS_ORIGINS` (empty = allow all)
- Rate limiting: 100 req/min under `/api/`
- In-memory cache (default TTL 15s) for event listings, disabled in test
- Authentication middleware with JWT verification
- Role-based access control for protected routes
