# EncoreTransport — cierre maestro verificable

Fecha: 2026-11-01  
Rama: `main`  
Commit de referencia: `0174468fdcdb71a5e28f7bcb9ed51e1f7bfed184`
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
- La pantalla de clientes usa el mismo contrato server-side, con búsqueda, rol/estado, paginación y separación de cuentas Passenger frente a reservas guest.
- La ficha administrativa de usuario expone pestañas reales de General, Perfil, Reservas, Boletos, Encomiendas autorizadas, Actividad y Permisos; cada pestaña carga su endpoint autorizado y paginado cuando corresponde.
- Admin incorpora consulta, detalle, historial y transiciones explícitas de ciclo de vida de boletos; separa estado de boleto, reserva, pago y abordaje y no infiere uso por finalización del viaje.
- Se eliminó la vinculación/notificación automática basada únicamente en `recipient_email`; el registro de paquetes no convierte al destinatario en cuenta sin confirmación.
- La custodia avanzada añade QR opaco, manifiestos por viaje con reconciliación, escaneo idempotente y transferencia con aceptación del conductor receptor.
- Driver PWA y Driver Mobile ya consumen los flujos de escaneo, carga, manifiesto, discrepancia y transferencia; las respuestas y errores provienen del backend.
- Encore Live incorpora polling adaptativo, recuperación al volver online/visible, interpolación de posiciones reales, marcadores stale y cleanup de animaciones; no se introduce WebSocket/SSE sin contrato backend.
- Driver Mobile incorpora permisos y tarea de GPS background, cámara QR, fotografía privada y validación explícita del destinatario; Passenger Mobile falla de forma segura sin red.
- El Website público sirve inglés por defecto y ofrece EN/ES desde header desktop y móvil; `locale-data.mjs` centraliza navegación, contenido estático/dinámico y SEO por variante. Las páginas tienen composiciones visuales diferenciadas y el CMS rechaza términos técnicos antes de guardar o publicar.
- El CMS admite campos bilingües `*_en`/`*_es` para secciones y FAQ, con validación editorial compartida y selección por locale en el Website.
- El servidor admite convertir canonical y `og:url` relativos en URLs absolutas cuando se configura `PUBLIC_SITE_URL` con un dominio público no local; no convierte el dominio de desarrollo en canonical de producción.

## Funcionalidad preservada

Reservas y cotización por tramo, selección de asientos, rutas y mapas TomTom/Leaflet, login, perfil, permisos Admin, notificaciones internas, GPS foreground del Driver, registro de paquetes y tracking por token.

## Pendientes que impiden el lanzamiento

Proveedor y credenciales de pago, aceptación de evidencia/cámara y GPS background en dispositivos reales, terminal/vehículo/ubicación por evento, proveedores Gmail/WhatsApp/push, dominio SEO final y E2E autenticado por cada rol. La gestión administrativa de autorizaciones de paquetes y la cobertura exhaustiva de cada transición de boleto todavía requieren una iteración específica.

## Evidencia

`npm test` pasa; los typechecks de API, Passenger web, Passenger Mobile y Driver Mobile pasan; el build de Passenger pasa; browser visual pasa con 36 checks y capturas en 360, 390, 768, 1024, 1440 y 1920 px, incluyendo cambio EN/ES y transferencia de búsqueda; los flujos Admin y Driver autenticados focalizados pasan a 1440 px. `php artisan test` pasa con 83 pruebas y 545 aserciones usando PHP 8.3.30 y MySQL de Laragon, incluyendo `WebsiteContentAndRouteImageTest`, `AdminUserSearchTest` y `AdminTicketLifecycleTest`. Las pruebas en dispositivos reales y las integraciones externas siguen bloqueadas.
