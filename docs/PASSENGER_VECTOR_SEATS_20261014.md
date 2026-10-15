# Passenger — vectorización real del seat map

## Objetivo

Corregir la pantalla:

```text
http://127.0.0.1:4173/passenger/
```

para que el mapa de asientos deje de verse como una rejilla vertical genérica y pase a verse como una representación horizontal del autobús, más cercana a la referencia que enviaste.

## Qué cambia

### seat-map.tsx

Se reemplaza el componente por una versión que:

- sigue usando los asientos reales del backend;
- organiza el vehículo horizontalmente;
- convierte `row_number` en columnas físicas del autobús;
- detecta el pasillo con base en `position_index`;
- conserva estados reales:
  - `available`
  - `selected`
  - `occupied`
  - `blocked`
  - `accessible`
- pinta cockpit, volante, conductor, puerta frontal y salida trasera;
- hace los asientos más pequeños y más físicos;
- deja la selección interactiva.

### vector-seat-map.css

Nueva capa visual específica para el seat map.

No depende de PNG ni de JPEG.
El aspecto visual sale de CSS/HTML:

- headrest;
- back;
- base;
- armrests;
- colores por estado;
- bus shell;
- cockpit;
- aisle;
- rear exit.

### main.tsx

Se agrega:

```ts
import './vector-seat-map.css';
```

solo si no existe.

## Aplicación

```powershell
powershell -ExecutionPolicy Bypass -File .\EncoreTransport_PASSENGER_VECTOR_SEATS_20261014\APLICAR_ASIENTOS_VECTOR_PASSENGER.ps1 .
```

## Validación

```bat
npm run typecheck:passenger
npm run build:passenger
node tests/seat-layout-vector-contract.test.mjs
npm run test:seat-layout
npm run validate:frontend
```

## Si sigue viéndose igual

Limpiar caché:

```text
Ctrl + Shift + R
```

Si hay service worker:

```text
DevTools → Application → Service Workers → Unregister
DevTools → Application → Storage → Clear site data
```
