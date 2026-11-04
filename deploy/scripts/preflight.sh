#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

failures=0
check_command() {
    local command_name="$1"
    if command -v "$command_name" >/dev/null 2>&1; then
        printf 'PASS command: %s\n' "$command_name"
    else
        printf 'FAIL command: %s is not installed\n' "$command_name" >&2
        failures=$((failures + 1))
    fi
}

check_file() {
    local file_name="$1"
    if [[ -f "$file_name" ]]; then
        printf 'PASS file: %s\n' "$file_name"
    else
        printf 'FAIL file: %s is missing\n' "$file_name" >&2
        failures=$((failures + 1))
    fi
}

check_command node
check_command npm
check_command php
check_command composer
check_command curl
check_file server.mjs
check_file package-lock.json
check_file backend/laravel/artisan
check_file backend/laravel/composer.lock
check_file backend/laravel/.env
check_file apps/passenger/dist/index.html

if [[ -f backend/laravel/.env ]]; then
    if grep -Eq 'CHANGE_ME|YOUR_PRODUCTION_DOMAIN' backend/laravel/.env; then
        printf 'FAIL env: production placeholder values remain\n' >&2
        failures=$((failures + 1))
    else
        printf 'PASS env: no production placeholders remain\n'
    fi

    required_keys=(APP_KEY APP_ENV APP_DEBUG APP_URL DB_CONNECTION DB_HOST DB_DATABASE DB_USERNAME)
    for key in "${required_keys[@]}"; do
        if grep -Eq "^${key}=.+" backend/laravel/.env; then
            printf 'PASS env key: %s\n' "$key"
        else
            printf 'FAIL env key: %s is missing or empty\n' "$key" >&2
            failures=$((failures + 1))
        fi
    done

    if grep -Eq '^APP_ENV=production$' backend/laravel/.env; then
        printf 'PASS env: APP_ENV=production\n'
    else
        printf 'FAIL env: APP_ENV must be production\n' >&2
        failures=$((failures + 1))
    fi

    if grep -Eq '^APP_DEBUG=false$' backend/laravel/.env; then
        printf 'PASS env: APP_DEBUG=false\n'
    else
        printf 'FAIL env: APP_DEBUG must be false\n' >&2
        failures=$((failures + 1))
    fi

    if grep -Eq '^SESSION_SECURE_COOKIE=true$' backend/laravel/.env; then
        printf 'PASS env: SESSION_SECURE_COOKIE=true\n'
    else
        printf 'FAIL env: SESSION_SECURE_COOKIE must be true\n' >&2
        failures=$((failures + 1))
    fi
fi

if (( failures > 0 )); then
    printf '\nPreflight failed with %d issue(s). No deployment was performed.\n' "$failures" >&2
    exit 1
fi

printf '\nPreflight passed. This command did not migrate the database or restart services.\n'
