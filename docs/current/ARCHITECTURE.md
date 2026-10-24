# Architecture current

Website, Passenger, Driver, Admin, Tracking and mobile clients consume the
Laravel API. Laravel owns authentication, permissions, routes, segment
inventory, pricing, booking transactions, tickets, packages and payments.
MySQL is the source of truth. OpenClaw, when enabled, is only a gateway for
Encore Assistant tools and never receives direct database access.

Canonical entrypoints are `server.mjs`, each app's `app.css`,
`packages/shared/api.mjs`, and `backend/laravel/routes/api.php`.

The homepage network overview uses `GET /api/v1/network/live`. Laravel
returns one compact public payload with route summaries and the latest real
location per active trip; the browser owns only map rendering and marker
refresh. Segment-aware seat availability is centralized in
`SeatAvailabilityService`, while `RouteSegmentService` resolves only
persisted configured directions.
