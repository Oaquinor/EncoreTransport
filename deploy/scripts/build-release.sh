#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ "${APP_ENV:-}" != "production" ]] && ! grep -Eq '^APP_ENV=production$' backend/laravel/.env 2>/dev/null; then
    printf 'APP_ENV is not production; refusing to prepare a production release.\n' >&2
    exit 1
fi

npm ci
npm run build:passenger

cd backend/laravel
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

printf '\nRelease build prepared. Database migrations were intentionally not run.\n'
printf 'Run `php artisan migrate --force` only after a verified backup and explicit approval.\n'
