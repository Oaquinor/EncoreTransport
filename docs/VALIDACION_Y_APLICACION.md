# EncoreTransport - Pack TomTom + Swagger + Core

Este pack se aplica SOBRE el repositorio existente. No contiene claves privadas y no intenta simular respuestas de TomTom ni pagos.

## Incluye

- Swagger/OpenAPI con endpoints reales del core y Maps.
- `MapServiceInterface` y `TomTomMapService`.
- Endpoints backend para search, geocode, reverse geocode y routing.
- Configuracion `MAP_PROVIDER=tomtom` y variables TomTom en `.env.example`.
- `PricingService` para que el backend sea responsable del total de la reserva.
- `ReleaseExpiredBookings` y Scheduler para liberar holds expirados aunque no llegue otra reserva.
- Core previo: auth, trips, seats, bookings, driver location y Swagger.
- Test TomTom que hace SKIP controlado cuando no existe `TOMTOM_API_KEY`.

## Aplicacion

Desde la raiz del repositorio:

```powershell
powershell -ExecutionPolicy Bypass -File .\EncoreTransport_TOMTOM_SWAGGER_CORE\APLICAR_TOMTOM_SWAGGER_CORE.ps1 .
```

Luego en `backend\laravel\.env` agrega tu clave real, sin subirla a Git:

```env
MAP_PROVIDER=tomtom
TOMTOM_API_KEY=TU_CLAVE_REAL
TOMTOM_SEARCH_BASE_URL=https://api.tomtom.com/search/2
TOMTOM_ROUTING_BASE_URL=https://api.tomtom.com/routing/1
```

Despues:

```bat
cd backend\laravel
php artisan config:clear
php artisan migrate
php artisan db:seed --class=EncoreTransportSeeder
php artisan l5-swagger:generate
php artisan schedule:list
php artisan test
php artisan serve
```

Swagger:

`http://127.0.0.1:8000/api/documentation`

## Endpoints TomTom

- `GET /api/v1/maps/search?q=...`
- `GET /api/v1/maps/geocode?address=...`
- `GET /api/v1/maps/reverse-geocode?latitude=...&longitude=...`
- `GET /api/v1/maps/route?origin_latitude=...&origin_longitude=...&destination_latitude=...&destination_longitude=...`

La API key se usa exclusivamente en Laravel. No debe colocarse en JavaScript publico.

## Scheduler

En desarrollo puedes ejecutar:

```bat
php artisan schedule:work
```

En produccion configura el cron/scheduler oficial de Laravel para ejecutar `schedule:run` cada minuto.

## Lo que este pack NO declara terminado

- PowerTranz real: faltan credenciales/documentacion operativa del proveedor.
- Realtime productivo: depende del proveedor/infraestructura final.
- WhatsApp real: requiere credenciales y templates aprobados.
- Frontend completo consumiendo TomTom: este pack deja lista la API backend para conectarlo sin exponer la key.

No se debe marcar el proyecto como production ready mientras esos puntos y los tests E2E criticos sigan pendientes.
