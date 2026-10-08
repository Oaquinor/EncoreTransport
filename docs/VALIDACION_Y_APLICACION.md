# Aplicacion y validacion

## 1. Aplicar
Desde la raiz de EncoreTransport:

```powershell
powershell -ExecutionPolicy Bypass -File .\EncoreTransport_CONSOLIDACION_TOTAL\APLICAR_CONSOLIDACION_TOTAL.ps1 .
```

El script crea `.encore_backup_YYYYMMDD_HHMMSS`, copia los archivos y retira copias legacy de configuracion despues de respaldarlas. No sobrescribe tu `.env` real.

## 2. Backend

```bat
cd backend\laravel
composer install
php artisan optimize:clear
php artisan migrate
php artisan l5-swagger:generate
php artisan schedule:list
php artisan test
php artisan serve
```

No ejecutes `migrate:fresh` en una base con datos a conservar.

Swagger:
`http://127.0.0.1:8000/api/documentation`

## 3. Datos de desarrollo (opcional)
Solo en `APP_ENV=local` o `testing`:

```bat
php artisan db:seed --class=EncoreTransportSeeder
```

No ejecutar demo seeders en produccion.

## 4. Frontend
En otra consola desde la raiz:

```bat
npm install
npm run validate:frontend
npm run dev
```

- Website: `http://127.0.0.1:4173/`
- Passenger: `http://127.0.0.1:4173/passenger/`
- Driver: `http://127.0.0.1:4173/driver/`
- Admin: `http://127.0.0.1:4173/admin/`

El preview server proxifica `/api/*` al backend definido por `LARAVEL_API_ORIGIN` (por defecto `http://127.0.0.1:8000`).

## 5. Variables frontend/preview
Raiz `.env.example`:

```env
PORT=4173
HOST=127.0.0.1
PUBLIC_BASE_URL=http://127.0.0.1:4173
LARAVEL_API_ORIGIN=http://127.0.0.1:8000
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
```

## 6. Variables Laravel esenciales
Conserva tus credenciales reales solo en `.env` (no Git):

```env
APP_ENV=local
APP_URL=http://127.0.0.1:8000
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=encoretransport
DB_USERNAME=root
DB_PASSWORD=

MAP_PROVIDER=tomtom
TOMTOM_API_KEY=
TOMTOM_SEARCH_BASE_URL=https://api.tomtom.com/search/2
TOMTOM_ROUTING_BASE_URL=https://api.tomtom.com/routing/1
TOMTOM_LANGUAGE=es-ES
TOMTOM_COUNTRY_SET=DO

ENCORE_CURRENCY=DOP
ENCORE_BOOKING_HOLD_MINUTES=15
PAYMENT_GATEWAY=unconfigured
```

## 7. Prueba funcional sugerida
1. `GET /api/v1/health`.
2. Website: consulta rutas reales.
3. Website: busca un viaje existente.
4. Passenger: selecciona viaje y carga asientos reales.
5. Passenger: completa un pasajero por asiento.
6. Passenger: login con un usuario real y crea booking.
7. Comprueba `pending_payment` y hold.
8. Comprueba que Payment responda configuracion pendiente si gateway sigue `unconfigured`; NO debe marcar `paid`.
9. Driver: login con usuario driver real, start trip, boarding, GPS, complete.
10. Admin: login admin y consulta dashboard/reportes/incidentes.

## 8. Swagger
Tras generar, verifica que documente las rutas que realmente existen. Este pack agrega documentacion de las operaciones nuevas en `app/OpenApi/OpenApiSupplement.php` y mantiene los atributos existentes.

## 9. Scheduler
Para liberar holds en un entorno real debes ejecutar el scheduler:

```bat
php artisan schedule:work
```

o configurar cron para `php artisan schedule:run` cada minuto.

## 10. Pagos
No configures `PAYMENT_GATEWAY=powertranz` hasta que exista el adapter real validado contra documentacion oficial y credenciales. El pack deliberadamente no inventa endpoints, firmas ni respuestas de PowerTranz.
