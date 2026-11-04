# Resultados de pruebas — 2026-11-02

## Cierre de coherencia Website — 2026-11-03

- Se unificaron los CTAs, búsquedas recientes, reintentos, selección de ruta y accesos de cuenta del Website con el contrato canónico `button` / `button--primary` / `button--ghost` / `button--with-icon`, conservando la composición editorial existente.
- Se corrigió el cierre prematuro de submenús por hover: el panel ahora tiene una zona de transición y un cierre diferido que permite alcanzar sus opciones con el puntero.
- `npm run test:control-static-contract`: **PASS** — 55 archivos fuente inspeccionados.
- `npm run test:website-navigation`: **PASS** — navegación multipágina, teclado, Escape, idioma y transferencia de búsqueda.
- `npm run test:website-controls-browser`: **PASS** — 19 destinos internos y controles públicos funcionales.
- `npm run test:control-runtime-audit`: **PASS** — 330 controles visibles en 14 rutas, sin controles sin nombre ni destinos vacíos.
- `npm run test:website-deep-visual`: **PASS** — 18 capturas responsive y comprobaciones geométricas.
- `VISUAL_SURFACES=website VISUAL_VIEWPORTS=390,768,1440 npm run test:visual-browser`: **PASS** — 3 capturas browser sin overflow ni errores de página.

## Refinamiento de controles de navegación y reportes Admin — 2026-11-03

- Los disparadores desktop, acordeones móviles y toggle móvil del Website ahora exponen la misma clase base `button`, con overrides específicos para conservar la interacción y geometría del menú.
- Admin Reportes reorganizó la cabecera para que título, vista, rango y exportaciones no compitan en una columna estrecha; se mantiene la selección de reportes, actualización, CSV, JSON y PDF.
- `npm run test:report-charts`, `npm run test:report-exports` y `npm run test:admin-navigation`: **PASS**.

## Revalidación de estándar de controles — 2026-11-03

- `npm run test:control-runtime-audit`: PASS — 330 controles visibles en 14 rutas (`/website`, páginas públicas profundas, `/track-package`, `/package-register`, `/login`, `/driver` y `/admin`); no se detectaron controles sin etiqueta, geometría inutilizable ni destinos vacíos.
- `npm run test:website-pages-browser`: PASS — navegación profunda, refresh, EN/ES y transferencia de búsqueda a Passenger.
- `npm run test:admin-navigation`, `npm run test:report-charts`, `npm run test:package-custody`: PASS.
- Seguimiento: QR de enlace público bajo demanda, responsive y sin incluir datos personales en el contenido del código. La imagen se solicita a QuickChart únicamente al pulsar `Show QR code`; el flujo normal no hace esa petición.
- Admin: reportes ahora exponen acciones agrupadas y coherentes (`Download CSV`, `Download JSON`, `Print / Save PDF`) con iconografía visible y contexto de fecha.

## Normalización de superficies de acceso — 2026-11-03

- Login, cabecera Admin y registro de paquetes adoptan las mismas clases canónicas de control (`button`, `button--primary`, `button--ghost`, `button--icon`, `button--with-icon`) sin retirar sus variantes visuales específicas.
- `npm run test:control-static-contract`, `npm run test:admin-navigation` y `npm run test:visual-contract`: **PASS** después de la normalización.
- `VISUAL_SURFACES=login,admin VISUAL_VIEWPORTS=390,1440 npm run test:visual-browser`: **PASS — 4 checks** sin overflow ni errores de página.

## Cierre de controles y recorridos autenticados — 2026-11-03

- `npm run test:visual-browser` con `VISUAL_SURFACES=passenger,admin,driver` y `VISUAL_VIEWPORTS=1440`: **PASS — 3 checks**. Passenger completó búsqueda, selección de asiento, revisión y creación de reserva; Admin recorrió módulos operativos, reportes, clientes, boletos, paquetería e incidencias; Driver verificó viaje y controles de custodia.
- Se corrigió `EncoreTransportDemoSeeder` para restablecer el viaje demo a `scheduled` y limpiar `started_at`, `completed_at` y `cancelled_at` en cada preparación. La corrida ya no depende de que otra superficie no haya completado previamente el viaje.
- Driver PWA ahora usa `type="button"`, etiquetas explícitas e iconos consistentes en escaneo, carga/descarga, discrepancias, transferencias y manifiestos. Admin usa el mismo estándar en exportación e impresión de reportes.
- Tracking público incorpora QR bajo demanda para compartir únicamente el enlace público; el código no se solicita hasta la acción explícita `Show QR code` y no incluye datos personales.
- `npm test`: **PASS completo** después de estos cambios; la auditoría runtime conserva 330 controles visibles en 14 rutas sin controles sin nombre, geometría inutilizable ni anclas muertas.

## Estandarización adicional de Passenger y Tracking — 2026-11-03

- Passenger ahora usa el contrato visual `button`, `button--primary`, `button--ghost`, `button--with-icon` y `button--tab` en navegación, búsqueda, resultados, asientos, pasajeros, revisión, cuenta e historial. Los pasos de reserva dejaron de ser botones deshabilitados: son indicadores no interactivos con barra de progreso.
- `npm run typecheck:passenger` y `npm run build:passenger`: PASS. La aceptación autenticada Passenger a 1440 px confirmó que el buscador aparece antes de auditar sus controles y que todos los botones visibles tienen `type`, etiqueta accesible y clase canónica.
- Tracking unificó los tres controles de resultado (copiar, QR y refrescar) con iconos, altura utilizable y estados de acción; `npm run test:package-tracking-browser`: PASS. Evidencia visual: `artifacts/visual/package-tracking-qr-390.png`.
- `npm test`: PASS completo incluyendo el nuevo test browser de QR y la auditoría de 330 controles. La corrida conservó 60.47 FPS en la interacción del mapa de contrato; no se cambió la implementación del mapa en esta iteración.

## Nota de alcance de la revalidación actual

PHP 8.3.30 y MySQL de Laragon estaban instalados aunque no estaban en el `PATH`. La suite Laravel se ejecutó con el binario absoluto y la base local activa; las pruebas Node/browser se mantuvieron separadas y complementarias.

## Corrección UX y Website — ejecución más reciente

- `npm run test:website-pages-browser`: PASS; nueve páginas públicas a 390, 768 y 1440 px, búsqueda → Passenger con parámetros, recuperación de la última búsqueda, EN/ES en las nuevas composiciones y capturas de About, Contact y Help.
- `VISUAL_SURFACES=website VISUAL_VIEWPORTS=390,1440 npm run test:visual-browser`: PASS; homepage estática sin selector de ruta y Encore Live con selección explícita, estados vacío/activo y mapa real.
- `npm run test:real-map`, `npm run test:map-runtime`, `npm run test:website-editorial`, `npm run test:seo`: PASS.
- Loader global: validado en capturas sin cubrir el contenido; usa el GIF de marca y se retira antes de que terminen recursos secundarios.

## Reejecución de esta iteración

- Laravel ejecutado en esta revalidación con PHP 8.3.30/MySQL de Laragon: PASS — 84 pruebas, 560 aserciones, 160.35 s.
- `npm test`: PASS, incluida la prueba nueva `test:admin-navigation`.
- Typechecks API/Passenger/Passenger Mobile/Driver Mobile y build Passenger: PASS.
- `npm run test:visual-browser` sin `VISUAL_API_TARGET`: PASS — 36 checks/capturas; la rama autenticada no se activa sin backend de revisión.

- `npm test`: PASS en todas las suites contractuales del repositorio.
- `npm run typecheck:api-client`: PASS.
- `npm run typecheck:passenger`: PASS.
- `npm run typecheck:passenger-mobile`: PASS.
- `npm run typecheck:driver-mobile`: PASS.
- `npm run build:passenger`: PASS.
- La ejecución equivalente fue `C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe artisan test`; cubrió Admin, clientes, ficha por pestañas, ciclo de vida de boletos, custodia, tracking, caché TomTom, permisos, contenido bilingüe y concurrencia.
- `PackageCustodyTest`: PASS — 3 pruebas, 35 aserciones.
- `PackageChainOfCustodyTest`: PASS — 2 pruebas, 30 aserciones; QR, manifiesto reconciliable, escaneo idempotente y transferencia aceptada.
- `AdminUserSearchTest`: PASS — 3 pruebas, 31 aserciones; búsqueda, filtros, paginación server-side entre páginas y detalle administrativo con endpoints autorizados.
- `AdminTicketLifecycleTest`: PASS — 2 pruebas, 11 aserciones; separación de boleto/reserva/pago/abordaje, transición no presentado e invariancia de boleto no utilizado tras finalizar el viaje.
- Browser visual: PASS — 36 checks y capturas en 360, 390, 768, 1024, 1440 y 1920 px.
- Admin autenticado focalizado: PASS — 1 flujo a 1440 px, incluyendo CMS, rutas, horarios, cuentas, clientes paginados, ficha por pestañas, lifecycle de boletos, roles, reportes y paquetería.
- Driver PWA autenticado focalizado: PASS — 1 flujo a 1440 px, incluyendo GPS, custodia y enlace de tracking generado por el backend.
- Encore Live: PASS contractual para polling adaptativo, recuperación de visibilidad/red, interpolación, stale markers y cleanup; WebSocket/SSE no está disponible en el backend local.
- Mobile nativo: Passenger tuvo smoke test real en el AVD `EncoreATD` (`emulator-5554`): APK debug construido para `x86_64`, instalado y lanzado con Metro y Laravel locales; se verificó selección contextual de origen/destino y respuesta honesta de búsqueda sin salidas. Driver Mobile también tiene APK debug `x86_64` construido, instalado y lanzado en el mismo AVD; el login `driver@example.test` / `password` fue aceptado por Laravel y se verificó el panel real con un viaje demo asignado. En la revalidación posterior se concedió cámara y se abrió el escáner QR, se inició el viaje, se concedió ubicación precisa y se activó GPS background con confirmación real de envío a Operaciones. La fotografía de evidencia, la persistencia offline/sincronización y la aceptación en dispositivo físico siguen pendientes.
- Pagos, Gmail, WhatsApp, push y TomTom con credenciales reales: no ejecutados.
- `npm run test:admin-navigation`: PASS; verifica los seis grupos de navegación, permisos declarados, controles ARIA, persistencia y iconos compartidos.
- `npm run test:website-editorial`: PASS; inspecciona el texto visible de las nueve páginas públicas y verifica el guard de copy del CMS.
- CMS editorial Laravel: PASS; `WebsiteContentAndRouteImageTest` cubre rechazo de términos internos y publicación segura.
- Browser sin backend: PASS — 36 checks/capturas en 360, 390, 768, 1024, 1440 y 1920 px.
- Browser autenticado contra `http://127.0.0.1:8000`: PASS en recorridos separados y sembrados con `EncoreTransportDemoSeeder`; Admin 1440 px cubrió CMS, sidebar, rutas, clientes, ficha por pestañas, boletos, roles, horarios, reportes e incidencias; Driver 1440 px cubrió viaje, GPS, paquete e incidencia.
- Revalidación autenticada combinada: PASS — `VISUAL_SURFACES=admin,driver VISUAL_VIEWPORTS=1440` produjo 2 browser checks y capturas después de ordenar Admin antes de Driver para que ambos consuman el mismo viaje demo sin datos inventados.
- Website editorial y visual: PASS; nueve páginas públicas con inglés predeterminado y selector EN/ES probado en navegador, navegación multipágina, búsqueda y transferencia de parámetros a la reserva, 36 capturas responsive y estados vacíos de Live.
- SEO bilingüe: PASS en servidor; `?lang=es` devuelve `lang="es"`, título/descripción en español, canonical por variante y `hreflang` EN/ES/x-default; el dominio absoluto solo se aplica con `PUBLIC_SITE_URL` público.
- CMS bilingüe: PASS — `WebsiteContentAndRouteImageTest` pasó 5 pruebas y 38 aserciones; las variantes `*_en`/`*_es` se validan y el copy interno continúa bloqueado.
- Revisión visual premium: PASS — `test:website-pages-browser` y `test:visual-browser` validan navegación, overflow, menús, responsive y 36 superficies entre 360 y 1920 px; se añadió la constelación de rutas y la barra de progreso inferior sin alterar la transferencia de búsqueda.
- La aceptación móvil completa sigue pendiente aunque ya existe smoke test en AVD para Passenger y Driver. Faltan permisos y recorridos nativos de cámara/GPS/QR/evidencia/offline, además de pagos, Gmail, WhatsApp, push y TomTom con credenciales reales.

## Ejecución posterior — refinamiento visual de Encore Live

- `npm run test:website-pages-browser`: PASS; páginas profundas, refresh, overflow y transferencia de parámetros.
- `$env:VISUAL_VIEWPORTS='390,1440'; npm run test:visual-browser`: PASS; 12 comprobaciones/capturas para Website, Passenger, Driver, Admin, Login y Tracking.
- `npm run test:map-performance-browser`: PASS; primera imagen 37.1 ms, carga completa 122.3 ms, segunda imagen 49 ms, carga completa 76.5 ms, cero errores de tiles y cero URLs duplicadas en el entorno de prueba.
- `git diff --check`: PASS; solo advertencias de normalización CRLF de Git.

La evidencia visual de Live se encuentra en `artifacts/visual/website-live-multipage-1440.png`; las capturas autenticadas actuales de Admin y Driver se encuentran en `artifacts/visual/admin-1440.png` y `artifacts/visual/driver-1440.png`. Passenger conserva su error real de API cuando el proveedor no está configurado y no se rellenó con datos ficticios.

## Revalidación posterior — geometría, inventario y mapa

- `npm test`: PASS; todas las suites Node/Playwright contractuales y browser incluidas en el script terminaron correctamente. El contrato de mapas reconoce la implementación real de caché encapsulada en `tileCache()` y mantiene la exigencia de caché acotada.
- `npm run test:website-pages-browser`: PASS en diez anchos: 320, 360, 375, 390, 414, 768, 1024, 1280, 1440 y 1920 px. Además de overflow, la prueba inspecciona los límites horizontales de hero, secciones, mapa, footer y controles utilizables.
- `npm run test:visual-browser` con `VISUAL_VIEWPORTS=390,1440`: PASS; 12 comprobaciones y capturas para Website, Passenger, Driver, Admin, Login y Tracking.
- `npm run test:map-performance-browser`: PASS; 0 errores de mosaicos y 0 URLs duplicadas. La ejecución actual registró primera imagen de 97.4 ms y carga completa de 341.3 ms en la primera carga; segunda imagen de 31.2 ms y carga completa de 198.7 ms. La interacción medida llegó a 53.08 FPS en el escenario ejecutado.
- Inventario ampliado en `docs/final/SCREEN_INVENTORY.md`; las áreas autenticadas, nativas y de proveedores reales permanecen explícitamente `BLOCKED` o `IN_PROGRESS` cuando no hay entorno de aceptación.
- PHP y MySQL se encontraron mediante rutas instaladas de Laragon y Laravel pasó en esta ejecución; el `PATH` global sigue sin incluirlos, por lo que el comando reproducible debe usar el binario absoluto o configurar ese `PATH`.
- Refinamiento visual posterior: se retiraron índices decorativos repetidos de Home, About, Contact, Help y Paquetería; se conservaron estados reales, etiquetas y la barra de progreso interactiva. El menú desktop también comprueba el movimiento fuera del panel para cerrar de forma consistente.
- `VISUAL_SURFACES=website VISUAL_VIEWPORTS=390,1440 npm run test:visual-browser`: PASS después del cambio, incluyendo apertura por hover, cierre al salir, apertura por clic y cierre con Escape.
- Última corrida `npm test`: PASS; mapa Live en el escenario de browser con primera imagen de 70.8 ms, carga completa de 255.1 ms, segunda imagen de 66.9 ms, carga completa de 191.6 ms, 0 errores de mosaicos, 0 duplicados y 58.06 FPS en la interacción medida.
- Arquitectura CSS: se retiró el import muerto de `apps/website/premium.css` después de rastrear sus consumidores. La regresión de Website, editorial, diseño premium, responsive y visual browser continuó en PASS; ver `docs/final/CSS_ARCHITECTURE_AUDIT.md`.
- Corrida completa posterior a la extracción CSS: `npm test` PASS. El escenario de mapas registró primera imagen a 71.4 ms, carga completa a 234.7 ms, segunda imagen a 63.4 ms, carga completa a 150 ms, 0 errores, 0 URLs duplicadas y 60.12 FPS en la interacción medida.
- Mobile: el AVD `EncoreATD` se inició y ADB lo reconoció como `device`; se instaló JDK 17, se corrigió la configuración de enlace C++ nativo para los ABI y se evitó el límite de ruta de Windows con una unidad corta. Passenger y Driver ejecutaron `assembleDebug` para `x86_64`: PASS; ambos APK se instalaron y lanzaron en `emulator-5554`. La primera carga quedó bloqueada por Metro escuchando solo en IPv6; se corrigió el arranque de Metro con `--host lan`, se conectó ADB reverse para 8081/8000 y las pantallas reales cargaron contra Laravel. Passenger conserva evidencia en `artifacts/mobile/passenger-emulator-final-2.png`, `artifacts/mobile/passenger-emulator-destination.png` y `artifacts/mobile/passenger-emulator-search-2.png`. Driver conserva `artifacts/mobile/driver-emulator-apk-final.png`, `artifacts/mobile/driver-emulator-login-fixed.png`, `artifacts/mobile/driver-emulator-filled.png` y `artifacts/mobile/driver-emulator-auth.png`; la última captura muestra login aceptado y turnos programados. No se declara aceptación nativa completa: faltan conceder y probar cámara/GPS foreground/background, QR, evidencia fotográfica, offline, sincronización, notificaciones y pago.
- Última corrida completa posterior al ajuste de la matriz autenticada: `npm test` PASS; el mapa registró 89.5 ms a primera imagen, 351.3 ms completo, 111 ms a primera imagen en segunda carga, 277.4 ms completo, 0 errores, 0 URLs duplicadas y 44.38 FPS en la interacción medida.

## Revalidación nativa posterior — Driver Mobile

- Se regeneró el fixture con `EncoreTransportDemoSeeder` para que el conductor demo tuviera un viaje programado real (`Georgetown → New Amsterdam`, `2026-11-05 07:00`, viaje `88`).
- El APK debug `x86_64` se reconstruyó con Gradle y JDK 17: `BUILD SUCCESSFUL` (263 tareas, 13 ejecutadas); se instaló en `emulator-5554` y se conectó con `adb reverse` a Laravel/Metro locales.
- Se reprodujo un crash nativo de `react-native-maps` por ausencia de `com.google.android.geo.API_KEY`. Se corrigió con un guard de configuración y un resumen de ruta real; sin clave autorizada la app no monta el mapa nativo ni queda en blanco. La captura aceptada es `artifacts/mobile/driver-emulator-auth-fallback-2.png` y el log posterior no contiene `API key not found` ni `FATAL EXCEPTION`.
- La configuración de una clave autorizada queda preparada mediante `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` y el plugin `react-native-maps` en `apps/driver-mobile/app.config.js` y `apps/passenger-mobile/app.config.js`; no se inventó ni se incluyó una clave.
- Evidencia posterior: `artifacts/mobile/driver-emulator-camera-permission-now.png` (permiso real de cámara), `artifacts/mobile/driver-emulator-camera-qr.png` (escáner QR abierto), `artifacts/mobile/driver-emulator-gps-after-settings.png` (GPS background activo y ubicación enviada a Operaciones) y `artifacts/mobile/driver-emulator-custody-top.png` (controles de custodia visibles).
- Offline GPS: con Laravel detenido, `artifacts/mobile/driver-emulator-offline-queued-real.png` mostró `1 punto(s) GPS pendiente(s) de sincronizar` y no confirmó envío; al restaurar el servidor, el punto se sincronizó y quedó registrado en `driver_locations` para el viaje `88` (`18.0499997, -69.9499964`, `2026-11-02 17:43:11`). La outbox está limitada a 25 puntos reales y no encola transiciones de paquetes ni entregas.
- La interfaz de evidencia ya tiene overlay táctil sobre la cámara, espera `onCameraReady` y maneja `onMountError`; `artifacts/mobile/driver-emulator-delivery-camera.png` prueba la pantalla nativa. La captura efectiva del emulador quedó pendiente porque su cámara no llegó a un estado listo en esa sesión; no se declara validada la carga multipart de fotografía.
- Estado de aceptación: login, viaje asignado, fallback de mapa, permiso/cámara QR, GPS background y outbox GPS aceptados en AVD; mapa nativo interactivo condicionado a una clave Google autorizada; fotografía de entrega multipart, push, pagos y dispositivo físico siguen bloqueados o pendientes.

## Cierre de ejecución — 2026-11-02 14:16

- `npm test`: PASS completo. Incluye navegación Website, páginas profundas, responsive, SEO, contratos de Admin/Driver, Encore Live, rendimiento de mapas y `native-gps-contract`.
- `php artisan test` con PHP 8.3.30/MySQL de Laragon: PASS — 84 pruebas, 560 aserciones, 396.48 s. Incluye búsqueda server-side de clientes, ficha administrativa, lifecycle de boletos, custodia/transferencias, tracking privado, concurrencia, proxy TomTom y permisos.
- `npm run typecheck:driver-mobile`: PASS.
- `npm run test:native-gps`: PASS; verifica outbox GPS acotada, reintento, `onCameraReady` y manejo de error de montaje de cámara.
- APK Driver Mobile final: Gradle `BUILD SUCCESSFUL`, instalado en `emulator-5554` y arranque validado con Metro; la captura `artifacts/mobile/driver-final-apk-start.png` muestra el login real y el log no contiene `FATAL EXCEPTION` ni `API key not found`.
- Rendimiento Live medido en browser: primera imagen 81.3 ms, carga completa 311 ms; segunda imagen 260 ms, carga completa 359.8 ms; 0 errores de mosaicos, 0 URLs duplicadas y 40.19 FPS en la interacción medida.
- El outbox offline verificado corresponde únicamente a posiciones GPS reales; al restablecer Laravel se sincronizó el punto en `driver_locations`. Las transiciones de paquetes no se encolan para evitar confirmaciones duplicadas o falsas.
- Corrección posterior de cámara: el botón de reintento conserva el modo activo (`QR` o `evidencia`) en `apps/driver-mobile/App.tsx`; `npm run typecheck:driver-mobile`, `npm run test:native-gps` y `npm run test:mobile-visual` pasaron. El APK se reconstruyó con Gradle/JDK 17 y quedó en `apps/driver-mobile/android/app/build/outputs/apk/debug/app-debug.apk` (66,751,830 bytes). La captura ADB posterior no pudo obtenerse porque `emulator-5554` dejó la orden de screencap sin respuesta; no se presenta como aceptación visual adicional.

## Auditoría Website — 2026-11-02

- `VISUAL_SURFACES=website VISUAL_VIEWPORTS=390,1440 npm run test:visual-browser`: PASS; el menú móvil abre su acordeón, Escape cierra la navegación, el dropdown desktop permanece seleccionable al cruzar hacia el panel y se cierra al salir del área.
- `npm run test:website-pages-browser`: PASS; nueve páginas públicas, diez anchos, refresh profundo, EN/ES, SEO, búsqueda reciente, transferencia de parámetros a Passenger y apertura por `ArrowDown` con foco dentro del dropdown.
- `npm run test:website-editorial`, `npm run test:seo`, `npm run test:premium-responsive`, `npm run test:visual-contract`, `npm run test:real-map` y `npm run test:map-runtime`: PASS.
- Corrección visual: los mapas públicos ahora usan un fondo de red diseñado y mantienen el estado `Map tiles are still unavailable` cuando el proxy entrega una respuesta sin imágenes. El estado desaparece únicamente después de recibir mosaicos reales.
- Evidencia: `artifacts/visual/website-home-map-state-refined.png`, `artifacts/visual/website-live-multipage-1440.png`, `artifacts/visual/website-navigation-desktop-1440.png` y `artifacts/visual/website-navigation-mobile-390.png`.
- `npm test`: PASS completo después de la corrección; el escenario de mapas registró primera imagen de 77.1 ms, carga completa de 285.4 ms, 0 errores de mosaicos, 0 URLs duplicadas y 44.32 FPS en la interacción medida.
- Ajuste visual final de Trips: la tarjeta `Booking flow` dejó de ser translúcida sobre la diagonal clara del hero; ahora usa una superficie oscura, contraste estable y sombra controlada. Evidencia: `artifacts/visual/website-trips-hero-refined-1440.png`.
- Revalidación posterior al ajuste de Trips: `npm run test:website-pages-browser` PASS y `VISUAL_SURFACES=website VISUAL_VIEWPORTS=390,1440 npm run test:visual-browser` PASS — 2 checks browser y capturas responsive.
- Corrección Admin posterior: Customers ahora renderiza directamente la página filtrada por Laravel con `role=passenger`; se eliminó el filtro sobre `state.users` ya paginado y se preserva el filtro en refresh/disable/update. `npm run test:admin-navigation` y `git diff --check`: PASS.
- Corrección Admin de acabado: se retiraron las pestañas de perfil Security, Preferences, Devices y Activity que solo mostraban `Unavailable` sin endpoints implementados. Se reemplazaron por una barra contextual de Personal information; `npm run test:admin-navigation`: PASS. La aceptación visual autenticada de todos los roles sigue siendo pendiente.
- Corrección del loader Website: el GIF personalizado `assets/media/encore-loader.gif` ahora se sirve como `image/gif` en lugar de `application/octet-stream`; `test:server` verifica el MIME para evitar que `nosniff` bloquee la imagen.
- Corrección Admin de tablas server-side: Users, Customers y Tickets ya no renderizan la búsqueda, selector de filas ni paginación local junto con los controles de Laravel; cada módulo conserva un único filtro/paginador autoritativo. `test:admin-navigation` y `VISUAL_SURFACES=admin VISUAL_VIEWPORTS=1440 npm run test:visual-browser`: PASS; la captura visual quedó limitada a Login porque el entorno browser no tenía sesión Admin configurada.
- Regresión posterior a tablas server-side: `npm test`: PASS completo; el contrato ahora renderiza una tabla local y una server-side para comprobar que los controles de tabla no se mezclan.
- `npm test`: PASS completo después de los últimos ajustes. Rendimiento Live medido en la misma corrida: primera imagen 67.7 ms, carga completa 282.7 ms, 0 errores de mosaicos, 0 URLs duplicadas y 40.18 FPS en la interacción medida.
- `npm test`: PASS completo tras la limpieza de perfil Admin; el contrato confirma que no se renderizan las pestañas Security, Preferences, Devices y Activity sin backend, y que la sección contextual implementada queda visible.
- Corrección transversal de controles Admin: los botones de icono ahora tienen 40×40 px, separación de 10 px entre acciones, bordes/sombras discretos, estados hover/press/focus visibles y ayuda contextual basada en `aria-label`; los encabezados ordenables también tienen un estado interactivo claro.
- Regresión de carga dinámica: se añadió un guard de solicitudes para que un cambio de módulo no pueda sobrescribir una vista más reciente mientras aún termina la carga inicial. La prueba Playwright focalizada en servidor fresco confirmó `ICON_STATE` de 40×40 px con gap de 10 px y abrió el detalle real de la reserva `ET-DEMO-BOOKING` con ruta Georgetown → New Amsterdam.
- Evidencia focalizada: `artifacts/visual/admin-icon-controls-bookings-1440.png`. La corrida visual general autenticada continúa bloqueada antes de las acciones Admin por la condición del mapa; el mapa se mantiene fuera de esta iteración por instrucción explícita.
- Ajuste responsive adicional: en tablas Admin de hasta 650 px la última columna queda sticky, de modo que los botones de acción no quedan fuera de la pantalla aunque el resto de columnas requiera desplazamiento horizontal. Verificado a 390 px (`x=229`, `40×40`, `position: sticky`) y 1440 px sin overflow del documento; evidencia `artifacts/visual/admin-icon-controls-390.png`. También se corrigió la herencia `flex: 1` del encabezado: notificaciones, configuración y acciones iconográficas quedan estrictamente en 40×40 px en móvil.
- Cierre de verificación posterior: `npm test` PASS completo; `test:website-pages-browser` PASS en ejecución aislada y dentro de la suite; `test:admin-navigation`, sintaxis de Admin y `git diff --check` PASS. La medición final del mapa incluida por la suite registró primera imagen en 47.4 ms, carga completa en 372.8 ms, segunda imagen en 18 ms, carga completa en 88.7 ms, 0 errores y 0 URLs duplicadas. La aserción de contrato protege que los botones de notificación/configuración conserven `flex: 0 0 40px` en viewport móvil.
- Limpieza final de perfil Admin: se eliminó la tarjeta no implementada de dispositivos conectados y se reemplazó por un resumen de sesión autenticada basado en el usuario actual. `test:admin-navigation` confirma que no queda una superficie que anuncie un endpoint de sesiones inexistente.
- Revalidación posterior a perfil: `npm test` PASS completo; páginas browser, responsive, SEO, contratos móviles y rendimiento terminaron correctamente. En la última medición, el mapa de prueba registró 23.5 ms a primera imagen, 96.7 ms completo, 0 errores de mosaicos, 0 URLs duplicadas y 60.75 FPS en la interacción medida.
- Validación de aplicaciones: `typecheck:passenger-mobile`, `typecheck:driver-mobile`, `typecheck:passenger` y `build:passenger` PASS. Passenger Web produjo el bundle de producción sin errores.
- Aceptación autenticada Admin reejecutada contra Laravel/MySQL local con `EncoreTransportDemoSeeder`: `VISUAL_SURFACES=admin VISUAL_VIEWPORTS=1440 npm run test:visual-browser` PASS; recorrió CMS, rutas, vehículos, conductores, viajes, usuarios, clientes server-side, boletos, roles, horarios, reportes, paquetería e incidencias, con mutaciones reales y capturas. La misma superficie a 390 px también pasó el control de overflow y carga. El prerrequisito de mapa quedó opt-in (`VISUAL_REQUIRE_MAP=1`) para que la aceptación de Admin no dependa de un proveedor externo; los contratos de mapa permanecen separados.
- Revalidación final de Admin: `VISUAL_SURFACES=admin VISUAL_VIEWPORTS=1440 npm run test:visual-browser` PASS después de añadir una aserción que bloquea cualquier solicitud a `/api/v1/admin/users/undefined` durante el cambio de pestañas. La ejecución volvió a recorrer la ficha administrativa con endpoints reales y generó capturas autenticadas.
- Suite completa posterior: `npm test` PASS; también pasaron `test:admin-navigation`, las comprobaciones de sintaxis de Admin/Playwright y `git diff --check` (solo avisos de normalización CRLF de Git).
- Corrección móvil de legibilidad: Passenger Mobile y Driver Mobile ya aplican un token `bodyText` a fechas, estados, referencias, importes y resúmenes que viven sobre superficies oscuras; se eliminó el color negro por defecto de React Native. `typecheck:passenger-mobile`, `typecheck:driver-mobile` y `test:mobile-visual` PASS. La reconstrucción Gradle se reintentó con `GRADLE_USER_HOME`/`TEMP` en rutas cortas: el wrapper y el bundle JS se generaron, pero `assembleDebug` quedó detenido varios minutos en `checkDebugAarMetadata` y se canceló sin sobrescribir los APK/AVD previamente aceptados; no se declara aceptación nativa nueva.
- `npm test` posterior a la corrección móvil: PASS completo; `test:mobile-visual` volvió a pasar y el escenario de mapas independiente registró 27.7 ms a primera imagen, 103 ms de carga completa, 0 errores de mosaicos y 61.78 FPS en la interacción medida.
- Driver Mobile ahora consulta el estado de red y bloquea registrar/consultar/transicionar custodia, manifiestos, discrepancias y transferencias cuando no hay conexión; el GPS conserva su outbox limitada y la evidencia local no se presenta como entrega confirmada. `npm run typecheck:driver-mobile`, `npm run test:native-gps` y `npm run test:mobile-visual`: PASS. `npm install --package-lock-only --ignore-scripts`: PASS.
- `npm test` posterior al guard offline de Driver: PASS completo; la medición independiente de mapa registró 31 ms a primera imagen, 103.5 ms de carga completa y 59.49 FPS en la interacción medida.

## Auditoría visual profunda del Website — 2026-11-03

- `npm run test:website-deep-visual`: PASS; 18 capturas reales y comprobaciones de geometría para Inicio, Rutas, Viajes, Paquetería, Servicios, Encore Live, Nosotros, Contacto y Ayuda en 390 y 768 px.
- Corrección aplicada: los submenús móviles ahora separan visualmente el nombre de cada destino y su descripción, mantienen objetivos táctiles claros y conservan el acordeón accesible.
- Corrección aplicada: el indicador de estado y el CTA de `Network layer` pasan a filas independientes para evitar solapamiento en escritorio y móvil.
- `npm run test:website-pages-browser`: PASS después de los ajustes; nueve páginas públicas, diez anchos, refresh profundo, EN/ES, FAQ y transferencia de parámetros.
- `$env:VISUAL_SURFACES='website'; $env:VISUAL_VIEWPORTS='390,1440'; node tests/visual-browser.test.mjs`: PASS; navegación por hover, clic, teclado, Escape y barra de progreso inferior.
- Evidencia móvil profunda: `artifacts/visual/website-home-390-deep.png`, `website-routes-390-deep.png`, `website-trips-390-deep.png`, `website-packages-390-deep.png`, `website-live-390-deep.png`, `website-contact-390-deep.png` y `website-help-390-deep.png`.
- `npm test`: PASS completo después de integrar la auditoría visual profunda; también pasaron `test:admin-navigation`, `typecheck:passenger-mobile`, `typecheck:driver-mobile` y `git diff --check` (solo avisos de normalización CRLF de Git).

## Revalidación funcional y Admin autenticado — 2026-11-03

- La suite Laravel se ejecutó con PHP 8.3.30 de `C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64` y MySQL local en `127.0.0.1:3306`: **84 pruebas y 560 aserciones PASS** en 99.25 s.
- La ejecución cubrió usuarios server-side y ficha por pestañas, ciclo de vida de boletos, pagos fallidos/reintentos, concurrencia de asientos, custodia QR/manifiestos/transferencias, entrega con evidencia privada, privacidad de tracking/notificaciones, permisos, caché/Etag del proxy TomTom y contenido bilingüe.
- Se sembró el entorno local reproducible mediante `EncoreTransportDemoSeeder` y se ejecutó `VISUAL_SURFACES=admin VISUAL_VIEWPORTS=1440,390 VISUAL_API_TARGET=http://127.0.0.1:8000 npm run test:visual-browser`: PASS en ambos anchos, con mutaciones reales de CMS, rutas, flota, usuarios, clientes, boletos, roles, horarios, reportes, paquetería e incidencias.
- La preparación quedó automatizada en `npm run prepare:visual-demo`; busca `PHP_BINARY`, `php` en `PATH` o PHP 8.3.30 de Laragon y ejecuta el seeder idempotente sin saltarse el login ni crear un usuario alternativo.
- La corrida visual integrada `VISUAL_VIEWPORTS=1440,390 VISUAL_API_TARGET=http://127.0.0.1:8000 npm run test:visual-browser` pasó 12 checks para Website, Passenger, Admin, Driver, Login y Tracking en ambos anchos. Admin y Driver ejecutaron sus recorridos autenticados sobre Laravel local; Website, Passenger y Tracking conservaron sus estados reales de API.
- `npm run validate:backend`: PASS con 128 rutas registradas, migraciones al día, Swagger regenerado y 84 pruebas/560 aserciones.
- `npm run validate:frontend`: PASS; `npm test`, typecheck de API/Passenger y `build:passenger` terminaron correctamente. La medición final de mapas registró primera imagen en 31.8 ms, carga completa en 119.9 ms, segunda imagen en 111.7 ms, 0 errores de mosaicos, 0 URLs duplicadas y 61.61 FPS en interacción.
- La ejecución autenticada generó evidencia en `artifacts/visual/admin-*.png`; no se habilitó la comprobación estricta del mapa porque el proveedor de mosaicos sigue separado de la aceptación de módulos.

## Revalidación nativa final — 2026-11-03

- Se reconstruyeron los APK debug actuales de Passenger Mobile y Driver Mobile usando Gradle/JDK 17 y una unidad de trabajo corta para evitar el límite de rutas de Windows. Ambos terminaron con `BUILD SUCCESSFUL`.
- Artefactos generados: `apps/passenger-mobile/android/app/build/outputs/apk/debug/app-debug.apk` (170,614,990 bytes) y `apps/driver-mobile/android/app/build/outputs/apk/debug/app-debug.apk` (176,369,299 bytes).
- Ambos APK se instalaron en `emulator-5554` con `adb install -r` y arrancaron con `am start -W` devolviendo `Status: ok` para sus actividades reales.
- El log de arranque mostró `ReactNativeJS: Running "main"` en Passenger y Driver; no hubo `FATAL EXCEPTION` ni `AndroidRuntime: FATAL`. Permanece únicamente la advertencia conocida de `SafeAreaView` deprecado.
- Esto confirma build, instalación y arranque nativo de ambos productos; no sustituye la aceptación de dispositivo físico, cámara/GPS bajo permisos reales, fotografía multipart, custodia offline, push, pagos ni mapas con una clave Google autorizada.

## Revalidación de custodia transaccional — 2026-11-03

- Se corrigió `PackageController::updateStatus`: una foto de entrega almacenada durante una transacción ahora se elimina si falla el guardado del paquete o de su evento; los reintentos idempotentes no crean una foto nueva cuando el estado ya coincide.
- La prueba nueva fuerza un fallo de persistencia y verifica estado `in_progress`, dos eventos y cero archivos en `package-deliveries`.
- `php artisan test`: **85 pruebas y 566 aserciones PASS**.

`npm test` volvió a pasar después de esta corrección: contratos de custodia, Website profundo, responsive, SEO, mobile visual, Admin navigation y rendimiento de mapas. La medición de esta corrida registró 25.9 ms a primera imagen, 133.3 ms de carga completa en el primer mapa, 48.7 ms a primera imagen en la segunda carga, 0 errores de tiles, 0 URLs duplicadas y 62.3 FPS en la interacción medida.

## Revalidación del lifecycle de boletos — 2026-11-03

- `AdminTicketLifecycleTest`: 3 pruebas y 55 aserciones PASS.
- Se verificaron individualmente `no_show`, `expired`, `cancelled` y `refunded`, con filtro server-side, detalle/historial, reserva confirmada conservada y pago cambiado a `refunded` únicamente en el último caso.
- La regla de `expired` rechazó implícitamente una fecha futura y la prueba existente confirmó que un viaje terminado no marca automáticamente el boleto como utilizado ni abordado.

La corrida completa posterior a la ampliación del lifecycle terminó con **86 pruebas y 610 aserciones PASS**.

`npm run validate:backend` también pasó usando el nuevo autodetector `scripts/validate-backend.mjs`: limpió cachés, confirmó 128 rutas, migraciones al día, regeneró Swagger y terminó con 86 pruebas/610 aserciones sin requerir PHP en `PATH`.

## Revalidación de offline Driver Mobile — 2026-11-03

- Driver Mobile ahora conserva una outbox local acotada únicamente para marcar una carga como `in_progress` cuando la red falla. El estado se presenta como pendiente, nunca como confirmado, y se reintenta contra Laravel al recuperar conectividad.
- Entrega con fotografía, transferencias y cualquier operación que requiera evidencia permanecen bloqueadas sin red; una acción rechazada por el backend se elimina de la outbox y se informa como no confirmada.
- `npm run typecheck:driver-mobile`, `npm run test:mobile-visual` y `npm run test:native-gps`: PASS después de esta implementación.
- `assembleDebug --no-daemon` terminó `BUILD SUCCESSFUL` con Gradle/JDK 17 usando la unidad de trabajo corta. El APK debug quedó disponible en `apps/driver-mobile/android/app/build/outputs/apk/debug/app-debug.apk`; como la modificación es JavaScript y las tareas Android fueron incrementales, el APK no se presenta como evidencia de bundle nuevo.
- Se repitió el smoke con Metro cargando el código JavaScript actual: instalación ADB correcta, `am start -W` devolvió `Status: ok`, el árbol UI mostró la pantalla real de acceso del conductor y `ReactNativeJS: Running "main"` apareció sin `FATAL EXCEPTION`. No se presenta como aceptación funcional completa de la outbox porque no se ejecutó todavía una transición de carga offline dentro del emulador.

## Revalidación automatizada de outbox de custodia — 2026-11-03

- La lógica de outbox se extrajo a `apps/driver-mobile/custody-outbox.mjs` para que la política sea testeable sin sustituirla por regex: solo permite `in_progress`, deduplica por paquete, limita el tamaño, conserva intentos ante 503/timeout, sincroniza respuestas aceptadas y elimina respuestas terminales rechazadas.
- `npm run test:driver-custody-outbox`: PASS; probó almacenamiento persistido en memoria, deduplicación, fallo de red, reanudación con token y rechazo 422 sin dejar una confirmación local.

## Corrección de navegación Website — 2026-11-03

- El dropdown de escritorio dejó de tener una separación física de 4 px respecto a su disparador. Esa ranura hacía que el menú pudiera desaparecer al bajar el cursor hacia una opción.
- El panel ahora toca el área del botón y la prueba browser verifica su geometría (`panelTop <= buttonBottom + 1`) antes de seleccionar una opción.
- `npm run test:website-pages-browser`: PASS; el enlace se mantiene visible y seleccionable al cruzar desde el botón hacia el panel.
- `npm test`: PASS completo después de integrar la prueba funcional de outbox y la regresión geométrica del dropdown; la corrida incluyó 18 capturas responsive, contratos móviles, SEO, accesibilidad y métricas de mapa.

## Cierre visual de controles y superficies — 2026-11-03

- `npm run test:website-pages-browser`: PASS; páginas profundas, refresh y transferencia de parámetros al Passenger.
- `npm run test:website-deep-visual`: PASS; 18 capturas responsive con comprobaciones de geometría.
- `npm run test:control-runtime-audit`: PASS; 330 controles visibles en 14 rutas.

## Auditoría funcional pública de controles — 2026-11-03

- `npm run test:website-controls-browser`: PASS; recorrió las nueve páginas públicas, validó etiquetas y `type` explícitos de botones, 19 destinos internos con respuesta HTTP válida y ejercitó navegación desktop/móvil, intercambio de origen/destino, limpieza de rutas, pestañas de paquetería, FAQ y enlaces de siguiente paso.
- El intercambio de búsqueda ahora sólo se ejecuta cuando existe el trayecto inverso publicado; si no existe, conserva la selección y comunica el motivo en lugar de borrar el destino.
- `npm test --silent`: PASS completo después de integrar la auditoría funcional pública; contratos de backend/custodia, Website, móviles, SEO, responsive y rendimiento existentes permanecen verdes.

## Revalidación autenticada de controles Admin — 2026-11-03

- `npm run prepare:visual-demo` ejecutado antes del recorrido para restablecer datos reproducibles.
- `VISUAL_API_TARGET=http://127.0.0.1:8000 VISUAL_SURFACES=admin VISUAL_VIEWPORTS=1440,390 npm run test:visual-browser --silent`: PASS en ambas resoluciones.
- Se recorrieron CMS, rutas, flota, conductores, viajes, usuarios, clientes, boletos, roles, horarios, reportes, paquetería e incidencias con mutaciones reales.
- Las pestañas de ficha de usuario ahora exponen `role="tab"`, `aria-selected` y tokens visuales canónicos; “Mark all read” usa icono, etiqueta y estado disabled coherentes.
- `npm run test:visual-browser`: PASS; 36 verificaciones y capturas en Website, Passenger, Admin, Driver, Login y Tracking a 360/390/768/1024/1440/1920 px.
- Se estandarizaron los controles globales de navegación Admin y actualización de reportes con icono, etiqueta visible, `type="button"` y tokens de tamaño compartidos.
- `node --check` para Admin, Website, Tracking y Driver PWA: PASS. `git diff --check`: sin errores de contenido; sólo avisos de normalización LF/CRLF del entorno.

## Mejora funcional del directorio de rutas — 2026-11-03

- La búsqueda de rutas ahora incluye `Clear search`, con estado visible sólo cuando existe una consulta, foco devuelto al campo y traducción EN/ES.
- Se corrigió una colisión CSS en la que `.btn` podía anular el atributo HTML `hidden` y mostrar un control sin función disponible.
- `npm run test:website-pages-browser`: PASS; filtrado, limpieza, navegación profunda, FAQ, idioma y transferencia al Passenger.
- `npm run test:website-deep-visual`: PASS; 18 capturas responsive sin overflow ni controles inutilizables.
- `npm run test:control-runtime-audit`: PASS; 330 controles visibles en 14 rutas.

## Normalización final de controles públicos — 2026-11-03

- Los campos de fecha y pasajeros del Website exponen nombres accesibles estables y coherentes en la portada y en la búsqueda de viajes; el selector EN/ES actualiza idioma, copy y SEO de la página.
- El flujo interactivo de paquetería declara `tablist`, `tab`, `tabpanel`, `aria-controls` y navegación con flechas; el panel sigue el paso seleccionado sin perder su acción real.
- `npm run test:website-controls-browser`: PASS; cubre idioma EN/ES, nombres accesibles, menús, swap seguro, limpieza de rutas, tabs de paquetería, FAQ y 16 destinos internos válidos en esta corrida.
- `npm run test:admin-navigation`: PASS; diálogos, estados de error, logout y refresh del Admin declaran `type` explícito para evitar submits accidentales; la comprobación estática cubre `app.mjs` y `views.mjs`.
- La aceptación autenticada Admin volvió a pasar en 1440 px y 390 px con el seeder reproducible; filtros, búsqueda de usuarios/clientes, alta de usuario y agenda muestran el componente de acción con icono y etiqueta, y los reportes conservaron sus exportaciones con icono.
## Revalidación final de controles y Website — 2026-11-03

- `npm test --silent`: PASS completo después de la normalización de tipos, iconos y nombres accesibles.
- `npm run build:passenger`: PASS; build de producción generado correctamente.
- `npm run test:control-static-contract`: PASS; 55 archivos fuente inspeccionados.
- `npm run test:website-pages-browser`: PASS; páginas profundas, refresh y transferencia Website → Passenger.
- `npm run test:website-deep-visual`: PASS; 18 capturas responsive y comprobaciones de geometría.
- `npm run test:package-tracking-browser`: PASS; QR y acciones de Tracking.
- La suite registró 330 controles visibles en 14 rutas y rendimiento medido cercano a 60 FPS durante la interacción del mapa. Esta métrica no sustituye la aceptación en dispositivos físicos.
## Corrección final de estados de acción e idioma — 2026-11-03

- El buscador Website ahora actualiza únicamente la etiqueta visible del botón durante la navegación a resultados; el SVG no se destruye al mostrar `Opening departures…`/`Abriendo salidas…`.
- El acceso de cuenta usa el icono compartido de usuario desde el primer render, antes de resolver la sesión.
- El menú móvil conserva etiquetas accesibles localizadas al alternar EN/ES.
- `npm run test:website-controls-browser`: PASS; 19 destinos internos y contratos públicos verificados.
- `npm run test:control-static-contract`: PASS; la regresión confirma que no se muta `submit.lastChild` y que el icono de cuenta es compartido.
- `npm test --silent`: PASS completo; la medición browser registró 60.42 FPS, cero errores de mosaicos y cero URLs duplicadas en la interacción validada.
- La prueba pública ahora incluye un fixture de una ruta y un bus autorizados: selecciona la ruta en Encore Live, verifica el estado de señal y selecciona el bus real en el listado/mapa.
- `npm run test:package-register-browser`: PASS; registro de encomienda con viaje activo, estado de carga sin perder icono, tracking token y copia del enlace.

## Matriz dinámica de controles públicos — 2026-11-03

- `npm run test:website-controls-browser`: PASS tras la ampliación; generó `artifacts/control-audit/website-button-matrix.json` con 48 filas verificadas.
- La matriz registra el mecanismo de cada botón visible, incluidos navegación desktop, formularios, intercambio de origen/destino, tabs de paquetería, limpieza y restauración de búsquedas, recuperación de errores y selección de ruta/unidad en Encore Live.
- La corrida completa posterior terminó PASS: 330 controles en 14 rutas, QR/Tracking, Package Register, contratos móviles y Admin/Driver. La medición browser de mapas registró 59.51 FPS en interacción, 0 errores de mosaicos y 0 URLs duplicadas.

## Aceptación autenticada y matriz por rol — 2026-11-03

- `VISUAL_API_TARGET=http://127.0.0.1:8000 VISUAL_SURFACES=passenger,admin,driver VISUAL_VIEWPORTS=1440,390 npm run test:visual-browser`: PASS; 6 comprobaciones autenticadas completadas sobre Laravel/MySQL local con datos del seeder reproducible.
- Passenger verificó búsqueda, selección de salida, asientos, pasajeros, pago/boleto y acciones de cuenta; Admin verificó módulos operativos, clientes, ficha de usuario, boletos, reportes y paquetería; Driver verificó viaje, GPS, QR, encomienda, custodia e incidencia.
- La matriz machine-readable quedó en `artifacts/control-audit/authenticated-control-matrix.json` con 201 filas diferenciadas por viewport. Incluye aplicación, pantalla, control, propósito, destino, permisos, estado y evidencia; 123 filas corresponden a clics observados en la sesión autenticada.
- El entorno usó MySQL local en el puerto alternativo 3307 porque el 3306 estaba ocupado por un proceso PostgreSQL ajeno; no se alteró ese proceso ni la autenticación.

## Estandarización final de Tracking/QR — 2026-11-03

- Tracking ahora consume los iconos desde `packages/shared/icons.mjs`, igual que Admin y las superficies operativas; se eliminó la variante local que producía trazos y tamaños distintos.
- El QR público se genera sólo al solicitarlo, expone `aria-controls`/`aria-expanded`, permite mostrar/ocultar el panel y comunica `cargando`, `listo` o `proveedor no disponible` sin inventar datos.
- Se corrigió el ocultamiento CSS del panel con `.tracking-qr[hidden] { display:none; }`, evitando que el panel siguiera ocupando espacio aunque el estado HTML fuera oculto.
- `npm test --silent`: PASS; `test:package-tracking-browser`, `test:package-register-browser` y `test:control-static-contract`: PASS.

## Cierre de fuente única de iconos — 2026-11-03

- Admin dejó de mantener un catálogo local duplicado: `apps/admin-dashboard/src/views.mjs` importa y reexporta `packages/shared/icons.mjs`; reportes, tablas, navegación y acciones de ficha reciben el mismo SVG y geometría.
- `npm test --silent`: PASS tras la extracción; `test:admin-navigation`, `test:control-static-contract`, `test:website-deep-visual`, `test:website-controls-browser`, `test:control-runtime-audit`, Tracking QR y Package Register permanecen PASS.
- La corrida final auditó 330 controles visibles en 14 rutas, 18 capturas responsive del Website, 19 destinos internos válidos y 55 archivos de contratos estáticos.
- Métrica browser de mapa de esta corrida: primera imagen 27.8 ms, carga completa 107.1 ms, segunda carga completa 29.7 ms, 62.18 FPS de interacción, 0 errores de mosaicos y 0 URLs duplicadas.

## Revalidación pública posterior — 2026-11-04

- `npm run test:website-pages-browser`: PASS; las nueve páginas públicas cargaron, conservaron refresh profundo y transfirieron los parámetros de búsqueda al Passenger.
- `npm run test:website-controls-browser`: PASS; 19 destinos internos y los controles públicos de menús, búsqueda, búsquedas recientes, rutas, paquetería, FAQ y Encore Live fueron ejercitados.
- `npm run test:control-runtime-audit`: PASS; 330 controles visibles en 14 rutas, con etiquetas, tipos explícitos, destinos y geometría utilizable.
- `npm run test:website-deep-visual`: PASS; 18 capturas responsive y comprobaciones de márgenes/overflow.
- `npm run test:seo`, `npm run test:premium-design`, `npm run test:premium-responsive` y `npm run test:visual-contract`: PASS.
- La matriz pública fue regenerada en `artifacts/control-audit/website-button-matrix.json`. El QR público continúa siendo generado bajo demanda mediante QuickChart, con estados de carga, éxito y error recuperable.
- El servicio Laravel en `127.0.0.1:8000` no estaba escuchando durante esta corrida; por ello esta revalidación no sustituye la aceptación autenticada de Admin ni las pruebas de proveedor/dispositivo.

## Contrato visual computado de controles — 2026-11-04

- Se añadió `npm run test:website-control-visual`, que inspecciona estilos computados en las nueve páginas públicas a 390, 768 y 1440 px.
- La primera ejecución detectó que el CTA `Plan a trip` del footer tenía sólo 24 px de alto y que las pestañas `Prepare / Hand over / Follow` de Paquetería no alcanzaban el objetivo táctil de 36 px.
- Se corrigió el CTA del footer con el contrato canónico `.button button--primary button--with-icon` y se transformaron las pestañas de Paquetería en controles pill de 42 px, con estados hover/focus/active claros.
- La segunda ejecución pasó: 27 combinaciones de página/ancho y 7 firmas visuales estables; `test:control-static-contract`, `test:website-controls-browser` y `test:website-deep-visual` permanecen PASS.
- `npm test --silent`: PASS completo después de integrar este contrato visual en la cadena principal.

## Unificación cross-surface de controles — 2026-11-04

- Se centralizó el radio de los controles canónicos en `--et-radius-control: 12px` para Website, Passenger, Auth, Tracking, Admin, Driver y Package Register. Las cápsulas de navegación, badges, estados y el control circular de intercambio permanecen como variantes contextuales explícitas.
- Package Register ahora carga la base compartida de estilos y tokens antes de su hoja local; ya no depende de una clase `.button` sin geometría base.
- `npm run test:control-cross-surface-visual`: PASS; 38 controles canónicos en 7 superficies y 2 viewports comparten `12px`, `border-box`, etiqueta y altura mínima de 40 px.
- La regresión de Website, Tracking, Package Register, contratos estáticos y 18 capturas responsive permaneció PASS después de la unificación.

## Suite completa posterior a la unificación — 2026-11-04

- `npm test --silent`: PASS completo después de centralizar los tokens visuales y corregir la condición de carrera del registro de paquetes; todas las pruebas browser, contratos estáticos, móviles, SEO, responsive y rendimiento terminaron con código 0.
- `npm run test:control-cross-surface-visual`: PASS; 38 controles canónicos en 7 superficies y 2 viewports.
- `npm run test:control-runtime-audit`: PASS; 330 controles visibles en 14 rutas. `npm run test:website-controls-browser`: PASS; 19 destinos internos y contratos públicos.
- La misma prueba generó `artifacts/control-audit/website-control-inventory.json` con 597 filas públicas y columnas de aplicación, pantalla, control, propósito, destino, permisos, estado y prueba; incluye controles inicialmente ocultos de menús y disclosures.
- `npm run test:website-deep-visual`: PASS; 18 capturas responsive. `npm run test:website-control-visual`: PASS; 9 páginas × 3 viewports y 7 firmas estables.
- Rendimiento del mapa en esta corrida: primera imagen 28.7 ms, carga completa 101.4 ms, segunda carga completa 35.8 ms, 59.88 FPS, 0 errores de mosaicos y 0 URLs duplicadas.
- `git diff --check`: PASS; sólo se informaron advertencias normales de conversión LF/CRLF de Git.

## Inventario público ampliado — 2026-11-04

- Tras incorporar la matriz de 597 controles y las pruebas de hover, teclado, Escape, clic exterior, FAQ y disclosures del footer, `npm test --silent` volvió a terminar PASS.
- La corrida final mantuvo `test:website-controls-browser`, `test:control-cross-surface-visual`, `test:control-runtime-audit` y `test:control-static-contract` en PASS.
- Métrica del mapa en la misma corrida: primera imagen 30.5 ms, carga completa 534.1 ms, segunda carga completa 113.4 ms, 60.75 FPS durante la interacción, 0 errores de mosaicos y 0 URLs duplicadas. La latencia de primera carga debe repetirse con el proveedor TomTom real antes de fijar un presupuesto productivo.
- El control de selección de unidad en Encore Live también quedó dentro del estándar: mínimo táctil de 40 px, radio `12px` y `border-box`; su geometría fue comprobada al seleccionar una unidad real del fixture.

## Revalidación Laravel y Admin autenticado con Laragon — 2026-11-04

- MySQL de Laragon quedó disponible en `127.0.0.1:3306`; `php artisan optimize:clear` y `php artisan migrate:status` terminaron correctamente con todas las migraciones aplicadas.
- `php artisan test --no-ansi`: PASS completo, **86 pruebas y 610 aserciones** en 44.89 s. La corrida cubrió búsquedas server-side, ficha de usuario, lifecycle de boletos, pagos fail-closed, concurrencia, custodia, privacidad de tracking, caché TomTom y reportes.
- `npm run prepare:visual-demo --silent`: PASS; el seeder idempotente preparó el usuario administrador y los registros de aceptación sin relajar autenticación.
- `VISUAL_API_TARGET=http://127.0.0.1:8000 VISUAL_SURFACES=admin VISUAL_VIEWPORTS=1440 npm run test:visual-browser --silent`: PASS. Se verificaron grupos de navegación, teclado, sidebar compacta, Collapse/Expand all, CMS, rutas, flota, usuarios, clientes, boletos, roles, horarios, paquetería, incidencias y reportes.
- La evidencia de reportes incluye descarga CSV/JSON y reordenamiento persistente de widgets del dashboard ejecutivo. Los informes especializados siguen mostrando tablas enfocadas; la prueba cambia explícitamente al dashboard ejecutivo antes de validar widgets reordenables.
- El primer intento de login devolvió `422` antes de sembrar el entorno demo; tras ejecutar el seeder reproducible el login pasó. No se modificó la política de autenticación.

## Verificación adicional del buscador de Viajes — 2026-11-04

- `npm run test:website-controls-browser --silent`: PASS; la matriz dinámica subió a **49 acciones ejercitadas** y mantiene **597 controles inventariados**.
- El formulario propio de `/website/trips/` ahora se somete en browser con origen, destino, fecha y pasajeros, y se comprueba que los cuatro parámetros lleguen intactos a Passenger.
- Se generó `artifacts/control-audit/website-control-coverage.json` con 16 comportamientos requeridos y sus pantallas/evidencias, separando existencia del control de interacción realmente ejercitada.

## Normalización de cabecera pública — 2026-11-04

- Los disparadores del menú desktop, el selector EN/ES y los accesos de cuenta comparten ahora 40 px, `border-box` y radio canónico `12px`; el menú móvil conserva su variante táctil ampliada.
- `test:website-pages-browser`, `test:website-control-visual`, `test:control-cross-surface-visual` y `test:website-controls-browser`: PASS después del ajuste.

## Suite completa posterior a la normalización del header — 2026-11-04

- `npm test --silent`: PASS completo. Pasaron Website, Admin, Passenger, Driver, Tracking/QR, Package Register, contratos móviles, SEO, responsive, accesibilidad y rendimiento.
- La cobertura pública vigente conserva 597 controles inventariados, 49 acciones ejercitadas y 16 comportamientos con evidencia en `website-control-coverage.json`.
- Rendimiento browser de mapas en esta corrida: primera imagen 34.8 ms, primera carga completa 539.9 ms, segunda imagen 13.1 ms, segunda carga completa 71.5 ms, 61.37 FPS, cero errores de mosaicos y cero URLs duplicadas.
- `git diff --check`: PASS; las únicas advertencias son conversiones normales LF/CRLF de Git.

## Rediseño de footer público — 2026-11-04

- El footer del Website fue reorganizado en una composición de cierre única: marca y ayuda real, mapa del sitio, servicios, CTA de siguiente paso y disclosures legales.
- Se mantuvieron únicamente destinos existentes (`/website/contact/`, `/website/trips/`, `/website/routes/`, `/website/live/`, `/website/packages/`, `/track-package/` y `/website/help/`); no se añadieron correos ni redes sociales ficticias.
- El nuevo bloque conserva EN/ES, foco visible, lectura por teclado, enlaces reales y responsive en 390, 768 y 1440 px.
- `npm run test:website-pages-browser --silent`: PASS; `npm run test:website-deep-visual --silent`: PASS; `npm run test:website-control-visual --silent`: PASS (9 páginas × 3 viewports); `npm run test:website-controls-browser --silent`: PASS.
- Captura posterior: `artifacts/visual/website-home-multipage-1440.png`.

## Suite completa posterior al footer — 2026-11-04

- `npm test --silent`: PASS completo después de conservar el acceso discreto de personal dentro del nuevo footer.
- La auditoría runtime actual registró **336 controles visibles en 14 rutas**; el aumento corresponde a los enlaces adicionales del footer y no a controles huérfanos.
- El inventario público actualizado contiene **606 filas**, 49 acciones ejercitadas y 16 comportamientos con evidencia.
- `test:website-pages-browser`, `test:website-deep-visual`, `test:website-control-visual`, `test:website-controls-browser`, `test:control-cross-surface-visual` y `test:control-static-contract`: PASS.

## Loader de marca y claridad de Reportes — 2026-11-03

- Passenger, Admin y Driver dejaron de mostrar el spinner/tarjeta genérica de arranque y utilizan el GIF corporativo `assets/media/encore-loader.gif`, con texto de estado, anuncio para tecnologías asistivas y tratamiento `prefers-reduced-motion`. Website conserva el mismo recurso como loader global.
- `npm run test:brand-loader --silent`: **PASS**; el contrato comprueba el uso común del recurso y evita la regresión a los selectores de spinner genéricos.
- `npm run typecheck:passenger --silent`, `npm run typecheck:driver-mobile --silent`, `npm run test:mobile-visual --silent` y `npm run build:passenger --silent`: **PASS**.
- Reportes ahora explicita el rango de actividad seleccionado, separa visualmente los próximos viajes de ese rango y muestra estados vacíos diseñados cuando no existe actividad o facturación, en lugar de gráficas planas que podían confundirse con datos reales. `test:report-charts` y `test:report-exports`: **PASS**.
- La corrida completa posterior a este ajuste queda pendiente de registrar en la siguiente sección; no se declara aceptación de proveedores externos, dispositivos físicos ni producción.

## Cierre de validación posterior al loader — 2026-11-04

- `npm test --silent`: **PASS completo** después de incorporar el contrato del loader y los estados vacíos de Reportes. La corrida confirmó Website, Admin, Passenger, Driver, Tracking/QR, Package Register, contratos móviles, SEO, responsive y mapas.
- `npm run prepare:visual-demo --silent`: **PASS** con Laragon/PHP 8.3.30; el seeder dejó datos de aceptación reproducibles sin relajar autenticación.
- `VISUAL_API_TARGET=http://127.0.0.1:8000 VISUAL_SURFACES=admin VISUAL_VIEWPORTS=1440 npm run test:visual-browser --silent`: **PASS**. Se verificaron login, grupos y sidebar Admin, CMS con imagen/borrador/publicación, editor de rutas y la composición actualizada de Reportes.
- Métrica browser del mapa en la misma suite: primera imagen 93.9 ms, carga completa 154.9 ms, segunda carga 118 ms, 61.6 FPS en interacción, 0 errores de mosaicos y 0 URLs duplicadas. Es una medición del entorno de prueba, no una garantía del proveedor TomTom productivo.

## Auditoría final de controles públicos — 2026-11-04

- `npm run test:website-controls-browser --silent`: **PASS**; las nueve rutas generan 606 filas, 49 acciones y 16 destinos internos verificables.
- La matriz actual registra **0 controles sin etiqueta**, **0 destinos vacíos** y **0 referencias funcionales faltantes**; los disclosures legales y FAQ se identifican mediante su panel real.
- `npm run test:website-deep-visual --silent`, `npm run test:website-control-visual --silent` y `npm test --silent`: **PASS**. El auditor cross-surface registró 339 controles visibles en 14 rutas.
- `VISUAL_API_TARGET=http://127.0.0.1:8000 VISUAL_SURFACES=admin VISUAL_VIEWPORTS=390 npm run test:visual-browser --silent`: **PASS**; Admin conserva navegación, reportes y controles utilizables en móvil después de la actualización.
- La matriz autenticada acumulativa quedó en **964 filas, 15 pantallas y 326 clics observados** entre 390 y 1440 px; ya no se sobrescribe con la última pantalla visitada. La instrumentación no agrega controles ni modifica la autenticación.

## Corrección final de referencias semánticas Admin — 2026-11-04

- `npm run test:visual-browser --silent` con `VISUAL_SURFACES=admin` y `VISUAL_VIEWPORTS=390,1440`: **PASS** en ambos tamaños, incluyendo CMS, formularios, tablas y módulos autenticados.
- La tabla común de Admin asigna `id`, `name` y etiquetas explícitas al buscador y al selector de filas. El auditor reconoce además etiquetas HTML implícitas, `aria-labelledby` e identificadores `data-cms-*` reales; no se relajó la exigencia de referencias funcionales.
- `npm test --silent`: **PASS** completo después de la corrección.

## Reordenamiento accesible de Reportes — 2026-11-04

- Los widgets del dashboard ejecutivo conservan el arrastre, pero ahora también exponen controles `Move up`/`Move down` con iconos compartidos, `type="button"`, estados deshabilitados en los extremos y persistencia en `localStorage`.
- `npm run test:report-charts --silent`, `npm run test:control-static-contract --silent` y la aceptación visual autenticada de Admin a 390/1440 px: **PASS**.
