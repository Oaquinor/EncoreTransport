# Matriz funcional final

| Área | Estado | Evidencia |
|---|---|---|
| Website/búsqueda | Parcialmente implementada | rutas HTTP 200, contratos frontend, captura real |
| Passenger/reservas/asientos | Implementada y verificada en Laravel | 82 pruebas backend, 541 aserciones, reglas de solapamiento |
| Admin/perfil/foto | Implementada | endpoints de perfil, captura y pruebas de avatar |
| Admin/cuentas/búsqueda | Implementada y verificada | filtros server-side por ID, nombre, correo, teléfono, rol, estado y fechas; paginación entre páginas y `AdminUserSearchTest` |
| Admin/ficha de usuario | Implementada y verificada | pestañas General, Perfil, Reservas, Boletos, Encomiendas autorizadas, Actividad y Permisos; endpoints autorizados independientes |
| Admin/ciclo de vida de boletos | Parcialmente implementada y verificada | filtros server-side, detalle, historial y estados separados de reserva/pago/abordaje; falta cobertura exhaustiva y E2E con scanner |
| Admin/notificaciones | Parcial | bandeja persistida y endpoints leído/no leído |
| Driver/GPS foreground | Parcial | contratos GPS y pruebas backend |
| Paquetería básica | Implementada | registro y tracking existentes |
| Custodia de paquetería | Parcialmente implementada y verificada | transacciones, eventos, reintentos, autorización, tracking público, disco privado, QR, manifiesto reconciliable, transferencia aceptada e integración UI PWA/Mobile; evidencia nativa y metadatos operativos avanzados pendientes |
| Mobile nativo/background GPS | Bloqueada | requiere emulador/dispositivo |
| Boletos vigentes/utilizados/QR | Parcial | emisión posterior a pago, consulta y validación transaccional; lifecycle ampliado pendiente |
