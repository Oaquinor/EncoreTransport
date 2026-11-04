# EncoreTransport — Inventario de superficies y recorridos

Fecha de corte: 2026-11-02
Fuente: servidor local (`server.mjs`), entradas de `apps/` y pruebas browser existentes.

Este inventario distingue las superficies públicas que pueden verificarse sin sesión de las pantallas cuyo contenido depende de autenticación, datos sembrados o proveedores externos. Una ruta no se considera aceptada solo porque su HTML exista: necesita una prueba de navegación, estado y geometría proporcional a su riesgo.

## Superficies públicas

| Aplicación | Pantalla | Ruta | Propósito | Controles principales | Estado | Prueba |
|---|---|---|---|---|---|---|
| Website | Inicio | `/website/` | Presentar viajes, paquetería, Live y búsqueda | Selector origen/destino, fecha, pasajeros, buscar, navegación | `IMPLEMENTED` | `test:website-pages-browser`, `test:visual-browser` |
| Website | Rutas y destinos | `/website/routes/` | Explorar rutas publicadas y terminales | Filtro de rutas, tarjetas de ruta, buscar por fecha, Live | `IMPLEMENTED` | `test:website-pages-browser` |
| Website | Buscar viajes | `/website/trips/` | Transferir búsqueda a Passenger | Origen, destino, fecha, pasajeros, búsquedas recientes | `IMPLEMENTED` | `test:website-pages-browser` |
| Website | Paquetería | `/website/packages/` | Explicar envío, requisitos y tarifas | Tracking, contacto, requisitos, información de precio | `IMPLEMENTED` | `test:website-pages-browser`, `test:visual-browser` |
| Website | Servicios | `/website/services/` | Orientar a viajes, paquetes, Live y ayuda | Tarjetas de servicio, accesos directos | `IMPLEMENTED` | `test:website-pages-browser` |
| Website | Encore Live | `/website/live/` | Seleccionar una ruta y mostrar señal autorizada reciente | Selector de ruta, zoom, mapa, lista de buses, reintento | `IMPLEMENTED / DATA-DEPENDENT` | `test:visual-browser`, `test:map-performance-browser` |
| Website | Nosotros | `/website/about/` | Explicar propósito y experiencia | Planear viaje, paquetes, rutas | `IMPLEMENTED` | `test:website-pages-browser` |
| Website | Contacto | `/website/contact/` | Dirigir cada necesidad al canal correcto | Viajes, paquetes, preguntas | `IMPLEMENTED` | `test:website-pages-browser` |
| Website | Ayuda | `/website/help/` | Responder dudas agrupadas por tema | FAQ nativa, búsqueda de viaje, tracking | `IMPLEMENTED` | `test:website-pages-browser` |
| Auth | Inicio de sesión | `/login/` | Autenticar perfiles autorizados | Formulario de credenciales, recuperación | `IMPLEMENTED / AUTH-DATA-DEPENDENT` | `test:visual-browser`, `test:server-routing` |
| Tracking | Rastreo público | `/track-package/` | Consultar una referencia sin exponer cuenta | Referencia, consulta, timeline, estados de error | `IMPLEMENTED / API-DATA-DEPENDENT` | `test:visual-browser`, contratos de custodia |
| Package Register | Registro de paquete | `/package-register/` | Iniciar registro operativo de encomienda | Datos de remitente, destinatario, contenido, destino | `IMPLEMENTED / API-DATA-DEPENDENT` | `test:visual-browser`, contratos de custodia |

## Superficies operativas y autenticadas

| Aplicación | Entrada | Áreas que deben auditarse en sesión | Dependencia actual | Estado de aceptación visual |
|---|---|---|---|---|
| Admin | `/admin/` | Dashboard, clientes, usuario con pestañas, reservas, boletos, paquetes, reportes, permisos, sidebar por rol | Credencial admin demo autorizada y datos sembrados | `PASS FOCALIZADO 1440` — flujo autenticado cubre CMS, sidebar, rutas, clientes, ficha, boletos, roles, horarios, reportes e incidencias |
| Driver PWA | `/driver/` | Viaje activo, abordaje, QR, GPS, paquetes, manifiestos, transferencias, incidencias | Sesión driver demo y datos operativos sembrados | `PASS FOCALIZADO 1440` — flujo autenticado cubre viaje, GPS, paquete e incidencia |
| Passenger Web | `/passenger/` | Resultados, detalle, asientos, pasajeros, pago, boleto, Mis viajes | API configurada y datos de viaje | `IN_PROGRESS` |
| Passenger Mobile | `apps/passenger-mobile/App.tsx` | Safe areas, navegación, tickets, permisos y estados offline | AVD `EncoreATD`, APK debug `x86_64`, Laravel local por ADB reverse | `IN_PROGRESS` — arranque, selección de ruta y búsqueda verificadas; auth, cámara/GPS, offline y pago nativo pendientes |
| Driver Mobile | `apps/driver-mobile/App.tsx` | Cámara/QR, evidencia, GPS foreground/background, cola offline | AVD `EncoreATD`, APK debug `x86_64`, Laravel local por ADB reverse; viaje demo real, permisos, fallback de mapa y outbox GPS | `IN_PROGRESS` — login, viaje asignado, QR, GPS background y sincronización offline de posiciones aceptados en AVD; captura multipart de evidencia, operaciones offline, mapa nativo con clave y dispositivo físico pendientes |

## Estados y controles que deben permanecer en la matriz funcional

- Carga, vacío, error, reintento y datos actualizados.
- Menús por hover, clic, teclado, Escape y pérdida de foco.
- Formularios con validación, doble envío, reintento y pérdida de red.
- Mapa sin ruta seleccionada, ruta seleccionada, bus reciente, GPS obsoleto, desconexión y reconexión.
- Admin con permisos permitidos/denegados, paginación y filtros server-side.
- Paquetería con registro, escaneo, carga/descarga, transferencia, aceptación, discrepancia, custodia y entrega.

## Evidencia faltante que no debe ocultarse

1. Matriz completa de Admin/Driver en todos los anchos, roles y estados, más custodia completa en interfaz.
2. Pagos, correo, WhatsApp, push y TomTom productivo en sandbox; los contratos Laravel sí están probados localmente.
3. Aceptación en dispositivo de cámara, permisos, GPS background, offline y sincronización.

La ausencia de cualquiera de estos recursos conserva el estado `BLOCKED` o `IN_PROGRESS`; no se sustituye por una prueba estática de expresiones regulares.
