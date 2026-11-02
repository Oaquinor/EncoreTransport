# Resultados de pruebas — 2026-11-01

## Corrección UX y Website — ejecución más reciente

- `npm run test:website-pages-browser`: PASS; nueve páginas públicas a 390, 768 y 1440 px, búsqueda → Passenger con parámetros, recuperación de la última búsqueda, EN/ES en las nuevas composiciones y capturas de About, Contact y Help.
- `VISUAL_SURFACES=website VISUAL_VIEWPORTS=390,1440 npm run test:visual-browser`: PASS; homepage estática sin selector de ruta y Encore Live con selección explícita, estados vacío/activo y mapa real.
- `npm run test:real-map`, `npm run test:map-runtime`, `npm run test:website-editorial`, `npm run test:seo`: PASS.
- Loader global: validado en capturas sin cubrir el contenido; usa el GIF de marca y se retira antes de que terminen recursos secundarios.

## Reejecución de esta iteración

- Laravel directo con PHP 8.3.30/MySQL local: PASS — 83 pruebas, 545 aserciones, 56.48 s.
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
- Driver PWA autenticado focalizado: PASS — 1 flujo a 1440 px, incluyendo GPS, custodia y enlace de tracking generado por el backend.
- Encore Live: PASS contractual para polling adaptativo, recuperación de visibilidad/red, interpolación, stale markers y cleanup; WebSocket/SSE no está disponible en el backend local.
- Mobile nativo: no ejecutado sin emulador/dispositivo.
- Pagos, Gmail, WhatsApp, push y TomTom con credenciales reales: no ejecutados.
- `npm run test:admin-navigation`: PASS; verifica los seis grupos de navegación, permisos declarados, controles ARIA, persistencia y iconos compartidos.
- `npm run test:website-editorial`: PASS; inspecciona el texto visible de las nueve páginas públicas y verifica el guard de copy del CMS.
- CMS editorial Laravel: PASS; `WebsiteContentAndRouteImageTest` cubre rechazo de términos internos y publicación segura.
- Browser sin backend: PASS — 36 checks/capturas en 360, 390, 768, 1024, 1440 y 1920 px.
- Browser autenticado contra `http://127.0.0.1:8000`: PASS focalizado en Admin y Driver tras ejecutar `EncoreTransportDemoSeeder` con el usuario autorizado de demo; la prueba no fabrica sesiones.
- Website editorial y visual: PASS; nueve páginas públicas con inglés predeterminado y selector EN/ES probado en navegador, navegación multipágina, búsqueda y transferencia de parámetros a la reserva, 36 capturas responsive y estados vacíos de Live.
- SEO bilingüe: PASS en servidor; `?lang=es` devuelve `lang="es"`, título/descripción en español, canonical por variante y `hreflang` EN/ES/x-default; el dominio absoluto solo se aplica con `PUBLIC_SITE_URL` público.
- CMS bilingüe: PASS — `WebsiteContentAndRouteImageTest` pasó 5 pruebas y 38 aserciones; las variantes `*_en`/`*_es` se validan y el copy interno continúa bloqueado.
- Revisión visual premium: PASS — `test:website-pages-browser` y `test:visual-browser` validan navegación, overflow, menús, responsive y 36 superficies entre 360 y 1920 px; se añadió la constelación de rutas y la barra de progreso inferior sin alterar la transferencia de búsqueda.
- La aceptación móvil real sigue bloqueada por falta de dispositivo/emulador configurado. Pagos, Gmail, WhatsApp, push y TomTom con credenciales reales también siguen pendientes.
