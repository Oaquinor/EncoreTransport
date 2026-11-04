# EncoreTransport — Master Goal Tracker

Fecha de actualización: 2026-11-04
Rama: `main`
Commit de referencia observado: `f48f16a2109f8687db67639eef80b059f183ed8d`
Estado global: `IN_PROGRESS`
Este tracker es la fuente operativa del objetivo maestro. Cada fase debe tener implementación, evidencia y una prueba proporcional a su alcance. `VERIFIED` significa que la evidencia actual cubre el requisito; `BLOCKED` significa que existe una dependencia externa concreta; `IN_PROGRESS` significa que hay trabajo o verificación pendiente.

## Plan por fases

| ID | Fase | Alcance | Estado | Evidencia actual | Siguiente acción de cierre |
|---|---|---|---|---|---|
| P0 | Baseline y seguridad del cambio | Git, cambios locales, apps, rutas, documentación y contratos | `IN_PROGRESS` | `git status`, `DESIGNER.md`, suites existentes, `SCREEN_INVENTORY.md` | Completar inventario de componentes y archivos grandes |
| P1 | Inventario de pantallas y controles | Rutas públicas, privadas, modales, pestañas, estados y acciones | `IN_PROGRESS` | `ALL_ACTIONS_AUDIT.md`, `SCREEN_INVENTORY.md`, `website-pages-browser`, `visual-browser`, `website-button-matrix.json` (49 acciones), `website-control-inventory.json` (597 filas) y `website-control-coverage.json` (16 comportamientos) | Ampliar matriz con estados autenticados por rol |
| P2 | Sistema visual compartido | Tokens, tipografía, radios, spacing, controles, estados y motion | `IN_PROGRESS` | `packages/shared/design-system.css`, `DESIGNER.md` | Mapear duplicaciones CSS y migrar reglas por responsabilidad |
| P3 | Arquitectura CSS y naming | Capas temporales, selectores duplicados, `!important`, nombres históricos | `IN_PROGRESS` | `docs/final/CSS_ARCHITECTURE_AUDIT.md`; se retiró el import muerto de `apps/website/premium.css` tras rastrear consumidores | Consolidar reglas restantes por selector consumidor y repetir regresión visual |
| P4 | Website público | Nueve rutas, EN/ES, SEO, navegación, responsive, formularios y mapas | `IN_PROGRESS` | Browser público; geometría 320–1920; 597 filas de inventario y 48 acciones ejercitadas; recuperación de rutas/Live; capturas de Website | Validar estados con API configurada y completar controles autenticados |
| P5 | Encore Live y mapas | Mapas estático/operativo, tiles, GPS stale, polling, interpolación y cleanup | `IN_PROGRESS` | `test:map-performance-browser`, `test:map-runtime`, métricas de tiles | Medir con red limitada y validar mapas Passenger/Driver/Admin |
| P6 | Admin | Sidebar, módulos, tablas, formularios, clientes, tickets, paquetes y permisos | `IN_PROGRESS` | Laravel PASS: 86/610; browser autenticado Admin 1440 px con seeder Laragon cubrió CMS, sidebar, rutas, clientes, ficha, boletos, roles, horarios, reportes, exportación CSV/JSON, widgets reordenables, paquetería e incidencias; matriz autenticada 201 filas | Ampliar aceptación a roles adicionales y revisar estados no cubiertos |
| P7 | Passenger Web/PWA | Búsqueda, resultados, asientos, pasajeros, pago, boleto, QR y cuenta | `IN_PROGRESS` | Typecheck/build; browser autenticado Passenger 1440 px pasó búsqueda, salida, asientos, pasajeros, pago/boleto y acciones de cuenta; matriz autenticada | Completar recorrido configurado a 390 px y estados de error/éxito |
| P8 | Driver Web/PWA | Viaje, abordaje, QR, GPS, paquetes, custodia, incidencias y offline | `IN_PROGRESS` | Laravel PASS; browser autenticado Driver 1440/390 px cubrió viaje, GPS, QR, paquete, custodia e incidencia; matriz autenticada | Ampliar custodia completa y escenarios offline/reconexión |
| P9 | Passenger/Driver Mobile | Safe areas, cámara, GPS, offline, sincronización, QR y notificaciones | `IN_PROGRESS` | Typechecks y contratos nativos; Passenger y Driver APK debug `x86_64` construidos, instalados y lanzados en AVD `EncoreATD`; Driver verificó login, viaje demo, QR, permisos, GPS background y outbox GPS sincronizada contra Laravel por ADB reverse | Completar Passenger nativo, fotografía multipart, operaciones offline de custodia, notificaciones, pagos, clave de mapa y dispositivo físico |
| P10 | Tracking y Package Register | Referencia, timeline, privacidad, validaciones y estados | `IN_PROGRESS` | Browser tracking y contratos de custodia | Capturar registro, error, privacidad y actualización pública |
| P11 | Acciones y regresiones | Listener, API, permisos, persistencia, recarga y errores por control | `IN_PROGRESS` | `test:website-controls-browser` PASS; 48 acciones con click, teclado, error y recuperación más 597 filas de inventario público; `control-static-contract` PASS en 55 archivos | Generar inventario dinámico autenticado y ejecutar controles críticos |
| P12 | QA transversal | Laravel, Playwright, responsive, accesibilidad, rendimiento y seguridad | `IN_PROGRESS` | `npm test`, Laravel 86/610 con MySQL Laragon, geometría 320–1920, visual browser autenticado Admin y métricas de mapas | Separar aceptación nativa y proveedores externos del cierre web/backend |
| P13 | Documentación y release | Matrices, capturas antes/después, riesgos, pendientes y readiness | `IN_PROGRESS` | `TEST_RESULTS.md`, `SCREEN_INVENTORY.md`, `RELEASE_READINESS.md`, auditorías existentes | Consolidar contradicciones y no declarar `READY_FOR_RELEASE` prematuramente |

## Estados de aceptación

- `VERIFIED`: implementación y prueba relevante ejecutadas con evidencia suficiente.
- `IMPLEMENTED`: código presente, pero falta una prueba proporcional o captura.
- `IN_PROGRESS`: la fase tiene trabajo activo o verificación incompleta.
- `BLOCKED`: la prueba requiere un recurso externo no disponible, como dispositivo, credencial o proveedor.
- `FAILED`: la última prueba relevante falló y requiere corrección.
- `NOT_STARTED`: todavía no existe una revisión suficiente.

## Bloqueos actuales

| Bloqueo | Impacto | Evidencia | Cómo se desbloquea |
|---|---|---|---|
| Cobertura visual completa por rol/ancho todavía no exhaustiva | Admin y Driver tienen aceptación focalizada a 1440 px, pero no todas las combinaciones de rol, viewport y estados | `admin-1440.png`, `driver-1440.png`, `test:visual-browser` con entorno demo | Ejecutar matriz ampliada cuando se definan roles y datos de aceptación |
| Aceptación nativa todavía parcial | Driver ya tiene aceptación AVD de login, viaje, QR, permisos, GPS background y outbox GPS; la captura multipart de evidencia, Passenger completo, custodia offline, notificaciones y pago no se han ejecutado | APK `x86_64` y capturas en `artifacts/mobile/`; `TEST_RESULTS.md`; typechecks/contratos no sustituyen pruebas nativas completas | Completar fotografía/custodia en AVD o dispositivo físico, Passenger nativo, integraciones externas y matriz de proveedor de mapas |
| Proveedores externos reales no configurados | No permite aceptar pagos, correo, WhatsApp, push o TomTom productivo | `RELEASE_READINESS.md` e `INTEGRATION_GAPS.md` | Configurar sandbox/credenciales y ejecutar pruebas aisladas |

## Regla de continuidad

Cada nueva sesión debe leer este archivo, revisar `git status`, tomar la primera fase `IN_PROGRESS` o `NOT_STARTED` con mayor prioridad, ejecutar una acción concreta y actualizar la evidencia. No se debe repetir una auditoría general si existe un defecto identificado que todavía no ha sido corregido o probado.

## Revalidación de controles públicos — 2026-11-03

- `npm run test:website-controls-browser` terminó PASS después de probar búsqueda reciente, limpieza de filtros, tabs de paquetería, selección de ruta/unidad de Encore Live y recuperación ante respuestas 503 de rutas y Live.
- La evidencia generada contiene 49 acciones en `artifacts/control-audit/website-button-matrix.json`, 597 filas en `artifacts/control-audit/website-control-inventory.json` y 16 comportamientos en `artifacts/control-audit/website-control-coverage.json`; la segunda matriz conserva aplicación, pantalla, control, propósito, destino, permisos, estado y prueba.
- Esta mejora cierra la cobertura dinámica pública, pero no convierte en aceptada la cobertura autenticada por rol ni las pruebas nativas/proveedores externos pendientes.

## Revalidación autenticada por rol — 2026-11-03

- La corrida `VISUAL_SURFACES=passenger,admin,driver VISUAL_VIEWPORTS=1440,390` terminó PASS con Laravel/MySQL local y datos preparados por `prepare:visual-demo`.
- Se generó `artifacts/control-audit/authenticated-control-matrix.json` con 201 filas y 123 clics observados; la matriz conserva viewport, aplicación, pantalla, control, propósito, destino, permisos, estado y prueba.
- Passenger, Admin y Driver quedan con evidencia funcional de escritorio y responsive. La fase P1/P6/P7/P8 permanece `IN_PROGRESS` por los bloqueos nativos/externos ya documentados.

## Revalidación 2026-11-02

- La geometría pública ahora se comprueba en diez anchos y falla si las regiones principales o los controles utilizables salen del viewport.
- `npm test` terminó correctamente después de alinear el contrato de caché de mosaicos con la implementación encapsulada en `tileCache()`.
- El inventario de rutas y superficies está en `docs/final/SCREEN_INVENTORY.md`.
- PHP 8.3.30 y MySQL de Laragon se encontraron fuera del `PATH`; Laravel se ejecutó con binario absoluto y terminó con 84 pruebas y 560 aserciones.
- La primera extracción CSS segura retiró el import no consumido de `apps/website/premium.css`; el alcance y la regresión están en `docs/final/CSS_ARCHITECTURE_AUDIT.md`.
- La corrida completa posterior (`npm test`) terminó en PASS; el mapa registró 71.4 ms a primera imagen, 234.7 ms completo, 150 ms completo en segunda carga y 60.12 FPS en interacción.
- La aceptación autenticada se ejecutó con `EncoreTransportDemoSeeder`: Admin 1440 px PASS y Driver 1440 px PASS en ejecuciones separadas, porque el flujo Driver cambia el viaje demo a `completed`.
- La matriz autenticada combinada también pasó: Admin se ejecuta antes que Driver y ambos completan sus controles sobre el viaje demo sin fabricar ubicaciones ni estados.
- La última `npm test` posterior al cambio de orden autenticado también pasó; el escenario Live midió 89.5 ms de primera imagen, 351.3 ms completo y 44.38 FPS en la interacción de esa ejecución.
- La aceptación Admin se reejecutó contra Laravel/MySQL local con datos demo y pasó a 1440 px y 390 px. Recorrió mutaciones reales de CMS, rutas, flota, usuarios, clientes, boletos, roles, horarios, reportes, paquetería e incidencias. La verificación estricta de mapa quedó separada y opt-in para no bloquear la aceptación de módulos no cartográficos.
- La revalidación de 2026-11-03 volvió a sembrar `EncoreTransportDemoSeeder`, ejecutó Laravel con PHP 8.3.30/MySQL y confirmó 86 pruebas/610 aserciones PASS; Admin autenticado pasó a 1440 px y 390 px con la misma cobertura operativa.
- La corrida integrada posterior pasó Website, Passenger, Admin, Driver, Login y Tracking a 1440 px y 390 px (12 checks); la cobertura pública profunda de las nueve páginas permanece cubierta por `test:website-deep-visual`.
- `validate:backend` y `validate:frontend` pasaron: 128 rutas, migraciones al día, Swagger, suite completa Node/browser, typechecks y build de Passenger.
- La última aceptación Admin a 1440 px añadió una aserción de regresión para impedir solicitudes `/api/v1/admin/users/undefined` durante la carga de pestañas; pasó con Laravel/MySQL local. `npm test` terminó nuevamente en PASS.

## Suite completa posterior a la normalización pública — 2026-11-04

- `npm test --silent`: PASS completo después de alinear la geometría de la cabecera pública.
- Website conserva 597 controles inventariados, 49 acciones ejercitadas y 16 comportamientos documentados en `artifacts/control-audit/website-control-coverage.json`.

- Revalidación posterior al footer: el inventario público vigente contiene 606 controles, 49 acciones ejercitadas y 16 comportamientos documentados; el runtime cross-surface registra 336 controles visibles en 14 rutas.
- La métrica browser de mapa de esta corrida registró 34.8 ms a primera imagen, 539.9 ms a primera carga completa, 71.5 ms en segunda carga y 61.37 FPS, sin errores de mosaicos ni URLs duplicadas.
- El estado general sigue `IN_PROGRESS`: la validación de producción, proveedores externos y aceptación nativa completa permanecen fuera de esta evidencia local.

## Revalidación posterior — controles y perfil Admin

- Los controles iconográficos mantienen 40×40 px, separación consistente, estados de foco/hover y columna de acciones accesible en móvil; el header fija notificaciones/configuración en 40×40 px aun cuando una regla responsive heredada intenta expandir controles.
- La ficha de perfil ya no presenta una tarjeta de dispositivos conectados sin endpoint; muestra únicamente el resumen de sesión autenticada disponible en el usuario actual.
- `npm test`, `npm run test:admin-navigation`, comprobación de sintaxis de Admin y `git diff --check`: PASS.
- El estado global permanece `IN_PROGRESS`: siguen fuera de aceptación completa los proveedores externos, la cobertura exhaustiva por rol/viewport y varios recorridos nativos que requieren dispositivo o credenciales reales.
- Driver Mobile dejó explícito el estado offline: GPS en outbox acotada y operaciones de custodia bloqueadas sin red, sin confirmaciones locales. Passenger/Driver pasan typecheck y contrato visual; la reconstrucción APK posterior quedó sin terminar en el entorno después de generar el bundle, por lo que no se presenta una nueva captura nativa como aceptación.

## Revalidación nativa final — 2026-11-03

- Passenger Mobile y Driver Mobile: ambos APK debug actuales terminaron `BUILD SUCCESSFUL`, se instalaron en `emulator-5554` y arrancaron con `Status: ok`; `ReactNativeJS: Running "main"` apareció sin `FATAL EXCEPTION`.
- Este avance aplica a las dos aplicaciones móviles, no solamente a Admin. La fase P9 permanece `IN_PROGRESS` por fotografía multipart, permisos/uso completo de cámara y GPS, custodia offline, push, pagos, credenciales de mapas y dispositivo físico.

## Revalidación Laravel y Admin — 2026-11-04

- Laragon dejó disponible MySQL en `127.0.0.1:3306`; Laravel pasó **86 pruebas y 610 aserciones** con PHP 8.3.30.
- `prepare:visual-demo` sembró el entorno reproducible y `test:visual-browser` autenticado pasó Admin a 1440 px, incluyendo reportes, exportaciones y widgets reordenables del dashboard ejecutivo.
- El login falló con `422` únicamente antes de preparar el seeder; después pasó sin debilitar autenticación. El estado global sigue `IN_PROGRESS` por cobertura nativa, proveedores externos y roles/estados todavía no exhaustivos.

## Revalidación de custodia — 2026-11-03

- Se corrigió la limpieza de la foto de entrega cuando una transacción falla y se añadió una prueba de persistencia fallida; Laravel terminó con 85 pruebas y 566 aserciones.
- `npm test` terminó nuevamente en PASS después del cambio, incluyendo Website profundo, contratos de las aplicaciones, mobile visual y rendimiento de mapas.
- La suite Laravel completa posterior quedó en 86 pruebas y 610 aserciones PASS; esto incluye estados terminales de boletos y limpieza de evidencia ante fallo transaccional.
- `npm run validate:backend` terminó PASS con autodetección de PHP, 128 rutas, migraciones, Swagger y 86/610.

## Revalidación offline Driver Mobile — 2026-11-03

- La cobertura no se limita a Admin: Website, Passenger, Driver, Login y Tracking continúan cubiertos por la corrida integrada browser responsive; el backend conserva 86 pruebas/610 aserciones PASS.
- Driver Mobile añadió una outbox acotada para `in_progress` únicamente; no confirma localmente, reintenta contra Laravel y deja fuera de línea entrega con fotografía y transferencias.
- Typecheck Driver, contrato visual y contrato GPS pasaron. El build Android incremental terminó `BUILD SUCCESSFUL`; el smoke con Metro cargó el JavaScript actual, arrancó la pantalla real de acceso y no produjo excepción fatal. La transición offline completa aún no se ejecutó dentro del AVD; P9 sigue `IN_PROGRESS`.
- `npm run test:driver-custody-outbox` pasó con almacenamiento, deduplicación, 503, reanudación y rechazo terminal 422; esto cubre la lógica de la outbox, mientras la aceptación nativa de la interacción offline permanece pendiente.
- Website: se eliminó la ranura de 4 px que podía cerrar el dropdown al mover el cursor hacia sus opciones; `test:website-pages-browser` verificó geometría de contacto y selección real.
- La suite principal `npm test` volvió a terminar PASS después de ambos cambios, incluyendo Website profundo, outbox Driver, contratos móviles y rendimiento de mapas.

## Revalidación de acciones compartidas y QR — 2026-11-03

- Tracking usa ahora el icono compartido del sistema y el QR público tiene un flujo reversible y accesible: mostrar, ocultar, estado listo y reintento ante fallo del proveedor.
- La prueba browser confirmó la URL pública codificada, los iconos, la semántica ARIA y el cierre real del panel; el contrato de Package Register y la suite completa permanecen PASS.
- Esto valida la interfaz y el contrato del proveedor QR, pero no equivale a aceptación de cámara nativa, dispositivo físico ni proveedor productivo.

## Fuente única de iconos Admin — 2026-11-03

- `apps/admin-dashboard/src/views.mjs` dejó de duplicar los SVG y usa `packages/shared/icons.mjs` como fuente única para acciones, reportes, tablas y navegación.
- La suite completa y el contrato Admin pasaron después del cambio; las fases externas/nativas continúan `IN_PROGRESS`.

## Loader común y claridad de datos — 2026-11-03

- El loader de marca se extendió a Website, Passenger, Admin y Driver; `test:brand-loader`, typechecks móviles, build de Passenger y prueba visual móvil pasan.
- Reportes diferencia el rango de actividad de las salidas futuras y muestra estados vacíos explicativos; los contratos de gráficos/exportación pasan.
- La fase global permanece `IN_PROGRESS`: falta la corrida completa posterior y siguen fuera de alcance de esta evidencia los proveedores externos, los dispositivos físicos y la aceptación E2E completa por rol.

## Cierre de la iteración de carga y Reportes — 2026-11-04

- `npm test` quedó en PASS completo después de los cambios; el contrato del loader, Website, Admin, Passenger, Driver, Tracking/QR, mobile visual y mapas permanecen verdes.
- `prepare:visual-demo` y la aceptación visual autenticada de Admin a 1440 px pasaron con Laragon/PHP 8.3.30, incluyendo CMS, rutas y Reportes.
- La fase global sigue `IN_PROGRESS` por proveedores externos, producción, pruebas físicas de cámara/GPS/push/offline y E2E completo por rol; no se declara `READY_FOR_RELEASE` por inferencia.

## Auditoría pública sin referencias huérfanas — 2026-11-04

- La matriz vigente mantiene 606 controles, 49 acciones, 16 destinos internos y 16 comportamientos, con 0 etiquetas vacías y 0 destinos/referencias funcionales vacíos.
- FAQ, privacidad, términos y accesibilidad ahora tienen identificadores de panel y `aria-controls`; el cambio fue verificado en browser y no alteró navegación ni responsive.
- El auditor runtime registra 339 controles visibles en 14 rutas. El objetivo global continúa `IN_PROGRESS` por la aceptación externa, física y autenticada que todavía requiere servicios/dispositivos configurados.

## Inventario Admin por módulo y viewport — 2026-11-04

- La captura acumulativa de `test:visual-browser` registra 964 filas, 15 pantallas Admin y 326 clics observados entre 390 y 1440 px. El contrato reconoce etiquetas HTML implícitas, referencias `aria-labelledby` e identificadores CMS reales.
- La matriz cubre Dashboard, Bookings, CMS, Routes, Vehicles, Drivers, Trips, Users, Customers, Tickets, Roles, Schedules, Reports, Packages e Incidents; las acciones conservan permisos y destinos.
- La fase global sigue `IN_PROGRESS` por la aceptación nativa completa, proveedores externos, producción y recorridos E2E de rol todavía no configurados.
