# Encore Transport — sistema de diseño y estados

El progreso integral y sus bloqueos se mantienen en `docs/final/MASTER_GOAL_TRACKER.md`. Este documento describe el contrato visual vigente; el tracker determina qué partes están implementadas, verificadas o bloqueadas.

## Alcance

Este documento define el lenguaje visual aplicado a Website, Passenger, Driver, Admin, Tracking y Package Register. La configuración de cuenta de Admin sigue las referencias `REF_01`–`REF_10` del paquete de mandato sin copiar datos ilustrativos.

## Tokens

- Tinta: `#102130`; tinta secundaria: `#1b3548`.
- Azul primario: `#168dcc` / `#2da9df`; verde operativo: `#1f9d74`; peligro: `#d15858`.
- Fondos: `#eef3f6`, `#f8fcfd`, blanco.
- Radios: `12px` para controles canónicos, 14–18px para tarjetas, 22–28px para superficies principales. Las cápsulas de navegación, estados, badges y tabs sólo usan radio pill cuando su semántica lo requiere.
- Focus: outline de 3px con azul translúcido; todos los controles son navegables por teclado.

## Cuenta de Admin

La pantalla usa breadcrumb, encabezado, pestañas, tarjeta de avatar, información personal, acceso y estado de dispositivos. Las pestañas sin API no se presentan como funcionales: muestran `Unavailable` y explican el bloqueo. La carga de foto usa selección real, previsualización, recorte cuadrado centrado con zoom, validación de tipo/tamaño y persistencia en Laravel. La eliminación usa confirmación explícita `DELETE` y conserva la regla de anonimización del backend.

## Arquitectura del Website

El Website es ahora multipágina. La navegación primaria expone `Inicio`, `Viajes`, `Paquetería`, `Seguimiento` y `Empresa y ayuda`; cada grupo despliega destinos reales con hover, clic y teclado en escritorio, y se comporta como acordeón en móvil. Escape, navegación a un enlace, pérdida de foco y cambio de breakpoint cierran los menús abiertos.

La auditoría visual final de esta iteración revisó las nueve páginas públicas en 390 y 1440 px, además de los diez anchos de la prueba geométrica. Se corrigió el cierre del dropdown al abandonar el puntero, se mantuvo el puente de selección entre botón y panel y `ArrowDown`/`ArrowUp` llevan el foco al primer/último destino. Cuando un proxy de mapas responde sin imágenes, el Website conserva un estado de red diseñado y un mensaje de recuperación visible; no muestra un rectángulo gris ni inventa ubicaciones.

Las páginas públicas son `/website/`, `/website/routes/`, `/website/trips/`, `/website/packages/`, `/website/services/`, `/website/live/`, `/website/about/`, `/website/contact/` y `/website/help/`. La home conserva únicamente la decisión inicial: hero, búsqueda, rutas destacadas, acceso contextual a paquetería, resumen de Encore Live, servicios y ayuda. Las explicaciones extensas viven en sus páginas propias.

El recorrido comercial primario es inicio/búsqueda → resultados → detalle → asientos → pasajeros → pago → boleto en Passenger. El Website solo construye y transfiere `origin`, `destination`, `date` y `passengers`; no duplica la lógica de reserva. `Platform`, `Journey Control` y la barra rápida no son superficies públicas. El acceso de personal se mantiene discreto en el footer y la cuenta/reservas permanecen separadas.

El idioma servido por defecto es inglés (`lang="en"`). `apps/website/locale-data.mjs` centraliza los recursos EN/ES, metadata por página y traducción del contenido público; el selector accesible aparece en header desktop y navegación móvil, persiste `encore_site_locale_v1` y conserva ruta, hash y parámetros de búsqueda. El servidor genera `lang`, canonical, Open Graph, Twitter Cards y `hreflang` EN/ES/x-default para la variante solicitada. Cada página tiene una composición propia: rutas usa una lectura editorial de destinos, viajes prioriza el formulario en una superficie oscura, paquetería usa una secuencia numerada, Live prioriza el mapa, y ayuda/contacto separan consulta y soporte.

La capa visual premium añade una narrativa de recorrido: `premium-interactions.mjs` muestra una barra de progreso inferior durante el desplazamiento, y la Home incluye una constelación abstracta alimentada únicamente por rutas publicadas reales. El inicio mantiene un mapa estático de la red; la selección de una ruta y las posiciones autorizadas viven únicamente en Encore Live. Live separa ahora el hero de señal en tiempo real, el workspace claro del mapa y la ayuda contextual, para que el fondo no convierta toda la pantalla en una sola superficie oscura. Las páginas públicas controlan ahora su propio ritmo vertical: el contenedor multipágina no añade bandas vacías globales encima del hero ni debajo de la última sección. Los servicios y FAQ se presentan como líneas editoriales, no como una colección de tarjetas independientes. Los marcadores decorativos de numeración fueron reemplazados por iconos, puntos, estados y una barra de progreso; los números se reservan para datos reales como conteos de rutas. About usa una burbuja de conversación y principios conectados; Contact usa rutas accionables en filas; Help usa un índice de temas y acordeones compactos. El GIF de marca `/assets/media/encore-loader.gif` se utiliza como loader global breve, con fallback por tiempo y sin bloquear la carga operativa. El movimiento se limita a órbitas y señales ligeras, respeta `prefers-reduced-motion` y no reemplaza ningún dato operativo del backend.

## Estados de privacidad de paquetería

`recipient_email` se trata como dato de contacto: registrar un paquete no busca automáticamente una cuenta ni vincula o notifica a un pasajero. La vinculación requiere confirmación explícita. La evidencia fotográfica de entrega se guarda en almacenamiento privado y el tracking público solo expone el estado operativo mínimo, sin correo, teléfono ni notas internas.

## Reglas por aplicación

- **Website:** identidad comercial, una búsqueda principal, rutas y paquetes como accesos contextuales; no expone herramientas internas de operación.
- **Admin:** producto empresarial con sidebar por dominio, header persistente, breadcrumbs, búsqueda server-side, tablas paginadas, filtros combinables, acciones contextuales, permisos visibles y estados de carga/error/vacío.
- **Passenger:** aplicación personal centrada en el próximo viaje, con reservas, boletos vigentes e historial separados; el pago y la emisión del boleto muestran estados reales del backend.
- **Driver:** operación primero: viaje activo, pasajeros, paquetes, vehículo, GPS e incidencias; cada acción debe ser rápida, reversible cuando corresponda y autorizada por Laravel.
- **Paquetería:** la referencia, estado actual, próxima acción y línea temporal son el eje; los detalles administrativos y la evidencia privada no se mezclan con el tracking público.

## Navegación Admin premium

El sidebar organiza únicamente módulos existentes y autorizados en `Operations`, `Fleet`, `Clients`, `Paquetería`, `Control` y `System`. Cada grupo es expandible, persistente y navegable por teclado; el módulo activo expone `aria-current="page"`. En modo colapsado se conservan el tooltip/nombre accesible, el icono y una abreviatura visual del grupo. La especificación de aceptación está en `docs/final/ADMIN_NAVIGATION_ACCEPTANCE.md`.

## Componentes compartidos

Se reutilizan los patrones de `packages/shared`: botones con foco visible, badges semánticos, tablas con búsqueda/paginación, tarjetas de viaje, mensajes de estado, mapas con fallback explícito y controles táctiles. No se crea una hoja correctiva nueva para ocultar problemas; las reglas específicas permanecen junto a la aplicación responsable y los contratos de comportamiento se prueban en frontend o Laravel.

Los iconos operativos tienen una única fuente en `packages/shared/icons.mjs`; Admin, Tracking y Driver no deben declarar catálogos SVG paralelos. Las acciones de Tracking mantienen etiqueta visible, icono, estado ARIA y una salida recuperable cuando el QR de QuickChart no está disponible.

Las superficies de Website, Login, Admin, Tracking y Package Register usan además el contrato de clases canónicas para que los controles equivalentes conserven la misma geometría, foco, jerarquía y ritmo de iconos, aunque cada producto pueda conservar una variante de composición propia. Los disparadores de navegación también exponen la base `button` sin perder su geometría de menú; Reportes mantiene una cabecera de análisis de dos niveles para separar vista, rango temporal y exportaciones.

El Website añade `tests/website-control-visual-contract.test.mjs` como guardia de coherencia computada: verifica los controles visibles de sus nueve páginas a 390, 768 y 1440 px, exige `border-box`, radio visible, etiqueta y altura táctil mínima. El CTA principal del footer y las pestañas de la inducción de Paquetería participan ahora del mismo estándar.

La comprobación `tests/control-cross-surface-visual.test.mjs` extiende ese estándar a Website, Viajes, Tracking, Package Register, Login, Driver y Admin. Los controles canónicos usan `--et-radius-control` (12 px); las formas pill se reservan a navegación, estados, badges y tabs, evitando que una variante contextual se confunda con una acción de producto.

La auditoría funcional pública también genera `artifacts/control-audit/website-control-inventory.json`: una fila por control de las nueve rutas del Website, con propósito, destino, permisos, estado y prueba. Los menús y disclosures inicialmente ocultos se conservan como controles disponibles para que la matriz no confunda visibilidad inicial con ausencia de funcionalidad.

`artifacts/control-audit/website-control-coverage.json` complementa el inventario con 16 comportamientos ejercitados. La regla de cierre es que cada clase de control tenga evidencia de interacción —no basta con que el HTML exista— y que la matriz mantenga separadas las acciones verificadas, los enlaces navegables y los estados disponibles.

La arquitectura CSS del Website se mantiene bajo auditoría por capas. La importación histórica no consumida de `apps/website/premium.css` fue retirada después de rastrear consumidores; el inventario y el criterio para las próximas extracciones están en `docs/final/CSS_ARCHITECTURE_AUDIT.md`.

## Responsive

Desktop usa dos columnas; tablet apila tarjetas manteniendo densidad intermedia; móvil convierte el formulario en una columna y mantiene botones táctiles. La geometría pública se comprueba en 320, 360, 375, 390, 414, 768, 1024, 1280, 1440 y 1920 px: cada hero, sección, mapa, footer y control visible debe permanecer dentro del viewport, sin overflow horizontal ni controles de tamaño cero. Las capturas principales se conservan en `artifacts/visual/`.

## Estados

Implementados: vacío, con datos, foto seleccionada, zoom, guardado, error de archivo, confirmación destructiva, dispositivo no disponible y cierre de sesión. No se inventan preferencias, dispositivos, actividad ni notificaciones sin endpoints reales.

## Live y móvil operativo

Encore Live usa posiciones recibidas del backend, polling adaptativo con recuperación al volver online o visible, interpolación breve entre puntos recientes y marcador stale cuando el GPS queda obsoleto. Las animaciones se cancelan al desmontar para no dejar timers ni frames activos; WebSocket/SSE queda fuera hasta que exista un contrato autenticado.

Driver Mobile incorpora cámara QR, captura de evidencia privada, verificación explícita del destinatario y GPS foreground/background con permisos nativos. Passenger Mobile falla de forma segura cuando no hay red para no crear reservas o pagos locales ficticios. Estas capacidades requieren aceptación en emulador o dispositivo real antes de producción.

La navegación pública mantiene el panel desplegable de escritorio pegado a su botón disparador para que no exista una ranura de puntero al cruzar hacia los enlaces. La outbox de custodia de Driver solo conserva cargas `in_progress`; entregas con evidencia y transferencias permanecen bloqueadas sin red.

La cabecera pública comparte ahora una base geométrica de 40 px, `border-box` y radio `12px` entre disparadores de menú, selector EN/ES y accesos de cuenta. El menú móvil conserva su variante táctil de 44–48 px para no comprimir la interacción en pantallas pequeñas.

El footer público usa una composición de cierre diferenciada pero perteneciente al mismo sistema: rail decorativo de red, firma de marca, contacto verificado, mapa del sitio, servicios y una tarjeta de siguiente paso. Los enlaces se mantienen sobre rutas reales y las opciones de privacidad, términos y accesibilidad siguen siendo disclosures accesibles; no se muestran redes sociales ni formularios de suscripción hasta disponer de canales confirmados y un endpoint real.

Los estados de arranque comparten la marca sin fingir actividad: Website, Passenger, Admin y Driver usan `assets/media/encore-loader.gif` con mensaje contextual, semántica `status` y tratamiento de movimiento reducido. En Reportes, la actividad del periodo y los próximos viajes son contextos distintos; el diseño los etiqueta y usa estados vacíos explicativos para que una gráfica sin actividad no parezca un fallo ni un dato inventado.
