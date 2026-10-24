# EncoreTransport — auditoría visual y validación

Fecha: 2026-10-24
Checkout: rama `codex/funcionalidad-reservas-rutas`; HEAD `f0699a7`.
Alcance de esta entrega: Website, fechas iniciales de Passenger Web/Mobile, mapa público y revisión visual automatizada. Esta entrega no completa el rediseño integral del CMS, Admin autenticado, Driver/PWA nativos ni todos los flujos de compra.

## Hallazgos de las capturas de referencia

- El CTA “Explore current route” ofrecía abrir una ruta sin que el usuario hubiera elegido una; el modal no tenía un contexto válido.
- El acceso rápido repetía navegación a rutas y mapa junto a paquetería, sin dar peso suficiente al rastreo.
- El pie mostraba un mapa provisional de Georgetown y redes sociales sin URL oficial.
- La sección de red usaba textos genéricos y coordenadas de paradas de respaldo cuando faltaban coordenadas publicadas.
- Acerca de y Contacto exponían notas editoriales internas (incluida una referencia a una persona) y datos de contacto pendientes.
- El buscador del sitio, Passenger Web y Passenger Mobile podían comenzar sin fecha.
- Las tarjetas de ruta no usaban una imagen de ruta si el API entregaba `image_url`; no se encontró endpoint existente para que Admin cargue y gestione esas imágenes.
- Admin/Driver están protegidos por autenticación; la prueba visual sin sesión ve el acceso Login, no las consolas autenticadas.

## Cambios aplicados

- Quité el CTA genérico y el modal de ruta sin selección.
- Sustituí los tres accesos rápidos por una sección destacada que enlaza al rastreo real de paquetes.
- Añadí selector de rutas al mapa de red. El filtrado usa ids del payload publicado; el mapa muestra ubicaciones que entrega el API, y un estado explícito cuando no hay datos.
- Eliminé coordenadas geográficas de respaldo para paradas y el mapa provisional de oficina. El mapa deja de insinuar una ubicación cuando el backend no la entrega.
- Quité de Acerca de/Contacto el texto de trabajo interno. El pie elimina enlaces sociales sin URL HTTPS configurada y se adapta cuando no hay redes verificadas.
- Las tarjetas muestran `image_url` si viene del API y conservan una ilustración neutral como fallback.
- Inicialicé las fechas del Website, Passenger Web y Passenger Mobile con el día del calendario local; Website aplica mínimo de hoy.
- Actualicé contratos visuales para comprobar selector, CTA retirado, fecha por defecto y ausencia de ubicaciones inventadas.

## Línea visual aplicada / existente

- Tipografía heredada del sistema compartido; titulares adaptables con `--et-display` y espaciado compacto `--et-tight`.
- Paneles con radio compartido `--et-panel-radius: 22px` y sombra `--et-panel-shadow`; marca Encore en azul, tinta azul marino, fondos claros y acento verde para estado.
- Componentes públicos: tarjetas de ruta, sección destacada de paquetería, estados del mapa, pasos, llamadas a la acción y footer responsive.
- En móvil, el rastreo usa CTA de ancho completo, el selector del mapa se adapta al ancho y el footer/columnas se apilan.

## Validación ejecutada

- `npm test`: pasó (reglas de negocio, hardcode guard, servidor, permisos, mapas, layout de asientos, UX, GPS contract, responsive, SEO, contratos visuales y rendimiento contractual).
- `npm run test:visual-browser`: pasó 30 comprobaciones en Website, Passenger, Driver, Admin, Login y Tracking a 390, 768, 1024, 1440 y 1920 px; capturas completas incluidas en el ZIP.
- `npm run typecheck:passenger` y `npm run typecheck:passenger-mobile`: pasaron.
- `npm run build:passenger`: pasó.
- `npm run typecheck:driver-mobile`: pasó.
- `git diff --check`: pasó.
- Intenté `php artisan test --filter='OperationalCoreTest|DriverLocationPrivacyTest'`; no se ejecutó porque `php` no está instalado/disponible en este entorno Windows.

## Pendiente / bloqueos comprobables

- No hay un endpoint de CMS ni de carga de imagen de ruta encontrado en Laravel; no añadí controles falsos ni endpoints duplicados. Se necesita acordar almacenamiento y contrato de administración antes de implementarlo.
- No había API Laravel activa para estas pruebas visuales; rutas, viajes, GPS, mapa con datos, tarifas, reservas, pagos y rastreo reales no se validaron de extremo a extremo.
- Sin sesión autenticada no se pudieron recorrer Admin y Driver ni comprobar permisos efectivos desde la UI.
- El ZIP contiene capturas del estado servido localmente. Driver/Admin muestran el login; no son mockups de pantallas autenticadas. Passenger Mobile se validó por tipos, no en un simulador/dispositivo.
- No se publicó el sitio ni se creó un commit.

## Archivos tocados por esta entrega

`apps/website/index.html`, `apps/website/app.mjs`, `apps/website/public-rework.css`, `packages/shared/real-map.mjs`, `apps/passenger/src/passenger-app.tsx`, `apps/passenger-mobile/App.tsx`, `tests/real-map-contract.test.mjs`, `tests/visual-browser.test.mjs`.
