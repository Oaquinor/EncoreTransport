# EncoreTransport Architecture

## Purpose

EncoreTransport is a multi-application platform with one central Laravel API and MySQL as the source of truth.

```text
Public Website
Passenger Web
Passenger Mobile
Driver Web
Driver Mobile
Admin
Tracking
Login
       │
       ▼
Root frontend server / API proxy
       │
       ▼
Laravel REST API
       │
       ▼
MySQL
```

## Application boundaries

### Website

`apps/website`

Purpose: discovery and public marketing.

May:
- show public routes and departures;
- preview a route;
- explain seat selection;
- link to package tracking.

Must not:
- contain operational language;
- expose backend implementation details;
- invent route, seat or price data.

### Passenger

`apps/passenger`

Purpose: transactional booking flow.

Owns:
- trip search;
- trip choice;
- seat selection;
- passenger data;
- review;
- booking;
- payment initiation;
- ticket/status.

Laravel remains authoritative for availability and price.

### Driver

`apps/driver-pwa`
`apps/driver-mobile`

Purpose: assigned operational work.

Owns:
- assigned trip;
- passenger boarding;
- schedule;
- incidents;
- vehicle status;
- packages;
- authorized GPS.

### Admin

`apps/admin-dashboard`

Purpose: centralized operations.

Only modules backed by real API/database data should be exposed.

### Authentication

`apps/auth`

Purpose: centralized staff/account sign in and role routing.

### Package Tracking

`apps/package-tracking`

Purpose: public shipment-status lookup.

## Shared packages

### `packages/shared/api/`

API access is split by responsibility:

- `core.mjs`
- `auth.mjs`
- `public.mjs`
- `bookings.mjs`
- `driver.mjs`
- `admin.mjs`

`packages/shared/api.mjs` is only a stable compatibility facade.

### `packages/shared/ui.mjs`

Shared HTML render helpers.

New helpers use descriptive `render*` names. Legacy short aliases remain only for compatibility.

### `packages/shared/html.mjs`

Shared escaping/status text utilities.

### `packages/shared/app-config.mjs`

Runtime-safe configuration.

Deployments may inject:

```js
globalThis.__ENCORE_CONFIG__ = {
  apiBaseUrl: '/api/v1',
  country: '...',
  currency: '...',
  locale: '...',
  timezone: '...',
};
```

## Styling

Each web application has exactly one canonical stylesheet entrypoint:

```text
apps/website/app.css
apps/passenger/src/app.css
apps/driver-pwa/app.css
apps/admin-dashboard/app.css
apps/auth/app.css
apps/package-tracking/app.css
```

The older style layers remain imported underneath only to preserve current behavior while they are gradually consolidated.

Do not add another `<link>` or CSS import directly to an application entrypoint. Add the layer through that application's `app.css`.

## Data authority

Frontend visual state never overrides server truth.

Laravel owns:
- availability;
- booking concurrency;
- pricing;
- trip status;
- payments;
- tickets;
- role authorization;
- driver location authorization.

## External dependencies not solved by code alone

The repository cannot truthfully be called fully production-ready until these external items are resolved:

- authorized payment provider + sandbox/production credentials;
- external notification provider if notifications are required;
- final production hostname for absolute SEO canonicals and sitemap;
- mobile device/emulator acceptance;
- browser E2E/deployment acceptance.
