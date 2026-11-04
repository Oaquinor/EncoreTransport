# EncoreTransport — cierre maestro verificable

Fecha: 2026-11-04
Rama: `main`
Commit de referencia: `0174468fdcdb71a5e28f7bcb9ed51e1f7bfed184`
Commit final: no creado; los cambios de esta revisión permanecen sin confirmar.

## Clasificación

`PARTIALLY_COMPLETE`

En la revalidación del 2026-11-02 se localizaron PHP 8.3.30 y MySQL de Laragon fuera del `PATH`; la suite Laravel se ejecutó con esos binarios y la base local activa.

La plataforma tiene una base funcional demostrable para Website, reservas, asientos, Passenger web, Driver PWA, Admin, mapas, tracking y contratos de seguridad. Passenger y Driver Mobile ya compilan, se instalan y arrancan en un AVD Android con la API local conectada; Driver además acepta el login demo, carga un viaje asignado real, abre el escáner QR y activa GPS background. Se reprodujo y corrigió el crash nativo de mapas por ausencia de clave Google con un fallback de ruta real y configuración del plugin para una clave autorizada. No se declara lista para producción porque la aceptación móvil completa, pagos externos, notificaciones externas, mapa nativo con proveedor configurado y la integración operativa completa de custodia siguen sin aceptación completa.

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
- La aceptación AVD posterior verificó login, viaje demo, permiso/cámara QR y GPS background con envío real a Operaciones. Sin `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`, Driver Mobile muestra el recorrido real como fallback y evita el crash nativo; la clave no se inventa ni se incluye en el repositorio.
- El Website público sirve inglés por defecto y ofrece EN/ES desde header desktop y móvil; `locale-data.mjs` centraliza navegación, contenido estático/dinámico y SEO por variante. Las páginas tienen composiciones visuales diferenciadas y el CMS rechaza términos técnicos antes de guardar o publicar.
- El CMS admite campos bilingües `*_en`/`*_es` para secciones y FAQ, con validación editorial compartida y selección por locale en el Website.
- El servidor admite convertir canonical y `og:url` relativos en URLs absolutas cuando se configura `PUBLIC_SITE_URL` con un dominio público no local; no convierte el dominio de desarrollo en canonical de producción.

## Funcionalidad preservada

Reservas y cotización por tramo, selección de asientos, rutas y mapas TomTom/Leaflet, login, perfil, permisos Admin, notificaciones internas, GPS foreground del Driver, registro de paquetes y tracking por token.

## Pendientes que impiden el lanzamiento

Proveedor y credenciales de pago, aceptación de evidencia/cámara y GPS background en dispositivos reales, terminal/vehículo/ubicación por evento, proveedores Gmail/WhatsApp/push, dominio SEO final y E2E autenticado por cada rol. La gestión administrativa de autorizaciones de paquetes y la cobertura exhaustiva de cada transición de boleto todavía requieren una iteración específica.

## Evidencia

La revalidación actual de Node/browser pasa (`npm test`), junto con typechecks, builds móviles, browser responsive, cambio EN/ES, transferencia de búsqueda y métricas de mapas. Laravel pasó con **86 pruebas y 610 aserciones** usando PHP 8.3.30 y MySQL de Laragon, incluyendo `WebsiteContentAndRouteImageTest`, `AdminUserSearchTest`, `AdminTicketLifecycleTest`, custodia, caché TomTom y concurrencia. Admin y Driver también pasaron recorridos autenticados combinados a 1440 px después de sembrar el entorno demo. Passenger Mobile y Driver Mobile construyeron APK debug `x86_64`, se instalaron y se lanzaron en `emulator-5554`; con ADB reverse se verificaron la selección contextual/búsqueda de Passenger y en Driver el login, viaje, fallback de mapa, QR, GPS background, outbox GPS y arranque del APK final. La evidencia móvil nueva está en `artifacts/mobile/driver-final-apk-start.png`, `artifacts/mobile/driver-emulator-offline-queued-real.png`, `artifacts/mobile/driver-emulator-camera-qr.png`, `artifacts/mobile/driver-emulator-gps-after-settings.png` y `artifacts/mobile/driver-emulator-custody-top.png`, además de las capturas previas de Passenger. La aceptación móvil completa y las integraciones externas siguen pendientes.

## Revalidación final local — 2026-11-03

PHP 8.3.30 y MySQL de Laragon se ejecutaron mediante rutas explícitas fuera del `PATH`. La suite Laravel más reciente pasó con **86 pruebas y 610 aserciones**. Tras sembrar el entorno demo, la aceptación visual Admin autenticada pasó a 1440 y 390 px y produjo capturas actualizadas de todos los módulos operativos. El estado global permanece `PARTIALLY_COMPLETE` por las dependencias que requieren proveedor, credenciales externas, dispositivo físico o E2E completo por rol.

## Revalidación nativa final — 2026-11-03

Los APK actuales de Passenger Mobile y Driver Mobile terminaron `BUILD SUCCESSFUL` con Gradle/JDK 17, fueron instalados en `emulator-5554` y arrancaron sus actividades reales con `Status: ok`. El log de ambos mostró `ReactNativeJS: Running "main"` y no reportó `FATAL EXCEPTION`. Esto completa la evidencia de compilación, instalación y arranque de las dos apps móviles; no declara completa la aceptación nativa funcional ni cambia la clasificación global `PARTIALLY_COMPLETE`.

La última revalidación corrigió además la limpieza de archivos temporales de evidencia cuando falla una transacción de entrega y amplió el lifecycle terminal de boletos. La suite Laravel terminó con **86 pruebas/610 aserciones**; `npm test` pasó nuevamente con Website, las aplicaciones web, contratos móviles y métricas de mapas. La clasificación permanece `PARTIALLY_COMPLETE` por los bloqueos externos, el dispositivo físico y los recorridos nativos aún no aceptados.

## Revalidación offline Driver Mobile — 2026-11-03

La app Driver ahora puede dejar en cola de forma controlada únicamente el inicio de una carga (`in_progress`) cuando no hay red; muestra que sigue pendiente, reintenta al reconectar y elimina acciones rechazadas sin presentarlas como confirmadas. Entregas con foto y transferencias no se encolan offline. Los contratos y typechecks pasaron. El build Android incremental terminó correctamente y el smoke con Metro cargó el JavaScript actual con arranque real y sin excepción fatal; todavía no se acepta la transición offline completa dentro del emulador y no se eleva el estado global.

## Revalidación Laravel y Admin — 2026-11-04

Con Laragon activo, MySQL respondió en `127.0.0.1:3306` y Laravel terminó **86 pruebas y 610 aserciones PASS** con PHP 8.3.30. El seeder `EncoreTransportDemoSeeder` dejó reproducible el usuario administrador y los datos de aceptación; el login visual pasó sin cambios de seguridad.

La prueba visual autenticada de Admin a 1440 px pasó CMS, navegación por grupos, teclado, sidebar compacta, Expand/Collapse all, rutas, flota, usuarios, clientes, boletos, roles, horarios, paquetería, incidencias y reportes. Reportes validó exportación CSV/JSON y orden persistente del dashboard ejecutivo; los reportes especializados mantienen su presentación tabular. La clasificación continúa `PARTIALLY_COMPLETE` por integraciones externas, dispositivo físico y aceptación nativa/E2E aún pendientes.
