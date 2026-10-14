# Auditoría visual exhaustiva del inicio — EncoreTransport

## Objetivo

El problema del inicio no era una sola sección. Era la falta de un sistema visual coherente entre:

- header;
- hero;
- buscador;
- destinos;
- preview de asientos;
- mapa;
- servicios;
- CTA final;
- footer.

El homepage anterior tenía buenas piezas individuales, pero cada bloque cambiaba demasiado de lenguaje, densidad, fondo y jerarquía.

## Cambio estructural

El inicio ahora utiliza una narrativa continua:

```text
Hero
↓
Search
↓
Current network
↓
Seat experience
↓
Journey context
↓
From search to boarding
↓
Passenger services
↓
Final CTA
↓
Footer
```

Todos los bloques comparten:

- mismo ancho máximo;
- misma escala de títulos;
- radios consistentes;
- una sola familia de sombras;
- superficies claras;
- azul Encore como acento;
- navy reservado para cierres y acciones importantes;
- espaciado vertical coherente.

## Hero

Se conserva exactamente la imagen del autobús suministrada por el usuario:

```text
assets/media/Autobus.png
```

Se redujo la sensación de “banner aislado” y se convirtió el hero en un punto de entrada al journey completo.

Los indicadores de rutas, salidas y estado continúan consumiendo la lógica existente.

## Search

El buscador deja de parecer un formulario independiente colocado debajo del hero.

Ahora:

- tiene jerarquía propia;
- mantiene From / To;
- conserva Swap;
- mantiene Date;
- mantiene Passengers;
- conserva el submit real a `/passenger/`.

No se modifica la lógica de `bookingForm`.

## Destinations

Se mantiene `#destinationGrid`, por lo que `app.mjs` continúa cargando rutas reales.

La mejora es de:

- ritmo;
- card size;
- hover;
- typography;
- visual hierarchy;
- estado de carga.

## Seat experience

El homepage ya no muestra el preview como una caja vertical enorme.

Se representa como autobús horizontal:

- cockpit;
- driver;
- front door;
- 2+2;
- aisle;
- rear exit;
- asientos compactos;
- estados reales.

No se sustituye `fetchTripSeats`.

## Route

El mapa real conserva:

```text
#routeMapCanvas
```

y continúa siendo manejado por `renderJourneyMap`.

El cambio reorganiza el bloque para que el mapa sea una herramienta del journey y no una sección visualmente desconectada.

## Process

Se agrega una sección de tres pasos que explica capacidades ya existentes:

1. Search.
2. Review trip.
3. Continue in Passenger.

No promete funcionalidades no implementadas.

## Services

Passenger y Package Tracking dejan de ser dos tarjetas genéricas oscuras.

Ambos siguen enlazando a:

```text
/passenger/
/track-package/
```

Staff no se mezcla con el journey comercial.

## Footer

Se convierte en un cierre coherente:

- Encore lockup;
- navegación pública;
- staff access separado;
- copy discreto.

## Lógica preservada

Se conservan los identificadores usados por `app.mjs`:

```text
routeCount
tripCount
serviceStatus
featuredTrip
bookingForm
searchMessage
routesState
destinationGrid
seatState
seatPreview
routeMapCanvas
mapStatus
mapEta
routeModal
modalMapCanvas
routeDistance
routeDuration
routeTitle
bookRouteLink
mobileMenuToggle
mobileNavigation
```

Por eso esta actualización trabaja sobre el diseño del homepage sin romper las llamadas API existentes.
