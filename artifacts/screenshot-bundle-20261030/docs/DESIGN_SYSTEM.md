# Encore Transport — sistema de diseño

## Tokens y principios

- Azul tinta para texto y navegación operativa.
- Azul Encore para acciones primarias y estados activos.
- Fondos claros para lectura y paneles blancos para datos editables.
- Radios consistentes de 10–24px según control, tarjeta o diálogo.
- Estados de foco visibles y navegación por teclado.
- Iconos SVG inline; no se usan imágenes rasterizadas para controles.

## Componentes consolidados

- Botones `.button`, `.button--primary`, `.button--ghost` y `.button--danger`.
- Avatares con imagen progresiva y fallback de iniciales.
- Selectores con flecha, foco y altura consistente.
- Diálogos nativos `<dialog>` para configuraciones sensibles.
- Tarjetas de viaje, estados vacíos y acciones contextuales.

## Responsive

Las pantallas Passenger críticas fueron comprobadas en 390px y 1440px. La siguiente iteración debe ampliar la matriz a 320, 375, 430, 768, 1024, 1280 y 1920px en todas las aplicaciones.
