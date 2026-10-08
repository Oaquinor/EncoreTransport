# EncoreTransport - Auditoria y consolidacion sobre `main`

Fecha de preparacion: 2026-10-08.
Repositorio auditado: `Oaquinor/EncoreTransport` (`main`).

## Estado encontrado

### Backend real ya existente y conservado
- Laravel 11 como API `/api/v1`.
- Autenticacion por token propio, roles passenger/driver/admin.
- Busqueda de viajes, rutas, asientos, booking con transaccion/lock y expiracion.
- TomTom detrás de Laravel mediante `MapServiceInterface` / `TomTomMapService`.
- Swagger/L5-Swagger.
- GPS de conductor.
- Scheduler para liberar bookings expirados.
- Abstraccion de pagos deliberadamente sin fingir proveedor (`UnconfiguredPaymentGateway`).

### Problemas encontrados en el repositorio
- Website con destinos, viaje destacado, asientos y tracking visual hardcodeados.
- Passenger React con EN-001/EN-014/EN-022, asientos y pago simulados.
- Passenger PWA legacy seguia accesible y conservaba datos de demostracion.
- Driver PWA usaba credenciales `ricardo.luna / 123456` y cambios de estado locales.
- Admin contenia graficos/usuarios/roles/reportería ficticios; `reporting-enhancements.mjs` tenia DOP 428K y porcentajes estaticos.
- `packages/shared/api.mjs` ocultaba fallas reales mediante fallback a `mock-data.mjs`.
- `packages/api-client` era un cliente mock.
- `packages/config` habilitaba mock API por defecto.
- Los service workers legacy cacheaban `mock-data.mjs`.
- Existia archivo de configuracion legacy `backend/laravel/config_encore.php` ademas de `config/encore.php`.
- Backend tenia modelos de Payment/Ticket pero faltaba una capa HTTP completa para exponer el estado real sin simular exito.
- Faltaban operaciones reales del Driver para start/complete/boarding e incidentes persistentes.
- Dashboard calculaba revenue desde booking confirmado y no desde pago confirmado.
- Faltaba reporte administrativo real por rango.
- Faltaba API de quote de precio para que frontend no calcule el total.

## Cambios incluidos en este pack

### Fuente de verdad y API
- Ningun frontend incluido hace fallback silencioso a mocks.
- API client centralizado con token, timeout, errores y serializacion.
- Quote de precio desde Laravel.
- Booking real con pasajeros, hold de asientos, cancelacion y expiracion.
- Payment API conserva el gateway desacoplado; si no hay proveedor configurado devuelve error real, nunca `paid` falso.
- Ticket se consulta solamente si existe realmente.
- Driver start/complete/boarding con transiciones backend.
- Incidentes persistidos y administrables.
- Dashboard/reports alimentados por MySQL; revenue usa pagos `paid`.
- Auditoria de login/logout/booking/payment/trip/incident.
- TomTom `journey` resuelve origen/destino y devuelve geometria real sin exponer API key.

### Website
- Rutas y destinos cargados desde Laravel.
- Busqueda real y transferencia de filtros al Passenger.
- Preview del viaje real desde API.
- Disponibilidad real de asientos.
- Preview de ruta dibujado a partir de TomTom (via backend), sin iframe OpenStreetMap ni SVG inventado.
- SEO tecnico basico: canonical, OpenGraph/Twitter, JSON-LD y endpoints `robots.txt`/`sitemap.xml` del servidor preview.

### Passenger
- React consume Laravel: search -> trip -> TomTom journey -> seats -> passengers -> quote -> auth -> booking -> payment.
- No confirma booking ni genera ticket desde la UI.
- Pago no se simula: con gateway sin configurar muestra la dependencia real.
- Passenger PWA legacy `/move` queda redirigida al Passenger actual para evitar dos implementaciones funcionales paralelas.
- Manifest/service worker del Passenger actual no cachea `/api`.

### Driver
- Login real por `/auth/login`.
- Perfil/viaje asignado reales.
- Pasajeros reales por booking confirmado.
- Start/complete persistidos.
- Boarding persistido.
- GPS real con `navigator.geolocation` -> Laravel.
- Incidentes persistidos.
- Sin credenciales demo funcionales en la UI.

### Admin
- Login admin real.
- Dashboard real.
- Reports reales por periodo.
- Incidentes reales.
- No se muestran usuarios/roles/reportes ficticios como si fueran funcionales.
- `reporting-enhancements.mjs` se neutraliza para no reinsertar metricas falsas.

### Mobile experimental
- `passenger-mobile` queda como cliente minimo de busqueda real, sin viajes embebidos.
- `driver-mobile` queda como login/contexto de viaje real, sin credenciales embebidas.
- API se configura con `EXPO_PUBLIC_API_URL`.

## Datos demo
`packages/shared/mock-data.mjs` se conserva exclusivamente porque los tests de business-rules existentes lo usan como fixture. No es importado por los clientes de produccion de este pack.

Los datos seed de desarrollo se mueven logicamente a `database/seeders/Demo/EncoreTransportDemoSeeder.php`. El wrapper `EncoreTransportSeeder` se conserva por compatibilidad con comandos anteriores y se niega a correr fuera de `local/testing`.

## Dependencias externas que NO se fingen
- PowerTranz: falta adapter concreto/documentacion/credenciales reales. El dominio permanece desacoplado y devuelve error configurado.
- Realtime/WebSockets: no se declara LIVE hasta elegir/configurar proveedor; GPS persiste y puede consultarse como ultima ubicacion.
- WhatsApp: no se simula envio.
- Email: Laravel puede configurarse, pero este pack no afirma entrega externa sin credenciales SMTP/proveedor.

## No se declara production-ready
No debe marcarse como listo para produccion mientras PowerTranz/webhook, realtime y notificaciones externas no esten configurados y probados con credenciales reales, y mientras no se ejecute QA E2E en el entorno de despliegue.
