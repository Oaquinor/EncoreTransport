# Matriz de navegación del Website

Actualizado: 2026-11-01. La navegación comercial se separa de Passenger y de las herramientas internas.

| Antes | Ahora | Destino verificable | Funcionalidad preservada |
|---|---|---|---|
| `Home` y múltiples anclas de la misma página | `Inicio` | `/website/` | Hero, búsqueda protagonista, rutas, paquetería, Encore Live y ayuda resumida |
| `Trips` → `#book` | `Viajes` → `Rutas y destinos` / `Buscar viajes` / `Terminales` | `/website/routes/`, `/website/trips/`, `/website/routes/#terminals` | Búsqueda, horarios, rutas y acceso a asientos en Passenger |
| `Routes` mezclado con contenido de home | `Rutas y destinos` | `/website/routes/` | Rutas y segmentos reales cargados desde API |
| `Seats` como explicación dentro de home | Acción contextual después de seleccionar salida | `/passenger/` | Seat map, pasajeros, pago y boleto permanecen en Passenger |
| `Trip map` dentro de la página principal | `Encore Live` | `/website/live/` | Mapa de red y ubicaciones autorizadas |
| `Services` como bloque extenso | `Paquetería` → `Información` y `Servicios` | `/website/packages/`, `/website/services/` | Información, requisitos, tarifas condicionadas y accesos operativos públicos |
| `Platform` / `Journey Control` | Eliminados de la navegación comercial | Acceso de personal en `/login/` | Admin y Driver no se presentan como producto público |
| `About` y `Contact` como secciones al final | `Empresa y ayuda` → `Nosotros` / `Contacto` / `Preguntas frecuentes` | `/website/about/`, `/website/contact/`, `/website/help/` | Contenido empresarial y canales sin datos ficticios |
| `Tracking` y CTA de paquete repetidos | `Seguimiento` → `Encore Live` / `Rastreo de paquetes` | `/website/live/`, `/track-package/` | Seguimiento de red y tracking de paquetes separados |

## Reglas de interacción

- Escritorio: los grupos se abren con hover, clic o foco; un solo grupo permanece abierto.
- Teclado: `Tab` entra a botones y enlaces, `Enter`/`Space` abre un grupo y `Escape` lo cierra devolviendo el foco al botón.
- Móvil: el botón hamburguesa abre la navegación; cada grupo es un acordeón independiente y los enlaces cierran el panel.
- Enlaces profundos: `/website/routes/`, `/website/trips/`, `/website/packages/`, `/website/services/`, `/website/live/`, `/website/about/`, `/website/contact/` y `/website/help/` responden directamente y soportan refresh.
- Búsqueda: Website conserva origen, destino, fecha y pasajeros al navegar a `/passenger/`; la lógica de resultados, asientos, pagos y boletos no se duplica.

## Evidencia

`website-navigation.test.mjs`, `server-routing.test.mjs`, `website-pages-browser.test.mjs` y `visual-browser.test.mjs` cubren rutas, menú desktop/móvil, Escape, refresh, responsive y transferencia de parámetros.
