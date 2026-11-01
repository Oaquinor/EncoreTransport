# Verificación de recorridos de usuario

| Recorrido | Resultado | Evidencia | Pendiente |
|---|---|---|---|
| Buscar → comparar → viaje → asiento | PASS contractual/browser | `npm test`, browser visual | aceptación con entorno sembrado |
| Pasajero autenticado → reserva/boleto | PARCIAL | Passenger typecheck/browser | QR y E2E autenticado |
| Driver → viaje → GPS foreground → incidencia | PARCIAL | GPS contract/browser | dispositivo y background |
| Registrar paquete → tracking | PASS | `PackageCustodyTest`, `PackageController`, browser existente | E2E autenticado |
| Tracking → estado/historial/próxima acción | PASS | `PackageCustodyTest`, tracking público | ampliar cadena de custodia |
| Entrega → verificación + foto privada | PASS Feature | `PackageCustodyTest`, almacenamiento `local` privado | integrar UI de transferencias/manifiesto/QR en Driver PWA/Mobile |
| Website → Passenger | PASS de contrato | nav simplificada, flujo de búsqueda y rutas existentes | E2E autenticado completo |
| Driver PWA → registro/estado de paquete | PASS local | API multipart y browser/contratos Driver | aceptación en dispositivo |
| Driver Mobile → paquete | NO DISPONIBLE | no hay pantalla de paquete equivalente | implementar recorrido Mobile |
| Admin → usuarios/roles/reportes | PARCIAL | dashboard/report contracts | E2E autenticado sembrado |
| Admin → buscar cuenta y paginar resultados | PASS Feature | `AdminUserSearchTest`, endpoint `admin/users` | volumen de producción y E2E por rol |
| Pago válido/rechazado/pendiente | BLOQUEADO | gateway unconfigured | sandbox y webhook |
| Sesión expirada/offline | PARCIAL | API client/contracts | prueba integrada |
