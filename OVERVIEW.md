# OVERVIEW.md

## 1. Project Purpose

"Qué hacer en..." is a web application designed to help users discover local events in their city. The primary goal is to provide a simple, intuitive platform for finding entertainment and activities. The project is built with future expansion in mind, allowing for a straightforward transition into native Android and iOS applications.

All user-facing content will be in Spanish.

## 2. Architecture

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
*   **Database**: A simple `events.json` file will be used for the initial phase (MVP). This will be migrated to a more robust database like PostgreSQL or MongoDB as the application scales.
*   **Styling**: Tailwind CSS for utility-first styling. The web package uses Tailwind CSS with PostCSS and Autoprefixer for optimal browser compatibility.

## 4. Development Roadmap

The project will be developed in phases:

1.  **Phase 1: Project Foundation & Backend (MVP)** ✅ *Partially Complete*
    *   Set up the monorepo structure. ✅
    *   Develop the Node.js API with endpoints for fetching events. ⏳ *Pending*
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
3.  **Phase 3: Backend API Development** ⏳ *Next Priority*
    *   Complete Node.js/Express API implementation
    *   Connect frontend to backend API
    *   Implement authentication and user management
    *   Add real-time features and caching
4.  **Phase 4: Mobile App**
    *   Develop the Expo mobile app, reusing components from the web app.
    *   Adapt UI/UX for mobile devices.
    *   Implement mobile-specific features (push notifications, offline support)
5.  **Phase 5: Advanced Features**
    *   Geolocation, advanced filtering, map views, user accounts
    *   Payment integration, analytics, and performance optimization

## 5. Configuration & Environment Variables

The project uses a `.env` file in the root directory to store sensitive configuration and credentials. This file is excluded from version control for security reasons.

**Required Environment Variables:**
*   `GITHUB_USERNAME`: GitHub username or organization name for repository operations
*   `GITHUB_REPOSITORY`: GitHub repository name for the project
*   `PORT`: Port for the API server (default: 4001)
*   `NEXT_PUBLIC_API_URL`: URL for the API server (e.g., http://localhost:4001)
*   `CORS_ORIGINS`: Comma-separated list of allowed origins for CORS (e.g., http://localhost:4000)

**API Defaults:**
*   Paginación: `page` inicia en 1, `limit` por defecto 20, máximo 100
*   Orden: `sort` admite `date` o `price`, `order` admite `asc` o `desc`

**Development Ports:**
*   **Web Application**: Port 4000 (configured in packages/web/package.json)
*   **API Server**: Port 4001 (will be configured when implementing the API)

**Important Notes:**
*   The `.env` file should never be committed to version control
*   All sensitive information (API keys, credentials, etc.) should be stored in environment variables
*   Each environment (development, staging, production) should have its own set of environment variables

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