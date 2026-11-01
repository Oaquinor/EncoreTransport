# Auditoría de alineación de controles

Fecha: 2026-10-31

## Cobertura

Se inspeccionaron los controles visibles (`button`, enlaces con estilo de botón y envíos de formularios) en:

- Website
- Passenger
- Driver
- Admin
- Login
- Tracking
- Package Register

Cada ruta se comprobó en 375 px, 768 px y 1440 px de ancho.

## Criterios

- Ningún control visible puede salir del viewport.
- No se permite desbordamiento horizontal del documento.
- Los controles accionables deben conservar al menos 36 × 32 px.
- Los controles ocultos no se contabilizan como errores visuales.

## Resultado

Todas las rutas cumplieron los criterios en las tres resoluciones. Se corrigió un desbordamiento de 3 px en el encabezado de `package-register` a 768 px, causado por un margen negativo aplicado al contenedor principal. El encabezado ahora usa espaciado interno y ancho contenido sin exceder el viewport.

Validación automatizada ejecutada con Playwright contra `http://127.0.0.1:4173`.
