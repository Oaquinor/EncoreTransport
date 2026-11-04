#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${1:-}"
if [[ -z "$BASE_URL" ]]; then
    printf 'Usage: %s https://production-domain\n' "$0" >&2
    exit 64
fi

BASE_URL="${BASE_URL%/}"

health="$(curl --fail --silent --show-error --location --max-time 15 \
    -H 'Accept: application/json' "$BASE_URL/api/v1/health")"
if [[ "$health" != *'"status":"ok"'* ]]; then
    printf 'FAIL API health: unexpected response\n' >&2
    exit 1
fi
printf 'PASS API health\n'

for path in /website/ /passenger/ /driver/ /admin/ /login/ /track-package/ /package-register/; do
    curl --fail --silent --show-error --location --max-time 15 \
        -H 'Accept: text/html' "$BASE_URL$path" >/dev/null
    printf 'PASS public route: %s\n' "$path"
done

printf 'Health check passed. Authentication, payments, mail and device capabilities require their dedicated acceptance suites.\n'
