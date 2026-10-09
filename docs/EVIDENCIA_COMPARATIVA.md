# Evidencia comparativa

## Referencia visual recibida

Las imágenes suministradas se utilizaron como dirección visual, no como código ni como evidencia de implementación. Las referencias muestran:
- Website con fotografía/autobús protagonista.
- Passenger con interfaz móvil limpia.
- Driver con fuerte foco en el conductor/viaje.
- Admin con composición empresarial y menos ornamentación.

## Evidencia técnica antes/después

### Website
**Antes**
- Hero más parecido a landing de prototipo.
- Header claro sin peso suficiente.
- Servicios dispersos.
- Booking separado visualmente del hero.

**Después en código**
- `premium-hero`, `premium-header`, `premium-booking`.
- Autobús del repositorio usado como protagonista.
- Booking elevado e integrado.
- Tracking, servicios y soporte conectados.

### Passenger
**Antes**
- Journey funcional pero visualmente muy “dashboard”.
- Cards de similar importancia.
- Search console y review con poca diferenciación.

**Después en código**
- Hero oscuro con imagen real del repo.
- Search console flotante.
- Results sobrios.
- Seat cabin refinada.
- Total panel con jerarquía superior.

### Driver
**Antes**
- Tarjetas uniformes.
- Viaje actual sin una zona visual dominante.

**Después en código**
- Assigned trip pasa a ser hero operacional.
- Mapa integrado dentro de esa zona.
- Actions, passengers, vehicle condition e incident siguen conectados.

### Admin
**Antes**
- Tabla pasiva.
- Lista de schedules sin creación.
- Incidents sin operación directa.

**Después en código**
- Search/sort/pagination de tablas.
- Form de schedule conectado al endpoint real.
- Actualización de status de incidents conectada al backend.
- Sidebar y densidad visual empresarial.

## Capturas reales

No se incluyen capturas inventadas.

Este entorno no ejecuta el navegador local del usuario ni su base de datos/API de Laragon. Para cumplir el criterio de evidencia sin falsificar resultados, las capturas deben tomarse después de aplicar el overlay y ejecutar los pasos de `PRUEBAS_LARAGON.md`.

Capturas requeridas:
1. Website desktop 1440×900 y móvil 390×844.
2. Passenger: Home, Results, Seat Selection y Review.
3. Driver: Assigned Trip, Map y Passengers.
4. Admin: Dashboard, Trips table, Schedules y Incidents.
5. Auth.
6. Package Tracking.
7. Passenger Mobile y Driver Mobile en emulador/dispositivo.
