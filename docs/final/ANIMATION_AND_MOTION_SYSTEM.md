# Sistema de animación y movimiento

## Reglas

- Transiciones cortas para hover, foco, apertura y estado activo; no se animan cambios de datos críticos.
- La jerarquía se comunica primero con color, texto y estado; el movimiento es secundario.
- Los componentes existentes usan `prefers-reduced-motion` donde corresponde; la revisión final debe comprobarlo en browser.
- Los estados de carga, error y éxito deben anunciarse con texto/`aria-live`, no sólo con animación.
- No se agregan librerías de motion para resolver un problema de CSS.

## Pendiente de aceptación

Falta una pasada browser con `prefers-reduced-motion: reduce` en Admin, Passenger, Driver y Website y una captura comparable por viewport. Por tanto, esta matriz es estándar de implementación, no aceptación final.
