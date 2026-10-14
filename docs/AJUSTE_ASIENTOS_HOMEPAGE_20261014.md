# Ajuste puntual — sección de asientos del homepage

## Qué se cambió

Se corrigió el bloque del homepage donde antes se mostraba un autobús grande dentro de la sección de asientos.

Ahora ese bloque presenta una vista visual del layout de asientos redimensionada, centrada y contenida dentro de una tarjeta limpia.

## Archivos modificados

- `apps/website/index.html`
- `apps/website/public-rework.css`
- `apps/website/seat-layout-home-reference.jpg`
- `APLICAR_REWORK_PUBLICO_SEO.ps1`

## Resultado esperado

En la sección:

- `Choose your seat`
- `Pick the seat that works for your trip.`

la columna izquierda debe mostrar el esquema de asientos, no el autobús.

## Aplicación

Ejecuta:

```powershell
powershell -ExecutionPolicy Bypass -File .\EncoreTransport_REWORK_ASIENTOS_HOMEPAGE_20261014\APLICAR_REWORK_PUBLICO_SEO.ps1 .
```

Luego reinicia el proyecto y limpia caché si hiciera falta.
