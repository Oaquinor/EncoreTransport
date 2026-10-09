# Resultados de pruebas ejecutadas en este entorno

## Aprobadas

### JavaScript — sintaxis
Ejecutado:

```text
node --check packages/shared/real-map.mjs
node --check apps/website/app.mjs
node --check apps/driver-pwa/app.mjs
node --check apps/admin-dashboard/app.mjs
node --check tests/real-map-contract.test.mjs
node --check tests/seat-layout-visual-contract.test.mjs
```

Resultado: **APROBADO**.

### PHP — sintaxis
Ejecutado:

```text
php -l backend/laravel/app/Contracts/Maps/MapServiceInterface.php
php -l backend/laravel/app/Services/Maps/TomTomMapService.php
php -l backend/laravel/app/Http/Controllers/Api/V1/MapController.php
php -l backend/laravel/app/Http/Controllers/Api/V1/SeatController.php
php -l backend/laravel/config/maps.php
php -l backend/laravel/routes/api.php
php -l backend/laravel/tests/Feature/RealMapTileProxyTest.php
```

Resultado: **APROBADO**.

### Contratos estáticos nuevos
Ejecutado:

```text
node tests/real-map-contract.test.mjs
node tests/seat-layout-visual-contract.test.mjs
```

Resultado: **APROBADO**.

## No declaradas como aprobadas

### TypeScript / React / React Native
Se intentó una compilación aislada del overlay, pero este directorio no contiene `node_modules`. El compilador solo reportó dependencias ausentes (`react`, `react-native`, `react-native-maps`, `react/jsx-runtime`); no se registraron errores sintácticos de los archivos antes de esas resoluciones.

La validación real debe ejecutarse dentro del repositorio:

```text
npm install
npm run validate:frontend
```

y para las aplicaciones Expo:

```text
npm run mobile:passenger
npm run mobile:driver
```

### Laravel Feature Tests
No se ejecutaron aquí porque el overlay no contiene `vendor/`, configuración de DB ni una instalación Laravel completa.

Ejecutar localmente:

```text
php artisan test
```

### TomTom real
No se probó una petición real contra TomTom porque este entorno no dispone de la clave del usuario.

### Capturas responsive
No se fabricaron capturas. Deben obtenerse desde el navegador/dispositivo local después de aplicar el pack.
