# Deployment checklist

Required environment inputs: Laravel application key, database credentials,
`ENCORE_COUNTRY`, `ENCORE_CURRENCY`, `ENCORE_TIMEZONE`, map credentials, mail
mailer settings, approved payment provider credentials/webhook secret, and
the production hostname.

Before deploy: run migrations against a separate database, generate assets,
run `npm test`, Laravel tests and browser/device acceptance. After deploy:
check health, API logs, queue/mail delivery, payment webhook idempotency,
package tracking, and rollback readiness. Never commit `.env`, tokens,
payment secrets or OpenClaw session data.
