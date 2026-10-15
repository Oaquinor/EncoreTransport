# Fix — Passenger layout alignment

## Causa

La pantalla tenía dos anchos máximos incompatibles:

```text
premium.css
.app-shell = 1180px

flow-refresh.css
.passenger-wrap = 1420px
```

El hijo terminaba siendo más ancho que su propio shell.

Eso explica la captura:

- header centrado en un ancho;
- journey en otro ancho;
- hero y contenido desplazados;
- sensación de que Passenger “se sale” de su propio portal.

## Corrección

Se agrega una última capa:

```text
apps/passenger/src/layout-alignment.css
```

con un único contenedor:

```text
1440px máximo
gutter desktop 28px
```

Todos estos bloques ahora comparten el mismo eje:

```text
Header
Journey
Hero
Search
Results
Trip
Seats
Passenger details
Review
Status
```

## También se retira del hero

El elemento decorativo:

```text
orbit
```

se oculta.

No aportaba información al pasajero y, junto a la fotografía del bus, hacía que el hero pareciera una composición de elementos flotantes sin función.

## Validación

```bat
npm run typecheck:passenger
npm run build:passenger
npm run dev
```

Luego:

```text
Ctrl + Shift + R
```
