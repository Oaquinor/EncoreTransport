# Aceptación editorial del Website

Fecha: 2026-11-01

## Resultado

Las nueve páginas públicas conservan sus rutas, navegación desplegable y acciones reales, pero ahora presentan la marca como empresa de transporte y paquetería. El texto visible evita nombres internos, arquitectura y lenguaje de implementación.

## Páginas revisadas

- Inicio: búsqueda protagonista, rutas disponibles, paquetería, Encore Live y ayuda.
- Viajes: búsqueda por origen, destino, fecha y pasajeros; continúa al flujo real de reserva.
- Rutas: destinos, puntos de salida y acceso a salidas por trayecto.
- Paquetería: preparación, envío, seguimiento, entrega y tarifas sin inventar importes.
- Servicios: viajes, envíos, seguimiento y ayuda sin exponer aplicaciones internas.
- Encore Live: ubicaciones recientes con explicación comprensible de sus límites.
- Nosotros: propósito, confianza y cuidado sin afirmaciones institucionales no verificadas.
- Contacto: accesos reales y aviso explícito cuando aún no existe un canal oficial configurado.
- Ayuda: preguntas prácticas sobre viajes, boletos, encomiendas y accesibilidad.

## Protección del CMS

`WebsiteContentController` rechaza en títulos, descripciones, botones y FAQ los términos internos `backend`, `frontend`, `endpoint`, `API`, arquitectura, implementación, parámetros, contratos y `Passenger`. La validación aplica tanto al borrador como a la publicación.

## Evidencia

- `npm run test:website-editorial`: PASS.
- `npm run test:website-navigation`: PASS.
- `npm run test:website-pages-browser`: PASS; rutas profundas, refresh y transferencia de búsqueda.
- `npm run test:visual-browser`: PASS; 36 capturas responsive en 360, 390, 768, 1024, 1440 y 1920 px.
- `php artisan test`: PASS; incluye el rechazo de copy técnico del CMS.

La configuración de producción debe definir `PUBLIC_SITE_URL` con el dominio público definitivo para que el servidor emita canonical y `og:url` absolutos. Si la variable está ausente o apunta a localhost, no se promueve el dominio local como canonical de producción.
