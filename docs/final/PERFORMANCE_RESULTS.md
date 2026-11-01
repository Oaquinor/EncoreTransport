# Resultados de rendimiento

La línea base documentada incluye `npm run test:performance-browser` dentro de `npm test`. Este mandato no introduce una medición nueva ni debe confundirse con una auditoría Lighthouse o una prueba bajo carga.

## Decisiones aplicadas

- Se reutiliza la iconografía compartida y no se agrega una librería.
- El sidebar no hace llamadas nuevas al backend: filtra el registro ya cargado por permisos.
- La ficha de usuario mantiene carga independiente por pestaña para no descargar todos los datos a la vez.
- Las tablas y listas grandes conservan paginación server-side donde existe endpoint.

## Pendiente

Medir Web Vitals/Lighthouse por ruta pública, carga de Admin autenticado, bundle móvil, imágenes CMS y rendimiento con datos de volumen. No declarar presupuesto cumplido sin esos artefactos.
