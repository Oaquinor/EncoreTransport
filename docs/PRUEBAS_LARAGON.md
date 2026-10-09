# Ejecución y validación en Laragon

## 1. Aplicar overlay

Desde la raíz del repo:

```powershell
powershell -ExecutionPolicy Bypass -File .\EncoreTransport_PREMIUM_VISUAL_20261008\APLICAR_PREMIUM.ps1 .
```

El script crea backup antes de reemplazar archivos.

## 2. Backend

```bat
cd "C:\Users\Laptop (Martinez)\source\repos\EncoreTransport\backend\laravel"

composer install
php artisan optimize:clear
php artisan migrate
php artisan l5-swagger:generate
php artisan test
php artisan serve
```

No ejecutar `migrate:fresh` sobre información que deba conservarse.

## 3. Frontend

En otra consola:

```bat
cd "C:\Users\Laptop (Martinez)\source\repos\EncoreTransport"

npm install
npm run validate:frontend
npm run dev
```

## 4. URLs

- Website: `http://127.0.0.1:4173/website/`
- Passenger: `http://127.0.0.1:4173/passenger/`
- Driver: `http://127.0.0.1:4173/driver/`
- Admin: `http://127.0.0.1:4173/admin/`
- Login: `http://127.0.0.1:4173/login/`
- Package tracking: `http://127.0.0.1:4173/track-package/`
- Swagger: `http://127.0.0.1:8000/api/documentation`

## 5. Visual responsive

Probar mínimo:
- 390×844
- 768×1024
- 1366×768
- 1440×900
- 1920×1080

Validar:
- sin scroll horizontal accidental;
- header accesible;
- textos no cortados;
- tablas admin navegables;
- botones de 44px o más en móvil;
- foco visible con teclado.

## 6. Functional smoke test

### Website
- Buscar ruta.
- Confirmar que filtros llegan a Passenger.
- Abrir mapa.
- Ir a tracking package.

### Passenger
- Search.
- Select trip.
- Map.
- Seats.
- Passenger data.
- Review.
- Login preserve draft.
- Create booking.

### Driver
- Login driver.
- Assigned trip.
- Passengers.
- Board passenger.
- Map.
- GPS browser permission.
- Vehicle status.
- Incident.

### Admin
- Login admin.
- Dashboard.
- Search/sort/paginate tables.
- Create schedule.
- Change incident status.
- Reports.

### Mobile
Configurar `EXPO_PUBLIC_API_URL` con la IP LAN del equipo de desarrollo.

No usar `127.0.0.1` desde un teléfono físico.
