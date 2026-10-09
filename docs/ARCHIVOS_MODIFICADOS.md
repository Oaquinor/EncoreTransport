# Archivos modificados y motivo

| Archivo | Motivo |
|---|---|
| `packages/shared/real-map.mjs` | Componente único de mapa real para Website, Passenger, Driver y Admin. |
| `apps/website/index.html` | Elimina SVG de mapa ficticio, corrige marca y agrega contenedores interactivos. |
| `apps/website/app.mjs` | Conecta rutas, seats y `maps/journey` al mapa real. |
| `apps/website/gap-close.css` | Lockup de marca, mapa y seat preview flexible. |
| `apps/passenger/src/passenger-app.tsx` | Añade mapa real, mejora flujo y resumen de quote. |
| `apps/passenger/src/seat-map.tsx` | Distribución dinámica, estados blocked/occupied/accessible. |
| `apps/passenger/src/visual-gap.css` | Presentación responsive del mapa y asientos. |
| `apps/passenger/src/main.tsx` | Carga CSS de cierre de brecha. |
| `apps/passenger/src/real-map.d.ts` | Declaración TS del módulo compartido MJS. |
| `apps/driver-pwa/index.html` | Carga estilos del cierre de brecha. |
| `apps/driver-pwa/app.mjs` | Ruta real, GPS existente, branding y validaciones de acciones. |
| `apps/driver-pwa/gap-close.css` | Mapa y layout Driver. |
| `apps/admin-dashboard/index.html` | Carga estilos nuevos. |
| `apps/admin-dashboard/app.mjs` | Mapa de operaciones real con última posición autorizada. |
| `apps/admin-dashboard/gap-close.css` | Branding y mapa responsive. |
| `apps/passenger-mobile/App.tsx` | Flujo nativo real de viaje/asiento/reserva + mapa. |
| `apps/driver-mobile/App.tsx` | Flujo nativo real de operación + mapa/boarding/incidencia. |
| `backend/laravel/app/Contracts/Maps/MapServiceInterface.php` | Contrato de tile raster. |
| `backend/laravel/app/Services/Maps/TomTomMapService.php` | Obtención de tiles TomTom desde servidor. |
| `backend/laravel/app/Http/Controllers/Api/V1/MapController.php` | Proxy binario y manejo de errores. |
| `backend/laravel/config/maps.php` | Configuración de Map Display API. |
| `backend/laravel/routes/api.php` | Ruta pública de tiles. |
| `backend/laravel/.env.example.map-additions` | Variables sin secretos para el mapa. |
| `backend/laravel/tests/Feature/RealMapTileProxyTest.php` | Prueba del proxy y protección de la clave. |
| `tests/real-map-contract.test.mjs` | Evita regresar a un SVG presentado como mapa real. |
| `tests/seat-layout-visual-contract.test.mjs` | Verifica contrato visual de asientos. |
| `package.json` | Integra nuevas pruebas a `npm test`. |
