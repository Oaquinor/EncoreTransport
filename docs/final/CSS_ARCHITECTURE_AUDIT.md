# Auditoría de arquitectura CSS — Website

Fecha: 2026-11-02

## Resultado de esta iteración

Se rastrearon los consumidores de las capas CSS del Website antes de retirar una dependencia. La hoja `apps/website/premium.css` contenía el sistema visual histórico basado en selectores `.premium-*`, pero ninguna plantilla HTML ni módulo JavaScript activo del Website utiliza esos selectores. El único resultado relacionado es `premium-interactions.mjs`, que implementa comportamiento de interacción y no depende de esa hoja.

Por eso se retiró únicamente `@import url("./premium.css")` de `apps/website/app.css`. No se eliminó el archivo físico para conservarlo como referencia recuperable hasta completar una extracción posterior.

## Capas que permanecen activas

| Capa | Motivo de permanencia |
|---|---|
| `packages/shared/styles.css` | Base compartida y utilidades consumidas por las superficies públicas. |
| `packages/shared/premium.css` | Tokens y reglas compartidas del lockup/branding usados por el shell y otras superficies. |
| `apps/website/styles.css` | Base histórica todavía consumida por componentes públicos. |
| `apps/website/mandate-fixes.css` | Correcciones de contratos existentes; requiere migración selectiva. |
| `apps/website/public-rework.css` | Layout y composición pública actual. |
| `packages/shared/design-system.css` | Tokens y controles compartidos. |
| `apps/website/visual-polish.css` | Ajustes visuales y de estados que siguen siendo consumidos. |
| `apps/website/multipage.css` | Composición de las rutas multipágina. |
| `apps/website/innovation.css` | Refinamientos actuales de composición, responsive y estados. |

## Validación

- `rg` sobre HTML y JavaScript del Website no encontró consumidores `.premium-*` activos.
- `npm run test:website-pages-browser`: PASS después de retirar el import.
- `npm run test:website-editorial`: PASS.
- `npm run test:premium-design`: PASS.
- `npm run test:premium-responsive`: PASS.
- `VISUAL_SURFACES=website VISUAL_VIEWPORTS=390,1440 npm run test:visual-browser`: PASS.

## Pendiente de arquitectura

La retirada del import elimina una capa muerta comprobada, pero no declara terminada la consolidación CSS. Las capas restantes todavía contienen reglas históricas y algunas sobreescrituras necesarias. La siguiente extracción debe hacerse por selector consumidor, con captura responsive y regresión visual por página; no se debe borrar o renombrar una hoja completa por tamaño o antigüedad.
