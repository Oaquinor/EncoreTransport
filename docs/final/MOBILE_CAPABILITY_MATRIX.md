# Matriz de capacidades móviles

| Capacidad | Passenger Mobile | Driver Mobile | Evidencia actual | Estado |
|---|---|---|---|---|
| Login seguro | Sí | Sí | Typecheck y flujo de código | PARCIAL |
| Reserva/boleto | Sí | N/A | API y typecheck | PARCIAL |
| Mapa nativo | Implementado en código | Implementado en código | `react-native-maps`; guard/fallback sin clave y config plugin para `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | BLOQUEADO POR CLAVE DEL PROVEEDOR |
| GPS foreground | N/A | Sí | AVD: permiso preciso concedido y ubicación enviada a Operaciones | ACEPTADO EN AVD / FALTA DISPOSITIVO FÍSICO |
| GPS background | N/A | Implementado | AVD: permiso background configurado, indicador `BACKGROUND GPS ACTIVO` y envío real verificados | ACEPTADO EN AVD / FALTA DISPOSITIVO FÍSICO |
| Cámara QR | N/A | Sí | AVD: permiso Android concedido y escáner QR abierto sin datos simulados | ACEPTADO EN AVD |
| Cámara/evidencia nativa | N/A | Implementado en código | `expo-camera`, permiso QR aceptado en AVD, overlay listo y fotografía privada/multipart preparados | PARCIAL — CAPTURA MULTIPART PENDIENTE |
| Offline/outbox | Fail-closed | GPS outbox controlada + outbox acotada para carga `in_progress` | GPS real verificado en AVD; prueba automatizada de almacenamiento, deduplicación, 503, reanudación y 422; la carga puede quedar pendiente sin confirmarse localmente y reintenta al volver la red; entregas con foto y transferencias permanecen fail-closed | PARCIAL — ACEPTACIÓN NATIVA PENDIENTE |
| Push | No aceptado | No aceptado | Proveedor/configuración externa ausente | BLOQUEADO |
| QR de custodia | N/A | Implementado en código | Cámara QR y controles de custodia conectados a backend QR/manifest/transfers | SIN ACEPTACIÓN DE DISPOSITIVO |

Los typechecks no sustituyen pruebas en emulador o dispositivo físico.
