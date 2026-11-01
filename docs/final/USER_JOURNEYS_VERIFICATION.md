# Verificación de recorridos de usuario

| Recorrido | Resultado | Evidencia | Pendiente |
|---|---|---|---|
| Buscar → comparar → viaje → asiento | PASS contractual/browser | `npm test`, browser visual | aceptación con Laravel |
| Pasajero autenticado → reserva/boleto | PARCIAL | Passenger typecheck/browser | QR y backend Laravel |
| Driver → viaje → GPS foreground → incidencia | PARCIAL | GPS contract/browser | dispositivo y background |
| Registrar paquete → tracking | PASS contractual | `PackageController`, browser existente | Laravel no ejecutado aquí |
| Tracking → estado/historial/próxima acción | PASS contractual | nueva prueba de custodia | prueba HTTP Laravel |
| Entrega → verificación + foto privada | IMPLEMENTADO, no ejecutado | controller/migration | prueba Feature Laravel |
| Admin → usuarios/roles/reportes | PARCIAL | dashboard/report contracts | E2E autenticado sembrado |
| Pago válido/rechazado/pendiente | BLOQUEADO | gateway unconfigured | sandbox y webhook |
| Sesión expirada/offline | PARCIAL | API client/contracts | prueba integrada |
