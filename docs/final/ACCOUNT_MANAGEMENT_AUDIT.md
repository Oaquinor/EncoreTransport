# Auditoría de gestión de cuentas

| Capacidad | Estado | Evidencia | Riesgo pendiente |
|---|---|---|---|
| Listado autorizado | `VERIFIED` | `AdminAccessController`, permisos `users.view` | E2E con distintos perfiles |
| Búsqueda por ID/nombre/correo/teléfono | `VERIFIED` | filtros server-side y `AdminUserSearchTest` | índice de producción para búsquedas grandes |
| Filtro por rol/estado/fechas | `VERIFIED` | query validada en Laravel | UX de filtros guardados |
| Paginación | `VERIFIED` | metadata `current_page/last_page/total` | prueba con volumen de producción |
| Crear/editar cuenta | `VERIFIED` | endpoints `admin/users` | flujo de invitación por correo |
| Roles y permisos | `VERIFIED` | `roles.manage`, `permissions.assign` y pruebas de autorización | revisión final de catálogo |
| Desactivar cuenta | `VERIFIED` | revoca tokens y registra auditoría | reactivación administrativa explícita |
| Foto de perfil propia | `VERIFIED` | subida, recorte, zoom, almacenamiento y URL autorizada | dispositivo real |
| Foto de otro usuario | `PARTIAL` | foto de driver con permiso específico | ficha de usuario dedicada |
| Ficha por pestañas | `PARTIAL` | base de perfil existente | endpoints de reservas/boletos/paquetes/actividad |

La API no devuelve indiscriminadamente todos los usuarios: la consulta por defecto entrega 25 resultados y admite hasta 100 por página.
