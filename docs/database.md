# Database

## Principios

- Normalización razonable.
- Evitar duplicación de datos derivables.
- Índices para búsquedas y filtros frecuentes.
- Timestamps en todas las tablas principales.
- Soft deletes solo donde aporten valor operativo.

## Entidades principales

- users
- roles
- permissions
- passengers
- drivers
- buses
- routes
- trips
- seats
- bookings
- booking_passengers
- payments
- inventory_items
- inventory_movements
- incidents
- notifications

## Relaciones clave

- Un usuario puede asumir un rol o varios permisos según la estrategia de autorización.
- Un conductor se asocia a viajes y a un bus operativo.
- Una ruta agrupa trayectos programados.
- Un viaje pertenece a una ruta y a un bus.
- Una reserva puede incluir uno o varios pasajeros.
- Un asiento pertenece a un bus y puede reservarse por viaje.

## Ajuste para producción

La base se pensó para crecer hacia reservas reales, pagos, inventario operativo e incidencias sin reestructurar el dominio central.