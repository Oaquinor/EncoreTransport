# EncoreTransport Visual Refresh — 2026-10-14

Este paquete aplica cambios reales al proyecto, no mockups.

## Cambios incluidos

### Website
- Hero más consistente y compacto.
- Nueva vectorización del autobús en el hero.
- Booking panel integrado visualmente con el resto del homepage.
- Se elimina el corte visual excesivamente oscuro entre secciones.
- Destinations, Seats, Route, Services y Footer comparten la misma escala visual.
- Preview de asientos se vuelve horizontal y más parecido a un vehículo real.
- Route/map section deja de verse como una página distinta.
- Footer oscuro se utiliza como cierre coherente, no como bloque blanco desconectado.

### Passenger
- Nuevo `SeatMap` orientado horizontalmente.
- Las filas reales del backend se convierten en columnas físicas del vehículo.
- Se detecta el hueco del pasillo a partir de `position_index`.
- Se mantienen los estados reales:
  - available
  - selected
  - occupied
  - blocked
  - accessible
- Cockpit, windshield, driver seat, front door, aisle y rear exit.
- Asientos con headrest, back, cushion y armrests.
- Summary lateral más limpio y sticky en desktop.

### Admin
- Sidebar más compacto y balanceado.
- Mejor jerarquía de módulos.
- Topbar y controles más coherentes.
- Cards de KPI más limpias.
- Mapa y paneles con radios y spacing homogéneos.
- Table toolbar, headers, rows, sort buttons y pagination dejan de verse como controles por defecto del navegador.

## Validación

Desde la raíz:

```bat
npm run typecheck:passenger
npm run build:passenger
npm run test:seat-layout
npm run test:premium-design
npm run test:premium-responsive
npm run validate:frontend
```

Después:

```bat
npm run dev
```

Para limpiar visualmente en Chrome:

```text
Ctrl + Shift + R
```

Si un Service Worker mantiene CSS viejo:
DevTools → Application → Service Workers → Unregister → Storage → Clear site data.
