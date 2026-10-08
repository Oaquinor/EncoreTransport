# EncoreTransport - Swagger + Core corregido

## Que corrige este pack

1. Swagger/OpenAPI con PHP Attributes (`OpenApi\Attributes`) para evitar dependencia de anotaciones legacy.
2. `@OA\Info` equivalente mediante `#[OA\Info]`.
3. Endpoints documentados para Health, Auth, Routes, Trips, Seats, Bookings, Drivers, Tracking y Admin.
4. Bearer Auth documentado para el boton **Authorize** de Swagger UI.
5. Seeder idempotente: se puede ejecutar mas de una vez sin chocar por `buses.plate`.
6. El seeder crea 42 asientos reales para `BUS-001`, por lo que `/api/v1/trips/{trip}/seats` deja de responder vacio.
7. El seeder solo corre en `local` o `testing` para evitar cargar credenciales demo en produccion.
8. `DriverController` deja de devolver un perfil hardcodeado y usa el conductor autenticado.
9. Busqueda de viajes aplica filtros reales de origen, destino, fecha y cantidad de pasajeros.
10. Reservas liberan holds vencidos y vuelven a calcular la disponibilidad.
11. Se conserva la restriccion unica `(trip_id, bus_seat_id)` para impedir doble reserva.
12. `config/encore.php` queda en la ruta correcta de Laravel.

## Aplicacion

Desde la raiz de EncoreTransport:

```powershell
powershell -ExecutionPolicy Bypass -File .\EncoreTransport_SWAGGER_CORE_CORREGIDO\APLICAR_SWAGGER_CORE.ps1 .
```

Si prefieres copiar manualmente, copia el contenido de `backend/laravel` del pack sobre `backend/laravel` del repo.

Luego:

```bat
cd backend\laravel
php artisan optimize:clear
php artisan migrate
php artisan db:seed --class=EncoreTransportSeeder
php artisan l5-swagger:generate
php artisan route:list --path=api/v1
php artisan serve
```

Swagger:

```text
http://127.0.0.1:8000/api/documentation
```

## Usuarios demo SOLO LOCAL/TESTING

- Passenger: `passenger@example.test` / `password`
- Driver: `driver@example.test` / `password`
- Admin: `admin@example.test` / `password`

## Pruebas

```bat
php artisan test --filter=ApiCoreSmokeTest
php artisan test --filter=SeatConstraintTest
```

## Si Swagger vuelve a decir que no encuentra PathItem

Verifica en `config/l5-swagger.php`:

```php
'annotations' => [
    base_path('app'),
],
```

El pack coloca `OpenApiSpec.php` dentro de `app/OpenApi` y los paths dentro de `app/Http/Controllers/Api/V1`, por lo que `base_path('app')` debe escanear ambos.
