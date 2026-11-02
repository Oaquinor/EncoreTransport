# Aceptación visual final

## Evidencia ejecutada

`npm run test:visual-browser` completó 36 checks para Website, Passenger, Driver, Admin, Login y Tracking en 360, 390, 768, 1024, 1440 y 1920 px. Las capturas se generan en `artifacts/visual/` y corresponden al código ejecutado.

El flujo Admin autenticado focalizado también pasó a 1440 px, cubriendo CMS, edición de rutas, creación de horario, cuentas/roles, reportes y paquetería. La comparación visual del Website conserva `artifacts/website-current-1440.png` y `artifacts/website-ref1-after-1440.png`; la captura actual es `artifacts/visual/website-1440.png`.

## Resultado perseguido

- Admin: sidebar por dominio, indicadores reales, tablas y acciones contextuales.
- Passenger: búsqueda, próximo viaje, reservas y boleto separados.
- Paquetería: estado, próxima acción, tracking y evidencia privada diferenciados.
- Driver: viaje activo, pasajeros, paquetes, GPS e incidencias en una jerarquía operativa.
- Website: búsqueda comercial protagonista, sin exponer `Platform`, `Journey Control` ni la barra rápida.

## Aceptación

`PARTIAL`: la revisión visual automatizada pasa, pero no se declara aceptación de lanzamiento mientras no existan pruebas en dispositivos reales, E2E autenticado configurado y proveedores externos disponibles.

La reorganización del sidebar Admin fue aplicada después de la captura de línea base. La captura autenticada posterior pasó a 1440 px contra Laravel local sembrado con credenciales autorizadas. La aceptación visual móvil nativa y la cobertura por rol siguen pendientes.

## Addendum — última revisión del Website

`/website/live/` fue revisado después de detectar que todo el `main` compartía un fondo navy. El hero conserva la identidad de señal en tiempo real, pero el mapa ahora se presenta en un workspace claro con selector explícito, estado vacío legible y panel de vehículos separado. La captura posterior es `artifacts/visual/website-live-multipage-1440.png`.

La ejecución más reciente de `npm run test:visual-browser` pasó 12 comprobaciones en 390 y 1440 px para Website, Passenger, Driver, Admin, Login y Tracking. La prueba específica de páginas profundas también pasó en 390, 768 y 1440 px. Esto valida navegación/responsive público; no reemplaza la aceptación autenticada por rol ni la prueba nativa en dispositivo.

La última corrección transversal eliminó el padding vertical global de `.site-page`, que estaba introduciendo bandas vacías antes y después de páginas con hero/secciones propias. Se revisaron nuevamente las capturas de Trips y Routes; sus ejes comienzan ahora inmediatamente después del header y terminan con el footer sin una franja artificial adicional.
