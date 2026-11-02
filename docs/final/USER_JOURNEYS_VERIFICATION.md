# Verificación de recorridos de usuario

| Recorrido | Resultado | Evidencia | Pendiente |
|---|---|---|---|
| Buscar → comparar → viaje → asiento | PASS contractual/browser | `npm test`, browser visual | aceptación con entorno sembrado |
| Pasajero autenticado → reserva/boleto | PARCIAL | Passenger typecheck/browser | QR y E2E autenticado |
| Driver → viaje → GPS foreground/background → incidencia | PARCIAL | GPS contract/browser; tarea background implementada en Mobile | aceptación en dispositivo |
| Registrar paquete → tracking | PASS | `PackageCustodyTest`, `PackageController`, browser existente | E2E autenticado |
| Tracking → estado/historial/próxima acción | PASS | `PackageCustodyTest`, tracking público | ampliar cadena de custodia |
| Entrega → verificación + foto privada | PASS Feature / UI implementada | `PackageCustodyTest`, almacenamiento `local` privado, cámara Driver Mobile y multipart conectado | aceptación en dispositivo y E2E autenticado |
| Website → Passenger | PASS browser local | búsqueda con origin/destination/date/passengers, transferencia a Passenger, refresh profundo y última búsqueda en localStorage | E2E autenticado completo |
| Inicio → red publicada → Encore Live | PASS browser local | inicio sin selector; Live inicia en “Select a route” y muestra la ruta/vehículos solo después de elegir | validación con backend de posiciones reales |
| Driver PWA → registro/estado de paquete | PASS local | API multipart y browser/contratos Driver | aceptación en dispositivo |
| Driver Mobile → paquete | PARCIAL local | pantalla de registro, cámara QR, evidencia, carga, manifiesto, discrepancia y transferencia conectadas al backend | validación en dispositivo |
| Admin → usuarios/roles/reportes | PASS focalizado | dashboard/report contracts y browser autenticado local a 1440 px | E2E autenticado por cada rol |
| Admin → buscar cuenta y paginar resultados | PASS Feature | `AdminUserSearchTest`, endpoint `admin/users` | volumen de producción y E2E por rol |
| Pago válido/rechazado/pendiente | BLOQUEADO | gateway unconfigured | sandbox y webhook |
| Sesión expirada/offline | PARCIAL | API client/contracts | prueba integrada |
