# EncoreTransport — Auditoría forense de diseño y navegación del Website

Fecha: 2026-11-01  
Alcance: `apps/website`, `server.mjs`, flujo público Website → Passenger y regresiones visuales de las aplicaciones conectadas.

## Criterio de cierre

El Website debe sentirse como un producto comercial de transporte, no como una colección de bloques. Cada pantalla necesita una intención propia, una acción primaria verificable, estados de carga/error/vacío y una ruta clara hacia la siguiente tarea. La implementación conserva el inglés como idioma inicial y ofrece español mediante el selector EN/ES, metadatos localizados y `hreflang`.

## Inventario público por pantalla

| Aplicación | Pantalla | Control / zona | Propósito | Destino | Permisos | Estado | Prueba |
|---|---|---|---|---|---|---|---|
| Website | Inicio | Selector EN/ES | Cambiar idioma sin perder la página | Misma ruta con `?lang=` | Público | Implementado | SEO + browser |
| Website | Inicio | Buscador protagonista | Buscar un viaje con origen, destino y fecha | Passenger / resultados | Público | Implementado | Website pages browser |
| Website | Inicio | Ruta destacada | Descubrir una ruta publicada | Rutas / detalle | Público | Implementado | Editorial + browser |
| Website | Inicio | Route constellation | Leer la red publicada usando datos reales | Rutas | Público | Implementado | Browser fixture; vacío honesto sin API |
| Website | Inicio | Encore Live preview | Acceder al estado operativo | Encore Live | Público | Implementado | Visual browser |
| Website | Inicio | Servicios editoriales | Elegir viaje, paquetería o seguimiento | Página específica | Público | Implementado | Visual + navegación |
| Website | Inicio | FAQ esencial | Resolver dudas rápidas | Ayuda | Público | Implementado | Editorial |
| Website | Todas | Header desktop | Navegar por grupos jerárquicos | Viajes, Paquetería, Seguimiento, Empresa y ayuda | Público | Implementado | Hover, clic, Escape |
| Website | Todas | Menú desplegable | Seleccionar subpágina sin que desaparezca al cruzar el puntero | Rutas, viajes, terminales, paquetería, tracking, Live, empresa, contacto, ayuda | Público | Implementado | Browser regression |
| Website | Todas | Navegación móvil | Abrir grupos como acordeón y cerrar al navegar | Rutas internas | Público | Implementado | Responsive browser |
| Website | Todas | Barra de progreso inferior | Indicar visualmente cuánto falta de la página | Desplazamiento vertical | Público | Implementado | Browser + visual |
| Website | Rutas | Route book | Consultar rutas publicadas | Detalle / búsqueda | Público | Implementado | Datos del backend |
| Website | Viajes | Formulario de búsqueda | Iniciar reserva sin duplicar lógica comercial | Passenger | Público | Implementado | Parámetros preservados |
| Website | Paquetería | Información y requisitos | Entender el servicio antes de cotizar | Paquetería / contacto | Público | Implementado | Navegación |
| Website | Paquetería | Tarifas / pasos | Explicar preparación y entrega | Página de paquetería | Público | Implementado | Visual |
| Website | Seguimiento | Tracking público | Consultar un identificador de envío | Estado de paquete | Público, dato requerido | Implementado | Tracking contract |
| Website | Inicio | Mapa de red publicado | Mostrar la red publicada como contexto estático, sin selector ni posiciones ficticias | Inicio | Público | Implementado | Visual/browser |
| Website | Encore Live | Mapa operativo | Elegir una ruta y mostrar vehículos con ubicaciones autorizadas recientes | Live map | Público | Implementado | Visual/browser |
| Website | Servicios | Comparativa de servicios | Distinguir viaje, paquetería y operación | Destinos contextuales | Público | Implementado | Visual |
| Website | Nosotros | Confianza y contexto | Explicar la empresa sin mezclar tareas operativas | Contacto / ayuda | Público | Implementado | SEO + browser |
| Website | Contacto | Rutas de resolución | Elegir entre reserva, envío o preguntas sin inventar canales oficiales | Passenger, tracking o Help | Público | Implementado | Browser |
| Website | Ayuda | Índice y acordeones | Resolver viajes, boletos, seguimiento y entrega con respuesta inmediata | Respuesta / tracking | Público | Implementado | Accordion + teclado |
| Website | Todas | Footer | Acceder a páginas legales, ayuda y accesos operativos discretos | Rutas internas | Público; staff separado | Implementado | Navegación |

## Estados revisados

| Estado | Tratamiento |
|---|---|
| Carga | Se mantiene el estado de carga existente y no se muestra contenido comercial inventado. |
| Vacío | Rutas, Live y tracking muestran una explicación y una acción siguiente; la constelación no crea ubicaciones ficticias. |
| Error | Los mensajes conservan contexto y permiten reintentar o cambiar de ruta. |
| Datos reales | La constelación de rutas usa únicamente rutas publicadas recibidas del backend. |
| Idioma | Inglés por defecto; español seleccionable; copy estático y CMS usan campos localizados. |
| Responsive | Se validaron 360, 390, 768, 1024, 1440 y 1920 px. |
| Accesibilidad | Foco visible, teclado, Escape, `aria-expanded`, `aria-current`, reduced motion y navegación semántica. |
| Movimiento | La órbita se desactiva con `prefers-reduced-motion`; la barra inferior mantiene solo una lectura estática del avance. |

## Correcciones de interacción

El menú desplegable tenía una separación física entre el botón y el panel. Al mover el puntero hacia abajo, `pointerleave` cerraba el menú antes de que el cursor alcanzara el primer enlace. La corrección combina un solapamiento de 4 px con un cierre diferido de 180 ms; Escape, clic fuera y navegación siguen cerrando inmediatamente.

## Dirección visual aplicada

- Hero y buscador: superficie protagonista con profundidad y radios amplios.
- Rutas: composición de libro de rutas y red visual, no una cuadrícula de tarjetas repetidas.
- Live: hero oscuro para señal operativa, workspace claro para el mapa y ayuda contextual separada.
- Paquetería: secuencia de custodia y pasos numerados.
- Ayuda: filas expandibles, lectura rápida y foco de teclado; se retiró la sección explicativa de accesibilidad porque no era una tarea del visitante.
- Nosotros: composición narrativa con burbuja de conversación, línea de recorrido y principios conectados; no se reutiliza la tarjeta lateral genérica.
- Contacto: hero oscuro y rutas de ayuda completas en filas grandes, cada una con destino real y señal de avance.
- Ayuda: índice anclado por tema, dos secciones de FAQ y acción visible hacia búsqueda/rastreo; no se presentan botones ambiguos ni paneles vacíos.
- Loader: GIF de marca como estado de arranque corto; el contenido no depende de que terminen mapas o recursos externos.
- Servicios y páginas internas: tarjetas con radios moderados, bordes ligeros y agrupaciones con contenedor redondeado; se eliminan sombras pesadas y decoraciones sin función.
- Progreso: barra inferior discreta, sin etiquetas laterales ni espacio reservado en el contenido.

## Referencias de producto

La composición toma patrones de productos reales: búsqueda centrada para reservar, tracking por identificador y consistencia de jerarquía de navegación. No se copiaron assets ni contenido de terceros; se adaptaron esos patrones a las rutas y datos de EncoreTransport.

## Evidencia ejecutada

- `npm run test:website-pages-browser` — PASS.
- `npm run test:website-navigation` — PASS.
- `npm run test:visual-browser` — PASS en la verificación dirigida de esta iteración para Website a 390 y 1440 px; la regresión amplia de 36 comprobaciones corresponde a la ejecución anterior documentada.
- `npm run test:website-pages-browser` — PASS; nueve páginas, transferencia de búsqueda, recuperación de búsqueda reciente, selector EN/ES y capturas multipágina de About, Contact y Help.
- `npm test` — PASS.
- `git diff --check` — sin errores de formato.

## Addendum — refinamiento de Encore Live

Fecha de verificación: 2026-11-01.

| Aplicación | URL | Componente | Estado anterior | Causa raíz | Corrección | Prueba de aceptación |
|---|---|---|---|---|---|---|
| Website | `/website/live/` | Superficie principal | Hero, mapa y ayuda compartían un fondo navy continuo; el selector parecía flotante y el estado vacío quedaba visualmente unido al mapa | `.site-page--live` aplicaba `background: #071f31` a todo el `main`, mientras la cabecera del mapa no tenía una composición propia | Hero oscuro limitado a la señal; workspace de mapa claro; selector en panel etiquetado; mapa vacío con fondo técnico y estado contextual; tarjetas inferiores en superficie tintada | `test:website-pages-browser`, `VISUAL_SURFACES=website VISUAL_VIEWPORTS=390,1440 npm run test:visual-browser`, captura `website-live-multipage-1440.png` |

La ruta sigue siendo operacional: el estado inicial conserva `Select a route`, no muestra vehículos ficticios y solo dibuja posiciones recibidas del backend después de seleccionar una ruta. La prueba visual también cubre selección de ruta, selección de autobús y estado de señal reciente.

### Limitaciones de esta iteración

- La ejecución amplia de browser pasó Website, Passenger, Driver, Admin, Login y Tracking en 390 y 1440 px, pero Admin y Driver se resolvieron como pantalla de acceso al no existir credenciales visuales configuradas en esa ejecución; no se declara aceptación interna de esos módulos.
- Passenger mostró el mensaje controlado de API no disponible en la captura sin backend. No se sustituyó por datos simulados.
- La prueba de mapa de navegador registró en el entorno de prueba 37.1 ms hasta primera imagen y 122.3 ms hasta carga completa en la primera carga; en la segunda, 49 ms y 76.5 ms respectivamente, sin errores ni URLs duplicadas. Estas cifras no sustituyen una medición de producción con red móvil real.

## Addendum — alineación transversal de páginas públicas

Se identificó una causa estructural de las franjas vacías que hacían que las composiciones parecieran descentradas: `.site-page` aportaba `padding: 72px 0 110px` aunque cada página ya definía el espacio de su hero y de sus secciones. La regla se neutralizó en `innovation.css` con `padding-block: 0`; el ritmo queda bajo responsabilidad de `routes-hero`, `packages-hero`, `trips-hero`, `about-intro`, `contact-intro`, `help-intro` y las secciones propias de cada página. Se verificó nuevamente el Website en 390 y 1440 px, incluyendo refresh, overflow y transferencia de búsqueda.

Las pruebas visuales cubren Website, Passenger, Driver, Admin, login y tracking como regresión. La intervención estética profunda de esta iteración se concentra en el Website público; no se declara aquí aceptación nativa de cámara, GPS background, pagos externos, correo, push ni dispositivos reales.

