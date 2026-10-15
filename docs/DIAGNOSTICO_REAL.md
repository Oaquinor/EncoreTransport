# Diagnóstico real

La captura confirma que el proceso que escucha en 4173 sigue ejecutando el `server.mjs` viejo.

Prueba: el texto mostrado es exactamente:

```text
Not found. If this is /passenger/, run npm run build:passenger first.
```

Ese texto existe en el `server.mjs` viejo revisado. Por tanto, aunque se hayan copiado otros archivos, el proceso de Node que está escuchando en 4173 no está usando el server corregido.

Además, el Passenger actual tiene otro problema distinto:

- `seat-map.tsx` genera clases `et-seat-*`;
- el CSS histórico principal de asientos usa clases `reference-*`.

Eso explica por qué los asientos aparecen como botones HTML simples.

El fix incluido hace tres cosas obligatorias:

1. reemplaza `server.mjs` por uno que publica `/login/` y `/track-package/`;
2. mata cualquier proceso que siga escuchando en 4173 para evitar que continúe el server viejo;
3. carga `passenger-final.css` al final, centrando todo Passenger y estilizando exactamente las clases `et-seat-*`.
