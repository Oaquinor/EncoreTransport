# Fix — Passenger SeatMap export/props

## Causa real

`passenger-app.tsx` importa:

```ts
import {
  SeatMap,
  type SeatDto,
} from './seat-map';
```

y usa:

```tsx
<SeatMap
  seats={seats}
  selected={selected}
  maxSelection={passengerCount}
  onToggle={toggle}
/>
```

El `seat-map.tsx` aplicado previamente había quedado incompatible:

- exportaba `SeatMap` solamente como `default`;
- no exportaba `SeatDto`;
- esperaba props con otros nombres:
  - `selectedSeatIds`
  - `maxSelectable`
  - `onSeatToggle`

Por eso Vite fallaba antes de generar el bundle.

## Corrección

El archivo incluido ahora:

- exporta `SeatMap` como named export;
- conserva `export default SeatMap`;
- exporta `SeatDto`;
- usa exactamente las props esperadas por `passenger-app.tsx`;
- mantiene la vectorización visual del asiento;
- conserva estados available/selected/occupied/blocked/accessible;
- usa `row_number` y `position_index`.

## Validación

```bat
npm run typecheck:passenger
npm run build:passenger
```

El warning de:

```text
/assets/media/Autobus.png didn't resolve at build time
```

no fue la causa del fallo actual. Vite lo deja como URL de runtime.
