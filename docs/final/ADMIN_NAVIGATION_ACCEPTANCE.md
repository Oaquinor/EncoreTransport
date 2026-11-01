# Aceptación de navegación Admin

## Estructura autorizada

| Grupo | Módulos existentes | Permiso fuente |
|---|---|---|
| Operations | Dashboard, Trips, Bookings, Tickets | `dashboard.view`, `trips.view`, `bookings.view`, `tickets.view` |
| Fleet | Vehicles, Drivers, Routes, Driver schedules | permisos de flota respectivos |
| Clients | Customers | `users.view` |
| Paquetería | Packages | `cargo.view` |
| Control | Incidents, Reports | `incidents.view`, `reports.view` |
| System | Website content, Users, Roles, Permissions, General, Profile & settings | permisos de configuración/acceso existentes |

## Aceptación técnica

- El registro es la única fuente de módulos y permisos; no se muestran grupos sin módulos autorizados.
- Cada grupo usa `data-nav-toggle`, `aria-expanded`, `aria-controls` y estado persistido en `encore_admin_nav_groups_v2`.
- El módulo activo usa `aria-current="page"` y fuerza visible su grupo para no perder contexto.
- El sidebar colapsado conserva el acceso a controles, `title`, `aria-label` y una abreviatura visible del grupo.
- La expansión global y el colapso global conservan la preferencia del usuario.
- La iconografía usa `packages/shared/icons.mjs`; no se añade una dependencia de iconos.

## Pruebas

- `npm run test:admin-navigation`: PASS.
- `npm test`: PASS posterior a esta iteración.
- Browser focal Admin después de este cambio: bloqueado contra el servidor local (`422 Invalid credentials`); requiere credenciales/fixtures autorizados.
- Roles y permisos Laravel: cubiertos por los contratos existentes; falta una matriz E2E por rol.
