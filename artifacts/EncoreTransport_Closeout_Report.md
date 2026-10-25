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
| Driver Mobile — verificación nativa | APK debug x86_64 compilado e instalado en emulador. Acceso autenticado, perfil, viaje asignado, lista de pasajeros y fallback visible al recibir 503 de TomTom; la pantalla sigue operativa sin crash. El E2E detectó y corrigió que el fallo del mapa bloqueara el login y luego provocara crash por tratar `{data:null}` como ruta. Las acciones `Iniciar viaje` y `Finalizar viaje` se probaron desde la UI contra mock aislado: la app envió los POST correctos y actualizó sus estados. Esa prueba valida el cableado móvil, no las transiciones del backend Laravel. El botón de GPS puntual también se probó con permiso foreground y coordenada simulada contra mock: la app envió `/driver/locations` y mostró confirmación; no se probó la persistencia Laravel ni el GPS continuo. |
| Passenger Mobile — verificación nativa | APK Android debug x86_64 compilado e instalado en emulador desde una copia temporal de la versión actual. Interfaz nativa cargada; completó búsqueda Georgetown → New Amsterdam para 2026-10-28, encontró el viaje demo 07:00–10:15 en BUS-001, mostró 55 asientos y seleccionó el asiento 55. Tras iniciar sesión y registrar al viajero, creó la reserva `ET-TQHCQIGOLK` pendiente por $85. El intento de pago respondió Fallido y la reserva permaneció Pendiente de pago, sin simular pago exitoso. |
| Passenger Mobile — pagos | El estado de reserva ya no afirma que el pago está siempre inactivo. La app permite iniciar un intento real con clave de idempotencia, consultar pagos anteriores y refrescar estados desde Laravel; errores de gateway quedan visibles y nunca marcan una reserva como pagada. |
| Reintentos de pago | `PaymentService` permite reintentar un registro fallido con la misma clave e identidad de pago; los intentos exitosos/en curso siguen siendo idempotentes. Prueba de integración confirma un solo registro al recuperar el gateway. |
| Reservas e integridad | La cancelación de invitado funciona con token privado sin sesión de usuario. Se conservan los bloqueos de asientos, la disponibilidad por tramo, vencimiento y prevención de sobreventa probados en Laravel. |
| Disponibilidad — procesamiento en lote | Los asientos reservados ahora se agrupan una sola vez por viaje antes del cálculo por tramo. Una página con hasta 100 viajes requiere dos consultas de disponibilidad, sin volver a escanear las reservas de todos los demás viajes por cada resultado. |

## Archivos de código modificados

- Admin: `apps/admin-dashboard/app.mjs`, `app.css`, `src/api.mjs`, `src/module-registry.mjs`, `src/views.mjs`.
- Driver PWA: `apps/driver-pwa/app.mjs` (map loader and unavailable state).
- Website y mapa: `apps/website/app.mjs`, `index.html`, `public-rework.css`, `packages/shared/real-map.mjs`.
- Passenger Mobile: `apps/passenger-mobile/App.tsx`, `app.json`, `package.json`.
- Driver Mobile: `apps/driver-mobile/App.tsx` (el fallback de mapas ya no bloquea acceso ni carga del viaje y evita crash al recibir mapa nulo).
- API y backend: `AdminDashboardController.php`, `AdminFleetController.php`, `BookingController.php`, `LiveNetworkController.php`, `PaymentGatewayInterface.php`, `PaymentService.php`, `RouteController.php`, `RouteResource.php`, `SeatAvailabilityService.php`, `Bus.php`, `TransportRoute.php`, `routes/api.php`.
- CMS y persistencia: `WebsiteContentController.php`, `2026_10_24_000200_add_image_path_to_transport_routes.php`.
- Pruebas: `AdminSurfaceWorkflowTest.php`, `ApiCoreSmokeTest.php`, `DriverLocationPrivacyTest.php`, `LiveNetworkTest.php`, `OperationalCoreTest.php`, `WebsiteContentAndRouteImageTest.php`, `tests/visual-browser.test.mjs`.

## Validación realizada

- `npm run validate:frontend`: aprobado (contratos frontend, tipos de API/Passenger Web y build de Passenger Web).
- `npm run validate:mobile`: aprobado (contrato GPS y TypeScript de Passenger Mobile y Driver Mobile).
- Después de la integración de pagos: `npm run typecheck` dentro de `apps/passenger-mobile` aprobado; `npm test` aprobado. Laravel confirma tanto el rechazo explícito cuando no hay pasarela como el reintento idempotente del mismo pago.
- `npm test`: aprobado (contratos de negocio, interfaz, mapas, GPS, responsive, SEO y rendimiento del navegador).
- Suite Laravel completa ejecutada con PHP 8.3.30, GD, la nueva clave TomTom y SQLite `:memory:`: **63 aprobadas, 0 omitidas, 376 aserciones**. Incluye geocodificación, cálculo de ruta y tesela contra TomTom real, GPS autenticado persistido durante el abordaje y rechazo a un conductor no asignado creado dentro de la prueba.
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
- E2E nativo de Driver Mobile en emulador x86_64: inicio de sesión demo, lectura del perfil, horario, viaje asignado y pasajeros; durante esa ejecución aún no estaba puesta la nueva clave y TomTom devolvió 503, pero la app mantuvo el viaje y sus controles sin crash. La suite completa confirma ahora que la clave real funciona; falta que el usuario revise visualmente el mapa nativo con la configuración actual.
- GPS Driver Mobile — persistencia backend: se añadió una prueba Laravel que autentica al conductor asignado, envía coordenadas durante el abordaje y confirma la respuesta `201` y la fila persistida en SQLite temporal. La app envía el mismo contrato (`trip_id`, coordenadas, rumbo, velocidad y `recorded_at`); el E2E móvil previo usó un mock, no esta instancia real de Laravel.
- Mapa público: chequeo visual de estado vacío y escenario controlado con dos buses vigentes y uno con GPS obsoleto; se verificó filtro por ruta y selección. Contrato de posiciones reales cubierto por `LiveNetworkTest` con datos persistidos.
- Revisión backend adicional: viajes A→B/B→C/A→C, solapamiento de asientos, bloqueos, vencimiento/cancelación, configuración de flota, permisos efectivos, asignación nocturna y protección de secuencia histórica de ruta.

## Funcionalidad aún no certificada

- Passenger Mobile completó en emulador el flujo de búsqueda, selección de asiento, reserva y pago fallido con API Laravel local. No se validaron en nativo todos los escenarios de cancelación, expiración o varios pasajeros; esos estados están cubiertos por pruebas backend y el checkout web.
- Driver Mobile verificó en emulador autenticación y lectura del viaje asignado. Iniciar/finalizar viaje y GPS puntual se probaron desde la app contra mock; las transiciones reales y persistencia GPS están cubiertas por pruebas Laravel, pero no se repitió el flujo UI conectado a Laravel. Quedan para revisión visual del usuario el mapa nativo con la clave nueva y la navegación de GPS; el GPS continuo nativo no se certificó de extremo a extremo. Tampoco se probó build release ni dispositivo físico.
- El intento de pago fallido de Passenger Mobile quedó visible en el emulador. La pasarela real permanece bloqueada hasta configurar credenciales y callback de producción; la interfaz conserva ese error sin simular éxito.
- El recorrido autenticado del navegador cubre altas operativas de rutas, vehículos, conductores, viajes, usuarios y horarios; asigna un rol y un permiso directo; y comprueba CMS, reportes, paquetes e incidencias. No cubre por navegador cada tipo de reporte, todos los permisos ni todos los flujos de reservas; estos últimos conservan pruebas backend.
- El escenario de mapa multi-bus del navegador usa posiciones de fixture para comprobar la interfaz; las posiciones reales se validan mediante pruebas backend. No se midió GPS en producción.
- No se midió el tiempo integral del endpoint ni se hizo benchmark con base de datos, carga concurrente, datos reales o dispositivos móviles. El microbenchmark anterior compara solo el procesamiento de colecciones después de leer reservas.

## Dependencias externas y límites

- La clave TomTom vive solo en `.env` local e ignorado por Git; el despliegue deberá recibirla mediante su propio almacén de secretos o variable de entorno.
- Los APK nativos se generaron en una copia temporal corta para evitar la limitación de longitud de rutas Windows; se ajustaron cachés CMake del NDK de esa copia, sin incorporar esos ajustes al producto. Passenger y Driver completaron los flujos de UI descritos en emulador. Driver inicia/finaliza viaje y envía GPS desde UI contra mock; la suite Laravel confirma la autorización y persistencia real del GPS, pero no la conexión E2E desde la app. El usuario revisará visualmente mapa y GPS con la clave actual. Los paquetes se compilaron en debug; no se probaron release ni dispositivo físico.
- No hay credenciales ni callbacks externos de pagos o correo en este entorno. El pago sin pasarela configurada falla explícitamente; no marca reserva pagada ni emite boleto como pagado. Los contratos del transport Gmail se prueban por separado.
- No se desplegó ni se modificó producción. El `.env` local no se incluye en el repositorio y contiene la clave TomTom fuera del control de versiones.

## Evidencia visual

Las capturas por aplicación, resolución y flujo están en `artifacts/EncoreTransport_Final_Visual_Review/`; el paquete distribuible es `artifacts/EncoreTransport_Final_Visual_Review.zip`. La evidencia textual de los E2E nativos está en `artifacts/EncoreTransport_Final_Visual_Review/mobile/native-emulator-e2e.txt`. No contiene secretos ni datos personales reales.
