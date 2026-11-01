# Resultados de pruebas — 2026-11-01

- `npm test`: PASS en todas las suites contractuales del repositorio.
- `npm run typecheck:api-client`: PASS.
- `npm run typecheck:passenger`: PASS.
- `npm run typecheck:passenger-mobile`: PASS.
- `npm run typecheck:driver-mobile`: PASS.
- `npm run build:passenger`: PASS.
- Laravel `php artisan test`: PASS — 82 pruebas, 541 aserciones, con PHP 8.3.30 y MySQL de Laragon.
- `PackageCustodyTest`: PASS — 3 pruebas, 35 aserciones.
- `PackageChainOfCustodyTest`: PASS — 2 pruebas, 30 aserciones; QR, manifiesto reconciliable, escaneo idempotente y transferencia aceptada.
- `AdminUserSearchTest`: PASS — 3 pruebas, 31 aserciones; búsqueda, filtros, paginación server-side entre páginas y detalle administrativo con endpoints autorizados.
- `AdminTicketLifecycleTest`: PASS — 2 pruebas, 11 aserciones; separación de boleto/reserva/pago/abordaje, transición no presentado e invariancia de boleto no utilizado tras finalizar el viaje.
- Browser visual: PASS — 36 checks y capturas en 360, 390, 768, 1024, 1440 y 1920 px.
- Admin autenticado focalizado: PASS — 1 flujo a 1440 px, incluyendo CMS, rutas, horarios, cuentas, clientes paginados, ficha por pestañas, lifecycle de boletos, roles, reportes y paquetería.
- Mobile nativo: no ejecutado sin emulador/dispositivo.
- Pagos, Gmail, WhatsApp, push y TomTom con credenciales reales: no ejecutados.
