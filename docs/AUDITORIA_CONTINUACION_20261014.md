# Continuación de auditoría integral EncoreTransport — 2026-10-14

## Commit remoto inspeccionado

`36f5347ddda7b8e537bb5d4b5a327aa7baeec880`

## Hallazgos reproducibles adicionales

### 1. Design system premium todavía no aplicado

El repositorio contiene `APLICAR_FIX_PREMIUM_DESIGN.ps1`, pero los archivos publicados siguen sin cargar el design system premium:

- Website no carga `packages/shared/premium.css` ni `apps/website/premium.css`.
- Driver PWA no carga `packages/shared/premium.css` ni `apps/driver-pwa/premium.css`.
- Admin no carga `packages/shared/premium.css` ni `apps/admin-dashboard/premium.css`.
- Passenger PWA no importa `packages/shared/premium.css` ni `apps/passenger/src/premium.css`.

Esto explica el fallo real:

```text
website must load the shared premium design system
```

La corrección modifica las aplicaciones, no el test.

### 2. Ubicación exacta de conductor expuesta públicamente

`GET /api/v1/trips/{trip}/location` estaba declarado fuera de autenticación.

El controlador devolvía directamente el último registro de `driver_locations`, incluyendo coordenadas exactas.

Eso contradice la regla de no exponer ubicaciones precisas a usuarios no autorizados.

Corrección:

- endpoint movido al grupo `api.token:driver,admin`;
- un conductor solo puede leer la ubicación de su propio viaje asignado;
- Admin puede leerla;
- los clientes Driver/Admin ya no fuerzan `token:false`;
- se agrega `DriverLocationPrivacyTest`.

### 3. Estado del Passenger PWA legacy

`apps/passenger-pwa/app.mjs` ya redirige a `/passenger/`.

El servidor también redirige `/move/` a `/passenger/`.

La carpeta legacy puede mantenerse temporalmente, pero ya no debe funcionar como aplicación paralela.

## Validación requerida después del pack

```bat
npm run test:premium-design
npm run test:premium-responsive
npm run validate:frontend
npm run validate:mobile
npm run validate:backend
```

Además:

```bat
cd backend\laravel
php artisan test --filter=DriverLocationPrivacyTest
```

No se declara esta auditoría cerrada hasta recibir resultados reales de estos comandos y completar las validaciones E2E disponibles.
