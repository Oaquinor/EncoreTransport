# Auditoría administrativa y permisos — 2026-10-15

## Diagnóstico basado en código

El panel actual es una aplicación JavaScript estática que consume una API Laravel. La autenticación usa tokens Bearer persistidos en `api_tokens`; antes de esta fase la autorización administrativa dependía principalmente de `user.role === admin`. Existían pantallas de listado y algunos endpoints operativos, pero no había un catálogo persistido de permisos, roles reutilizables, revocaciones directas ni separación entre visibilidad y ejecución.

## Arquitectura implementada

Se añadió:

- `roles`, `permissions`, `role_user`, `permission_role` y `permission_user`.
- `PermissionService` con resolución `roles → permissions` y revocación directa por usuario.
- Middleware `permission:<key>` con denegación por defecto y respuesta `403`.
- Catálogo inicial de permisos para dashboard, rutas, viajes, horarios, vehículos, conductores, reservas, tickets, pagos, caja, cargo, reportes, usuarios, roles, configuración y auditoría.
- Asignación idempotente inicial: el antiguo rol `admin` se migra a `superadmin`; el seeder demo sincroniza explícitamente los roles demo y el registro público asigna `passenger` sin crear privilegios administrativos.
- `/api/v1/auth/me` y login devuelven permisos efectivos para que los clientes adapten la navegación.

## Matriz de migración de endpoints

| Área | Método de autorización | Estado |
|---|---|---|
| Dashboard | `dashboard.view` | Migrado |
| Routes | `routes.view/create/update` | Migrado |
| Drivers | `drivers.view/create/update` | Migrado |
| Vehicles | `vehicles.view/create/update` | Migrado |
| Reports | `reports.view` | Migrado |
| Schedules | `schedules.view/manage` | Migrado |
| Incidents | `trips.view/update` | Migrado |
| Packages | `cargo.view` | Migrado para consulta administrativa |
| Legacy admin operations | compatibilidad `api.token` + permisos parciales | Requiere completar acción por acción |
| Users/Roles/Settings | catálogo creado, CRUD pendiente | No cerrado |

## Estado de recursos

| Recurso | Estado real |
|---|---|
| Rutas y paradas | CRUD inicial real; paradas se reemplazan dentro de transacción; desactivación conserva historial |
| Vehículos y asientos | Alta/listado/actualización; capacidad genera asientos; cambios se bloquean con reservas activas |
| Conductores | Perfil y estado real; licencia única; cuenta de acceso aún separada y pendiente de invitación segura |
| Viajes | Consulta y operaciones de conductor existentes; CRUD administrativo central pendiente |
| Reservas | Creación, retención y propiedad ya existentes; venta administrativa/Attendant pendiente |
| Pagos/reembolsos | Gateway desacoplado y fallo explícito sin proveedor; caja/reembolsos pendientes |
| Cargo | Registro/tracking/eventos básicos; ciclo operativo completo pendiente |
| Auditoría | Servicio central existente y usado en varias operaciones; consulta administrativa pendiente |

## Pruebas añadidas o ejecutadas

- Prueba de permisos efectivos y acceso de pasajero a rutas administrativas.
- Prueba de revocación directa que prevalece sobre el permiso heredado del rol.
- Pruebas de CRUD de rutas, conductor y vehículo preparadas en Laravel.
- `node --check` del panel y módulos API: correcto.
- Contratos de negocio, hardcode, diseño, responsive y SEO: correctos.

## Pendientes que bloquean cierre

1. Ejecutar migraciones y pruebas Laravel con PHP/MySQL real.
2. Completar CRUD y permisos de viajes, usuarios, roles, configuraciones y auditoría.
3. Añadir activación segura de conductores con invitación de un solo uso y expiración.
4. Completar Attendant, caja, reembolsos y Cargo end-to-end.
5. Migrar los consumidores restantes de `role=admin` a permisos por acción.
6. Validar browser E2E, móvil, pagos y notificaciones externas.

No se declara producción hasta cerrar esos puntos y repetir las pruebas afectadas.
