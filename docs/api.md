# API

## Convenciones

- Versionado: `/api/v1`.
- Respuestas consistentes con `data`, `meta` y `errors`.
- Validación centralizada.
- Códigos HTTP apropiados.
- Autenticación y autorización por rol/permisos.

## Endpoints base

- `GET /api/v1/health`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/routes`
- `GET /api/v1/trips/search`
- `GET /api/v1/trips/{trip}`
- `POST /api/v1/bookings`
- `POST /api/v1/bookings/{booking}/cancel`
- `GET /api/v1/driver/me`
- `GET /api/v1/driver/trips/current`
- `POST /api/v1/driver/trips/{trip}/start`
- `POST /api/v1/driver/trips/{trip}/complete`
- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/reports`

## Preview actual

En este workspace, las apps consumen una capa mock que respeta la forma de estos contratos para que el backend Laravel pueda sustituirse sin rehacer interfaces.