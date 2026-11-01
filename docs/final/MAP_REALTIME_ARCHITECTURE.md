# Arquitectura de mapas y realtime

## Estado actual

- `packages/shared/real-map.mjs` centraliza la representación de mapa y fallback.
- Website Live, Admin y Driver consumen ubicaciones/recorridos mediante los contratos existentes.
- El fallback visual no se presenta como GPS real: una ubicación ausente o antigua se etiqueta como no actual.
- Las posiciones reales se actualizan con polling adaptativo: 25 s en operación normal y backoff hasta 120 s ante fallos.
- La pestaña visible y la conectividad reactivan una recuperación inmediata; `pagehide` cancela el temporizador.
- Las posiciones recientes se interpolan durante 900 ms con easing; los puntos obsoletos conservan el marcador, pero se muestran en estado stale.
- Cada marcador muestra estado GPS y hora de actualización. Las animaciones se cancelan y los recursos se liberan al desmontar el mapa.
- `tests/live-network-resilience.test.mjs`, los tests de contrato de mapa y el runtime local pasan.

## Decisión de transporte

No se introduce WebSocket/SSE ni un proveedor nuevo porque el backend disponible no expone un canal realtime autenticado. La implementación compatible es polling adaptativo con recuperación explícita; no inventa posiciones ni simula eventos. Falta validar TomTom con credenciales, latencia, privacidad y carga bajo datos reales.

## Aceptación pendiente

La aceptación en producción debe probar actualización, pérdida de red, orden de eventos, stale markers, permisos y cleanup al desmontar la pantalla en Website, Admin, Driver PWA y Mobile con telemetría real. Esto queda bloqueado hasta contar con datos/credenciales operativos.
