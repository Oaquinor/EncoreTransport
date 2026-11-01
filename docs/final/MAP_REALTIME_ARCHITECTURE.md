# Arquitectura de mapas y realtime

## Estado actual

- `packages/shared/real-map.mjs` centraliza la representación de mapa y fallback.
- Website Live, Admin y Driver consumen ubicaciones/recorridos mediante los contratos existentes.
- El fallback visual no se presenta como GPS real: una ubicación ausente o antigua se etiqueta como no actual.
- Los tests de contrato de mapa y runtime local pasan en la línea base documentada.

## Decisión pendiente

No se introduce WebSocket/SSE ni un proveedor nuevo sin contrato de backend, autenticación, política de reconexión y presupuesto de batería. Falta validar TomTom con credenciales, latencia, reconexión, privacidad y carga bajo datos reales.

## Aceptación futura

Probará actualización, pérdida de red, orden de eventos, stale markers, permisos y cleanup al desmontar la pantalla en Website, Admin, Driver PWA y Mobile.
