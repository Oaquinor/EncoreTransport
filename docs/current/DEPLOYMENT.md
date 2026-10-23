# Production deployment

This checklist is the operational source of truth. Never commit `.env`, API
tokens, payment secrets, mail credentials, WhatsApp credentials or OpenClaw
session data.

## Required configuration

Set these values in the deployment secret store, not in Git:

- `APP_KEY`, `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://...`
- `APP_TIMEZONE=America/Guyana`, `ENCORE_COUNTRY=Guyana`, `ENCORE_CURRENCY=GYD`,
  `ENCORE_LOCALE=en-GY`, `ENCORE_TIMEZONE=America/Guyana`
- production database credentials and a non-public database host
- `SESSION_SECURE_COOKIE=true`, trusted HTTPS proxy configuration and secure
  cookie settings
- TomTom production key and API limits
- queue, cache and session stores suitable for the expected traffic
- a real mail provider and verified sender domain
- approved payment provider credentials and webhook secret before enabling
  payments
- a production hostname before enabling canonical SEO URLs

Keep `ENCORE_PAYMENT_GATEWAY=unconfigured` until the provider has passed its
sandbox and webhook tests. Keep `L5_SWAGGER_PUBLIC=false`; generated API docs
are for internal development only.

## Pre-deploy

1. Provision a separate staging database and run `php artisan migrate:status`.
2. Take a verified database backup before production migrations.
3. Run `composer install --no-dev --prefer-dist --optimize-autoloader`.
4. Run the frontend builds and validation commands from the repository root.
5. Run Laravel feature tests, permission tests and the browser/device acceptance
   suites available in the target environment.
6. Build frontend assets and confirm the server allowlist exposes only the
   intended application routes.
7. Verify queue workers, scheduler/cron, mail delivery, map quotas and webhook
   endpoints in staging.

## Deploy

```bash
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan queue:restart
npm run build:all
```

Serve Laravel and the frontend only through HTTPS. Put the reverse proxy in
front of the app, terminate TLS there, restrict database access to the app
network, and send application/queue/webhook logs to the production log store.

## Post-deploy checks

- `GET /api/v1/health` returns a healthy response without leaking configuration.
- Website, passenger, driver, admin and tracking routes load at mobile and
  desktop breakpoints.
- Login, return URL, permission enforcement and logout work with real users.
- Booking remains unconfirmed until payment confirms; ticket issuance follows
  the confirmed booking state.
- Queue workers process mail and notifications; a failed notification does not
  roll back a booking.
- Payment webhooks are authenticated and idempotent.
- Segment availability and ticket validation work for the active route.
- Logs contain no tokens, passwords, card data or OpenClaw session secrets.

## Rollback and recovery

Keep the previous application build available until post-deploy checks pass.
For an application rollback, switch the release symlink back, clear/rebuild
cached configuration and restart workers. Do not reverse an applied migration
blindly; use a forward-compatible corrective migration after restoring a
verified backup when database data is involved. Document the incident and
retain the relevant logs.

External credentials, the final production domain, payment provider, mail
provider and WhatsApp/OpenClaw number remain deployment inputs rather than
values that can be safely invented in this repository.
