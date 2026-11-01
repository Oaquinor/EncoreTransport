# Matriz de capacidades móviles

| Capacidad | Passenger Mobile | Driver Mobile | Evidencia actual | Estado |
|---|---|---|---|---|
| Login seguro | Sí | Sí | Typecheck y flujo de código | PARCIAL |
| Reserva/boleto | Sí | N/A | API y typecheck | PARCIAL |
| GPS foreground | N/A | Sí | `expo-location`, contrato nativo | PARCIAL |
| GPS background | N/A | Implementado en código | `expo-location`, `expo-task-manager`, permiso background, tarea persistente y envío del último punto real | SIN ACEPTACIÓN DE DISPOSITIVO |
| Cámara/evidencia nativa | N/A | Implementado en código | `expo-camera`, QR, fotografía privada y `multipart/form-data` al endpoint de entrega | SIN ACEPTACIÓN DE DISPOSITIVO |
| Offline/outbox | Fail-closed | No implementado | Passenger bloquea reserva/pago sin red; Driver no inventa una cola offline | PENDIENTE |
| Push | No aceptado | No aceptado | Proveedor/configuración externa ausente | BLOQUEADO |
| QR de custodia | N/A | Implementado en código | Cámara QR y controles de custodia conectados a backend QR/manifest/transfers | SIN ACEPTACIÓN DE DISPOSITIVO |

Los typechecks no sustituyen pruebas en emulador o dispositivo físico.
