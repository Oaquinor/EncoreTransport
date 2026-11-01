# Resultados de pruebas — 2026-11-01

## Reejecución de esta iteración

- Laravel directo con PHP 8.3.30/MySQL local: PASS — 82 pruebas, 541 aserciones, 51.12 s.
- `npm test`: PASS, incluida la prueba nueva `test:admin-navigation`.
- Typechecks API/Passenger/Passenger Mobile/Driver Mobile y build Passenger: PASS.
- `npm run test:visual-browser` sin `VISUAL_API_TARGET`: PASS — 36 checks/capturas; la rama autenticada no se activa sin backend de revisión.

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
- `npm run test:admin-navigation`: PASS; verifica los seis grupos de navegación, permisos declarados, controles ARIA, persistencia y iconos compartidos.
- Browser sin backend: PASS — 36 checks/capturas en 360, 390, 768, 1024, 1440 y 1920 px.
- Browser autenticado contra `http://127.0.0.1:8000`: BLOQUEADO — Laravel responde `422 Invalid credentials` para el usuario demo configurado por defecto; no se sembraron datos ni se fabricó una sesión para obtener evidencia.
- Por lo anterior, la captura específica del sidebar autenticado y la interacción runtime de sus grupos quedan pendientes de un entorno con credenciales/fixtures autorizados.
