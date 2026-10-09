# Pruebas en Laragon

## 1. Backend

Desde la raíz de Laravel:

```bat
cd "C:\Users\Laptop (Martinez)\source\repos\EncoreTransport\backend\laravel"
composer install
php artisan optimize:clear
php artisan migrate
php artisan l5-swagger:generate
php artisan test
php artisan serve
```

No usar `migrate:fresh` sobre una base con información que deba conservarse.

## 2. Frontend web

En otra consola, desde la raíz del repositorio:

```bat
cd "C:\Users\Laptop (Martinez)\source\repos\EncoreTransport"
npm install
npm run validate:frontend
npm run dev
```

## 3. URLs

- Website: `http://127.0.0.1:4173/website/`
- Passenger: `http://127.0.0.1:4173/passenger/`
- Driver: `http://127.0.0.1:4173/driver/`
- Admin: `http://127.0.0.1:4173/admin/`
- Swagger: `http://127.0.0.1:8000/api/documentation`

## 4. Verificación del mapa

En DevTools > Network:

- Deben aparecer peticiones a `/api/v1/maps/tiles/...png`.
- NO debe aparecer `TOMTOM_API_KEY` en la URL del navegador.
- `/api/v1/maps/journey` debe devolver origen, destino y `route.points`.

Si falta la clave, la UI debe mostrar `Route map unavailable`, no una línea falsa.

## 5. Asientos

1. Buscar un viaje real.
2. Abrir Passenger.
3. Verificar que la disposición corresponda a `row_number` y `position_index`.
4. Marcar un asiento disponible.
5. Intentar reservar el mismo asiento desde una segunda sesión.
6. La segunda operación debe recibir `422` y no crear una reserva duplicada.

## 6. Driver

- Login de rol driver.
- Ver viaje asignado.
- Cambiar estado solo en transiciones válidas.
- Marcar passenger boarded.
- Enviar GPS solo con permiso del navegador y viaje en `boarding` / `in_progress`.
- Confirmar registro en `driver_locations`.
- Confirmar que el mapa se actualiza con esa ubicación.

## 7. Admin

- Login admin.
- Dashboard debe mostrar datos de DB.
- El mapa debe usar un viaje real.
- Sin `driver_locations`, no debe aparecer marcador de vehículo.
- Verificar tablas de horarios, paquetes e incidencias.

## 8. Mobile

Desde la raíz:

```bat
npm run mobile:passenger
npm run mobile:driver
```

En dispositivo físico configurar `EXPO_PUBLIC_API_URL` con la IP LAN del equipo Laragon, por ejemplo:

```text
http://192.168.1.20:8000/api/v1
```

No usar ese ejemplo como valor fijo; usar la IP real del equipo.
