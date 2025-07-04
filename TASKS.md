# Project Tasks

This file outlines the development tasks for the "Qué hacer en..." project. We will track our progress here by checking off items as we complete them. This list will be continuously updated as the project evolves.

## Project Foundation & Backend (MVP)
- [x] Set up monorepo structure with pnpm workspaces (/api, /web, /app packages)
- [ ] Create Node.js/Express API with TypeScript and event endpoints (/api/events, /api/events/[city])
- [ ] Create mock events.json database with sample event data for multiple cities
- [ ] Configure environment variables and .env setup for all packages

## Web App Frontend (MVP)
- [ ] Initialize Next.js web application with TypeScript and SSR configuration
- [ ] Create landing page with city selection functionality
- [ ] Build event listing page with server-side rendering for SEO (/eventos/[city])
- [ ] Implement API integration for fetching and displaying events
- [ ] Set up responsive design with mobile-first approach

## Future Enhancements
- [ ] Add geolocation feature to auto-detect user's city
- [ ] Implement advanced filtering system (date, category, price range)
- [ ] Create interactive map view for event locations
- [ ] Build user account system for saving favorite events and preferences