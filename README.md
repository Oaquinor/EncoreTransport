# Encore Transport

Preview monorepo for a transport platform with four separate experiences and a central API designed to evolve into production.

## What it includes

- Public website.
- Passenger PWA.
- Driver PWA.
- Admin dashboard.
- Shared contracts and rules to avoid duplication.
- Documentation for architecture, API, database, and business rules.
- A foundation ready to integrate Laravel + MySQL as the central backend.

## Architecture

The platform follows this principle:

Website + Passenger PWA + Driver PWA + Admin Dashboard -> Laravel API -> MySQL

In this preview, the central API is represented with shared contracts and rules so the flows can be navigated and validated directly from the browser without duplicating critical logic in each app.

## Requirements

- Node.js 24 or newer.
- PHP and Composer are planned for the future real Laravel API, but they are not required for the initial preview.

## Run

```bash
npm run dev
```

Then open the local server URL.

## Tests

```bash
npm test
```

## Structure

- `apps/website` - public website.
- `apps/passenger-pwa` - mobile-first passenger experience.
- `apps/driver-pwa` - operational interface for drivers.
- `apps/admin-dashboard` - administrative dashboard.
- `packages/shared` - shared contracts, rules, and reusable components.
- `backend/laravel` - reference and preparation for the real central API.
- `docs` - architecture documentation.
- `tests` - critical rule tests.

## Environment Variables

Check `.env.example` for the preview baseline values and the future API.
