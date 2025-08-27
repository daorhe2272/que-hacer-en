# Project Tasks

This file outlines the development tasks for the "Qué hacer en..." project. We will track our progress here by checking off items as we complete them. This list will be continuously updated as the project evolves.

## ✅ Completed: Web App Frontend (MVP)
  Delivered a Next.js frontend in TypeScript with SSR, a city-selection landing page, SEO-friendly event listings at `/eventos/[city]`, a mock events dataset for multiple cities, and a mobile-first responsive layout.

## ✅ Completed: UI/UX Design Implementation
  Delivered a cohesive, responsive UI aligned with the design system: city‑aware hero with purple gradient, sticky navigation with a prominent responsive search, reusable event cards and category filters, polished interactions, and performance‑oriented system fonts.

## ✅ Completed; Backend API Development
  Delivered a TypeScript Express REST API powering the web app: validated endpoints for listing and fetching events (city-specific, with rich filtering including category, text, date and price ranges), pagination and sorting; consistent error handling and structured logging; security hardening with rate limiting, environment-aware CORS and correlation IDs; in-memory caching for performance; fully integrated with the frontend and covered by comprehensive tests (validation, stable ordering, headers and diacritics-insensitive search).

## 🚧 In progress: UX Enhancements (Based on Questions Analysis)
- [x] Implement loading states and skeleton screens for event cards
- [ ] Add progressive loading for images and search results
- [ ] Enhance search with autocomplete and suggestions
- [ ] Implement advanced filtering (date ranges, price ranges, distance)
- [x] Add 'no results' states with discovery suggestions
- [x] Create error handling for network issues and failed searches
- [x] Wire category and text filters via URL params and SSR to API
- [ ] Add CTA: "Ver más de [Categoría] en [Ciudad]" when category is active
- [x] Pagination UI (classic or Load More)
- [x] ErrorBanner: add inline "Reintentar" action
- [x] Images perf: ensure progressive/lazy via next/image in all lists
  - [x] Configurar `next.config.js` con `images.remotePatterns` para pruebas o usar assets locales en test
- [x] SEO
  - [x] OG/Twitter cards per city
  - [x] sitemap.xml and robots.txt
  - [x] JSON-LD schema.org/Event for lists/detail
  
### ✅ Completed: Web Error Handling
- [x] ErrorBanner: acción "Reintentar" funcional
  - [x] Migrar sección a client o añadir boundary client para disparar recarga

## ✅ Completed: Database & Data Management
  Established the API as the single source of truth and migrated from JSON to PostgreSQL: designed and indexed the schema, normalized categories with a master dictionary, applied migrations and Session Pooler configuration in Supabase, seeded from the repo `events.json`, removed JSON fallbacks in non‑test environments, optimized search with GIN trigram + unaccent, and managed `DATABASE_URL` secrets across environments with DB‑mode tests validating combined filters and stable ordering.
 - [ ] Set up backup and recovery procedures (pending)

## ✅ Completed: Authentication & User Management
- [x] Elegir proveedor de autenticación: Supabase Auth
- [ ] Configurar Supabase y variables de entorno
  - [x] Auth (Dashboard): `Site URL` y `Redirect URLs` configuradas
  - [x] Web: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [x] API: `SUPABASE_URL`, `SUPABASE_JWT_SECRET` o verificación por JWKS
  - [x] Google OAuth: configurar en Supabase Dashboard (Authentication > Providers > Google)
  - [x] Configurar redirect URLs en Google Cloud Console para OAuth
  - [ ] Prod/Stage: `ENABLE_AUTH=true` (tests: off)
- [x] Web (Next.js)
  - [x] Instalar `@supabase/ssr` y `@supabase/supabase-js`
  - [x] Helper SSR de Supabase con cookies HttpOnly
  - [x] Helper cliente (Supabase browser client)
  - [x] Provider/hook de sesión (contexto)
  - [x] Reenviar Bearer token al API en fetch SSR
  - [x] Reenviar Bearer token al API en fetch cliente
  - [x] Página `/login` (email/password + registro + Google OAuth)
  - [x] Contexto: obtener perfil de usuario desde `/api/users/me` y exponer email/role
  - [x] OAuth providers (Google) con callback handler
  - [x] Cerrar sesión y menú de usuario en `TopNavigation`
  - [x] Gatear botón "Crear Evento" por sesión
  - [x] Aplicar hero background styling a página de error de auth (`/auth/auth-code-error`)
  - [x] Responsive user dropdown menu en móvil (TopNavigation)
  - [x] Mensajes de error de login en español (códigos de error de Supabase)
- [x] API (Express)
  - [x] Instalar `jose` y `@supabase/supabase-js`
  - [x] Middleware: verificar JWT con JWKS de Supabase; adjuntar `req.user`
  - [x] Autorización por rol: `requireRole('organizer'|'admin')`
  - [x] Proteger `POST /api/events` y rutas de gestión
  - [x] Endpoint `GET /api/users/me` (upsert y retorno de perfil)
  - [x] Event creation/management endpoints para organizers
  - [x] Role-based route protection en Next.js middleware
- [ ] Base de datos
  - [x] Tabla `users` (id uuid de auth, role enum: attendee|organizer|admin, perfil)
  - [x] Upsert de usuario/perfil en primer login
  - [ ] (Opcional) `organizer_profiles` con verificación
- [ ] Roles y permisos
  - [ ] Rol por defecto: `attendee`; bootstrap de `admin`
  - [x] `organizer` puede crear/editar sus eventos (API endpoints completados)
  - [ ] Add role promotion/demotion functionality for admins
  - [ ] Implement organizer verification process
- [x] Favoritos y preferencias
  - [x] Esquema `favorites(user_id,event_id)`
  - [ ] Esquema `user_preferences(jsonb)`
  - [x] API endpoints para favoritos (`POST/DELETE /api/users/favorites`, `GET /api/users/favorites`)
  - [x] UI favoritos en event cards y perfil de usuario
  - [x] Endpoints y UI conectados
- [ ] Seguridad
  - [ ] CORS restringido a `NEXT_PUBLIC_WEB_URL` en prod
  - [ ] Cookies HttpOnly, Secure, SameSite=Lax
  - [ ] Rate limiting en rutas sensibles
  - [ ] Logs con `x-correlation-id` en fallos de auth
  - [ ] Validación adicional en registro (fortaleza de contraseñas)
  - [ ] Rate limiting específico en endpoints de auth (login/register)
  - [ ] Add event ownership validation (ensure organizers can only edit their own events)
  - [ ] Add input sanitization for event creation/editing
  - [ ] Implement CSRF protection for form submissions
  - [ ] Add audit logging for sensitive operations (event creation/deletion)
- [x] Tests
  - [x] API: middleware (token válido/expirado/ausente) y checks de rol
  - [x] API: `/api/users/me` (401/200/404/500)
  - [x] Web E2E: flujo login/registro, toggle entre modos, validation
  - [x] Web E2E: Google OAuth flow y callback handling
  - [x] Web E2E: gating de "Crear evento", logout
  - [x] Web E2E: auth error scenarios y página de error
  - [x] API: favorites endpoints testing
  - [x] User role switching y permissions testing

## ⏳ Pending: Authentication UX Enhancements
- [ ] Página "Forgot Password" con reset por email
- [ ] Mejorar UX de confirmación de email en registro
- [x] Redirección inteligente post-login (remember intended page)
- [ ] Loading states más granulares en OAuth flow
- [ ] Manejo de errores específicos (email ya existe, contraseña débil, etc.)
- [ ] Agregar "Remember me" option para sesiones extendidas
- [ ] Avatar/profile picture integration con Google OAuth
- [ ] Welcome email o onboarding flow post-registro
- [ ] Event creation form para organizers (UI placeholder creado, form real pendiente)
- [x] Favorites functionality testing en UI
- [ ] Fix existing event creation test (update to include `city` field in validation)
- [ ] Implement actual event creation form with category dropdown, city selection
- [ ] Add event image upload functionality
- [ ] Add event edit/delete functionality in UI
- [ ] Create organizer dashboard to manage their events
- [ ] Add organizer event statistics and analytics

## 🚧 In progress: Observability & Quality
- [ ] Monitoring/Errors: integrate Sentry (web + api)
- [ ] Analytics basics (page views, filters usage)
 - [ ] Alertas básicas (uptime de API, errores 5xx, latencia)
- [x] CI/CD
  - [x] GitHub Actions: lint, test, build on PRs
  - [x] Coverage report in CI
  - [x] Job E2E headless (Linux) con matriz de navegadores (Chromium/Firefox/WebKit)
  - [x] Workflow CI completo (pnpm + Node 22 + caché)
    - [x] Jobs: lint (web+api), unit tests (api), build (web+api)
    - [x] E2E (Playwright): instalar browsers, ejecutar contra build de producción
    - [x] Artefactos: subir reportes de Playwright (HTML) y traces al fallar
    - [x] Disparadores: `pull_request` y `push` a `master`
    - [x] Concurrency y cancelación de ejecuciones obsoletas en PRs

### 🚧 In progress: E2E Tests (Web)
- [ ] Navegación y rutas
  - [x] Landing (`/`): selección de ciudad redirige a `/eventos/[city]`
  - [x] Ciudad inválida (`/eventos/unknown-city`) muestra 404/not-found
  - [ ] Preservación de parámetros al navegar atrás/adelante del navegador
- [x] Paginación y tamaño de página
  - [x] Selector "Por página" (`limit`) cambia conteo y actualiza URL; persiste entre páginas
  - [x] "Anterior" deshabilitado en página 1; "Siguiente" deshabilitado en última
  - [x] Deep link fuera de rango (`page` > `totalPages`) maneja estado esperado
- [x] Ordenamiento
  - [x] Orden por fecha asc/desc reordena correctamente
  - [x] Orden por precio asc/desc reordena correctamente
  - [x] Persistencia de `sort` y `order` al cambiar de página y al cambiar `limit`
- [x] Búsqueda y filtros
  - [x] Búsqueda por texto (`q`) funciona correctamente con database search
  - [x] Filtro por categoría resetea `page` y preserva otros parámetros
  - [x] Combinación de `q` + categoría con paginación y orden aplicado
- [x] Estados vacíos y error
  - [x] `NoResults` cuando no hay coincidencias (contenido y enlaces sugeridos)
  - [x] Falla de red/API caída muestra `ErrorBanner` con mensaje adecuado
  - [x] Botón "Reintentar" de `ErrorBanner` dispara recarga (funcional vía ErrorBannerClient)
- [ ] Accesibilidad
  - [ ] Navegación por teclado en paginación y selects; foco visible
  - [x] ARIA labels en controles de orden y tamaño de página
- [x] SEO
  - [x] Título/meta tags por ciudad
  - [x] `sitemap.xml` y `robots.txt`
  - [x] JSON-LD `schema.org/Event` en listas/detalle
- [x] Infraestructura E2E
  - [x] Ejecutar E2E contra build de producción (`next build` + `next start`)
  - [x] Mock/unoptimized de `next/image` para E2E
  - [x] Fixtures/seed de datos deterministas para E2E
  - [x] Matriz de navegadores (Chromium, Firefox, WebKit)

## 🚧 In progress: Documentation & DX
- [x] Provide .env.example (root, web, api) with variable explanations
  - [x] Añadir valores por defecto para dev/test (puertos, NEXT_PUBLIC_API_URL)
- [x] Frontend: scripts usan PORT en lugar de `-p 4000`; Playwright inyecta `PORT=4000` en E2E
- [ ] Document API endpoints in packages/api/README.md
- [ ] Developer guide: local setup and common scripts (pnpm)
  - [ ] Documentar flujo E2E (webServer, scripts, variables) en `packages/web/README.md`
  - [ ] Documentar Supabase Auth (variables y flujo de login/logout) en `packages/web/README.md`
  - [ ] Documentar configuración de Google OAuth (Supabase + Google Cloud Console)
 - [ ] Añadir guía de roles (attendee/organizer/admin) y bootstrap de admin

## ⏳ Pending: Advanced Features & Optimization
- [ ] Add geolocation feature to auto-detect user's city
- [ ] Create interactive map view for event locations  
- [ ] Expand the number of locations to include all cities in Colombia
- [ ] Implement payment processing and booking system
- [ ] Add social media sharing and viral features
- [ ] Create recommendation engine based on user behavior
- [ ] Implement analytics and performance monitoring
- [ ] Add multilingual support and localization
- [ ] Create event organizer dashboard and management tools
- [ ] Expand one by one to other countries

## ⏳ Pending: Business & Growth Features
- [ ] Implement revenue model (commissions, subscriptions, ads)
- [ ] Add email marketing and user retention features
- [ ] Create referral programs and user acquisition tools
- [ ] Implement A/B testing framework
- [ ] Add content moderation and safety features
- [ ] Create API rate limiting and security measures

## ⏳ Pending: Mobile Application (React Native)
- [ ] Set up Expo development environment
- [ ] Create shared component library between web and mobile
- [ ] Implement platform-specific navigation
- [ ] Add push notifications
- [ ] Implement offline functionality
- [ ] Share types and utilities with web
- [ ] First screens: city selector + event feed
- [ ] Sync filters and queries with API