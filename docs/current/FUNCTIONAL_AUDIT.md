# Functional audit and closure matrix

This matrix records the latest repository audit. A status is only marked `VERIFIED` when a repeatable check or automated test exists.

| Requirement | Interface | API/service | Persistence | Evidence | Status |
|---|---|---|---|---|---|
| Published route segments drive passenger search | Website booking form | `GET /api/v1/routes`, route resources | `TransportRoute`, `RouteStop`, `RouteSegment` | Browser checks; dynamic selector implementation | VERIFIED |
| Route origin/destination match ordered stops | Admin route editor | Admin route controller | Route and stop records | PHPUnit validation assertion; 34 tests pass | VERIFIED |
| Multiple trips/buses and segment-aware seats | Passenger flow, live map | Trip, availability and booking services | Trips, buses, seats, booking seats | PHPUnit concurrency/segment tests; live-map contract | VERIFIED |
| Effective permissions | Admin/driver/passenger entry points | Permission middleware/service | Users, roles, permissions | Authorization tests and dashboard permission contract | VERIFIED |
| Homepage network overview | Website map | `GET /api/v1/network/live` | Active trips and latest locations | HTTP smoke check, browser map contracts | VERIFIED |
| Passenger booking and ticket flow | Passenger web/mobile | Search, quote, booking and ticket APIs | Booking/payment/ticket records | Backend suite; authenticated browser flow pending | PARTIAL |
| Admin route, vehicle and driver maintenance | Admin dashboard | Existing admin endpoints | Fleet and route records | Visual browser checks; backend feature tests | IMPLEMENTED WITHOUT FULL UI E2E |
| Admin users, roles and permissions maintenance | Admin dashboard | Admin access endpoints | Users/roles/permissions | Mutation forms now call existing secured endpoints; authenticated browser validation remains pending | IMPLEMENTED WITHOUT FULL UI E2E |
| Driver operational flow | Driver PWA/mobile | Driver trip/location/incidents APIs | Driver, trip, incident and location records | Typechecks and visual checks; device run pending | PARTIAL |
| Payment provider | Passenger checkout | `UnconfiguredPaymentGateway` | Payment state transitions | Provider credentials absent by design | BLOCKED |
| Google Mail delivery | Booking notifications | Laravel notification/mail configuration | Queue/failed jobs | Provider credentials and live delivery test pending | PARTIAL |
| OpenClaw and WhatsApp | Assistant/channel surfaces | Configurable gateway boundary | Audit/action records | Local gateway credentials/runtime absent | BLOCKED |
| Production deployment | All applications | Infrastructure | Production DB/secrets/domain | External infrastructure not supplied | BLOCKED |

## Confirmed corrections in this closure pass

- Removed the Website's hard-coded origin/destination whitelist. Selectors now derive active published segments from Laravel route data and constrain destinations to the selected origin.
- Replaced Admin's route JSON textarea with an ordered stop and commercial-segment editor. Segment combinations are generated from stop order and submitted as structured payloads.
- Added backend validation requiring at least two stops and requiring the first/last stop to match route origin/destination.
- Added a regression test for invalid route stop ordering and updated the existing route maintenance test to use a coherent route.
- Fixed Admin user updates that incorrectly sent role and direct-permission arrays on every save. Those fields now appear as editable only when the current operator has `roles.manage` or `permissions.assign`; ordinary profile updates no longer trigger a false 403.
- Replaced legacy literal `role === superadmin` checks in access mutation paths with effective `roles.manage` + `permissions.assign` capability checks, so legacy `admin` users backed by the system-administrator role are handled consistently.

## Validation boundary

The available environment does not provide system PHP/MySQL, production payment credentials, Google OAuth delivery, OpenClaw/WhatsApp runtime, a public domain, or physical mobile devices. Laravel was nevertheless executed with a temporary PHP 8.5 runtime and an isolated SQLite test database; those checks do not claim MySQL or production-provider verification.
