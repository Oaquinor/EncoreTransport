# Passenger SeatMap SVG final

## Por qué el mapa anterior seguía viéndose mal

El componente `seat-map.tsx` ya emitía clases:

```text
et-seat-bus
et-seat
et-seat__back
et-seat__base
...
```

pero el navegador seguía mostrando botones HTML crudos porque el resultado visual dependía de una capa CSS externa que no estaba entrando de forma confiable en el bundle/runtime.

## Solución final

El nuevo `seat-map.tsx` ya no depende de una hoja CSS para dibujar el bus y los asientos.

Todo el vehículo se renderiza como SVG interactivo:

- carrocería;
- frente redondeado;
- parabrisas;
- conductor;
- volante;
- puerta frontal;
- pasillo;
- asientos;
- apoyabrazos;
- salida trasera;
- estados de asiento.

Los asientos siguen siendo clicables.

## Datos conservados

La lógica sigue usando:

```text
id
seat_number
row_number
position_index
available
selected
occupied
blocked
accessible
```

No se inventa disponibilidad.

## Validación

```bat
node tests/passenger-seatmap-svg-contract.test.mjs
npm run typecheck:passenger
npm run build:passenger
npm run dev
```

Después:

```text
Ctrl + Shift + R
```

Si Passenger sigue mostrando el componente viejo, limpia el Service Worker y Site Data.
