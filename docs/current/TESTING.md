# Testing

Commands intended for workspace validation:

```text
npm test
npm run typecheck:api-client
npm run typecheck:passenger
npm run typecheck:passenger-mobile
npm run typecheck:driver-mobile
npm run build:passenger
node tests/performance-runtime.test.mjs
```

The Node contracts, server routing, performance contract, all four typechecks
and Passenger production build pass. Laravel migrations pass on a fresh SQLite
database and PHPUnit passes with 34 tests, 110 assertions and 4 expected
skips. Composer validation and security audit pass. Browser visual validation
passes with the temporary WSL browser libraries; physical mobile-device E2E
remains pending.
`npm audit --audit-level=high` reports 11 advisories, mostly transitive Expo
tooling; force remediation was not applied because it would downgrade Expo
across a breaking major.

Additional coverage includes:

- `LiveNetworkTest` for the public latest-location payload and privacy boundary.
- Segment-aware seat availability through `SeatAvailabilityService`.
- `SeatConcurrencyTest` for same-seat overlap versus non-overlapping segments.
- Homepage live-network performance contracts: no initial seat fan-out, lazy map
  initialization, visible-tab polling and marker reuse.

The validation runtime used a temporary PHP 8.5 plus SQLite database under
`/tmp`; no repository or production database was modified. Swagger generation
completed with a CLI compatibility definition for PHP 8.5's removed
`T_THROW` token; standard supported PHP runtimes do not need that shim.

Browser visual validation passed 30 checks and screenshots at 390, 768, 1024,
1440 and 1920 pixels. A cold browser measurement at 1440px recorded:

| Surface | DOMContentLoaded | Load | Resources | Transfer |
|---|---:|---:|---:|---:|
| Website | 422 ms | 422 ms | 27 | 1.79 MB |
| Passenger | 73 ms | 73 ms | 3 | 296 KB |
| Driver | 104 ms | 104 ms | 17 | 1.63 MB |
| Admin | 138 ms | 138 ms | 17 | 1.63 MB |

The website performance run made no seat API requests on initial load.
