# EncoreTransport — cierre maestro verificable

Fecha: 2026-11-01  
Rama: `main`  
Commit de referencia: `b950cc9327a1078b3e8da0b91dafec5e6d0d8110`
Commit final: no creado; los cambios de esta revisión permanecen sin confirmar.

## Clasificación

`PARTIALLY_COMPLETE`

La plataforma tiene una base funcional demostrable para Website, reservas, asientos, Passenger web, Driver PWA, Admin, mapas, tracking y contratos de seguridad. No se declara lista para producción porque pagos externos, dispositivos móviles reales, notificaciones externas y la integración operativa completa de custodia siguen sin aceptación completa.

## Trabajo realizado en esta revisión

- Se preservó `main` y se confirmó que `codex/funcionalidad-reservas-rutas` es antecesora de `main`; no había divergencia que fusionar.
- Se añadió una prueba de contrato para custodia y se incorporó a `npm test`.
- Registro y cambio de estado de paquetes son transaccionales.
- Los reintentos se serializan con bloqueo de fila.
- La entrega exige verificación del receptor y fotografía.
- Las fotografías de entrega se guardan en el disco privado `local`.
- Tracking público devuelve `last_updated_at` y `next_action`, sin teléfono, correo ni notas operativas privadas.
- La API compartida del Driver soporta evidencia multipart.
- Website ya no permite que el fallo de viajes destacados sobrescriba el estado de Encore Live; el browser test espera explícitamente la inicialización asíncrona del mapa.
- La navegación pública del Website quedó reducida a `Home | Trips | Packages | Tracking | Help`; se retiraron `Platform`, `Journey Control` y la barra rápida pública.
- `ALL_ACTIONS_AUDIT.md` ahora contiene 460 filas de controles/listeners detectados en 38 archivos, con pantalla, propósito, destino, permisos, estado y evidencia.
- La gestión de cuentas incorpora búsqueda y filtros server-side con paginación; `AdminUserSearchTest` verifica el recorrido contra Laravel/MySQL.
- Se eliminó la vinculación/notificación automática basada únicamente en `recipient_email`; el registro de paquetes no convierte al destinatario en cuenta sin confirmación.
- La custodia avanzada añade QR opaco, manifiestos por viaje con reconciliación, escaneo idempotente y transferencia con aceptación del conductor receptor.

## Funcionalidad preservada

Reservas y cotización por tramo, selección de asientos, rutas y mapas TomTom/Leaflet, login, perfil, permisos Admin, notificaciones internas, GPS foreground del Driver, registro de paquetes y tracking por token.

## Pendientes que impiden el lanzamiento

Proveedor y credenciales de pago, UI operativa de manifiestos/transferencias en Driver Mobile, terminal/vehículo/ubicación por evento, GPS background en dispositivo, aceptación nativa, proveedores Gmail/WhatsApp/push, dominio SEO final y E2E autenticado contra un entorno sembrado.

## Evidencia

`npm test` pasa; los typechecks de API, Passenger web, Passenger Mobile y Driver Mobile pasan; el build de Passenger pasa; browser visual pasa con 36 checks y capturas en 360, 390, 768, 1024, 1440 y 1920 px; el flujo Admin autenticado focalizado pasa a 1440 px. `php artisan test` pasa con 78 pruebas y 504 aserciones usando PHP 8.3.30 y MySQL de Laragon. Las pruebas en dispositivos reales y las integraciones externas siguen bloqueadas.
