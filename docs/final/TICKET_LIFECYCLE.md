# Ciclo de vida de boletos

## Estado actual

El modelo separa reserva, pago y boleto. Una reserva puede estar pendiente de pago o confirmada; el boleto se emite únicamente cuando existe pago `paid` y reserva `confirmed`. El QR contiene un identificador público y un token cuya huella se guarda en Laravel.

| Operación | Estado | Evidencia |
|---|---|---|
| Emitir boleto después de pago confirmado | `VERIFIED` | `TicketService::issue` |
| Consultar boleto con acceso del pasajero, admin o guest token | `VERIFIED` | `TicketController::show` |
| Validar QR/token una sola vez | `VERIFIED` | transacción, `lockForUpdate`, `TicketService::validateToken` |
| Rechazar token incorrecto, viaje no activo o boleto usado | `VERIFIED` | `TicketController`, pruebas backend |
| Vigente vs utilizado | `VERIFIED` | `tickets.status`, `validated_at`, `used_at` |
| No presentado, vencido, reembolsado | `PARTIAL` | requiere dimensiones de negocio y endpoints de lifecycle |
| Escaneo duplicado/concurrente | `VERIFIED` | bloqueo transaccional; falta prueba con dos clientes físicos |

No se marca un boleto como usado porque el viaje terminó: la transición ocurre en la validación autorizada del token durante `boarding` o `in_progress`.
