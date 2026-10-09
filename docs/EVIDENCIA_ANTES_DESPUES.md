# Evidencia antes / después

## Website

**Antes**
- `apps/website/index.html` contenía `<svg class="route-svg">`.
- La ruta real de TomTom se convertía en una línea SVG sobre un bloque decorativo.
- El usuario veía una forma de ruta, pero no calles, zoom ni cartografía.

**Después**
- `routeMapCanvas` y `modalMapCanvas` son contenedores Leaflet.
- Los tiles vienen de `/api/v1/maps/tiles/{z}/{x}/{y}.png`.
- La ruta continúa viniendo de `maps/journey`.
- Hay marcadores reales de origen y destino y controles de zoom.

## Passenger

**Antes**
- No existía mapa cartográfico en el detalle del viaje.
- La grilla visual heredaba una estructura fija.

**Después**
- El detalle del viaje renderiza la misma ruta TomTom.
- El seat map calcula sus columnas desde `position_index`.
- Distingue `available`, `selected`, `occupied`, `blocked`, `accessible`.

## Driver

**Antes**
- Las acciones eran reales, pero la ruta no tenía contexto cartográfico.
- GPS se enviaba sin que el conductor pudiera comprobar la última posición en mapa.

**Después**
- La ruta usa la misma fuente TomTom.
- La última ubicación guardada se muestra si existe.
- Si no existe GPS real no aparece un vehículo ficticio.

## Admin

**Antes**
- Los estilos contenían `.ops-map` con carreteras y pines puramente decorativos.
- No representaban una ruta operativa.

**Después**
- Dashboard usa `adminLiveMap`.
- TomTom dibuja la ruta real.
- La última posición real se añade cuando existe.

## Capturas

No se incluyen capturas fabricadas. Para evidencia visual real ejecutar el proyecto localmente y capturar:

1. `/website/` escritorio 1440×900 y móvil 390×844.
2. `/passenger/` detalle del viaje y selección de asientos.
3. `/driver/` viaje asignado con y sin GPS registrado.
4. `/admin/` Dashboard con mapa.
5. Passenger Mobile y Driver Mobile en emulador/dispositivo.

La guía `PRUEBAS_LARAGON.md` contiene el procedimiento.
