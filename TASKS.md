# Project Tasks

This file outlines the development tasks for the "Qué hacer en..." project. We will track our progress here by checking off items as we complete them. This list will be continuously updated as the project evolves.

## ✅ Completed: Web App Frontend (MVP)
  Delivered a Next.js frontend in TypeScript with SSR, a city-selection landing page, SEO-friendly event listings at `/eventos/[city]`, a mock events dataset for multiple cities, and a mobile-first responsive layout.

## ✅ Completed: UI/UX Design Implementation
  Delivered a cohesive, responsive UI aligned with the design system: city‑aware hero with purple gradient, sticky navigation with a prominent responsive search, reusable event cards and category filters, polished interactions, and performance‑oriented system fonts.

## ✅ Completed: Backend API Development
  Delivered a TypeScript Express REST API powering the web app: validated endpoints for listing and fetching events (city-specific, with rich filtering including category, text, date and price ranges), pagination and sorting; consistent error handling and structured logging; security hardening with rate limiting, environment-aware CORS and correlation IDs; in-memory caching for performance; fully integrated with the frontend and covered by comprehensive tests (validation, stable ordering, headers and diacritics-insensitive search).

## ✅ Completed: UX Enhancements and Web Error Handling
  Implemented loading states, 'no results' discovery, robust error handling with retry actions, optimized image loading with `next/image`, and comprehensive SEO improvements including OG/Twitter cards, sitemap, robots.txt, and JSON-LD schema. Also addressed specific web error handling for retry actions by migrating sections to client components or adding client boundaries to trigger reloads.

## ✅ Completed: Database & Data Management
  Established the API as the single source of truth and migrated from JSON to PostgreSQL: designed and indexed the schema, normalized categories with a master dictionary, applied migrations and Session Pooler configuration in Supabase, seeded from the repo `events.json`, removed JSON fallbacks in non‑test environments, optimized search with GIN trigram + unaccent, and managed `DATABASE_URL` secrets across environments with DB‑mode tests validating combined filters and stable ordering.

## ✅ Completed: Authentication & User Management
  Implemented Supabase Auth with Google OAuth, including full configuration for web (Next.js) and API (Express) environments. This involved setting up SSR and client-side helpers, session providers, JWT verification middleware, role-based authorization for 'organizer' and 'admin' roles, and protecting API routes. Database changes included a `users` table with roles and upsert functionality for first logins. Favorites and preferences were implemented with a `favorites(user_id, event_id)` schema, corresponding API endpoints, and integrated UI. Comprehensive tests were added for API middleware, user endpoints, Web E2E login/registration flows, Google OAuth, role gating, and favorite functionality.

## ✅ Completed: Observability & Quality
  The CI/CD pipeline has been successfully implemented using GitHub Actions, covering linting, testing, and building on pull requests, with integrated coverage reports. E2E tests are configured to run headlessly on Linux across multiple browsers (Chromium, Firefox, WebKit) against production builds, with artifact uploading for Playwright reports and traces on failure. The complete CI workflow utilizes pnpm and Node 22 with caching, triggered by pull requests and pushes to master, and includes concurrency and cancellation for obsolete PR executions.

## Tasks for immediate implementation:
- [ ] When looking at an event details, if the user is the owner of the event, he/she should be able to either edit it or deleted it. For the time being, just create the edit/delete buttons. Analyze where would it be best to place these options, and what form should they take (buttons, dropdown, icons?).
- [ ] Filtro de eventos para hoy, mañana, esta semana, fin de semana, siguiente semana, este mes, próximo mes.
- [ ] Incluir link original del evento en la página del evento detallada.

## Pending tasks:
- [ ] Add an option for users to share events.
- [ ] Establcer rol de usuarios por defecto: `attendee`;
- [ ] Página "Forgot Password" con reset por email
- [ ] Agregar "Remember me" option para sesiones extendidas
- [ ] Add progressive loading for images and search results
- [ ] Welcome email o onboarding flow post-registro
- [ ] Set up backup and recovery procedures
- [ ] Enhance search with autocomplete and suggestions
- [ ] Implement advanced filtering (date ranges, price ranges, distance)
- [ ] Add CTA: "Ver más de [Categoría] en [Ciudad]" when category is active
- [ ] Implement organizer verification process
- [ ] Seguridad:
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
- [ ] Configurar SMTP personalizado con SendGrid para emails de producción (reemplazar servicio built-in de Supabase con límite de 3-4 emails/hora)
- [ ] Mejorar UX de confirmación de email en registro
- [ ] Document API endpoints in packages/api/README.md
 - [ ] Añadir guía de roles (attendee/organizer/admin) y bootstrap de admin
- [ ] Loading states más granulares en OAuth flow
- [ ] Manejo de errores específicos para autenticación (email ya existe, contraseña débil, etc.)
- [ ] Event creation form para organizers (UI placeholder creado, form real pendiente)
- [ ] Add role promotion/demotion functionality for admins
- [ ] Monitoring/Errors: integrate Sentry (web + api)
- [ ] Avatar/profile picture integration con Google OAuth (Opcional)
- [ ] Add organizer event statistics and analytics (Opcional)
- [ ] Create organizer dashboard to manage their events (Opcional)

## Advanced Features & Optimization:
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