# Matriz funcional final

| Área | Estado | Evidencia |
|---|---|---|
| Website/búsqueda | Parcialmente implementada | rutas HTTP 200, contratos frontend, captura real |
| Passenger/reservas/asientos | Implementada y verificada en Laravel | 78 pruebas backend, 504 aserciones, reglas de solapamiento |
| Admin/perfil/foto | Implementada | endpoints de perfil, captura y pruebas de avatar |
| Admin/cuentas/búsqueda | Implementada y verificada | filtros server-side por ID, nombre, correo, teléfono, rol, estado y fechas; paginación y `AdminUserSearchTest` |
| Admin/notificaciones | Parcial | bandeja persistida y endpoints leído/no leído |
| Driver/GPS foreground | Parcial | contratos GPS y pruebas backend |
| Paquetería básica | Implementada | registro y tracking existentes |
| Custodia de paquetería | Parcialmente implementada y verificada | transacciones, eventos, reintentos, autorización, tracking público, disco privado, QR, manifiesto reconciliable y transferencia aceptada; UI móvil y metadatos operativos avanzados pendientes |
| Mobile nativo/background GPS | Bloqueada | requiere emulador/dispositivo |
| Boletos vigentes/utilizados/QR | Parcial | emisión posterior a pago, consulta y validación transaccional; lifecycle ampliado pendiente |
