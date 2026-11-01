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
| No presentado, vencido, cancelado, reembolsado | `PARTIAL` | Admin ya expone filtros, detalle, historial y transición explícita; falta ampliar cobertura transaccional individual y E2E con scanner/proveedor de pagos |
| Escaneo duplicado/concurrente | `VERIFIED` | bloqueo transaccional; falta prueba con dos clientes físicos |

No se marca un boleto como usado porque el viaje terminó: la transición ocurre en la validación autorizada del token durante `boarding` o `in_progress`.

## Administración

`AdminTicketController` mantiene separados `ticket.status`/`lifecycle_status`, `booking.status`, el estado del pago y `boarding_status`. Un viaje terminado no convierte automáticamente un boleto activo en utilizado: `used_at` solo aparece tras una validación autorizada. Las transiciones administrativas registran historial y aplican permisos; el reembolso actualiza los pagos pagados dentro de la misma operación.
