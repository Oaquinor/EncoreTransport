# Aplicación y pruebas

## 1. Aplicar

Desde la raíz del repo:

```powershell
powershell -ExecutionPolicy Bypass -File .\EncoreTransport_MANDATO_INTEGRAL_20261008\APLICAR.ps1 .
```

El script crea `.encore_mandato_backup_YYYYMMDD_HHMMSS` antes de sobrescribir.

## 2. Backend

```bat
cd backend\laravel
composer install
php artisan optimize:clear
php artisan migrate
php artisan l5-swagger:generate
php artisan test
php artisan serve
```

No ejecutar `migrate:fresh` sobre una base con datos.

## 3. Frontend

```bat
cd C:\ruta\EncoreTransport
npm install
npm run validate:frontend
npm run dev
```

## 4. URLs

- Website: `http://127.0.0.1:4173/`
- Login: `http://127.0.0.1:4173/login/`
- Passenger: `http://127.0.0.1:4173/passenger/`
- Driver: `http://127.0.0.1:4173/driver/`
- Admin: `http://127.0.0.1:4173/admin/`
- Package tracking: `http://127.0.0.1:4173/track-package/`
- Swagger: `http://127.0.0.1:8000/api/documentation`

## 5. Validaciones mínimas

1. `/` debe responder 302 a `/website/` y cargar `styles.css` 200.
2. Website debe mostrar logo real y no términos internos como Laravel/MySQL.
3. Buscar un viaje real y continuar a Passenger con filtros conservados.
4. Seleccionar exactamente la cantidad de asientos configurados para pasajeros.
5. Si no hay sesión, Passenger debe conservar el borrador y enviar a `/login/`.
6. Driver debe ver schedule, viaje asignado y poder persistir vehicle status/package/incident/GPS.
7. Admin debe mostrar solo módulos respaldados por datos reales.
8. Trip Cost Summary debe indicar bloqueo si no hay costos; nunca inventar rentabilidad.
9. Swagger no debe mostrar warnings `Unable to merge`.
10. Ejecutar `php artisan test` y `npm run validate:frontend`.
