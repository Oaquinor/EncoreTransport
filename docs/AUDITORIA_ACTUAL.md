# EncoreTransport - auditoria de la rama actual

Base revisada: `Oaquinor/EncoreTransport`, rama `main`, commit `fb1e341e43215beae26758318e201d7409793b58` (`Correciones`).

## Defectos criticos comprobados

1. `server.mjs` servia `apps/website/index.html` directamente para `/`. Como el HTML usa `./styles.css`, `./enhancements.css`, `./app.mjs`, el navegador los resolvia contra la raiz y la pagina podia quedar sin estilos. Se cambia `/` por redireccion a `/website/` y se normalizan aliases sin slash final.
2. `apps/website/app.mjs` consumia la respuesta normalizada de `MapController` como si fuera la respuesta RAW de TomTom (`data.results`, `data.routes`). El mapa real no podia dibujarse de forma coherente. Se usa `/maps/journey`, que ya normaliza geocodificacion y ruta en Laravel.
3. `routes/api.php` no exponia endpoints que ya consumian `packages/api-client` y controladores existentes: listado/cancelacion de bookings, quote, maps/journey, payments, ticket y detalle de route. Se alinean rutas y contratos.
4. Habia dos migraciones con el mismo prefijo `2026_10_08_000200` y ambas intentaban crear `booking_passengers.boarded_at` e `incidents`. Esto explica el error `Duplicate column name 'boarded_at'`. La segunda migracion se hace reconciliadora/idempotente y conserva el esquema de incidencias que usa el modelo actual (`title`, `severity`).
5. `BookingService` crea pasajeros con `status=booked`, pero `BookingPassenger::$fillable` no incluia `status`; el valor se descartaba silenciosamente. Se corrige.
6. `routes/api.php` enviaba operaciones de viaje al `DriverController`, aunque existe `DriverTripController` con `TripStateService`, auditoria y timestamps de estado. Se centralizan las transiciones en `DriverTripController`.
7. Existia modelo/estructura de tickets y token QR, pero no endpoint de validacion de servidor. Se agrega validacion consumible solo por `driver/admin`, con token opaco, control de uso duplicado y estado del viaje.
8. Incidencias solo podian crearse/listarse. Se agrega actualizacion de estado/severidad para administracion y auditoria.
9. Solo existia login. Se agrega registro de pasajeros sin permitir elegir un rol privilegiado.
10. Se mantiene el comportamiento correcto de pagos: si no hay gateway real configurado, no se simula aprobacion.

## No se ha falseado como completado

- PowerTranz, PayPal y Stripe NO estan integrados realmente en la rama actual. Solo existe `UnconfiguredPaymentGateway`.
- El mandato nuevo solicita Google Maps, pero la rama real contiene TomTom como proveedor funcional. No se sustituyo una integracion existente por otra sin credenciales, APIs habilitadas ni validacion externa. El cambio de proveedor debe hacerse como un bloque separado y probado.
- Email, WhatsApp Business, push/FCM y realtime no estan verificados de extremo a extremo.
- El panel administrativo no contiene todos los CRUD enumerados en el mandato; varios modulos siguen siendo parciales.

## Archivos actualizados en este pack

- `server.mjs`
- `apps/website/app.mjs`
- `packages/shared/api.mjs`
- `packages/api-client/src/index.ts`
- `backend/laravel/routes/api.php`
- `backend/laravel/database/migrations/2026_10_08_000200_complete_operational_core.php`
- `backend/laravel/app/Models/BookingPassenger.php`
- `backend/laravel/app/Http/Controllers/Api/V1/AuthController.php`
- `backend/laravel/app/Http/Controllers/Api/V1/DriverController.php`
- `backend/laravel/app/Http/Controllers/Api/V1/IncidentController.php`
- `backend/laravel/app/Http/Controllers/Api/V1/TicketController.php`
- `backend/laravel/app/Services/Tickets/TicketService.php`

## Aplicacion

1. Copiar el pack en la raiz del repo.
2. Ejecutar `powershell -ExecutionPolicy Bypass -File .\EncoreTransport_ACTUALIZACION_CRITICA\APLICAR_ACTUALIZACION.ps1 .`
3. Desde `backend\laravel`: `php artisan optimize:clear`, `php artisan migrate`, `php artisan l5-swagger:generate`, `php artisan test`.
4. Desde la raiz: `npm install`, `npm run build:passenger`, `npm run dev`.
5. Abrir `http://127.0.0.1:4173/`; debe redirigir a `/website/` con CSS/JS cargados.
