# Passenger + Login + SeatMap — corrección integrada

## 1. Login 404

El `server.mjs` actual del repositorio no tiene aliases para:

```text
/login
/track-package
```

aunque existen:

```text
apps/auth
apps/package-tracking
```

Por eso `http://127.0.0.1:4173/login/` termina en el 404 genérico.

El instalador conecta:

```text
/login         -> apps/auth
/track-package -> apps/package-tracking
```

## 2. Passenger no centrado

El portal acumuló reglas con anchos distintos (`1180px`, `1420px`, etc.).

La nueva capa usa un solo contenedor:

```text
max-width: 1480px
margin-left: auto
margin-right: auto
gutter desktop: 28px
```

para header, journey y el flujo completo.

## 3. SeatMap crudo

El TSX actual sí genera componentes visuales:

```text
et-seat-bus
et-seat-column
et-seat__back
et-seat__base
et-seat__arm
```

pero el CSS cargado estaba orientado a otras clases (`reference-*`).

Por eso la captura muestra botones HTML sin vectorización.

`passenger-integrated.css` implementa exactamente las clases `et-seat-*` del componente actual y dibuja:

- carrocería horizontal;
- cockpit;
- volante;
- conductor;
- puerta frontal;
- asientos con headrest/back/base/arms;
- pasillo central;
- salida trasera;
- estados available/selected/occupied/blocked/accessible.

No usa una imagen raster para los asientos.

## Validación

```bat
node tests/passenger-integration-contract.test.mjs
npm run typecheck:passenger
npm run build:passenger
npm run dev
```

Después prueba:

```text
http://127.0.0.1:4173/login/
http://127.0.0.1:4173/passenger/
```

En Passenger navega:

```text
Search -> Results -> Trip -> Seats
```
