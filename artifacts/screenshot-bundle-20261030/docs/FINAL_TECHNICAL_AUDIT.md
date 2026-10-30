# Encore Transport — auditoría técnica final (línea base)

Fecha: 2026-10-30

## Alcance inspeccionado

Se revisaron las aplicaciones `website`, `passenger`, `passenger-mobile`, `driver-pwa`, `driver-mobile`, `admin-dashboard`, `auth`, `package-tracking`, `package-register`, el servidor Node, los paquetes compartidos y los controladores Laravel.

## Estado verificable

| Área | Estado | Evidencia |
|---|---|---|
| Reserva y reglas de negocio | Existente / validada | `tests/business-rules.test.mjs` |
| API proxy y routing | Existente / validada | `tests/server-routing.test.mjs` |
| Mapas y estados GPS | Parcial, dependiente de proveedor | `tests/real-map-contract.test.mjs`, `tests/map-runtime-contract.test.mjs` |
| Passenger web | Existente / validada | build, typecheck y Playwright visual |
| Passenger Mobile | Compila / pendiente dispositivo físico | `typecheck:passenger-mobile` |
| Driver Mobile | Compila / pendiente dispositivo físico | `typecheck:driver-mobile` |
| Admin y permisos | Existente / validada por contrato | `tests/dashboard-permission-contract.test.mjs` |
| Reportes | Existente / validada por contrato | `tests/admin-report-exports.test.mjs`, `tests/admin-report-charts.test.mjs` |
| TomTom/GPS real | Pendiente de credenciales y telemetría real | proveedor externo no disponible en pruebas locales |
| Pagos productivos | Pendiente de pasarela, webhooks y credenciales | no se deben simular como producción |

## Hallazgos confirmados

1. La cuenta de Passenger exponía configuración y seguridad dentro del flujo principal. Se corrigió ocultándolas detrás de un diálogo nativo `<dialog>` accesible.
2. Los avatares podían mostrar un icono de imagen rota. Se añadió fallback de iniciales y carga condicional de imagen.
3. El diálogo de configuración necesitaba comportamiento responsive. Se validó en 390px y 1440px sin overflow.
4. Los selectores de ruta, pago y resultados tenían estilos inconsistentes. Se centralizó su apariencia y estado de foco.
5. La cascada CSS sigue distribuida en varias capas históricas. Se eliminaron cuatro hojas del Website que no tenían consumidores (`home-exhaustive.css`, `visual-reference.css`, `visual-refresh.css`, `gap-close.css`). Las capas importadas por aplicaciones se conservan hasta migrarlas con cobertura visual.
6. Admin no tenía un acceso de configuración consistente en el topbar. Se añadió un botón de Settings con icono SVG que navega al módulo General respetando permisos.
7. Admin tenía un overflow horizontal de 6px en escritorio por la composición del topbar/mapa. Se corrigió con límites de ancho y aislamiento horizontal del contenido.
8. Passenger podía pintar el home antes de resolver `/auth/me` y luego cambiar a cuenta, generando parpadeo y consultas duplicadas. Se añadió bootstrap de sesión único, caché de usuario en `sessionStorage` y pantalla de arranque estable.
9. Website ahora usa la misma caché corta de identidad para pintar inmediatamente el estado autenticado mientras `/auth/me` confirma la sesión.

## Riesgos y bloqueos

- No es posible certificar pagos, GPS en segundo plano o notificaciones externas sin credenciales y dispositivos reales.
- Los datos demo deben permanecer identificados como demo y no representar disponibilidad operativa.
- La consolidación total del CSS requiere una etapa separada para evitar regresiones entre Website, Admin y Passenger.
