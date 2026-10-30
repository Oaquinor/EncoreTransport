# EncoreTransport — auditoría comparativa de 20 plataformas

Fecha: 2026-10-30

## Lectura transversal

Las plataformas maduras no intentan mostrar todas sus capacidades al mismo tiempo. El patrón dominante es:

1. Un buscador de viaje visible y orientado a origen, destino, fecha y pasajeros.
2. Resultados comparables por hora, duración, precio, operador/vehículo y disponibilidad.
3. Checkout lineal con asiento, pasajeros, contacto, pago y confirmación.
4. Una cuenta que concentra boletos, cambios, cancelaciones, reembolsos y próximos viajes.
5. Un seguimiento separado para el viaje y para paquetes, con estados verificables.

FlixBus expone mapa de rutas, gestión de reserva, rastreador del viaje y ayuda desde la navegación; además comunica boleto móvil y actualizaciones de viaje. redBus combina buscador, filtros temporales, asientos, cancelación, reembolso, soporte y seguimiento en vivo. Omio organiza la propuesta alrededor de comparar varios modos y conserva reservas y actualizaciones dentro de la cuenta. Estas señales están documentadas en sus sitios oficiales: [FlixBus](https://www.flixbus.com/), [redBus](https://www.redbus.in/), [Omio](https://www.omio.com/).

Busbud confirma que la selección de asiento depende del operador y debe comunicarse claramente cuando no esté disponible ([guía oficial](https://busbud.zendesk.com/hc/en-us/articles/40182508000788-How-to-Select-or-Book-a-Specific-Seat)). Wanderu destaca buscar, comparar y reservar en un flujo corto ([app y producto](https://www.wanderu.com/en-us/app/)). 12Go añade voucher, soporte por reserva, login social y estados de confirmación instantánea o manual ([FAQ oficial](https://12go.asia/en/FAQ)). Greyhound separa Plan a Trip, Manage My Booking, Trip Tracker y Travel Info ([navegación oficial](https://www.greyhound.com/bus-routes/orlando-fl-lufkin-tx)).

## Comparativa por plataforma

| Referencia | Patrón útil | Aplicación para EncoreTransport |
|---|---|---|
| FlixBus | Buscador, mapa de rutas, gestión de reserva, tracker y boleto móvil | Website + Passenger deben tener “Mis viajes”, ticket y tracker en primer nivel |
| redBus | Comparación, filtros, asientos, cancelación, reembolso, soporte y tracking | Resultados deben comparar claramente tarifa, duración, disponibilidad y reglas |
| Busbud | Asiento condicionado por operador y explicación de alternativas | Mostrar “selección disponible / asignación automática” por viaje |
| Omio | Cuenta de reservas, múltiples modos, app y actualizaciones | Separar planificación, reserva y seguimiento sin duplicar pantallas |
| Wanderu | Buscar → comparar → reservar con checkout corto | Reducir pasos y conservar el estado del flujo |
| Bookaway | Inventario de operadores, e-tickets y soporte contextual | Ticket debe incluir operador, instrucciones y contacto de soporte |
| 12Go | Voucher, estados de confirmación, soporte por reserva y login social | Estados de pago/reserva deben ser explícitos y accionables |
| Greyhound | Manage booking, Trip Tracker, travel info y políticas | Passenger necesita gestión posterior a la compra |
| National Express | Journey planner, cuenta, cambios y ayuda | Website debe explicar antes de reservar y permitir volver sin perder datos |
| BlaBlaCar | Perfil, confianza, seguridad y cuenta obligatoria para ciertas acciones | Preparar base de perfil, verificación y auditoría sin copiar carpooling |
| AbhiBus | Agregación, ofertas, múltiples operadores y ticket digital | Preparar filtros y mensajes de disponibilidad, sin promociones inventadas |
| ClickBus | Compra regional simple, selección y confirmación | Mantener checkout corto y localizado |
| Plataforma 10 | Venta multi-operador y gestión posterior | Reservas deben tener referencia estable y estado consultable |
| DeÔnibus | Comparación regional y experiencia móvil | Priorizar Passenger responsive y accesible |
| Obilet | Comparación de operadores, horarios, pagos y cuenta | Añadir filtros por hora/precio y resumen persistente |
| Easybook | Rutas regionales, operadores y e-ticket | Rutas publicadas deben ser la única fuente de opciones |
| OurBus | Reserva directa, tracking y comunicación operacional | Driver/Admin deben alimentar estados reales del viaje |
| CheckMyBus | Descubrimiento/comparación antes de reservar | Website debe explicar rutas y llevar a resultados válidos |
| Caribe Tours | Referencia regional de operación y confianza local | Priorizar terminales, paradas, horarios y contacto real |
| Metro Servicios Turísticos | Operación local y catálogo de servicios | Separar pasajero, paquetes y operación sin mezclar CTA |

## Brechas confirmadas en EncoreTransport

### Prioridad P0 — integridad comercial

- El buscador y los resultados deben conservar siempre el tramo solicitado.
- La tarjeta de resultado debe exponer hora, duración, tarifa, asientos y vehículo reales.
- El Passenger debe tener un centro de cuenta con boletos próximos, usados, vencidos y cancelados.
- El ticket debe poder abrirse desde la cuenta y desde el estado de reserva.

### Prioridad P1 — conversión y confianza

- Resultados con filtros/sort de hora, precio, disponibilidad y duración.
- Mensajes explícitos cuando no hay selección de asiento o cuando el estado es indicativo.
- Resumen de políticas de cancelación, pago y equipaje antes de confirmar.
- Inicio de sesión/registro sin perder el estado del checkout.

### Prioridad P1 — operación conectada

- Driver debe registrar inicio, ubicación autorizada, abordaje, incidencias y paquetes.
- Admin debe ver el mismo estado de viaje y disponibilidad que ve Passenger.
- Tracking debe distinguir viaje, paquete y estado de última actualización.

### Prioridad P2 — producto y diseño

- Menos bloques repetidos en Website.
- Navegación consistente entre Website, Passenger, Driver y Admin.
- Tickets digitales con jerarquía visual, QR cuando exista un identificador verificable y estados de uso.
- No mostrar mapas, reviews, descuentos o capacidades que no provengan de la API.

## Propuesta de implementación

### Fase 1 — Passenger account + ticket center

Reutilizar `GET /bookings`, `GET /bookings/{booking}`, `GET /bookings/{booking}/ticket` y los estados actuales. Añadir en la cuenta:

- pestañas Próximos, Usados, Vencidos y Cancelados;
- tarjeta de boleto con referencia, tramo, fecha, hora, asiento, tarifa y estado;
- acción “Ver boleto”, “Cancelar” solo si el backend lo permite y “Comprar otro viaje”;
- pantalla vacía contextual cuando no existan reservas.

### Fase 2 — búsqueda y resultados

Conservar la API actual y hacer visibles filtros de orden y disponibilidad. No crear combinaciones de rutas en frontend: todo debe venir de Laravel.

### Fase 3 — Website

Mantener un hero con buscador real, añadir una banda compacta de confianza operacional y una sección de rutas publicadas. El CTA principal debe ir al buscador; tracking y cuenta deben ser CTAs secundarios.

### Fase 4 — Driver/Admin

Unificar estados del viaje, incidentes y paquetes. Los controles deben aparecer solo cuando existe permiso y endpoint funcional.

### Fase 5 — calidad

Validar A→B, B→C, A→C, bloqueo de asientos, cancelación, vencimiento, dos autobuses, concurrencia, ticket y cuenta; después ejecutar contratos visuales y responsive.

## Decisiones de no integración

- No copiar identidades visuales, código o textos propietarios.
- No añadir vuelos, trenes, carpooling, wallets, reseñas o promociones mientras no existan requisitos y API.
- No usar mapas ficticios ni ubicaciones simuladas como si fueran datos reales.
