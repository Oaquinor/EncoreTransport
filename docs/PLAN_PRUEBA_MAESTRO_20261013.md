# Plan de prueba maestro

## 1. Estado Git

```bat
git rev-parse HEAD
git status --short
git log -5 --oneline
```

No aplicar si hay modificaciones locales en archivos objetivo sin revisarlas.

## 2. Backend

```bat
cd backend\laravel
composer install
php artisan optimize:clear
php artisan migrate
php artisan encore:maps:diagnose
php artisan l5-swagger:generate
php artisan test
```

No ejecutar `migrate:fresh` sobre datos que deban preservarse.

## 3. Frontend

```bat
cd C:\Users\Laptop (Martinez)\source\repos\EncoreTransport
npm install
npm run validate:frontend
npm run build:passenger
npm run dev
```

## 4. Navegador

Validar como mínimo:

- `/website/`
- `/passenger/`
- `/driver/`
- `/admin/`
- `/login/`
- `/track-package/`

Comprobar desktop, tablet y móvil; consola sin errores no gestionados; Network sin 404/5xx silenciosos.

## 5. Mapas

Backend:

```bat
php artisan encore:maps:diagnose
```

Esperado:

```text
PASS geocoding
PASS routing
PASS map-display raster tile
PASS current trip origin/destination
```

En el navegador, comprobar:
- `/api/v1/maps/journey` 200;
- `/api/v1/maps/tiles/...` 200 image/png;
- zoom/pan;
- origen/destino;
- geometría real;
- ningún secreto TomTom en Network.

## 6. Asientos concurrentes

Dos sesiones diferentes, mismo viaje/asiento. La segunda reserva debe ser rechazada por el backend.

## 7. GPS

Driver PWA:
- autorizar ubicación;
- enviar posición;
- comprobar `driver_locations`;
- validar timestamp de última posición.

Driver Mobile:
- mantener PENDIENTE hasta instalar/configurar `expo-location` y validar Android/iOS.

## 8. Pagos

Sin proveedor configurado: no debe generarse pago aprobado ni ticket pagado.

Con sandbox real: probar cada gateway por separado, servidor + webhook + idempotencia.

## 9. Package tracking

Probar token válido, inválido, inexistente y estado actualizado. Confirmar que el endpoint público no expone datos privados innecesarios.

## 10. Evidencia

Guardar capturas reales de Website, Passenger, Driver y Admin, además de salida de pruebas y del diagnóstico TomTom. No sustituir evidencia con mocks.
