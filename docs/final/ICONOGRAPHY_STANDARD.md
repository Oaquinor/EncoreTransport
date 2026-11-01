# Estándar de iconografía

- Fuente única compartida: `packages/shared/icons.mjs`.
- Los iconos son SVG inline, sin emojis en controles operativos y sin paquetes adicionales.
- Tamaño base: 16–18 px; controles compactos usan el mismo trazo y contraste.
- Un control con icono debe conservar texto o `aria-label` explícito.
- Acciones de inspección, guardado, configuración, reporte, boleto, vehículo y paquetería tienen glifos diferenciados.
- Los iconos son decorativos cuando el texto ya expresa el propósito (`aria-hidden=true`); el nombre accesible vive en el control.
- No se usa iconografía para simular capacidades no disponibles.

La cobertura visual de todas las pantallas queda pendiente de la siguiente captura browser posterior a la reorganización Admin.
