# EncoreTransport Closure Audit — 2026-10-14

Repository reviewed: `Oaquinor/EncoreTransport`
Main commit inspected: `be4de7cb8b3e3f0d184bf8655193e74a277cbe84`

## Executive conclusion

EncoreTransport has real functional coverage, but the repository still shows the history of many incremental visual patches.

The largest maintainability problem is not one broken screen. It is fragmentation:

- multiple style layers per application;
- repeated utility logic;
- large application orchestrators;
- historical patch scripts in the repository root;
- mixed naming conventions;
- a shared API file that previously contained every domain in one module;
- configuration assumptions embedded in shared code.

This package addresses the safest structural problems without changing booking, maps, authorization, pricing or database behavior.

## Inventory reviewed

### Frontend

- Website: 24 files
- Passenger Web: 18 files
- Legacy Passenger PWA: 6 files
- Passenger Mobile: 6 files
- Driver Web: 10 files
- Driver Mobile: 6 files
- Admin: 14 files
- Auth: 4 files
- Tracking: 4 files
- Shared/packages: 28 files

### Backend

87 application/config/migration files were enumerated.

The Laravel backend is materially better structured than the current frontend.

## High-priority findings

### 1. CSS patch stacking

Before this cleanup:

- Website directly loaded 6 style files.
- Passenger imported 8 style files.
- Driver loaded 7 style files.
- Admin loaded 10 style files.
- Auth loaded 4 style files.
- Tracking loaded 4 style files.

Names such as:

```text
gap-close.css
mandate-fixes.css
visual-refresh.css
flow-refresh.css
seat-reference.css
```

make the history of emergency patching visible to future developers.

This package introduces one canonical `app.css` entrypoint per application.

The old files remain as compatibility layers for now; they should be consolidated gradually after visual regression testing.

### 2. Shared API mixed every domain

`packages/shared/api.mjs` mixed auth, public data, booking, driver and admin calls.

It is now split internally into:

```text
api/core.mjs
api/auth.mjs
api/public.mjs
api/bookings.mjs
api/driver.mjs
api/admin.mjs
```

`api.mjs` remains a compatibility facade.

### 3. Repeated generic helpers

The repo repeats `esc()` functions in multiple apps.

A shared `html.mjs` is added.

`ui.mjs` receives descriptive render names while preserving aliases.

### 4. Monolithic application files

Current inspected line counts:

```text
Passenger Web passenger-app.tsx   ~1096
Passenger Mobile App.tsx           ~706
Driver Mobile App.tsx             ~1189
Driver PWA app.mjs                 ~469
Admin app.mjs                      ~486
Admin views.mjs                    ~331
```

The first three should be split into screens/services/components.

This package adds an architecture audit command so the issue remains visible instead of silently growing.

A full split of these files should be performed as its own behavior-preserving refactor with typecheck/device/browser verification; doing it blindly together with payment/visual changes would increase risk.

### 5. Configuration ambiguity

Shared configuration currently defaults to:

```text
Dominican Republic
DOP
America/Santo_Domingo
```

Earlier product requirements have also referenced Guyana.

This is a product/configuration decision, not something code should guess.

The configuration is therefore made runtime-overridable while existing defaults remain unchanged.

### 6. Legacy mock data remains

`packages/shared/mock-data.mjs` still contains old demonstration data.

It should never be imported by production applications.

The new architecture contract enforces this.

### 7. Payments are not complete

Laravel currently binds a payment abstraction, but the only verified fallback is:

```text
UnconfiguredPaymentGateway
```

This correctly fails closed.

A real provider cannot be honestly marked complete without:
- authorized provider choice;
- sandbox credentials;
- webhook secret;
- callback URLs;
- provider-specific success/failure mapping;
- end-to-end sandbox verification.

### 8. Production closure is broader than unit tests

Still externally required:

- browser E2E acceptance;
- Android/iOS device or emulator acceptance;
- deployment/rollback procedure;
- HTTPS and public hostname;
- final SEO domain;
- payment credentials;
- notification provider if required.

## App-by-app review

### Website

Strengths:
- public SEO metadata exists;
- route/search integration is real;
- real map integration exists;
- public package/passenger links exist.

Needs ongoing cleanup:
- consolidate legacy style layers;
- avoid technical copy leaking into public UI;
- final production domain for canonical/sitemap;
- browser E2E.

### Passenger Web

Strengths:
- real API flow;
- seat metadata;
- quote;
- booking;
- authentication continuation.

Structural debt:
- 1000+ line application orchestrator;
- multiple style layers;
- technical labels still exist in places in the current main.

### Driver Web

Strengths:
- real assigned trip;
- boarding;
- incidents;
- schedule;
- vehicle status;
- packages;
- route map.

Debt:
- duplicate formatting/escaping helpers;
- generic shared UI class dependency;
- app file approaching refactor threshold.

### Admin

Strengths:
- modules are restricted to real data-backed areas;
- reports and schedules are API-backed;
- blocked modules are not falsely implemented.

Debt:
- many style layers;
- generic `table()` renderer;
- repeated escaping;
- module/view responsibilities could be further separated.

### Mobile

Both native apps are materially implemented, but each `App.tsx` is too large for long-term maintenance.

Recommended target structure:

```text
src/
  api/
  components/
  screens/
  hooks/
  domain/
  styles/
```

### Backend

The Laravel side has clear controllers, models and services.

Main unresolved commercial gap:
- payment provider.

The backend should remain authoritative for all booking/payment/ticket state.

## What this package implements

- API facade decomposition.
- Runtime-overridable shared config.
- Shared HTML utilities.
- Professional UI helper names with compatibility aliases.
- Canonical CSS entrypoint per web app.
- Architecture contract test.
- Architecture audit command.
- Architecture/naming/app catalog documentation.
- Optional archival of old root patch scripts.

## Closure status

### Implemented by this package

- repository organization baseline;
- API module organization;
- style entrypoint organization;
- naming conventions;
- developer documentation;
- architecture regression checks.

### Not truthfully closable without external inputs

- real payment gateway;
- production notification provider;
- production hostname/absolute SEO;
- final country/currency decision;
- device E2E;
- browser E2E/deployment acceptance.
