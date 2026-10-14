# Encore Transport

EncoreTransport is a multi-application transport platform with a central Laravel API and separate public, passenger, driver, administrative and native-mobile experiences.

## Current architecture

```text
Website / Passenger / Driver / Admin / Mobile
                  ↓
             Laravel API
                  ↓
                 MySQL
```

Applications:

- `apps/website` — public passenger-facing website.
- `apps/passenger` — Passenger PWA (React + Vite).
- `apps/driver-pwa` — Driver operational PWA.
- `apps/admin-dashboard` — administrative Operations application.
- `apps/passenger-mobile` — Expo / React Native passenger app.
- `apps/driver-mobile` — Expo / React Native driver app.
- `apps/auth` — centralized role-based login.
- `apps/package-tracking` — public package tracking.
- `backend/laravel` — central Laravel API.
- `packages/*` — shared API, domain, configuration, UI and utilities.

The root Node server serves the web applications and proxies `/api/*` requests to Laravel.

## Requirements

- Node.js 24 or newer.
- PHP compatible with the Laravel application.
- Composer.
- MySQL.
- A configured Laravel `.env`.
- TomTom credentials for real maps.

## Run locally

### Laravel

```bash
cd backend/laravel
composer install
php artisan optimize:clear
php artisan migrate
php artisan l5-swagger:generate
php artisan test
php artisan serve
```

### Frontend

From the repository root:

```bash
npm install
npm run build:passenger
npm run dev
```

Default URLs:

- Website: `http://127.0.0.1:4173/website/`
- Login: `http://127.0.0.1:4173/login/`
- Package tracking: `http://127.0.0.1:4173/track-package/`
- Passenger: `http://127.0.0.1:4173/passenger/`
- Driver: `http://127.0.0.1:4173/driver/`
- Admin: `http://127.0.0.1:4173/admin/`
- Laravel API: `http://127.0.0.1:8000/api/v1`
- Swagger: `http://127.0.0.1:8000/api/documentation`

## Validation

```bash
npm run validate:frontend
```

Laravel:

```bash
cd backend/laravel
php artisan test
php artisan l5-swagger:generate
```

## Authentication

Authentication is centralized. The login response determines the user's role.

- Passenger → Passenger application.
- Driver → Driver application.
- Admin → Operations.

The public website exposes a discreet **Staff access** link instead of presenting administrative access as a commercial passenger action.

## Maps

Web maps use the shared mapping component and Laravel map endpoints. The TomTom API key remains server-side.

A vehicle marker must only be shown when the backend has a valid authorized driver location.

## Seats and booking

Seat presentation is based on the persisted bus configuration, including row and position data. Booking availability is revalidated by Laravel. The booking service uses database transactions, row locks and the booking-seat constraint to prevent simultaneous sale of the same seat.

## Demo data

Demo seed data is limited to local/testing environments and must not be presented as production information.

## Native GPS

Driver Mobile does not yet send native GPS because `expo-location` and its Android/iOS permission lifecycle are not currently installed/configured. The existing browser Driver PWA can submit authorized geolocation.

This remains explicitly pending; no location is simulated.

## Payments

Payment integrations must be validated independently with provider sandbox credentials and server-side confirmation/webhooks. A booking must not be considered paid from a client-only response.

## Known external dependencies

Production verification can require:

- TomTom API key/access.
- Payment provider credentials and webhooks.
- Notification provider credentials.
- Android/iOS device or emulator.
- Native GPS permission configuration.

See `docs/AUDITORIA_CORRECCION_20261009.md` after applying the mandate correction pack for the verified/pending matrix.
