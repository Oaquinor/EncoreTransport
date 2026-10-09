# Auditoría — cierre de brecha visual y funcional

## Línea base revisada

- Repositorio: `Oaquinor/EncoreTransport`
- Rama: `main`
- Commit observado al iniciar esta auditoría: `7438e3e4d6bd720d80f3b155cad573aa5839eeca`
- El conector de GitHub permitió lectura del repositorio, pero la creación de una rama de reparación devolvió `403 Resource not accessible by integration`. Por esa razón este entregable se prepara como overlay aplicable al repositorio local, no como un commit remoto falsamente atribuido.

## Hallazgos críticos

### Website

**Defectuoso**
- El bloque de mapa seguía presentando una ruta SVG sobre un fondo decorativo. La geometría sí provenía de TomTom, pero el resultado no era un mapa cartográfico interactivo.
- El logo corporativo se mostraba como imagen aislada sin el lockup visible `encore / transport`.
- La previsualización de asientos dependía de CSS originalmente diseñado para una distribución rígida.

**Corrección incluida**
- Mapa interactivo Leaflet con tiles raster reales de TomTom servidos por un proxy Laravel.
- La clave TomTom no se expone al navegador.
- Ruta, marcadores, origen, destino, distancia y duración usan el mismo `maps/journey`.
- Lockup corporativo visible.
- Vista de asientos construida con `row_number` y `position_index`.

### Passenger PWA

**Parcial**
- El flujo búsqueda → resultado → viaje → asiento → pasajero → revisión → reserva ya estaba conectado a la API.
- El mapa del viaje no existía en la experiencia Passenger.
- El seat map tenía soporte de posición, pero todavía heredaba una grilla visual 2+2 en CSS.

**Corrección incluida**
- Mapa TomTom real dentro del detalle de viaje.
- Grilla dinámica por `position_index`, sin asumir cuatro asientos por fila.
- Estados diferenciados: disponible, seleccionado, ocupado, bloqueado y accesible.
- Resumen de precio tomado del quote del backend.

### Driver PWA

**Parcial**
- Autenticación, viaje actual, pasajeros, boarding, GPS, estado de vehículo, incidencias y paquetes ya estaban conectados.
- No había visualización cartográfica real de la ruta ni de la última posición registrada.

**Corrección incluida**
- Mapa interactivo de ruta.
- Marcador del vehículo solamente si existe `driver_locations` real.
- El botón GPS sigue requiriendo permiso del navegador y persiste la ubicación mediante Laravel.

### Admin

**Parcial**
- Dashboard, viajes, reservas, vehículos, conductores, rutas, horarios, paquetes, incidencias y reportes ya tenían fuentes reales.
- El mapa de operaciones anterior era decorativo/genérico en CSS y no estaba conectado a TomTom.

**Corrección incluida**
- Mapa real en Dashboard del viaje operativo más relevante.
- Última ubicación del conductor solamente cuando existe.
- Marca corregida sin invertir los colores del logo.

### Aplicaciones móviles nativas

**Defectuoso / incompleto**
- Passenger Mobile solo hacía búsqueda de viajes.
- Driver Mobile solo hacía login y mostraba un viaje.
- Esto no era equivalente a haber actualizado las PWA.

**Corrección incluida**
- Passenger Mobile: búsqueda, detalle, mapa TomTom vía tile proxy, disponibilidad, selección de asiento, login y creación de reserva.
- Driver Mobile: login, horario, viaje, mapa, pasajeros, boarding, cambio de estado e incidencias.
- Driver Mobile NO inventa GPS. El envío nativo de una nueva posición continúa bloqueado hasta integrar `expo-location` y su manejo de permisos.

## Backend

### Mapas
Se añadió un proxy raster:
`GET /api/v1/maps/tiles/{z}/{x}/{y}.png`

La clave `TOMTOM_API_KEY` se mantiene en Laravel. Los clientes consumen imágenes cartográficas sin recibir el secreto.

### Asientos
El backend ya expone:
- `row_number`
- `position_index`
- `accessible`
- `blocked`
- `available`

La exclusión concurrente sigue siendo responsabilidad de `BookingService` y de la restricción única en `booking_seats`.

## Pendientes que NO se marcan como terminados

- PowerTranz, PayPal y Stripe: no hay evidencia de credenciales y webhooks operativos para todos los proveedores.
- WhatsApp/FCM: requieren cuentas y credenciales externas.
- GPS nativo Driver Mobile: falta integrar `expo-location`.
- Capturas visuales reales: este entorno no tiene acceso al navegador local del usuario; no se fabrican capturas.
- Módulos administrativos bloqueados por entidades/reglas de negocio inexistentes siguen pendientes; no se crean CRUD ficticios.

## Seguridad

- La clave TomTom permanece en backend.
- Las rutas administrativas siguen protegidas por `api.token:admin`.
- El mapa público puede consultar la última posición de un viaje porque ese endpoint ya era público; debe revisarse la política comercial de privacidad antes de producción si se quiere ocultar hasta que el viaje esté activo.
