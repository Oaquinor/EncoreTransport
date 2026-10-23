# EncoreTransport Security Baseline

## Implemented controls

- Laravel API responses include `nosniff`, `DENY` framing, strict referrer policy, restrictive permissions policy and `no-store` for API data.
- The Node frontend/proxy emits the same browser security headers and never serves files outside its allowlist.
- Bearer tokens are stored only in `sessionStorage`; persistent browser storage is not used for authentication tokens.
- Guest booking tokens are random, stored server-side as SHA-256 hashes and accepted only through `X-Guest-Booking-Token`.
- Guest booking responses hide the guest token hash, payment metadata, passenger document/contact fields and driver operational fields.
- Public package tracking exposes status/timestamps only; internal package event notes are not public.
- Role and direct-permission assignment cannot grant access beyond the acting administrator's authority. Superadmin assignment is restricted to superadmin.
- Assistant audit arguments/results are recursively redacted for passwords, tokens, secrets, API keys, cookies and payment-card fields, with bounded depth and string length.
- Map provider credentials remain server-side and map tile coordinates are range-checked before the upstream request.

## Required deployment controls

- Set `APP_ENV=production`, `APP_DEBUG=false`, a unique `APP_KEY`, HTTPS, `SESSION_SECURE_COOKIE=true`, and a production mail/queue backend.
- Keep payment, map, WhatsApp and mail credentials outside the repository and rotate them if exposed.
- Restrict database, Redis, queue, storage and Laravel debug endpoints to private infrastructure.
- Run `npm audit` and `composer audit` in CI. The current npm audit includes Expo transitive findings that require a reviewed Expo upgrade; do not use a breaking `npm audit fix --force` blindly.
- Keep Swagger generation/UI disabled or access-controlled in production.

## Security test expectations

The backend suite must cover authentication, permission escalation, guest token ownership, public-data minimization, ticket validation, package tracking privacy, rate limiting and security headers.
