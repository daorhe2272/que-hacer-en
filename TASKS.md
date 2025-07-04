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

## Backend API (MVP)
- [ ] Create Node.js/Express API with TypeScript and event endpoints (/api/events, /api/events/[city])
- [ ] Implement API integration for fetching and displaying events
- [ ] Connect frontend to backend API instead of local mock data

## Future Enhancements
- [ ] Add geolocation feature to auto-detect user's city
- [ ] Implement advanced filtering system (date, category, price range)
- [ ] Create interactive map view for event locations
- [ ] Build user account system for saving favorite events and preferences