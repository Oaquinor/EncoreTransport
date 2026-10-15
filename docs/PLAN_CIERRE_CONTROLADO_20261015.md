# Plan de cierre controlado

## Fase 1 — consolidación inmediata

Aplicar:

```powershell
powershell -ExecutionPolicy Bypass -File .\EncoreTransport_AUDITORIA_INTERNA_CONSOLIDACION_20261015\APLICAR_CONSOLIDACION_INTERNA.ps1 . -RestartFrontend
```

Después:

```bat
npm run audit:repository
npm run test:architecture
npm run typecheck:passenger
npm run build:passenger
npm run validate:frontend
```

## Fase 2 — Laravel

```bat
npm run validate:backend
```

Antes de tocar nombres de migraciones:

```bat
cd backend\laravel
php artisan migrate:status
```

## Fase 3 — Mobile

```bat
npm run validate:mobile
```

Después ejecutar Passenger Mobile y Driver Mobile en emulador/dispositivo.

## Fase 4 — aceptación visual

Revisar:

```text
/website/
/passenger/
/driver/
/admin/
/login/
/track-package/
```

a:

```text
1440px
1024px
768px
390px
```

## Fase 5 — refactor de monolitos

No mezclar con correcciones visuales.

Orden:

```text
Passenger Web
Driver Mobile
Passenger Mobile
Driver Web
Admin
```

Cada split debe ser behavior-preserving.

## Fase 6 — externos

Cerrar:

```text
payment provider
notifications
production domain
HTTPS
deployment
rollback
```
