# Refactoring audit

## Initial audit

The repository already had the intended top-level boundaries (`apps`,
`packages`, `backend/laravel`) and an established shared JavaScript API
facade. The main confirmed duplication was a second typed API client that was
not used consistently: Passenger web and both mobile apps each implemented
their own fetch/header/error handling. The frontend also has separate typed
domain formatting for React Native, so that package remains in place because
it is an active mobile dependency.

Admin already separates API, view and module registry files. Laravel already
contains dedicated booking, route-segment, pricing, notification, permission
and map services. No broad controller/service rewrite was justified without
runtime and database profiling.

## Applied

- Extended `packages/api-client` with the canonical typed `requestJson`,
  timeout handling, bearer/guest credentials and normalized `ApiError` /
  `TimeoutError` behavior.
- Migrated Passenger web, Passenger Mobile and Driver Mobile to that client.
- Declared the API client as an explicit dependency of both mobile apps and
  synchronized the workspace lock metadata.
- Preserved the existing shared JavaScript API client for Website, Admin,
  Driver PWA and tracking applications; it remains the correct runtime client
  for those non-TypeScript apps.

## Deliberately not removed

No CSS layer, app module or Laravel class was removed in this pass. Static
absence of references is not sufficient proof for dynamically loaded routes,
HTML imports, service workers or Laravel framework discovery. Existing
visual layers therefore remain until browser coverage or a dependency graph
proves removal safe.

## Validation

The API client, Passenger web, Passenger Mobile and Driver Mobile typechecks
pass after the refactor. Browser E2E, Laravel tests and production build
execution remain environment-dependent as recorded in `STATUS.md` and
`TESTING.md`.
