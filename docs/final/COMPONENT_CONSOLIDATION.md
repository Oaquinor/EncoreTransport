# Consolidación de componentes

## Reutilizados

- `packages/shared/styles.css`, `premium.css`, `design-system.css` y `ui.mjs` para identidad, foco, badges y controles.
- Tabla Admin compartida con búsqueda local, ordenamiento y paginación visual.
- API compartida para tokens, errores, reservas, tracking y Driver.
- Mapas compartidos con estado de carga, fallback y destrucción segura.
- Patrones de foto/avatar en Admin y Driver.

## Decisiones

Admin mantiene estilos empresariales propios porque su densidad y jerarquía difieren de Passenger. Driver mantiene controles grandes y rápidos para operación. Website mantiene composición comercial. Se evita fusionar superficies con responsabilidades distintas solo para reducir archivos.

## Deuda

Existen hojas históricas de evolución visual en algunas apps. No se agregaron nuevas capas correctivas en esta iteración; la consolidación completa requiere una pasada separada de extracción de tokens y regresión visual por aplicación.
