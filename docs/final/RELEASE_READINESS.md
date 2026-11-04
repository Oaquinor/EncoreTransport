# Preparación para producción

Actualizado: 2026-11-04. Clasificación actual: `PARTIALLY_COMPLETE`.

Cumplido: reglas de reservas, permisos, perfil Admin, directorio de cuentas con búsqueda server-side, ficha administrativa por pestañas, lifecycle administrativo inicial de boletos, persistencia de notificaciones, Website multipágina comercial con inglés predeterminado y selector EN/ES, SEO bilingüe servido, composiciones públicas diferenciadas, polling Live adaptativo, controles móviles nativos implementados en código, suites Node/browser automatizadas y Laravel ejecutado con PHP 8.3.30/MySQL de Laragon: **86 pruebas y 610 aserciones**. Admin y Driver tienen aceptación visual autenticada focalizada a 1440 px. Passenger y Driver Mobile tienen APK debug `x86_64` construidos, instalados y lanzados en el AVD `EncoreATD`; Passenger verificó búsqueda real y Driver verificó login, viaje demo, escáner QR y GPS background contra Laravel local.

No cumplido: proveedor de pagos con sandbox, integración externa con credenciales reales, captura multipart de evidencia fotográfica en dispositivo, sincronización offline de operaciones de custodia, mapa nativo con una clave Google autorizada, dispositivo físico, push y E2E autenticado por cada rol.

Preparación de producción — 2026-11-04: se añadieron plantillas reproducibles en `deploy/` para Nginx + HTTPS, PHP-FPM, servidor Node, worker y scheduler de Laravel, además de preflight, build de release y health check. `npm run build:passenger`, `test:server`, `test:hardcode` y la sintaxis Bash de los scripts pasan. El VPS aún no fue modificado: el intento SSH no interactivo contra `13.140.235.1` terminó en `Permission denied (publickey,password)`. Faltan una vía de acceso autorizada, dominio final, certificado/DNS y secretos de producción; por eso la clasificación sigue siendo `PARTIALLY_COMPLETE`.

La navegación Admin tiene ahora una estructura por dominios y contrato automatizado; el flujo focal autenticado se ejecutó con el usuario demo sembrado y conserva evidencia visual. Encore Live tiene una composición visual diferenciada y métricas de mapa de navegador, sin cambiar la fuente de posiciones reales. Passenger y Driver Mobile ya tienen evidencia de APK, arranque y conexión local; Driver también carga el panel autenticado con viaje demo, QR y GPS background. Se corrigió el crash de `react-native-maps` cuando falta la clave de Google mediante fallback operativo y configuración explícita del plugin; el mapa nativo interactivo requiere una clave autorizada. La aceptación nativa completa, las integraciones externas y la cobertura E2E completa por cada rol siguen pendientes, por lo que no se declara `READY_FOR_RELEASE`.

Revalidación posterior: los controles iconográficos de Admin conservan geometría fija y acciones visibles en móvil; la ficha de perfil dejó de mostrar superficies de dispositivos sin API y ahora expone solo información de sesión autenticada disponible. La aceptación autenticada completa de Admin pasó contra Laravel/MySQL local a 1440 px y la carga responsive pasó a 390 px, cubriendo también mutaciones reales de CMS, rutas, flota, usuarios, clientes, boletos, roles, horarios, reportes, paquetería e incidencias. `npm test`, `test:admin-navigation` y `test:visual-browser` focalizado permanecen en PASS. La verificación de mapa es independiente y opt-in. La prueba visual ahora también garantiza que ninguna pestaña de usuario solicite un identificador `undefined`. Passenger Mobile y Driver Mobile corrigieron la legibilidad de datos secundarios en tarjetas oscuras y pasan typecheck/contrato visual. Driver Mobile también bloquea operaciones de custodia sin red y mantiene solo el GPS en outbox; la reconstrucción Gradle de esta microcorrección queda bloqueada en el entorno por un fallo de loopback del daemon, sin cambiar la clasificación global.

Última auditoría Website: `test:website-deep-visual` pasó 18 capturas en 390/768 px para las nueve páginas públicas. Se corrigieron el espaciado de submenús móviles y el posible solapamiento del CTA de Network layer. El estado global permanece `PARTIALLY_COMPLETE`; no se cambia a `READY_FOR_RELEASE` mientras sigan pendientes las integraciones externas y la aceptación nativa completa.

Revalidación del 2026-11-03: Laravel/MySQL local pasó **86 pruebas y 610 aserciones**; Admin autenticado pasó a 1440 y 390 px con el seeder demo y recorrió los módulos operativos con mutaciones reales. Esto cierra la evidencia local de Admin, pero no elimina los bloqueos de proveedor externo, dispositivo físico y E2E completo por rol.

La corrida visual integrada también pasó Website, Passenger, Admin, Driver, Login y Tracking a 1440 y 390 px (12 checks). No se confunde esta cobertura browser con la aceptación nativa completa ni con proveedores externos.

La suite completa posterior a la normalización del header público volvió a pasar el 2026-11-04. La cabecera EN/ES, menús y accesos de cuenta comparten 40 px, `border-box` y radio `12px`; Website mantiene 597 controles inventariados, 49 acciones ejercitadas y 16 contratos de comportamiento. Esto fortalece la coherencia local, pero no elimina los bloqueos de producción ya descritos.

`validate:backend` y `validate:frontend` también pasaron el 2026-11-03: rutas/migraciones/Swagger, suite Node/browser, typechecks y build de Passenger. La métrica de mapa quedó registrada en `TEST_RESULTS.md`.

## Revalidación Laravel y Admin — 2026-11-04

Laragon quedó disponible con MySQL en `127.0.0.1:3306`. La suite real terminó con **86 pruebas y 610 aserciones PASS** usando PHP 8.3.30, después de limpiar cachés y comprobar el estado de todas las migraciones. `npm run prepare:visual-demo` preparó el entorno reproducible y la aceptación `VISUAL_SURFACES=admin VISUAL_VIEWPORTS=1440` pasó contra `127.0.0.1:8000`.

La aceptación visual autenticada cubrió navegación por grupos, teclado, sidebar compacta, Expand/Collapse all, CMS, rutas, flota, usuarios, clientes, boletos, roles, horarios, reportes, exportación CSV/JSON, widgets reordenables, paquetería e incidencias. El estado global no cambia a `READY_FOR_RELEASE`: pagos/proveedores externos, dispositivo físico, cámara/GPS/push/offline completos y E2E por rol siguen pendientes.

## Revalidación nativa final — 2026-11-03

Passenger Mobile y Driver Mobile reconstruyeron sus APK debug actuales con Gradle/JDK 17, se instalaron en el AVD `EncoreATD` (`emulator-5554`) y arrancaron mediante sus actividades reales con `Status: ok`. El log de ambos mostró `ReactNativeJS: Running "main"` sin excepciones fatales. La aceptación global continúa `PARTIALLY_COMPLETE`: esta evidencia cubre build/instalación/arranque, no las pruebas pendientes de dispositivo físico, cámara/GPS completos, evidencia multipart, custodia offline, push, pagos, TomTom/Google Maps con credenciales y E2E autenticado por rol.

La custodia transaccional y el lifecycle de boletos se revalidaron después: la foto de entrega se limpia cuando falla la persistencia, y Laravel terminó con **86 pruebas/610 aserciones**. `npm test` también pasó con la regresión visual y de mapas; no cambia la clasificación global porque siguen faltando proveedores externos y aceptación nativa completa.

La validación quedó reproducible con `npm run validate:backend`: el script localiza PHP de Laragon o `PHP_BINARY`, valida 128 rutas, migraciones, Swagger y la suite completa.

## Revalidación offline Driver Mobile — 2026-11-03

Driver Mobile incorpora una outbox local limitada para la carga `in_progress`, con reintento al recuperar red y lenguaje explícito de pendiente/no confirmada. Entrega con evidencia y transferencias continúan fail-closed sin conexión. Typecheck, contrato visual y contrato GPS pasaron; el smoke con Metro cargó el JavaScript actual y arrancó la pantalla real sin excepción fatal. La transición offline todavía requiere aceptación funcional nativa y la clasificación permanece `PARTIALLY_COMPLETE`.

La política de outbox también tiene prueba funcional aislada (`npm run test:driver-custody-outbox`): deduplicación, límite, persistencia ante 503, sincronización posterior y eliminación de rechazos 422. Esta prueba fortalece la lógica, pero no sustituye la aceptación en un dispositivo.

## Revalidación de controles de Passenger y Tracking — 2026-11-03

Passenger consolidó la jerarquía visual de sus acciones y dejó de representar los pasos de reserva como botones deshabilitados. Tracking ahora tiene acciones agrupadas con iconos y QR público bajo demanda. Typecheck/build de Passenger, aceptación browser autenticada de Passenger/Admin/Driver y `npm test` pasaron; la clasificación global sigue `PARTIALLY_COMPLETE` por las integraciones externas y la aceptación física/nativa pendiente.

La última revalidación visual pasó Website, Passenger, Admin, Driver, Login y Tracking en 36 checks responsive entre 360 y 1920 px. También pasó la auditoría runtime de 330 controles en 14 rutas. Esto confirma la coherencia técnica de las superficies inspeccionadas, pero no cambia `PARTIALLY_COMPLETE`: continúan pendientes pagos/proveedores externos, pruebas físicas de cámara/GPS/push y E2E autenticado por rol fuera del entorno local.

La normalización posterior extendió las clases canónicas a Login, el toggle/notificaciones/menú de usuario de Admin y los controles de Package Register. Los contratos estáticos y la revisión browser focalizada de 390/1440 px permanecen en PASS; esto mejora la coherencia visual, pero no elimina los bloqueos de integración externa o aceptación nativa.

Se corrigió además un control del Website que podía quedar visualmente presente sin acción: el directorio de rutas ahora muestra y oculta `Clear search` según el estado real del filtro. La regresión está cubierta por browser; el estado general no cambia por los bloqueos externos ya documentados.

La nueva auditoría funcional pública (`test:website-controls-browser`) pasó 19 destinos internos y los controles interactivos de las nueve páginas. El intercambio de origen/destino quedó fail-safe para no borrar una búsqueda cuando no existe una ruta de regreso publicada.

Admin volvió a pasar la aceptación autenticada con el seeder visual reproducible en 1440 y 390 px después de la normalización de pestañas y notificaciones. Esta evidencia cubre el entorno local preparado; no sustituye las integraciones externas y las pruebas físicas que mantienen el estado `PARTIALLY_COMPLETE`.

La revalidación pública posterior pasó idioma EN/ES, nombres accesibles de los campos de búsqueda y navegación por teclado de las pestañas de paquetería. Website, Tracking/QR, capturas responsive y auditoría runtime permanecen verdes; estos resultados no cambian `PARTIALLY_COMPLETE` mientras sigan pendientes proveedores externos y aceptación física/nativa.
## Estado posterior a la revalidación — 2026-11-03

La suite completa volvió a pasar tras la última tanda de correcciones. Website y Passenger compilan; 330 controles visibles fueron auditados en 14 rutas; el Website cuenta con 18 capturas responsive, navegación profunda y transferencia de búsqueda verificada; Tracking conserva QR y acciones reales.

El estado global permanece `PARTIALLY_COMPLETE`. No se marca `READY_FOR_RELEASE` mientras sigan pendientes las integraciones de proveedores externos, pagos/notificaciones y la aceptación física completa de cámara, GPS background, push y sincronización offline. Tampoco se considera cerrada la auditoría de controles dinámicos autenticados por rol.
## Revalidación posterior de coherencia de controles — 2026-11-03

La última corrección pública cerró la inconsistencia de clases de botones del Website sin reemplazar sus estilos: los CTAs, reintentos, acciones de mapa, búsquedas recientes y accesos de cuenta comparten ahora el contrato canónico. También se añadió una zona de transición al hover de los menús para que sus opciones puedan seleccionarse sin desaparición prematura. Los contratos estáticos, la auditoría runtime y las capturas responsive públicas permanecen en PASS.

Admin Reportes también recibió una corrección de composición: la vista, el rango de fechas y las exportaciones ahora viven en una jerarquía explícita, evitando el encabezado comprimido que hacía envolver el título y mezclaba controles. Los contratos de gráficos, exportación y navegación Admin permanecen en PASS.

La última suite completa permanece en verde después de corregir el estado de carga del buscador y el icono/etiqueta del header. El Website conserva 19 destinos internos verificables, el auditor runtime registra 330 controles en 14 rutas y la prueba responsive mantiene sus capturas y geometría.

La revalidación más reciente posterior al footer mantiene la suite completa en verde y eleva el inventario runtime a 336 controles visibles en 14 rutas, todos con destinos reales o disclosures explícitos. El footer conserva el acceso de personal sin volver a exponer funciones internas en la navegación primaria.

El inventario público generado después de ese ajuste contiene 606 filas, 49 acciones ejercitadas y 16 comportamientos verificados. El estado de lanzamiento sigue siendo `PARTIALLY_COMPLETE` por los bloqueos externos y de dispositivos documentados en este informe.

La clasificación sigue siendo `PARTIALLY_COMPLETE`: esta iteración no convierte en aceptadas las integraciones externas, pagos/notificaciones, E2E autenticado por rol ni las pruebas físicas de cámara/GPS/push/offline.

## Loader corporativo y estados de Reportes — 2026-11-03

Passenger, Admin y Driver usan ahora el loader corporativo `assets/media/encore-loader.gif` durante su arranque, con estado accesible y fallback visual reducido para movimiento. Reportes distingue el periodo de actividad de la lista de próximas salidas y presenta estados vacíos explícitos cuando no hay datos en el periodo elegido. Los contratos focalizados y la compilación de Passenger pasan; la clasificación se mantiene `PARTIALLY_COMPLETE` hasta cerrar proveedores externos, pruebas físicas/nativas y E2E autenticado por rol.

La revalidación posterior del 2026-11-04 pasó `npm test`, preparó el demo local con Laragon y ejecutó la aceptación visual autenticada de Admin a 1440 px después del cambio de Reportes. Esto confirma el comportamiento en el entorno local reproducible; no convierte en aceptadas las integraciones externas, producción, dispositivos físicos ni los recorridos E2E completos por rol.

La auditoría pública posterior registra 606 controles en nueve rutas, 49 acciones y 0 controles sin etiqueta o destino. Los disclosures legales y FAQ tienen referencias explícitas a sus paneles. El auditor runtime llegó a 339 controles visibles en 14 rutas; esta cifra fortalece la trazabilidad, pero no elimina los bloqueos de proveedores, dispositivos y producción.

La aceptación Admin posterior pasó también a 390 px con Laravel/MySQL local, además de 1440 px; se conserva la evidencia de grupos, sidebar, reportes y acciones contextuales. La aceptación visual no sustituye las pruebas físicas ni las integraciones productivas pendientes.

La matriz autenticada acumulativa de esa sesión contiene 964 filas en 15 pantallas Admin y 326 clics observados a 390/1440 px. Esto cierra la pérdida de evidencia que ocurría cuando el inventario solo tomaba la pantalla final; no se interpreta como aceptación de pagos, notificaciones, dispositivos físicos o proveedores externos. El contrato también valida referencias de campos implícitamente etiquetados y del CMS, y la tabla reutilizable expone referencias explícitas para búsqueda y tamaño de página.

Reportes conserva el dashboard ejecutivo con KPIs, tendencias, ingresos, ocupación, estados, incidencias, carga y próximas salidas; además, sus widgets pueden reordenarse por arrastre o por controles accesibles arriba/abajo. La regresión completa y la aceptación Admin autenticada siguen en PASS.

La navegación de Encore Live sí cuenta ahora con una verificación funcional de selección de ruta y unidad; la validación de datos reales en producción continúa dependiendo del servicio de posiciones configurado.

El registro operativo de paquetes también cuenta con prueba browser de alta, generación de referencia/enlace y copia del tracking. La aceptación real contra Laravel y el dispositivo Driver sigue siendo necesaria para el lanzamiento.

La última verificación pública generó `artifacts/control-audit/website-button-matrix.json` con 48 controles del Website comprobados por browser, incluidos búsqueda reciente, estados de error/recuperación y selección de ruta/unidad en Encore Live. Esto mejora la evidencia de controles públicos, pero no cambia `PARTIALLY_COMPLETE` mientras permanezcan pendientes proveedores externos, pagos/notificaciones y pruebas físicas/nativas.

La suite completa posterior a esta verificación terminó PASS. El rendimiento medido del mapa browser fue 59.51 FPS durante la interacción, con cero errores de mosaicos y cero solicitudes duplicadas; no se interpreta como aceptación de dispositivos físicos ni de proveedores productivos.

La aceptación autenticada posterior pasó Passenger, Admin y Driver a 1440 y 390 px sobre Laravel/MySQL local. El inventario resultante tiene 201 filas en `artifacts/control-audit/authenticated-control-matrix.json`, incluidos 123 clics observados. Esto fortalece la evidencia de controles por rol, pero no cambia `PARTIALLY_COMPLETE`: siguen pendientes dispositivos físicos y proveedores externos.

La última corrección de Tracking/QR estandarizó los iconos con el sistema compartido y corrigió el panel ocultable, incluyendo estados de carga y error del proveedor QR. El flujo browser pasó; el estado global permanece `PARTIALLY_COMPLETE` por las integraciones externas y aceptación nativa pendientes.

La extracción final del catálogo duplicado de iconos en Admin pasó la suite completa y los contratos de navegación. La coherencia de fuente está validada; no cambia `PARTIALLY_COMPLETE`, porque todavía faltan aceptación física móvil y proveedores productivos.

La suite completa posterior a la unificación visual también terminó PASS el 2026-11-04: 38 controles canónicos cross-surface, 330 controles runtime, 19 destinos públicos, 18 capturas responsive y métricas de mapa sin errores ni solicitudes duplicadas. Este resultado confirma la regresión del código disponible, pero no cambia `PARTIALLY_COMPLETE`: Laravel/proveedores productivos, pagos/notificaciones y la aceptación física completa de cámara, GPS background, push y offline siguen fuera de esta evidencia.
