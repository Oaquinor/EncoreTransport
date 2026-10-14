# Encore Transport

EncoreTransport is a multi-application transport platform backed by a central Laravel API and MySQL database.

## Applications

- `apps/website` — public passenger-facing website.
- `apps/passenger` — Passenger PWA (React + Vite).
- `apps/passenger-mobile` — Passenger Expo / React Native app.
- `apps/driver-pwa` — Driver operational PWA.
- `apps/driver-mobile` — Driver Expo / React Native app.
- `apps/auth` — centralized role-based login.
- `apps/admin-dashboard` — administrative Operations application.
- `apps/package-tracking` — public package tracking.
- `backend/laravel` — central Laravel REST API.
- `packages/*` — shared API, design, domain and utility packages.

```text
Website / Passenger / Driver / Admin / Mobile
                  ↓
          Root HTTP server / proxy
                  ↓
             Laravel API
                  ↓
                 MySQL
```

## Requirements

- Node.js 24 or newer.
- npm using the committed `package-lock.json`.
- PHP 8.2+.
- Composer.
- MySQL.
- Laravel `.env` configured locally.
- TomTom credentials for real map services.

Never commit `.env`, provider secrets, tokens or API keys.

## Important: command locations

Root npm commands must be executed from the repository root:

```text
C:\...\EncoreTransport
```

Do **not** run commands such as `npm run build:passenger` from `backend\laravel`; that package does not own the root monorepo scripts.

Laravel commands are executed from:

```text
C:\...\EncoreTransport\backend\laravel
```

## Install

From the repository root:

```bash
npm install
```

Laravel:

```bash
cd backend/laravel
composer install
php artisan optimize:clear
```

## Run locally

Console 1 — Laravel:

```bash
cd backend/laravel
php artisan serve
```

Console 2 — frontend server:

```bash
npm run build:passenger
npm run dev
```

Default routes:

- Website: `http://127.0.0.1:4173/website/`
- Login: `http://127.0.0.1:4173/login/`
- Package tracking: `http://127.0.0.1:4173/track-package/`
- Passenger: `http://127.0.0.1:4173/passenger/`
- Driver: `http://127.0.0.1:4173/driver/`
- Admin: `http://127.0.0.1:4173/admin/`
- Laravel API: `http://127.0.0.1:8000/api/v1`
- Swagger: `http://127.0.0.1:8000/api/documentation`

`/move/` is a legacy URL and redirects to `/passenger/`.

## Validation

Frontend and browser-facing contracts:

```bash
npm run validate:frontend
```

Native mobile static/type validation:

```bash
npm run validate:mobile
```

Laravel validation:

```bash
npm run validate:backend
```

Complete local validation:

```bash
npm run validate:local
```

`validate:mobile` validates TypeScript/configuration and GPS contracts. It is **not** a substitute for testing Android/iOS on a real device or emulator.

## Authentication

Authentication is centralized through `/login/`.

- Passenger → Passenger application.
- Driver → Driver application.
- Admin → Operations.

The server exposes only explicitly public frontend paths. Repository files such as `package.json`, Laravel source files and local `.env` files must never be served as static frontend content.

## Booking and seats

Seat availability and pricing are validated by Laravel. Booking creation uses transactions, row locks and database constraints to prevent simultaneous sale of the same seat.

The frontend layout is derived from persisted vehicle seat metadata. A visual seat map does not override server availability.

## Maps

TomTom credentials stay in Laravel.

Web clients consume Laravel map endpoints and a Laravel tile proxy. A vehicle marker is displayed only when the backend has a valid authorized driver location.

Useful diagnostics:

```bash
cd backend/laravel
php artisan optimize:clear
php artisan encore:maps:diagnose
```

## Driver Mobile GPS

Driver Mobile uses `expo-location` for foreground location.

Implemented behavior includes:

- runtime foreground permission;
- real device coordinates;
- current-position submission;
- foreground watch updates;
- server authorization against the assigned trip;
- stopping tracking when the operational trip ends or the app flow signs out/unmounts.

This does **not** claim background GPS. Background tracking requires separate Android/iOS permissions, store policy review and an explicit operational requirement.

On a physical device, `EXPO_PUBLIC_API_URL` must point to a backend URL reachable from that device. `127.0.0.1` on a phone refers to the phone itself.

## Passenger Mobile

Passenger Mobile has its own Expo app and typecheck. A successful Passenger PWA build does not validate the native Passenger app.

Run:

```bash
npm run mobile:passenger
```

and test on a supported emulator/device when available.

## Payments and notifications

Commercial payment providers and external notification providers remain blocked until authorized sandbox/production credentials and provider callback/webhook flows are available.

The application must not mark a payment as successful from a client-only response and must not emit a paid ticket before backend confirmation.

## SEO

The public Website contains basic metadata, but the final production canonical URL and sitemap require the confirmed public production domain.

The repository includes a conservative `robots.txt`. Do not invent a production hostname merely to create absolute canonical or sitemap URLs.

## Production note

Do not declare production readiness only because unit tests pass. Production readiness additionally requires browser E2E verification, mobile device/emulator verification, configured HTTPS, provider credentials where applicable, deployment/rollback procedures and a separate test database for migration validation.
