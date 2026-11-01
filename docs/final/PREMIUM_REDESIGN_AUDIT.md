# Auditoría de cierre premium

Fecha: 2026-11-01  
Referencia de código: `c4bbd97c022411d26fa99443cf09ca59e3e33cef`  
Estado: `PARTIALLY_COMPLETE`

## Matriz inicial de problemas

| Superficie | Archivo principal | Impacto | Severidad | Corrección/evidencia | Estado |
|---|---|---|---|---|---|
| Website público | `apps/website/site-shell.mjs`, `site-navigation.mjs` | Navegación comercial dispersa y destinos repetidos | P0 | Multipágina y grupos públicos ya implementados; contratos de navegación y browser visual | VERIFICADO LOCAL |
| Admin sidebar | `apps/admin-dashboard/app.mjs`, `src/module-registry.mjs` | Grupos internos no reflejaban dominios operativos | P1 | Grupos `Operations`, `Fleet`, `Clients`, `Paquetería`, `Control`, `System`; permisos conservados | VERIFICADO POR CONTRATO |
| Admin sidebar colapsado | `apps/admin-dashboard/app.mjs`, `app.css` | El grupo perdía su referencia visual | P1 | Inicial de grupo, `title`, `aria-label`, `aria-controls`, persistencia | VERIFICADO POR CONTRATO; browser autenticado bloqueado por credenciales |
| Cuentas y clientes | `AdminAccessController.php`, `app.mjs` | Riesgo de filtrar localmente una página Laravel | P0 | Búsqueda, roles, estado y paginación server-side; prueba de páginas cruzadas existente | VERIFICADO LOCAL |
| Ficha de usuario | `AdminAccessController.php`, `app.mjs` | Pestañas sin endpoint inducen falsa completitud | P1 | Siete pestañas con carga independiente y estados de error | VERIFICADO LOCAL; E2E por rol pendiente |
| Boletos | `AdminTicketController.php`, `app.mjs` | Confundir viaje finalizado con abordaje | P0 | Estados de boleto, reserva, pago y abordaje separados | PARCIAL; ampliar transiciones y scanner |
| Custodia | `PackageController.php`, Driver PWA/Mobile | Evidencia, eventos operativos y dispositivos reales pendientes | P1 | QR, manifiesto, transferencia y tracking existentes | PARCIAL |
| Mapas y realtime | `packages/shared/real-map.mjs` | Sin aceptación de proveedor y canal realtime productivo | P1 | Leaflet/TomTom con fallback y contratos locales | PARCIAL |
| Mobile | `apps/*-mobile/App.tsx` | GPS foreground validado; cámara/offline/background no aceptados | P1 | Typecheck y contrato nativo | BLOQUEADO POR DISPOSITIVO/CONFIGURACIÓN |

## Alcance de esta iteración

Se mejoró el sidebar Admin sin retirar módulos autorizados. No se inventaron endpoints, datos, confirmaciones de pago ni capacidades nativas. Los recorridos externos, dispositivos reales y proveedores siguen siendo bloqueos explícitos.

## Criterio de cierre

El producto no se considera listo para producción hasta que `PARTIAL` y `BLOCKED` tengan evidencia de ejecución equivalente en Laravel/MySQL, browser autenticado y dispositivos configurados.
