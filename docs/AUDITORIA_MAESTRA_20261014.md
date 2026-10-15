# EncoreTransport — Auditoría maestra y plan de ejecución

Fecha: 2026-10-14  
Repositorio: `Oaquinor/EncoreTransport`  
Cliente: Jamol Benjamin  
Desarrollo: Oliver Aquino Ruiz

## Estado ejecutivo

El repositorio es un monorepo activo con frontend web/PWA, aplicaciones móviles Expo, paquetes compartidos y una API Laravel 11. El backend ya contiene datos persistidos y servicios reales para rutas, viajes, reservas con retención de asientos, pagos mediante gateway desacoplado, tickets, GPS, paquetes, auditoría y reportes.

La validación estática de frontend ya pasa en los contratos ejecutados hasta el punto de `test:server`; la suite se detuvo porque el sandbox no permite que una prueba abra un listener TCP (`listen EPERM 127.0.0.1`). Laravel y las pruebas de integración contra MySQL requieren ejecutarse en un entorno con PHP, Composer y base de datos configurados.

No se declara producción. Persisten bloqueos externos para proveedor de pagos, notificaciones, dominio SEO definitivo y aceptación en navegador/dispositivo real.

## Inventario verificado

| Área | Implementación encontrada | Estado inicial | Evidencia |
|---|---|---|---|
| Sitio público | `apps/website`, servido por `server.mjs` | Parcial, real para búsqueda | API pública consumida; contenido empresarial definitivo aún depende del cliente |
| Passenger PWA | `apps/passenger`, React/Vite | Parcial, consume API real | Flujo de búsqueda, asientos, cotización y reserva en `passenger-app.tsx` |
| Passenger Mobile | `apps/passenger-mobile`, Expo | Parcial | Código y typecheck disponibles; falta dispositivo/emulador |
| Driver PWA | `apps/driver-pwa` | Parcial, operaciones reales | Viajes, pasajeros, GPS navegador y paquetes presentes |
| Driver Mobile | `apps/driver-mobile`, Expo + `expo-location` | Parcial, GPS foreground | Permiso y watch nativos presentes; falta aceptación física y background explícito |
| Attendant | No existe una aplicación/directorio dedicado verificable | Ausente como producto separado | No se inventa una app; funciones equivalentes no están completas en API |
| Admin Dashboard | `apps/admin-dashboard` | Parcial, módulos respaldados por API | Dashboard, reportes, incidencias, paquetes y estados de vehículo |
| Backend | Laravel 11, PHP `^8.2` | Implementado parcialmente | `backend/laravel/routes/api.php`, controladores, servicios y migraciones |
| Base de datos | MySQL configurado, migraciones Laravel | Implementada con deuda | Migraciones duplicadas con timestamp `2026_10_08_000200` |
| Mapas | TomTom vía proxy Laravel + Leaflet | Implementado, pendiente credencial | Servicio, endpoints y pruebas de integración presentes |
| Pagos | Interfaz + gateway no configurado | Bloqueado externamente | `UnconfiguredPaymentGateway`, prueba de fallo explícito |
| Notificaciones | Tabla/configuración base | Bloqueado externamente | Falta proveedor y credenciales verificables |
| Cargo | Paquetes, tracking público, eventos básicos | Parcial | Falta ciclo completo de carga, destino, reconciliación y permisos operativos |
| SEO | metadata, robots y contratos | Parcial | Dominio público definitivo pendiente |

## Matriz de trazabilidad priorizada

| Requisito | Módulo/archivos | Brecha | Solución/criterio de aceptación | Prioridad/estado |
|---|---|---|---|---|
| Fuente única y API versionada | `routes/api.php`, `app/Services`, `packages/shared/api` | Hay contratos reales, pero consumidores deben coincidir con autorización | Todo flujo crítico usa `/api/v1`; GET solo lee y mutaciones usan POST/PUT/PATCH/DELETE | P0 / En curso |
| Privacidad de ubicación | `DriverLocationController`, `routes/api.php`, apps driver/admin | Endpoint de ubicación estaba público y clientes omitían token | Token obligatorio; passenger solo con reserva del viaje, driver asignado, admin autorizado | P0 / Corregido, pendiente Laravel test |
| Reserva y doble venta | `BookingService`, `booking_seats` | No contempla segmentos de múltiples paradas | Reglas server-side, transacción, locks, expiración; ampliar a tramos con migración compatible | P0 / Parcial |
| Pago confiable | `PaymentService`, `PaymentController` | Gateway externo no configurado | Mantener estado pendiente hasta confirmación/webhook; probar idempotencia real con proveedor | P0 / Bloqueado externo |
| Ticket verificable | `TicketService`, `TicketController` | Flujo base existe | Emitir solo tras pago autorizado/completado; validar QR con rol operativo | P0 / Parcial |
| Permisos de recursos | controladores API | Varios recursos operativos requieren revisión sistemática | Policies/guards por propiedad y asignación; pruebas de 401/403 | P0 / En curso |
| Driver GPS real | `driver-mobile`, `DriverLocationController` | Aceptación física pendiente | Solo trip boarding/in-progress, timestamp y autorización, sin posiciones ficticias | P0 / Parcial |
| Attendant ventas/check-in/caja | API/admin | App y dominio de caja no verificables completos | Diseñar sobre modelos existentes, sin confirmar pago electrónico desde cliente | P1 / Ausente-parcial |
| Cargo end-to-end | `PackageController`, modelos/migraciones | Estados limitados a received/in_progress/delivered | Completar estados, eventos, asignación, carga, recepción, entrega y auditoría | P1 / Parcial |
| Dashboard real | `AdminDashboardController`, reportes | API real presente; cobertura de métricas incompleta | Solo cifras calculadas de DB; estado vacío si no hay datos | P1 / Parcial |
| SEO/indexación | sitio, `robots.txt`, servidor | Dominio y E2E pendientes | Canonical/sitemap solo con hostname configurado; áreas privadas no indexables | P1 / Parcial |
| Responsive/accesibilidad | CSS entrypoints y apps | Browser E2E no disponible | Verificar teclado, foco, reduced-motion y breakpoints con navegador real | P1 / Pendiente validación |
| Pagos Fygaro/Powertranz | servicio gateway/config | Cuenta, contrato y webhooks faltantes | Implementar adaptador solo después de credenciales/sandbox y contrato oficial | P0 / Bloqueado externo |

## Plan ordenado por dependencias

1. **Fundamentos P0:** ejecutar Laravel en entorno válido; reconciliar migraciones duplicadas sin renombrar migraciones ya aplicadas; normalizar autorización de recursos y respuestas de error.
2. **Reservas P0:** especificar y persistir origen/destino por reserva; aplicar disponibilidad por segmento; añadir idempotencia y pruebas de concurrencia.
3. **Ticket/pago P0:** separar intención, autorización, webhook verificado y emisión; no activar gateway sin contrato/credenciales.
4. **Operación P1:** completar check-in, manifiesto, caja y módulo de attendant sobre los mismos servicios; registrar auditoría inmutable.
5. **Cargo P1:** ampliar estados/eventos de paquete y permisos por rol; probar recorrido completo.
6. **Clientes P1:** conectar passenger/driver/admin a contratos finales; añadir estados offline seguros sin confirmar ventas desconectadas.
7. **Diseño/SEO P1:** consolidar entrypoints CSS canónicos, validar responsive real, metadatos y sitemap condicionado al dominio.
8. **Producción P0:** secretos por entorno, HTTPS, colas, backups/restore, observabilidad, proveedor de pagos/notificaciones y aceptación browser/mobile.

## Cambios realizados en esta auditoría

- Se protegió `GET /api/v1/trips/{trip}/location` con autenticación `api.token`.
- Se autorizó al pasajero únicamente cuando posee reserva pendiente o confirmada para ese viaje.
- Se mantuvieron las reglas de conductor asignado y administrador.
- Se corrigieron Driver PWA y Admin Dashboard para enviar el token al consultar ubicación.
- Se añadió prueba de privacidad y autorización del pasajero.

## Pruebas y limitaciones reales

Ejecutado:

- `node tools/audit-repository.mjs`: 19 hallazgos; 9 de alta prioridad/bloqueantes.
- `node tools/audit-architecture.mjs`: confirmó entrypoints canónicos y deuda de refactor.
- `npm test`: suite completa de contratos pasó después de ejecutar el test de routing con permisos para el listener local.
- `npm run typecheck:passenger`, `npm run typecheck:passenger-mobile` y `npm run typecheck:driver-mobile`: pasaron tras sincronizar `expo-location` en `package-lock.json`.
- `npm run build:passenger`: pasó tras instalar las dependencias opcionales nativas de Rollup; Vite dejó únicamente el aviso esperado de un asset runtime absoluto.

Pendiente de ejecutar en entorno habilitado:

- `npm run validate:backend` con PHP, Composer, `.env` y MySQL. Este entorno no tiene `php` instalado.
- Suite Laravel de reservas, concurrencia, GPS y privacidad.
- Build/typecheck completo de todas las apps móviles y PWA.
- Browser E2E en móvil/tablet/escritorio.
- Sandbox/webhook real de proveedor de pagos y proveedor de notificaciones.

## Evaluación actual

**Estado: listo para continuar desarrollo y pruebas de aceptación controladas; no listo para producción.**

La razón es verificable: pagos/notificaciones carecen de integración externa aprobada; falta validación real de navegador y dispositivos; el módulo attendant/caja y cargo no cubren todavía todo el alcance; y la suite Laravel no se ejecutó porque este entorno no tiene PHP.
