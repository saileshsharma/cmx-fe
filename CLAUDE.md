# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Build and Development:**
- `npm run dev` - Start development server (Vite, runs on http://localhost:5173)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

**Code Quality:**
- `npm run lint` - Run ESLint on src/**/*.{js,jsx,ts,tsx}
- `npm run typecheck` - Run TypeScript compiler without emitting files

**Testing:**
- `npm run test` - Run unit tests with Vitest
- `npm run test:ci` - Run tests in CI mode with JUnit output
- `npm run e2e` - Run Playwright end-to-end tests
- `npm run e2e:report` - Show Playwright test report

## Project Architecture

**Tech Stack:**
- React 18 with Vite for bundling
- TypeScript support
- TailwindCSS for styling
- Apollo Client for GraphQL integration
- React Router for navigation
- Vitest for unit testing, Playwright for E2E

**GraphQL Configuration:**
The app uses Apollo Client with both HTTP and WebSocket support for GraphQL operations. Configuration is handled in `src/apolloClient.js` with:
- Environment-based endpoint configuration via `VITE_GRAPHQL_URI` and `VITE_GRAPHQL_WS_URI`
- Development proxy to localhost:8080/graphql (configured in vite.config.ts)
- Error handling with custom app:error events
- WebSocket subscriptions with retry logic and connection management

**Project Structure:**
```
src/
├── components/          # React components organized by feature
│   ├── claim/          # Claim management components
│   ├── fnol/           # First Notice of Loss components
│   ├── home/           # Dashboard and home page components
│   ├── notification/   # Notification system
│   ├── policy/         # Policy lookup and management
│   └── surveyor/       # Surveyor management and live tracking
├── graphql/            # GraphQL queries, mutations, and subscriptions
├── router/             # Route definitions (AppRouter.tsx)
├── routes/             # Route constants and path definitions
├── apolloClient.js     # Apollo Client configuration
├── config.js           # Application configuration
├── App.jsx            # Main application component
└── main.jsx           # Application entry point
```

**Authentication:**
Simple localStorage-based authentication system. Authentication state is managed in App.jsx and checked via localStorage "isAuthenticated" key.

**Routing:**
- Uses React Router with a ProtectedLayout wrapper for authenticated routes
- All protected routes are relative paths under the root "/" route
- Default redirect to "claims-dashboard" for authenticated users
- Centralized route definitions available in src/routes/

**Key Features:**
- Claims Motor X (CMX) - Insurance claims management platform
- FNOL (First Notice of Loss) processing
- Policy inquiry and management
- Surveyor dispatch and live tracking with maps
- Real-time notifications via GraphQL subscriptions
- Dashboard with policy and claims overview

**Environment Variables:**
- `VITE_GRAPHQL_URI` - GraphQL HTTP endpoint
- `VITE_GRAPHQL_WS_URI` - GraphQL WebSocket endpoint for subscriptions
- `VITE_GRAPHQL_CREDENTIALS` - Cookie sending policy (default: "include")
- `VITE_HOST` / `VITE_PORT` - Development server configuration
- `HMR_HOST` - Hot module reload host for LAN testing

**Path Aliases:**
TypeScript path mapping configured for:
- `@/*` → `src/*`
- `@components/*` → `src/components/*`
- `@features/*` → `src/features/*`
- `@graphql/*` → `src/graphql/*`

**Development Notes:**
- Vite proxy configured for /graphql to localhost:8080 in development
- Apollo Client includes performance monitoring (logs slow queries >1000ms)
- Error handling emits custom events for UI integration
- WebSocket connection includes exponential backoff retry logic