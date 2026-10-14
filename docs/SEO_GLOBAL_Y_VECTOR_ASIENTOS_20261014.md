# SEO global + vectorización real de asientos

## Rutas revisadas

### Indexables

- `/website/`
- `/track-package/`

### No indexables

- `/passenger/`
- `/driver/`
- `/admin/`
- `/login/`
- `/api/*`

Esto es intencional. SEO no significa indexar todo. Las pantallas transaccionales, operativas y autenticadas no deben competir con las páginas públicas en buscadores.

## Website

Se mantiene:

- title;
- description;
- Open Graph;
- Twitter metadata;
- FAQ schema;
- Organization/WebSite schema;
- canonical relativo mientras no exista dominio de producción confirmado.

## Passenger

Tiene:

- title útil;
- description;
- favicon;
- `noindex,nofollow,noarchive`.

Passenger es el flujo transaccional de reserva, no una landing de adquisición orgánica.

## Driver

Se corrige `lang="es"` a `lang="en"` porque el contenido actual está en inglés.

También se añade:

- description;
- favicon;
- application-name;
- `noindex,nofollow,noarchive`.

## Admin

Se añade:

- application-name;
- description;
- favicon;
- `noindex,nofollow,noarchive`.

## Login

Se mantiene como `noindex` y se refuerza con `noarchive`.

## Package Tracking

Es pública e indexable.

Se amplía:

- canonical;
- Open Graph URL/site-name;
- Twitter metadata;
- description orientada a la intención `track a package`.

## API proxy

Las respuestas proxied `/api/*` reciben:

```text
X-Robots-Tag: noindex, nofollow, noarchive
```

Esto evita indexación accidental de endpoints.

## Asientos del homepage

Se elimina el JPEG de referencia.

El nuevo:

```text
apps/website/seat-layout-preview.svg
```

es un SVG vectorial real.

Características:

- `viewBox` responsivo;
- carrocería horizontal;
- cockpit;
- volante;
- puerta;
- 13 columnas de 2+2;
- pasillo central;
- 52 asientos principales;
- 3 asientos contra la pared trasera;
- total visual 55;
- numeración vectorial;
- asientos construidos con `rect`, no raster;
- se redimensiona sin perder calidad.

La foto del autobús continúa en el Hero. La sección de Seats usa únicamente el SVG.

## Sitemap

No se genera todavía porque un sitemap válido requiere URLs absolutas y el dominio público final no está confirmado.

Cuando exista el dominio, se deben cerrar:

- canonical absoluto;
- `og:url` absoluto;
- `og:image`;
- sitemap XML;
- Search Console;
- Bing Webmaster Tools si se requiere.
