# Prueba completa

## 1. Aplicar
Desde la raiz del repo:

```powershell
powershell -ExecutionPolicy Bypass -File .\EncoreTransport_REPARACION_INTEGRAL\APLICAR_REPARACION_INTEGRAL.ps1 .
```

## 2. Backend

```bat
cd backend\laravel
php artisan optimize:clear
php artisan migrate
php artisan l5-swagger:generate
php artisan test
php artisan serve
```

Debe responder `http://127.0.0.1:8000/api/v1/health`.

## 3. Frontend
En otra consola, raiz del repo:

```bat
npm install
npm run build:passenger
npm run dev
```

Abrir:
- `http://127.0.0.1:4173/website/`
- `http://127.0.0.1:4173/passenger/`
- `http://127.0.0.1:4173/driver/`
- `http://127.0.0.1:4173/admin/`

## 4. Website
- Debe verse con el mismo diseño baseline.
- Network debe mostrar `GET /api/v1/routes`.
- Buscar una ruta realmente existente (por ejemplo la sembrada en tu BD si aplica).
- Debe navegar a `/passenger/?origin=...&destination=...`.

## 5. Passenger
- Network: `GET /api/v1/trips/search`.
- Seleccionar viaje: `GET /api/v1/trips/{id}` y `/seats`.
- Elegir exactamente el numero de asientos igual a pasajeros.
- Completar pasajeros.
- Si no hay token, introducir credenciales reales de Passenger del entorno local.
- Crear booking.
- Esperado: `201`, booking real, normalmente `pending_payment`.
- No debe aparecer un pago exitoso inventado.

## 6. Driver
- Login con usuario role=driver.
- Debe cargar `/driver/me`, `/driver/trips/current`, passengers.
- Start trip: estado `in_progress` en MySQL.
- Mark boarded: `booking_passengers.boarded_at` se llena.
- Send GPS: nueva fila en `driver_locations`.
- Report incident: nueva fila en `incidents`.
- Complete: estado `completed`.

## 7. Admin
- Login con usuario role=admin.
- Dashboard debe cargar datos de MySQL.
- Refresh debe volver a consultar.
- Reports > Last 7 days debe usar `/api/v1/admin/reports`.

## 8. Validacion automatizada
Desde la carpeta del pack ya copiada dentro del repo:

```bat
EncoreTransport_REPARACION_INTEGRAL\VALIDAR_REPARACION_INTEGRAL.cmd
```

## 9. Si la pagina se ve en blanco
Abrir F12 > Console y Network. Verificar primero:
- `apps/website/index.html` retorna 200.
- `styles.css`, `enhancements.css`, `app.mjs` retornan 200.
- No hay SyntaxError de JS.
- `/api/v1/routes` retorna JSON o un error visible; un fallo de API ya no debe borrar el HTML del Website.
