# Admin — rediseño profesional

Estado: `IMPLEMENTED` / `PARTIAL` según módulo.

## Estructura aprobada

Admin usa sidebar agrupado por dominio, header persistente, breadcrumbs contextuales, menú de cuenta, centro de notificaciones, estado de acceso, panel de contenido y controles de tabla. Los grupos actuales se limitan a módulos con permiso y endpoint real:

| Dominio | Módulos reales |
|---|---|
| Operations | Dashboard, Trips, Bookings |
| Fleet | Vehicles, Drivers, Routes, Driver schedules |
| Customer service | Packages, Incidents, Customers |
| Reports | Reports |
| Access control | Users, Roles, Permissions |
| System | Website content, General, Profile & settings |

No se añadieron menús para facturación, proveedores, mantenimiento u otros dominios que no tienen backend operativo.

## Dashboard

Los KPI se calculan desde Laravel y se ocultan cuando el permiso de la métrica no existe. El panel incluye viajes recientes, ocupación, ingresos pagados, incidentes abiertos, paquetes en tránsito, mapa operativo y reportes con filtros/exportación. El mapa indica explícitamente cuando no existe una posición GPS autorizada.

## Cuentas

El directorio de usuarios acepta búsqueda por ID, nombre, correo y teléfono, además de rol, estado y fechas de registro. Laravel pagina los resultados; Admin muestra el total, página actual y navegación anterior/siguiente. La prueba es `AdminUserSearchTest`.

## Límites conocidos

Las fichas profundas de usuario por pestaña (reservas, boletos, paquetes y actividad) todavía no tienen endpoints dedicados. La superficie actual permite editar acceso, roles, permisos directos, estado y perfil; no presenta pestañas vacías como si estuvieran implementadas.
