# Auditoría pública, contenido y SEO — EncoreTransport

## Qué se corrigió

El objetivo de esta revisión no es añadir texto por añadir texto. Se separó lo que necesita un visitante normal de lo que solo interesa al equipo técnico.

## 1. Hero

Se conserva la dirección visual solicitada:

- `Travel with confidence.`
- `Every step of the way.`
- `Find your trip, choose your route, and pick your seat.`
- CTA `Search a trip`.
- CTA `Explore current route`.
- solo dos indicadores visibles: Routes y Departures.

La imagen original de `assets/media/Autobus.png` se mantiene.

## 2. Seat Experience del Website

El seat map técnico se retira visualmente del homepage.

El homepage ahora explica un beneficio sencillo:

- ver qué asientos están disponibles;
- elegir los asientos necesarios;
- revisar la selección antes de continuar.

El elemento `#seatPreview` permanece oculto para conservar la lógica existente que calcula `#seatState`.

El selector real y detallado permanece en Passenger, donde sí tiene sentido.

## 3. Copy orientado a pasajeros

Se eliminan del contenido público expresiones como:

- configured map service;
- configured seat layout;
- server quote;
- server total;
- row_number;
- position_index;
- provider verification;
- raw backend error messages.

El usuario ve lenguaje de viaje y reserva, no lenguaje de implementación.

## 4. SEO

Se reforzó el Website con:

- title orientado a intención:
  `Encore Transport | Bus Routes, Trips & Seat Selection`;
- meta description;
- robots;
- favicon;
- Open Graph title/description/site name/locale;
- Twitter title/description;
- canonical relativo, porque el dominio de producción todavía no está confirmado;
- Organization structured data;
- WebSite structured data;
- FAQPage structured data;
- FAQ visible equivalente al schema;
- headings H1/H2 con jerarquía semántica;
- enlaces internos claros hacia Passenger y Package Tracking;
- copy natural alrededor de rutas, viajes, asientos y paquetes.

No se añadió un sitemap con URLs inventadas porque `sitemap.xml` necesita el dominio público definitivo.

## 5. Indexación

### Indexables

- `/website/`
- `/track-package/`

### No indexables

- `/login/`
- `/passenger/`
- `/driver/`
- `/admin/`
- `/api/`
- `/move/`

Esto evita que pantallas transaccionales o internas compitan con el sitio público.

## 6. Package Tracking

El usuario ya no ve `secure tracking token` como concepto principal.

La interfaz habla de:

- Tracking number;
- Current status;
- Route;
- latest recorded update.

Los errores ya no muestran mensajes internos.

## 7. Passenger

Se conservan todas las llamadas API y reglas existentes.

Solo se cambia lenguaje visible:

- `Server quote` → `Trip total`;
- `Server total` → `Total`;
- `Hold seats / Create booking` → `Reserve seats`;
- mensajes técnicos de pago → explicación natural para el pasajero;
- error de seat metadata → mensaje normal de indisponibilidad;
- errores de mapa dejan de mostrar el detalle técnico.

## 8. Auth

La pantalla es de staff, por lo que se marca `noindex,nofollow`.

La comunicación se simplifica a:

`Sign in with your Encore account to continue to your workspace.`

## 9. Pendiente para SEO de producción

Para cerrar SEO al 100% todavía hace falta conocer el dominio público definitivo.

Con ese dato se deben generar:

- canonical absoluto;
- `og:url` absoluto;
- `og:image` absoluto;
- sitemap XML con URLs absolutas;
- Search Console / Bing Webmaster verification si el cliente lo requiere.

No se inventaron estas URLs.
