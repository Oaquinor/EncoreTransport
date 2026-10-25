# EncoreTransport — informe técnico de cierre

Fecha: 25 de octubre de 2026  
Rama y base revisada: `main`, `e5f5da372de71aa4125b80b3b68af44a614e240f`  
Entorno funcional: PHP 8.5 en WSL, Laravel, SQLite temporal con datos demo. No se usó producción.

## Cambios implementados

| Área | Resultado verificable |
|---|---|
| Admin — editor de rutas | Corregida la pérdida de texto al completar varias paradas: los segmentos ahora se actualizan sin reconstruir los campos en edición ni quitar el foco. Las tarifas, distancias y tiempos se conservan en el payload. |
| CMS del Website | Editor permitido de secciones, títulos, descripciones, enlaces, visibilidad, orden y preguntas frecuentes; vista previa, borrador y publicación. Las imágenes se guardan en biblioteca compartida y no se eliminan mientras sigan referenciadas. |
| Imágenes de rutas | Carga, vista previa, almacenamiento y exposición mediante `RouteResource`; compatible con rutas históricas y sin regenerar secuencias usadas por viajes existentes. |
| Mapas operativos y público | Admin y Driver muestran estados visuales inmediatos y fallbacks legibles cuando faltan coordenadas o falla el proveedor. El mapa público presenta solo viajes en marcha, separa GPS vigente de obsoleto, limpia coordenadas antiguas y muestra lista, filtro por ruta, selección de bus y estado vacío. Las ubicaciones vienen del backend. |
| Admin — autobuses | Alta y edición con configuración real de asientos (fila, posición, clase, activo, ventana, pasillo, accesible y bloqueado); capacidad enlazada a los asientos guardados. Los asientos se entregan ordenados espacialmente. |
| Admin — incidencias | Quien tiene `incidents.update` puede editar título, descripción, severidad y estado; los usuarios de solo lectura ven la incidencia sin controles mutables. El guardado usa el endpoint existente y los estados se vuelven a leer desde Laravel. |
| Admin — reservas | La lista muestra ruta, salida, titular, cantidad de pasajeros, asientos, estado e importe. “View booking” reutiliza `GET /bookings/{id}` para revisar pasajeros, pagos y boleto; se mantienen únicamente las acciones permitidas sobre reservas no pagadas. |
| Passenger Web | Recorrido autenticado como invitado: buscar, elegir salida, asiento, ingresar viajero, revisar, crear reserva pendiente, recuperar estado y cancelar con el token privado para liberar el asiento. |
| Passenger Mobile | Mejoras de registro e inicio de sesión, búsqueda y navegación del flujo, varios viajeros/asientos, recuperación de reserva y tolerancia a fallos del mapa. Se reutilizan las APIs y reglas Laravel. |
| Passenger Mobile — verificación nativa | APK `assembleDebug` x86_64 compilado e instalado en emulador. `MainActivity` abre, pero queda sin interfaz: logcat confirma que el bundle `index.android.bundle` no está empaquetado en debug. Metro no abrió 8081 y `assembleRelease` quedó detenido en `configureCMakeRelWithDebInfo[x86_64]`; no se produjo APK release ni se pudo validar el flujo nativo. |
| Passenger Mobile — pagos | El estado de reserva ya no afirma que el pago está siempre inactivo. La app permite iniciar un intento real con clave de idempotencia, consultar pagos anteriores y refrescar estados desde Laravel; errores de gateway quedan visibles y nunca marcan una reserva como pagada. |
| Reintentos de pago | `PaymentService` permite reintentar un registro fallido con la misma clave e identidad de pago; los intentos exitosos/en curso siguen siendo idempotentes. Prueba de integración confirma un solo registro al recuperar el gateway. |
| Reservas e integridad | La cancelación de invitado funciona con token privado sin sesión de usuario. Se conservan los bloqueos de asientos, la disponibilidad por tramo, vencimiento y prevención de sobreventa probados en Laravel. |
| Disponibilidad — procesamiento en lote | Los asientos reservados ahora se agrupan una sola vez por viaje antes del cálculo por tramo. Una página con hasta 100 viajes requiere dos consultas de disponibilidad, sin volver a escanear las reservas de todos los demás viajes por cada resultado. |

## Archivos de código modificados

- Admin: `apps/admin-dashboard/app.mjs`, `app.css`, `src/api.mjs`, `src/module-registry.mjs`, `src/views.mjs`.
- Driver PWA: `apps/driver-pwa/app.mjs` (map loader and unavailable state).
- Website y mapa: `apps/website/app.mjs`, `index.html`, `public-rework.css`, `packages/shared/real-map.mjs`.
- Passenger Mobile: `apps/passenger-mobile/App.tsx`, `app.json`, `package.json`.
- API y backend: `AdminDashboardController.php`, `AdminFleetController.php`, `BookingController.php`, `LiveNetworkController.php`, `PaymentGatewayInterface.php`, `PaymentService.php`, `RouteController.php`, `RouteResource.php`, `SeatAvailabilityService.php`, `Bus.php`, `TransportRoute.php`, `routes/api.php`.
- CMS y persistencia: `WebsiteContentController.php`, `2026_10_24_000200_add_image_path_to_transport_routes.php`.
- Pruebas: `AdminSurfaceWorkflowTest.php`, `ApiCoreSmokeTest.php`, `LiveNetworkTest.php`, `OperationalCoreTest.php`, `WebsiteContentAndRouteImageTest.php`, `tests/visual-browser.test.mjs`.

## Validación realizada

- `npm run validate:frontend`: aprobado (contratos frontend, tipos de API/Passenger Web y build de Passenger Web).
- `npm run validate:mobile`: aprobado (contrato GPS y TypeScript de Passenger Mobile y Driver Mobile).
- Después de la integración de pagos: `npm run typecheck` dentro de `apps/passenger-mobile` aprobado; `npm test` aprobado. Laravel confirma tanto el rechazo explícito cuando no hay pasarela como el reintento idempotente del mismo pago.
- `npm test`: aprobado (contratos de negocio, interfaz, mapas, GPS, responsive, SEO y rendimiento del navegador).
- `php artisan test` con PHP 8.5, GD y SQLite `:memory:`: **58 aprobadas, 4 omitidas, 361 aserciones**. Incluye reintento del mismo pago fallido sin duplicar el registro, replay del checkout e integridad de los campos ocultos. Las cuatro omisiones requieren una clave TomTom o una segunda cuenta de conductor.
- `git diff --check`, `node --check` de los módulos y prueba visual: aprobados.
- Playwright/Chromium: **36/36** capturas responsive de Website, Passenger, Driver, Admin, Login y Tracking a 360, 390, 768, 1024, 1440 y 1920 px. Admin y Driver se revisaron con sesiones demo autenticadas.
- Tras el último ajuste de mapas, los recorridos autenticados de Admin y Driver a 1440 px se repitieron y aprobaron; esas capturas actualizadas están incluidas en el ZIP.
- E2E autenticado de Admin a 1440 px: editar Website, guardar borrador, publicar, reutilizar imagen, quitar referencias, editar imagen de ruta y crear/editar autobús con asientos; los datos persistidos se comprobaron por API.
- E2E administrativo ampliado sobre SQLite local: crear una ruta con terminales, parada intermedia y tres segmentos comerciales, subir imagen de ruta, crear un autobús con plano de asientos, crear conductor y programar viaje con vehículo/conductor/ruta seleccionados; crear, editar, asignar rol y permiso directo, y desactivar un usuario; editar/restaurar etiqueta de rol, crear horario, filtrar el reporte de vehículos y abrir las vistas de paquetes e incidencias. Se verificaron las escrituras en Laravel.
- E2E administrativo enfocado repetido sobre SQLite limpio: **1/1 flujo a 1440 px aprobado**; incluye creación y edición de ruta con tres segmentos, flota, conductor, viaje, CMS, permisos, horarios, reportes y revisión de incidencias.
- En el E2E de incidencias, Driver creó una incidencia autenticado; Admin actualizó el título, descripción y severidad y recorrió `open → in_progress → resolved → dismissed → open`. Cada guardado se comprobó leyendo la API. La captura está en `admin/flows/admin-incidents-1440.png`.
- E2E de reservas Admin: abrió el detalle de `ET-DEMO-BOOKING` mediante el endpoint existente y verificó ruta, pasajeros, asientos, pagos y boleto. Captura: `admin/flows/admin-booking-details-1440.png`.
- `AdminSurfaceWorkflowTest::test_admin_booking_list_and_existing_detail_endpoint_supply_operational_context` verificó el resumen enriquecido de reservas del dashboard, el detalle con relaciones y el acceso del pasajero propietario.
- La prueba `OperationalCoreTest::test_batched_availability_uses_two_queries_for_a_page_of_trips` verificó 12 viajes, conteos con y sin reserva, y exactamente dos consultas de disponibilidad en toda la página.
- Microbenchmark local del procesamiento en memoria posterior a la consulta: 100 viajes y 2500 filas de reserva, misma salida y mediana de 5 rondas. El escaneo global anterior tomó **1009 ms**; el agrupado por viaje tomó **13 ms**. No incluye base de datos, red, proceso HTTP, concurrencia ni carga de producción.
- E2E de Passenger a 1440 px: reserva de invitado, estado de pago pendiente y cancelación; se comprobó la liberación del asiento.
- E2E de Driver PWA a 1440 px: iniciar y terminar viaje, enviar GPS autorizado y comprobarlo en la red pública, guardar condición del vehículo, registrar paquete y reportar incidencia.
- Mapa público: chequeo visual de estado vacío y escenario controlado con dos buses vigentes y uno con GPS obsoleto; se verificó filtro por ruta y selección. Contrato de posiciones reales cubierto por `LiveNetworkTest` con datos persistidos.
- Revisión backend adicional: viajes A→B/B→C/A→C, solapamiento de asientos, bloqueos, vencimiento/cancelación, configuración de flota, permisos efectivos, asignación nocturna y protección de secuencia histórica de ruta.

## Funcionalidad aún no certificada

- No se completaron flujos nativos para Passenger Mobile ni Driver Mobile. Passenger Mobile compiló e instaló, pero no renderiza UI por falta de bundle en debug; Metro no inició y release no produjo APK. Driver Mobile conserva solo typecheck/contratos. Driver PWA sí tiene un recorrido interactivo autenticado; el caso de embarque no tiene pasajero confirmado en el conjunto demo y se valida en pruebas Laravel.
- La acción de pago móvil se comprobó mediante pruebas de API, pero no con un emulador o dispositivo. La pasarela real permanece bloqueada hasta configurar credenciales y callback de producción; la interfaz conserva ese error sin simular éxito.
- El recorrido autenticado del navegador cubre altas operativas de rutas, vehículos, conductores, viajes, usuarios y horarios; asigna un rol y un permiso directo; y comprueba CMS, reportes, paquetes e incidencias. No cubre por navegador cada tipo de reporte, todos los permisos ni todos los flujos de reservas; estos últimos conservan pruebas backend.
- El escenario de mapa multi-bus del navegador usa posiciones de fixture para comprobar la interfaz; las posiciones reales se validan mediante pruebas backend. No se midió GPS en producción.
- No se midió el tiempo integral del endpoint ni se hizo benchmark con base de datos, carga concurrente, datos reales o dispositivos móviles. El microbenchmark anterior compara solo el procesamiento de colecciones después de leer reservas.

## Dependencias externas y límites

- Cuatro pruebas se omiten: tres requieren `TOMTOM_API_KEY`; una requiere una segunda cuenta conductora. El proxy y el manejo de errores TomTom sí tienen pruebas locales.
- Bloqueo nativo reproducible: `adb` confirma `com.anonymous.encorepassenger/.MainActivity` y logcat reporta `Unable to load script` / falta de `index.android.bundle`; el build release se detuvo en CMake sin generar salida.
- No hay credenciales ni callbacks externos de pagos o correo en este entorno. El pago sin pasarela configurada falla explícitamente; no marca reserva pagada ni emite boleto como pagado. Los contratos del transport Gmail se prueban por separado.
- No se desplegó, no se modificó producción y no se hicieron commits, push ni merge. Los datos y archivos de revisión son locales.

## Evidencia visual

Las capturas por aplicación, resolución y flujo están en `artifacts/EncoreTransport_Final_Visual_Review/`; el paquete distribuible es `artifacts/EncoreTransport_Final_Visual_Review.zip`. No contiene secretos ni datos personales reales.
