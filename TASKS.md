# Project Tasks

This file outlines the development tasks for the "Qué hacer en..." project. We will track our progress here by checking off items as we complete them. This list will be continuously updated as the project evolves.

## Project Foundation (MVP)
- [x] Set up monorepo structure with pnpm workspaces (/api, /web, /app packages)
- [x] Configure environment variables and .env setup for all packages

## Web App Frontend (MVP)
- [x] Initialize Next.js web application with TypeScript and SSR configuration
- [x] Create mock events.json database with sample event data for multiple cities
- [x] Create landing page with city selection functionality
- [x] Build event listing page with server-side rendering for SEO (/eventos/[city])
- [x] Set up responsive design with mobile-first approach

## UI/UX Design Implementation
- [x] Create comprehensive design system based on provided prototype
- [x] Implement hero section with purple gradient background and city-specific content
- [x] Build search component with integrated category dropdown
- [x] Create top navigation bar with location selector and "Crear Evento" button
- [x] Design and implement event cards with proper styling and layout
- [x] Build category filter navigation (Todos, Música, Arte, etc.)
- [x] Implement responsive design for mobile and desktop
- [x] Add hover states and interactive animations
- [x] Create reusable UI components following design system
- [x] Implement custom background image integration with gradient overlay
- [x] Configure sticky navigation with enhanced search functionality
- [x] Implement system fonts strategy for optimal performance in Latin American markets
- [x] Enhance search component width for better desktop experience
- [x] Adjust hero section typography to match prototype specifications
- [x] Update gradient colors to darker purple tones for better visual impact
- [x] Hide "Crear Evento" button on mobile view in navigation
- [x] Replace search icon with search bar on medium+ screens in navigation
- [x] Improve search bar visibility with better contrast and styling
- [x] Implement responsive search bar sizing for larger screens
- [x] Add mobile search functionality with expandable second row

## Backend API Development (Next Priority)
- [x] Set up Express.js server with TypeScript configuration
- [x] Design and implement RESTful API endpoints
  - [x] GET /api/events (all events with filtering)
  - [x] GET /api/events/[city] (city-specific events)
  - [x] GET /api/events/id/[id] (individual event details)
  - [x] POST /api/events (create event - for organizers)
- [x] Implement proper error handling and validation
  - [x] Define event schema (zod/joi)
  - [x] Validate query params (city, category, q)
  - [x] Consistent error responses (status codes + payload)
- [x] Connect frontend to backend API instead of local mock data
- [x] Add request logging and basic security measures
 - [x] Add API unit tests (Jest + Supertest)
- [x] Security hardening
  - [x] Rate limiting (express-rate-limit)
  - [x] CORS by environment (dev/stage/prod)
  - [x] Correlation ID in logs
- [x] Pagination & sorting
  - [x] Query params: page, limit, sort (date, price)
  - [x] Web UI: soporte de paginación en /eventos/[city] y utilidades de API
- [x] Additional API tests (phase 2)
  - [x] POST /api/events (happy path válido)
  - [x] Cabeceras de rate limit presentes y coherentes
  - [x] `x-correlation-id` presente en respuestas y propagado
  - [x] Orden por fecha considerando fecha+hora (evitar empates) y orden estable
- [x] Additional filters
  - [x] Date range (from, to)
  - [x] Price range (minPrice, maxPrice)
- [x] Performance
  - [x] In-memory response caching by filter combination
- [x] Additional tests
  - [x] Validation error cases
  - [x] Pagination and limits
  - [x] Accent/diacritics-insensitive search
  - [x] Cache hit/expiry coverage vía router factory
  - [x] Search OR branches (título, descripción, location, tags)
  - [x] CORS: lista vacía permite origen entrante

## UX Enhancements (Based on Questions Analysis)
- [x] Implement loading states and skeleton screens for event cards
- [ ] Add progressive loading for images and search results
- [ ] Enhance search with autocomplete and suggestions
- [ ] Implement advanced filtering (date ranges, price ranges, distance)
- [x] Add 'no results' states with discovery suggestions
- [x] Create error handling for network issues and failed searches
- [x] Wire category and text filters via URL params and SSR to API
- [ ] Add CTA: "Ver más de [Categoría] en [Ciudad]" when category is active
- [x] Pagination UI (classic or Load More)
- [ ] ErrorBanner: add inline "Reintentar" action
- [ ] Images perf: ensure progressive/lazy via next/image in all lists
  - [ ] Configurar `next.config.js` con `images.remotePatterns` para pruebas o usar assets locales en test
- [ ] SEO
  - [ ] OG/Twitter cards per city
  - [ ] sitemap.xml and robots.txt
  - [ ] JSON-LD schema.org/Event for lists/detail
  
### Web Error Handling
- [ ] ErrorBanner: acción "Reintentar" funcional
  - [ ] Migrar sección a client o añadir boundary client para disparar recarga

## Database & Data Management
- [ ] Single source of truth for data
  - [x] Remove packages/web/src/data/events.json
  - [x] Document API as the only data source
  - [x] Remove duplicate `packages/api/events.json`
  - [x] Seed reads `events.json` from repo root
  - [ ] API reads from PostgreSQL for all endpoints
  - [ ] Retirar fallback JSON en entornos no-test una vez estable DB
- [ ] Category normalization
  - [ ] Master dictionary (slug + label) and mapping in API/UI
- [x] Choose database: PostgreSQL
- [ ] Set up production database (provider, backups, monitoring)
- [x] Design comprehensive database schema
- [x] Implement data migration from JSON to database
- [x] Add database indexing for performance
- [ ] Set up backup and recovery procedures
  - [x] Apply migrations in Supabase (Session Pooler)
  - [x] Seed Supabase with `events.json`
  - [ ] Configurar Session Pooler (6543) en todos los entornos (dev/CI/prod)
  - [ ] Gestionar secretos: `DATABASE_URL` en CI/CD y hosting
  - [ ] Backups/PITR y alertas básicas en proveedor
  - [ ] Mejorar índices de búsqueda: GIN trigram funcional con `unaccent(lower(...))` (title, description, venue, tags)
  - [ ] Tests API en modo DB (cobertura de filtros combinados y orden estable)

## Authentication & User Management
- [ ] Design user authentication strategy (email, social, phone)
- [ ] Implement user registration and login
- [ ] Create user profile management
- [ ] Add user roles (attendees, organizers, admins)
- [ ] Implement favorite events and user preferences

## Observability & Quality
- [ ] Monitoring/Errors: integrate Sentry (web + api)
- [ ] Analytics basics (page views, filters usage)
- [ ] CI/CD
  - [x] GitHub Actions: lint, test, build on PRs
  - [x] Coverage report in CI
  - [x] Job E2E headless (Linux) con matriz de navegadores (Chromium/Firefox/WebKit)
  - [x] Workflow CI completo (pnpm + Node 22 + caché)
    - [x] Jobs: lint (web+api), unit tests (api), build (web+api)
    - [x] E2E (Playwright): instalar browsers, ejecutar contra build de producción
    - [x] Artefactos: subir reportes de Playwright (HTML) y traces al fallar
    - [x] Disparadores: `pull_request` y `push` a `master`
    - [x] Concurrency y cancelación de ejecuciones obsoletas en PRs

### E2E Tests (Web)
- [ ] Navegación y rutas
  - [x] Landing (`/`): selección de ciudad redirige a `/eventos/[city]`
  - [x] Ciudad inválida (`/eventos/unknown-city`) muestra 404/not-found
  - [ ] Preservación de parámetros al navegar atrás/adelante del navegador
- [ ] Paginación y tamaño de página
  - [ ] Selector "Por página" (`limit`) cambia conteo y actualiza URL; persiste entre páginas
  - [ ] "Anterior" deshabilitado en página 1; "Siguiente" deshabilitado en última
  - [ ] Deep link fuera de rango (`page` > `totalPages`) maneja estado esperado
- [ ] Ordenamiento
  - [ ] Orden por fecha asc/desc reordena correctamente
  - [x] Orden por precio asc/desc reordena correctamente
  - [ ] Persistencia de `sort` y `order` al cambiar de página y al cambiar `limit`
- [ ] Búsqueda y filtros
  - [ ] Búsqueda por texto (`q`) con acentos/diacríticos-insensible
  - [ ] Filtro por categoría resetea `page` y preserva otros parámetros
  - [ ] Combinación de `q` + categoría con paginación y orden aplicado
- [ ] Estados vacíos y error
  - [x] `NoResults` cuando no hay coincidencias (contenido y enlaces sugeridos)
  - [ ] Falla de red/API caída muestra `ErrorBanner` con mensaje adecuado
  - [ ] Botón "Reintentar" de `ErrorBanner` dispara recarga (cuando se migre a client)
- [ ] Accesibilidad
  - [ ] Navegación por teclado en paginación y selects; foco visible
  - [x] ARIA labels en controles de orden y tamaño de página
- [ ] SEO (bloqueado hasta implementación)
  - [ ] Título/meta tags por ciudad
  - [ ] `sitemap.xml` y `robots.txt`
  - [ ] JSON-LD `schema.org/Event` en listas/detalle
- [ ] Infraestructura E2E
  - [x] Ejecutar E2E contra build de producción (`next build` + `next start`)
  - [x] Mock/unoptimized de `next/image` para E2E
  - [ ] Fixtures/seed de datos deterministas para E2E
  - [x] Matriz de navegadores (Chromium, Firefox, WebKit)

## Documentation & DX
- [x] Provide .env.example (root, web, api) with variable explanations
  - [x] Añadir valores por defecto para dev/test (puertos, NEXT_PUBLIC_API_URL)
- [x] Frontend: scripts usan PORT en lugar de `-p 4000`; Playwright inyecta `PORT=4000` en E2E
- [ ] Document API endpoints in packages/api/README.md
- [ ] Developer guide: local setup and common scripts (pnpm)
  - [ ] Documentar flujo E2E (webServer, scripts, variables) en `packages/web/README.md`

## Advanced Features & Optimization
- [ ] Add geolocation feature to auto-detect user's city
- [ ] Create interactive map view for event locations  
- [ ] Implement payment processing and booking system
- [ ] Add social media sharing and viral features
- [ ] Create recommendation engine based on user behavior
- [ ] Implement analytics and performance monitoring
- [ ] Add multilingual support and localization
- [ ] Create event organizer dashboard and management tools

## Business & Growth Features
- [ ] Implement revenue model (commissions, subscriptions, ads)
- [ ] Add email marketing and user retention features
- [ ] Create referral programs and user acquisition tools
- [ ] Implement A/B testing framework
- [ ] Add content moderation and safety features
- [ ] Create API rate limiting and security measures

## Mobile Application (React Native)
- [ ] Set up Expo development environment
- [ ] Create shared component library between web and mobile
- [ ] Implement platform-specific navigation
- [ ] Add push notifications
- [ ] Implement offline functionality
- [ ] Share types and utilities with web
- [ ] First screens: city selector + event feed
- [ ] Sync filters and queries with API