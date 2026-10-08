# Auditoria de reparacion integral - EncoreTransport

Baseline auditado: `Oaquinor/EncoreTransport`, `main`, commit `fb7501336116b2e8c6acf94b7131e0e86a477f67`.

## Hallazgo principal del fallo visual

El repositorio original contiene HTML/CSS visualmente completo para Website, Passenger, Driver y Admin. El pack anterior reemplazo demasiados archivos de presentacion e integracion al mismo tiempo. La reparacion actual cambia la estrategia:

1. Restaurar HTML, CSS, enhancements, logo y assets visuales desde `origin/main`.
2. No reconstruir el producto visual.
3. Sobreponer solamente la logica que conecta API/BD.
4. Usar un proxy same-origin `/api/*` en `server.mjs` para evitar que cada frontend tenga URLs distintas.
5. Si Laravel falla, mostrar error. No usar mock-data como fallback.

## Auditoria por superficie

### Website
- Se conserva `apps/website/index.html`, `styles.css`, `enhancements.css`, `enhancements.mjs` del baseline.
- `app.mjs` obtiene rutas reales de `/api/v1/routes`.
- El buscador transfiere `origin`, `destination`, `date` y `passengers` al Passenger.
- La pagina no desaparece si la API falla; solo la zona dependiente de API muestra el error y Retry.
- Las cifras de demostracion del bloque hero dejan de presentarse como metricas reales una vez responde la API.

### Passenger Web
- Se conserva la hoja visual existente.
- Search usa `/api/v1/trips/search`.
- Trip usa `/api/v1/trips/{id}`.
- Seats usa `/api/v1/trips/{id}/seats` y conserva IDs reales de `bus_seats`.
- Passenger count debe coincidir con seat count.
- Booking usa `/api/v1/bookings` con `trip_id`, `seat_ids`, `passengers`.
- Login usa `/api/v1/auth/login` solo cuando el booking requiere token.
- No se simula pago aprobado ni ticket confirmado. El flujo termina en estado real `pending_payment` mientras el gateway este sin configurar.

### Driver
- Se conserva layout/CSS del PWA.
- Se eliminan usuario/clave funcionales hardcodeados.
- Login real por `/auth/login`.
- Perfil y viaje asignado reales.
- Start/Complete modifican Laravel.
- Passenger boarded persiste `boarded_at`.
- GPS usa `navigator.geolocation` y persiste en `driver_locations`.
- Incidencia persiste en tabla `incidents`.

### Admin
- Mantiene layout/CSS del dashboard.
- Requiere token admin real.
- Dashboard obtiene trips, bookings, buses, drivers y metricas de BD.
- Reporte de periodo usa endpoint real.
- No se usa `reporting-enhancements.mjs` para inyectar DOP 428K/porcentajes ficticios.

### Backend
- Se conserva auth, trips, routes, seats, booking transaction/locks, TomTom y tracking existentes.
- Se agrega migracion operacional para `boarded_at` e `incidents`.
- Se agregan operaciones de Driver e informe Admin.
- `OpenApiSupplement.php` de packs anteriores se elimina porque duplicaba operaciones ya documentadas en Controllers y provocaba `Unable to merge @OA\Get()`.

## Dependencias externas que NO se falsean

- Payment gateway: permanece `unconfigured` hasta tener proveedor/credenciales reales.
- Ticket final: no se presenta como emitido hasta que exista confirmacion real del pago.
- Email/WhatsApp: no se simula envio.
- Realtime/WebSocket: no se muestra como LIVE si solo existe ultima ubicacion conocida.

## Archivos visuales restaurados, no reinventados

El script restaura desde Git los HTML/CSS/assets aprobados de Website, Passenger, Driver, Admin, estilos shared, logo y medios. Luego aplica los archivos funcionales incluidos en este pack.
