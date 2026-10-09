# Pruebas recomendadas

## Servidor publico
- `/` responde 302 a `/website/`.
- `/website/styles.css`, `/website/enhancements.css`, `/website/app.mjs` responden 200.
- `/api/v1/health` se proxifica a Laravel.

## Web
- Carga rutas reales.
- Carga primer viaje real si existe.
- Carga asientos reales del bus del viaje.
- Calcula ruta por `/api/v1/maps/journey` y dibuja la geometria normalizada.
- El buscador redirige a Passenger con origin/destination/date/passengers.

## Passenger
- Search -> trip -> seats -> passengers -> booking.
- Seleccionar un asiento ya retenido devuelve 422 y no duplica reserva.
- Total definitivo viene de Laravel.

## Driver
- Login con rol driver.
- Current trip.
- Start usa `TripStateService` y registra `started_at`/auditoria.
- Boarding actualiza `booking_passengers.status=boarded` y `boarded_at`.
- Complete registra `completed_at`.
- GPS persiste en `driver_locations`.
- Incidente persiste en `incidents`.

## Admin
- Dashboard solo con token admin.
- Reports solo con token admin.
- Incidents list/update solo con token admin.

## Ticket
- Solo driver/admin puede validar QR.
- Token incorrecto -> 409.
- Booking no confirmado -> 409.
- Fuera de boarding/in_progress -> 409.
- Primer escaneo valido marca `used`.
- Segundo escaneo -> 409.

## Pagos
- Sin gateway real configurado NO debe aparecer pago aprobado.
- El endpoint devuelve error real del gateway no configurado.
