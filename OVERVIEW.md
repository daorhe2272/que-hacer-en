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
*   **Styling**: A utility-first CSS framework compatible with both web and React Native (like Tailwind CSS with NativeWind) is recommended to maximize style reuse.

## 4. Development Roadmap

The project will be developed in phases:

1.  **Phase 1: Project Foundation & Backend (MVP)**
    *   Set up the monorepo structure.
    *   Develop the Node.js API with endpoints for fetching events.
    *   Create a mock `events.json` database.
2.  **Phase 2: Web App Frontend (MVP)**
    *   Build the Next.js web application.
    *   Create the landing page (city selection) and event listing pages.
    *   Implement SSR for city-specific event pages.
3.  **Phase 3: Mobile App**
    *   Develop the Expo mobile app, reusing components from the web app.
    *   Adapt UI/UX for mobile devices.
4.  **Phase 4: Future Enhancements**
    *   Geolocation, advanced filtering, map views, user accounts, etc.

## 5. Configuration & Environment Variables

The project uses a `.env` file in the root directory to store sensitive configuration and credentials. This file is excluded from version control for security reasons.

**Required Environment Variables:**
*   `GITHUB_USERNAME`: GitHub username or organization name for repository operations
*   `GITHUB_REPOSITORY`: GitHub repository name for the project

**Important Notes:**
*   The `.env` file should never be committed to version control
*   All sensitive information (API keys, credentials, etc.) should be stored in environment variables
*   Each environment (development, staging, production) should have its own set of environment variables

## 6. Styling & Conventions

### Styling

*   **Framework**: To be decided, but a utility-first approach is recommended for consistency.
*   **Design**: The design should be clean, modern, and mobile-first. A minimalistic approach is preferred, focusing on readability and ease of use.
*   **Colors**: A simple color palette will be defined, with a primary accent color for branding and a set of neutral grays for text and backgrounds.

### Conventions

*   **File Naming**: `kebab-case.ts` for general files, `PascalCase.tsx` for React components.
*   **Component Structure**: Components should be organized by feature. Shared components will reside in a common `components` directory within the `web` and `app` packages.
*   **Commits**: The [Conventional Commits](https://www.conventionalcommits.org/) standard should be followed (e.g., `feat:`, `fix:`, `docs:`, `chore:`).
*   **API**: All communication between the frontend and backend will be done via a RESTful API with clear and consistent JSON responses.