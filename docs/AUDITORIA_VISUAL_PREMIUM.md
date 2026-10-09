# Auditoría visual y funcional — EncoreTransport Premium

## Línea base revisada

- Repositorio: `Oaquinor/EncoreTransport`
- Rama: `main`
- Commit observado al iniciar este rediseño: `87bdbfb0dc2549ffc051dac12c3977980009c791`
- Arquitectura observada:
  - Website público: HTML/CSS/ES modules.
  - Passenger: React + Vite.
  - Driver PWA: HTML/CSS/ES modules + PWA.
  - Admin: HTML/CSS/ES modules.
  - Passenger Mobile: Expo / React Native.
  - Driver Mobile: Expo / React Native.
  - Backend: Laravel.
  - Mapas: TomTom a través de Laravel + render web compartido.
  - API client compartido y servidor Node para servir/proxificar las aplicaciones.

## Dirección visual tomada de las referencias suministradas

Las referencias enfatizan cinco cualidades que se trasladaron al código sin copiar literalmente ninguna pantalla:

1. **Website con impacto editorial**
   - Hero amplio.
   - Autobús como protagonista visual.
   - Búsqueda integrada en la composición.
   - Menos tarjetas decorativas y más jerarquía tipográfica.

2. **Passenger claramente móvil**
   - Navegación limpia.
   - Jerarquía fuerte.
   - Selección de asientos comprensible.
   - Flujo continuo en lugar de páginas visualmente inconexas.

3. **Driver orientado a trabajo**
   - Viaje actual primero.
   - Acciones operativas cercanas al contexto.
   - Ruta, pasajeros, estado del vehículo e incidencias sin ruido innecesario.

4. **Admin empresarial**
   - Sidebar estable.
   - Dashboard compacto.
   - Tablas serias con búsqueda, orden y paginación.
   - Formularios administrativos con validaciones visibles.

5. **Marca única**
   - Azul marino como base.
   - Azul/cian solo como acento.
   - Blanco y neutros como superficies.
   - Menos degradados, menos sombras y menos radios exagerados.

## Hallazgos del estado actual

### Website

Fortalezas:
- Búsqueda real conectada.
- Rutas y salidas reales.
- Seat preview real.
- Mapa real integrado.
- Navegación a Passenger, Driver y Admin.

Brecha visual:
- Hero funcional pero todavía con apariencia de prototipo de producto.
- Header y CTA sin suficiente personalidad comercial.
- Falta un recorrido claro entre viaje, servicios, tracking y soporte.
- Demasiados patrones de tarjetas del mismo peso visual.

Corrección premium:
- Header flotante oscuro.
- Hero cinematográfico usando el recurso de autobús existente.
- Booking panel estructurado como herramienta principal.
- Secciones diferenciadas por propósito.
- Tracking/servicios/soporte integrados a la navegación.

### Passenger

Fortalezas:
- Flujo real de búsqueda, viaje, seats, pasajeros, review y booking.
- Quote del backend.
- Draft preservado al autenticar.
- Seat map configurable.
- Mapa real.

Brecha visual:
- La navegación y el journey stepper compiten con el contenido.
- Resultados y cards tienen demasiado tratamiento de “dashboard”.
- La selección de asiento necesita sensación de cabina y jerarquía clara.
- Review/total no tiene suficiente prioridad visual.

Corrección premium:
- Topbar flotante.
- Inicio editorial con autobús y búsqueda elevada.
- Resultados más sobrios.
- Cabina de asiento más física y legible.
- Panel de total fijo en escritorio y natural en móvil.

### Driver PWA

Fortalezas:
- Login real centralizado.
- Viaje asignado.
- Pasajeros y boarding.
- Horarios.
- Estado manual del vehículo.
- Incidencias.
- Paquetes.
- GPS autorizado.
- Mapa real.

Brecha visual:
- Todas las tarjetas pesan casi lo mismo.
- El conductor no percibe inmediatamente qué viaje está trabajando.
- Acciones de viaje no tienen suficiente prioridad.

Corrección premium:
- Viaje actual convertido en hero operacional.
- Header oscuro persistente.
- Mapa integrado dentro del contexto del viaje.
- Resto de operaciones en superficies claras y compactas.
- Acciones primarias claramente diferenciadas.

### Admin

Fortalezas:
- Dashboard con fuentes reales.
- Viajes, bookings, vehículos, conductores, rutas.
- Schedules, packages, incidents y reports.
- Mapa operativo real.

Brecha funcional/visual:
- Tablas sin búsqueda, sort y paginación local.
- Incidencias no tenían una operación visual clara para actualizar estado.
- Schedules se visualizaban, pero la creación no estaba integrada en la pantalla.
- Sidebar y cards tenían demasiado radio/sombra para una herramienta empresarial.

Corrección premium:
- Tablas con búsqueda, orden y paginación.
- Resolución/actualización de incidencias.
- Formulario real para crear horarios.
- Jerarquía de sidebar más empresarial.
- Menos ornamentación y más densidad útil.

### Auth y Package Tracking

Brecha:
- Correctos funcionalmente pero con estética de formulario genérico.

Corrección:
- Login en layout editorial 2 columnas.
- Tracking de paquetes en experiencia separada con foco en privacidad y estado.

### Mobile nativo

Passenger Mobile y Driver Mobile ya tenían integración funcional básica/extendida por el trabajo previo. El rediseño actual conserva esa lógica y eleva las superficies, jerarquía, contraste, espaciado, mapa, cards, botones y estados para acercarlos a una aplicación comercial.

## Funcionalidades que no se simulan

Este rediseño no introduce:
- pagos falsos;
- GPS inventado;
- disponibilidad inventada;
- métricas administrativas ficticias;
- respuestas de proveedores;
- módulos administrativos sin entidades reales.
