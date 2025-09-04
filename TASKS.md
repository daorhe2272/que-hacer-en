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

## In Progress: Implement actual event creation form with category dropdown, city selection

### Requirements:
Feature Summary

  Implement a functional event creation form that allows authenticated organizers to create new events through the web interface, replacing the current placeholder
  implementation.

  Functional Requirements

  1. Authentication & Authorization: Previously, it was considered that only authenticated users with 'organizer' or 'admin' roles can access the form but we have decided to let regular users create events as well. Only non-authenticated users are not allowed to create events.

  2. Form Fields: Support all required fields per the API schema:
    - Title (3-200 chars)
    - Description (10-2000 chars)
    - Date (YYYY-MM-DD format)
    - Time (HH:MM format)
    - Location (2-200 chars)
    - Address (2-200 chars)
    - Category (from predefined categories)
    - City (from allowed cities: bogota, medellin, cali, barranquilla, cartagena)
    - Price (non-negative number)
    - Currency (3-char code, defaulting to COP)
    - Image URL (optional, must be valid URL)
    - Organizer (2-200 chars)
    - Capacity (positive integer)
    - Tags (optional array)
    - Status (defaults to 'active')
  3. Validation: Client-side validation matching API schema requirements
  4. Error Handling: Proper display of validation errors and API errors
  5. Success Handling: Redirect to event management or show success message
  6. Loading States: Show loading indicators during form submission

  Non-Functional Requirements

  1. Performance: Form should respond quickly with immediate validation feedback
  2. Accessibility: Form should be keyboard navigable and screen reader friendly
  3. Mobile Responsive: Form should work well on all device sizes
  4. Security: Proper sanitization and validation of all inputs
  5. User Experience: Clear, intuitive Spanish interface matching existing design
  6. Error Recovery: Clear error messages with actionable guidance

  Current Issues to Fix

  1. Test Validation Issue: Current test uses hardcoded category 'Tecnología' but API expects category slugs (e.g., 'tecnologia')
  2. Missing API Client Function: No createEvent function in web API client
  3. Form State Management: No React state management for form data
  4. Missing Validation: No client-side validation implementation

  Design Constraints

  - Must use existing design system (Tailwind CSS classes, color scheme, typography)
  - Must be in Spanish per project requirements
  - Must integrate with existing authentication system
  - Must follow mobile-first responsive design
  - Must use utility-first CSS approach

  The requirements are now explicit and validated. Ready to proceed to Step 2: Architecture & Design.

  ---
  Step 2: Architecture & Design

● Logical Module Breakdown

  1. Form Component (CrearEventoPage)
    - Main form container with state management
    - Form validation logic
    - Submission handling
    - Loading and error states
  2. API Client Extension (lib/api.ts)
    - createEvent() function to POST to /api/events
    - Proper authentication header handling
    - Error response handling
  3. Form Validation Module
    - Client-side validation matching API schema
    - Real-time field validation
    - Spanish error messages
  4. Form Field Components (Reusable)
    - Input field wrapper with validation display
    - Select dropdown for categories and cities
    - Textarea component
    - Date/time pickers

  Data Flow Architecture

  User Input → Form State → Validation → API Call → Success/Error Handling
       ↑                                                      ↓
  Form Fields ← Validation Errors ← Error State ← API Response

  Component Interfaces

  // Form State
  interface EventFormData {
    title: string
    description: string
    date: string
    time: string
    location: string
    address: string
    category: string
    city: string
    price: number
    currency: string
    image?: string
    organizer: string
    capacity: number
    tags: string[]
    status: string
  }

  // API Function
  async function createEvent(eventData: EventFormData): Promise<{
    success: boolean
    event?: Event
    error?: string
  }>

  Dependencies

  - Existing: React, Next.js, Tailwind CSS, Supabase auth, existing API client structure
  - New: Form validation library (built-in HTML5 + custom validation)
  - Shared: Categories from @que-hacer-en/shared, existing design tokens

  Design Trade-offs

  Performance vs. User Experience
  - Choice: Real-time validation for better UX
  - Trade-off: Slightly more client-side processing
  - Justification: Better UX outweighs minimal performance cost

  Validation Strategy
  - Choice: Client-side validation + server-side validation
  - Trade-off: Code duplication vs. security + UX
  - Justification: Security requires server-side, UX requires client-side

  State Management
  - Choice: Component-level useState vs. external state library
  - Trade-off: Simplicity vs. advanced features
  - Justification: Form scope is limited, useState sufficient

  Error Handling
  - Choice: Toast notifications vs. inline error display
  - Trade-off: Space efficiency vs. contextual clarity
  - Justification: Inline errors provide better context for form corrections

  Testing Strategy (Preview)

  - Unit Tests: Form validation logic, API client function
  - Integration Tests: Form submission flow with mocked API
  - E2E Tests: Complete user journey from login to event creation
  - Error Scenario Tests: Network failures, validation failures, authentication issues

  Architecture design complete. Ready for Step 3: Test Planning.

  ---
  Step 3: Test Planning

● Acceptance Tests (Gherkin-style)

  Feature: Event Creation Form

  Scenario 1: Successful Event Creation
  Given I am logged in as an organizer
  And I navigate to /crear-evento
  When I fill in all required fields with valid data:
    | Field       | Value                    |
    | title       | "Concierto de Salsa"    |
    | description | "Una noche de baile..."  |
    | date        | "2024-12-25"            |
    | time        | "20:00"                 |
    | location    | "Teatro Nacional"        |
    | address     | "Carrera 7 #22-47"     |
    | category    | "musica"                |
    | city        | "bogota"                |
    | price       | 45000                   |
    | organizer   | "Eventos Culturales"    |
    | capacity    | 200                     |
  And I click "Crear Evento"
  Then I should see a success message
  And the event should be created in the database
  And I should be redirected to event management page

  Scenario 2: Validation Errors Display
  Given I am logged in as an organizer
  And I am on the event creation form
  When I submit the form with invalid data:
    | Field       | Value | Error Expected        |
    | title       | "ab"  | "Mínimo 3 caracteres" |
    | description | "x"   | "Mínimo 10 caracteres"|
    | price       | -100  | "El precio no puede ser negativo" |
  Then I should see validation errors for each invalid field
  And the form should not be submitted
  And the loading state should be cleared

  Scenario 3: Authentication Required
  Given I am not logged in
  When I try to access /crear-evento
  Then I should be redirected to /login?redirect=/crear-evento

  Scenario 4: Role Authorization
  Given I am logged in as an attendee (not organizer)
  When I try to access /crear-evento
  Then I should see a "No autorizado" message
  Or I should be redirected to login with role upgrade prompt

  Scenario 5: Network Error Handling
  Given I am logged in as an organizer
  And I have filled the form with valid data
  And the API server is unavailable
  When I submit the form
  Then I should see "Error de conexión. Por favor intenta de nuevo."
  And the form should remain editable
  And I should be able to retry submission

  Property-Based Tests

  Test 1: Title Length Validation
  - Property: For any title string of length 3-200, validation should pass
  - Property: For any title string outside this range, validation should fail
  - Generator: Random strings of varying lengths (0-300 chars)
  - Assertion: Validation result matches expected based on length

  Test 2: Date Format Validation
  - Property: All dates in YYYY-MM-DD format should validate successfully
  - Property: All malformed date strings should fail validation
  - Generator: Valid dates (2024-2030 range) and invalid date strings
  - Assertion: Validation matches expected format requirements

  Test 3: Price Range Validation
  - Property: All non-negative numbers should pass price validation
  - Property: All negative numbers should fail price validation
  - Generator: Random numbers from -1000 to 1000000
  - Assertion: Validation result matches sign of input

  Test 4: Category Selection
  - Property: All predefined category slugs should be valid
  - Property: Any non-predefined category should be rejected
  - Generator: Mix of valid category slugs and random strings
  - Assertion: Only predefined categories pass validation

  Integration Tests (Minimal Mocking)

  Test 1: Complete Form Submission Flow
  describe('Event Creation Integration', () => {
    test('should create event end-to-end', async () => {
      // Setup: Create test user session
      // Action: Fill and submit form
      // Assertion: Event exists in database
      // Assertion: Success feedback shown
    })
  })

  Test 2: API Error Response Handling
  test('should handle 400 validation errors from API', async () => {
    // Setup: Mock API to return validation errors
    // Action: Submit form with edge case data
    // Assertion: Client displays server validation errors
    // Assertion: Form remains in editable state
  })

  Test 3: Authentication Token Handling
  test('should include auth token in API requests', async () => {
    // Setup: Mock authenticated session
    // Action: Submit valid form
    // Assertion: API request includes Authorization header
    // Assertion: Request uses current user's token
  })

  Error Handling & Edge Cases

  Edge Case 1: Maximum Field Lengths
  - Test data at exact validation boundaries (200 chars for title)
  - Verify form accepts maximum allowed length
  - Verify form rejects length + 1

  Edge Case 2: Special Characters in Input
  - Test Unicode characters, emojis, HTML entities
  - Verify proper encoding/escaping
  - Verify API accepts special characters correctly

  Edge Case 3: Date/Time Edge Cases
  - Past dates (should they be allowed?)
  - Leap year dates (Feb 29)
  - Time format edge cases (24:00 vs 00:00)

  Edge Case 4: Concurrent User Sessions
  - Multiple tabs with form open
  - Token expiration during form completion
  - Session invalidation scenarios

  Error Scenario 1: Network Interruption
  - Submit form while network disconnects
  - Verify timeout handling
  - Verify retry mechanism

  Error Scenario 2: Server Overload
  - API returns 503 Service Unavailable
  - API returns 429 Rate Limited
  - Verify appropriate user messaging

  Coverage Measurement Strategy

  API Client Coverage
  - Line coverage: >95% for createEvent function
  - Branch coverage: All error paths tested
  - Function coverage: All related helper functions

  Form Component Coverage
  - Component rendering: All UI states tested
  - Event handling: All user interactions tested
  - Validation logic: All validation rules tested

  E2E Test Coverage
  - User journey coverage: Happy path + 3 error scenarios
  - Browser coverage: Chrome, Firefox, Safari
  - Device coverage: Desktop, tablet, mobile viewports

### Implementation Status Summary

  ✅ Completed Components

  1. API Client Extension (lib/api.ts)
  - ✅ Added createEvent() function with proper authentication headers
  - ✅ Handles validation errors from server (Zod error format)
  - ✅ Returns structured response with success/error states
  - ✅ Includes TypeScript types for form data and results

  2. Form Validation Module (lib/validation.ts)
  - ✅ Complete client-side validation matching API schema
  - ✅ Validates all required fields: title, description, date, time, location, address, category, city, price, organizer, capacity
  - ✅ Spanish error messages
  - ✅ Real-time field validation support
  - ✅ Proper TypeScript typing

  3. Event Creation Form (app/crear-evento/page.tsx)
  - ✅ Complete functional form replacing placeholder
  - ✅ All form fields implemented with proper validation
  - ✅ Real-time validation feedback
  - ✅ Loading states during submission
  - ✅ Success/error handling with user feedback
  - ✅ Authentication required (redirects to login)
  - ✅ Mobile-responsive design matching existing UI
  - ✅ Category dropdown with real categories from shared constants
  - ✅ City selection dropdown
  - ✅ Form submission with API integration

  4. API Authorization Update
  - ✅ Updated API route to allow all authenticated users (not just organizers) per updated requirements
  - ✅ Removed role restriction from POST /api/events

  📝 Key Features Delivered

  1. Complete Form Implementation: Full event creation form with all required fields
  2. Validation: Both client-side and server-side validation with Spanish error messages
  3. Authentication Integration: Proper auth checks and redirects
  4. User Experience: Loading states, success messages, error handling
  5. Design Consistency: Matches existing UI design system
  6. Mobile Responsive: Works on all device sizes
  7. Real-time Feedback: Immediate validation as user types

  ⚠️ Current Issues

  1. Build Warning: useSearchParams() in login page needs Suspense boundary (not related to event creation)
  2. Test Update Needed: Existing test mentioned in TASKS.md needs category field updated from 'Tecnología' to 'tecnologia' (slug format)

  🎯 What's Ready

  - Event Creation Form: Fully functional and ready for use
  - API Integration: Complete end-to-end flow from form to database
  - Validation: Comprehensive validation matching API requirements
  - UI/UX: Professional, consistent with existing design

## Pending tasks:
- [ ] Fix existing event creation test (update to include `city` field in validation)
- [ ] Add event image upload functionality
- [ ] Add event edit/delete functionality in UI
- [ ] Establcer rol de usuarios por defecto: `attendee`;
- [ ] Página "Forgot Password" con reset por email
- [ ] Agregar "Remember me" option para sesiones extendidas
- [ ] Add progressive loading for images and search results
- [ ] Tests E2E para preservación de parámetros al navegar atrás/adelante del navegador
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