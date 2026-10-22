# Architecture current

Website, Passenger, Driver, Admin, Tracking and mobile clients consume the
Laravel API. Laravel owns authentication, permissions, routes, segment
inventory, pricing, booking transactions, tickets, packages and payments.
MySQL is the source of truth. OpenClaw, when enabled, is only a gateway for
Encore Assistant tools and never receives direct database access.

Canonical entrypoints are `server.mjs`, each app's `app.css`,
`packages/shared/api.mjs`, and `backend/laravel/routes/api.php`.
