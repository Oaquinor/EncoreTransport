# Auditoría de seguridad y contratos — 2026-10-15

## Alcance de esta iteración

Se revisaron los contratos del dashboard administrativo, la autorización por permisos y los endpoints operativos de conductor sobre la rama `main`, en el commit de referencia `db1401da7ebb0b0856fa89606c605454e2a397d7`.

## Correcciones aplicadas

| Área | Defecto encontrado | Corrección | Estado |
|---|---|---|---|
| Dashboard | La consulta cargaba viajes, reservas, flota, rutas y conductores sin separar permisos de dominio. | Consultas y métricas condicionadas por `trips.view`, `bookings.view`, `vehicles.view`, `routes.view`, `drivers.view`, `payments.view` y `cargo.view`; la respuesta incluye capacidades explícitas. | Corregido; contrato Node probado |
| Dashboard UI | La interfaz podía presentar secciones sin autorización real. | Tarjetas, viajes recientes y bloques de datos se renderizan según `capabilities`. | Corregido; contrato Node probado |
| Reservas | Un registro sin `user_id` podía tratarse como propio. | La propiedad exige usuario coincidente o `bookings.view`; los administradores deben tener el permiso efectivo. | Corregido en controlador |
| Pagos y tickets | Se usaba el rol textual `admin` para saltar la propiedad. | Acceso del propietario o permisos `bookings.view`, `payments.view` y `tickets.view`. | Corregido en controlador |
| Operaciones de conductor | Varias acciones aceptaban `role=admin` como bypass. | Se requiere `driver.access` y la asignación efectiva del viaje; la validación de tickets usa `tickets.validate`. | Corregido en rutas y controladores |
| Incidencias | Las rutas administrativas usaban permisos de viajes. | Se separaron `incidents.view` e `incidents.update`. | Corregido en rutas |
| Catálogo de permisos | Faltaban permisos para desactivación, publicación, incidencias, Cargo, integraciones y acceso Driver. | Migración incremental idempotente `2026_10_15_000500_expand_permission_catalog.php`. | Pendiente ejecutar migración |

## Matriz de endpoint revisada

| Endpoint | Método | Protección final | Alcance |
|---|---:|---|---|
| `admin/dashboard` | GET | `api.token` + `dashboard.view` | Solo dominios autorizados en la respuesta |
| `bookings` | GET | `api.token` | Propias reservas o `bookings.view` |
| `bookings/{booking}` | GET/POST | `api.token` | Propietario no nulo o `bookings.view` |
| `bookings/{booking}/payments` | GET/POST | `api.token` | Propietario o `payments.view`/reserva autorizada |
| `bookings/{booking}/ticket` | GET | `api.token` | Propietario o `tickets.view` |
| `driver/*` | GET/POST | `api.token` + `driver.access` | Conductor autenticado y viaje asignado |
| `tickets/validate` | POST | `api.token` + `tickets.validate` | Personal con permiso de validación |
| `admin/incidents` | GET/PATCH | `api.token` + permiso de incidencias | Consulta y modificación separadas |

## Validación ejecutada

- `npm run test:dashboard-permissions`: aprobado.
- `node --check tests/dashboard-permission-contract.test.mjs`: aprobado.
- `git diff --check`: aprobado.
- Pruebas Laravel, migraciones MySQL y `php artisan test`: no ejecutadas en este entorno porque PHP no está instalado.

## Pendientes verificables

1. Ejecutar la migración con una base de datos de respaldo y comprobar las asignaciones existentes.
2. Ejecutar `php artisan test`, `route:list` y pruebas de autorización contra MySQL.
3. Revisar los controladores restantes que todavía consulten el campo textual `role` y sustituirlos por permisos o políticas cuando su lógica no sea específica de identidad.
4. Completar activación segura de cuentas, recuperación de contraseña y administración de usuarios si no están cubiertas por la instalación actual.

## Ejecución en Windows

Desde `backend\laravel`:

```powershell
php artisan migrate:status
php artisan migrate
php artisan route:list
php artisan test
```

No usar `migrate:fresh` contra una base de datos con información real.
