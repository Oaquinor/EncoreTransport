# EncoreTransport - implementation status

## Implemented in this package

- Versioned `/api/v1` routing foundation.
- Token authentication without exposing token hashes.
- Role gating for passenger / driver / admin endpoints.
- Normalized bus seats.
- Booking passengers and booking seats.
- Concurrency-safe booking service using DB transaction + row locks + unique `(trip_id, bus_seat_id)` constraint.
- Payment domain tables and gateway abstraction foundation.
- Secure ticket identifier/QR storage model foundation.
- Driver location persistence with latest-location endpoint.
- Notification and audit tables.
- Environment placeholders for Google Maps, payments, WhatsApp and realtime.
- Rate limiting on login, booking and driver location writes.

## Deliberately not faked

External integrations are not claimed as complete without real provider credentials/documentation:

- Google Maps API keys and billing.
- Powertranz merchant credentials and webhook signature contract.
- Meta WhatsApp Business credentials/templates.
- Production realtime provider.

The architecture is prepared for them, but no fake success response is introduced.

## Required follow-up on the target machine

1. Copy/overlay the files from this package into the repository.
2. Rename `backend/laravel/config_encore.php` to `backend/laravel/config/encore.php`.
3. Append `.env.example.additions` values to `backend/laravel/.env.example` and configure real secrets only in `.env`.
4. Run `composer install` and `php artisan migrate`.
5. Seed bus seats for existing buses before testing bookings.
6. Run `php artisan test`.
7. Replace frontend mock clients progressively with HTTP calls to `/api/v1` once backend base URL is configured.
