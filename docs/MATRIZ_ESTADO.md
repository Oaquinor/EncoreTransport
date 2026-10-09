# Matriz de estado real

| Área | Estado | Evidencia / limitación |
|---|---|---|
| Website root/assets | IMPLEMENTADA, PENDIENTE DE VALIDACIÓN | El servidor ya redirige a `/website/`; este pack conserva ese flujo y no lo reemplaza. |
| Branding Website | IMPLEMENTADA, PENDIENTE DE VALIDACIÓN | Lockup visible `encore / transport`; requiere revisión visual local. |
| Website search | IMPLEMENTADA, PENDIENTE DE VALIDACIÓN | Consume `trips/search` y transfiere filtros a Passenger. |
| Website seat preview | IMPLEMENTADA, PENDIENTE DE VALIDACIÓN | Usa filas/posiciones reales del endpoint de seats. |
| Website real map | IMPLEMENTADA, PENDIENTE DE VALIDACIÓN | Leaflet + TomTom tiles vía Laravel + `maps/journey`; requiere clave TomTom y prueba de navegador. |
| Passenger PWA search | IMPLEMENTADA, PENDIENTE DE VALIDACIÓN | API real. |
| Passenger PWA seat selection | IMPLEMENTADA, PENDIENTE DE VALIDACIÓN | Layout dinámico; concurrencia sigue validándose en backend. |
| Passenger PWA route map | IMPLEMENTADA, PENDIENTE DE VALIDACIÓN | Mismo mapa compartido que Website. |
| Passenger booking hold | IMPLEMENTADA, PENDIENTE DE VALIDACIÓN | `POST /bookings`, login centralizado, draft preservado. |
| Payment final | BLOQUEADA EXTERNAMENTE | No se declara pago completado sin proveedor configurado. |
| Ticket final | IMPLEMENTADA, PENDIENTE DE VALIDACIÓN | Backend existente emite solo tras pago verificado. |
| Driver PWA | IMPLEMENTADA, PENDIENTE DE VALIDACIÓN | Viaje, schedule, pasajeros, boarding, vehículo, incidentes, paquetes y GPS. |
| Driver PWA map | IMPLEMENTADA, PENDIENTE DE VALIDACIÓN | Ruta TomTom + última ubicación real si existe. |
| Admin Dashboard | IMPLEMENTADA, PENDIENTE DE VALIDACIÓN | Datos reales + mapa operativo. |
| Admin schedules/packages/incidents | IMPLEMENTADA, PENDIENTE DE VALIDACIÓN | Endpoints ya existentes; pack conserva integración. |
| Admin módulos sin entidades de negocio | PENDIENTE / BLOQUEADA | No se crearon CRUDs ficticios. |
| Passenger Mobile | IMPLEMENTADA, PENDIENTE DE VALIDACIÓN | Búsqueda, mapa, asiento, login y booking. |
| Driver Mobile | IMPLEMENTADA, PENDIENTE DE VALIDACIÓN | Login, schedule, trip, mapa, passengers, boarding, incident. |
| Driver Mobile GPS send | BLOQUEADA POR DEPENDENCIA | Falta `expo-location` y permisos nativos; no se simula GPS. |
| TomTom Search/Routing | IMPLEMENTADA, PENDIENTE DE VALIDACIÓN | Requiere `TOMTOM_API_KEY`. |
| TomTom raster map display | IMPLEMENTADA, PENDIENTE DE VALIDACIÓN | Nuevo proxy de tiles; requiere clave y prueba real. |
| PowerTranz | BLOQUEADA EXTERNAMENTE | Credenciales/aprobación/sandbox. |
| Stripe | BLOQUEADA EXTERNAMENTE | Credenciales/webhook. |
| PayPal | BLOQUEADA EXTERNAMENTE | Credenciales/webhook. |
| WhatsApp/FCM | BLOQUEADA EXTERNAMENTE | Tokens/cuentas/proveedor. |
