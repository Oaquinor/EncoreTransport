# Matriz de capacidades móviles

| Capacidad | Passenger Mobile | Driver Mobile | Evidencia actual | Estado |
|---|---|---|---|---|
| Login seguro | Sí | Sí | Typecheck y flujo de código | PARCIAL |
| Reserva/boleto | Sí | N/A | API y typecheck | PARCIAL |
| GPS foreground | N/A | Sí | `expo-location`, contrato nativo | PARCIAL |
| GPS background | N/A | No aceptado | Falta permiso, tarea y prueba de dispositivo | BLOQUEADO |
| Cámara/evidencia nativa | N/A | No aceptado | Falta integración de cámara/galería y upload probado | BLOQUEADO |
| Offline/outbox | No aceptado | No aceptado | No se inventa sincronización | BLOQUEADO |
| Push | No aceptado | No aceptado | Proveedor/configuración externa ausente | BLOQUEADO |
| QR de custodia | N/A | UI conectada | Backend QR/manifest/transfers y contratos locales | PARCIAL |

Los typechecks no sustituyen pruebas en emulador o dispositivo físico.
