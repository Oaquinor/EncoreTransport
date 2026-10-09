# Validación en Laragon

## Antes de aplicar

Desde la raíz:

```bat
git rev-parse HEAD
git status --short
```

El commit remoto auditado fue:

```text
87bdbfb0dc2549ffc051dac12c3977980009c791
```

No descartes cambios locales.

## Backend

```bat
cd backend\laravel
composer install
php artisan optimize:clear
php artisan migrate
php artisan l5-swagger:generate
php artisan test
php artisan serve
```

## Frontend

```bat
cd C:\Users\Laptop (Martinez)\source\repos\EncoreTransport
npm install
npm run validate:frontend
npm run build:passenger
npm run dev
```

## Pruebas manuales

### Website
- Confirmar que ningún `data-reveal` queda invisible con JS fallando.
- Scroll: entradas progresivas perceptibles.
- Reduced motion del SO: contenido visible, sin movimiento.
- Desktop: nav centrado y `Staff access` discreto.
- Mobile: botón abre/cierra menú, Escape lo cierra, foco va al primer enlace.
- No aparece tarjeta comercial `Operations`.
- Buscar viaje y confirmar traslado de filtros a Passenger.
- Seat preview: usar registros reales; si no hay seats, mostrar estado vacío.
- Mapa: tiles, origen, destino y ruta real; fallo de proveedor muestra error.

### Admin
- Sin token: redirección a login.
- Passenger/Driver entrando a `/admin/`: no queda `Loading…`; muestra Access denied.
- Admin: dashboard y módulos cargan.
- Mapas sin GPS: no inventar marcador.
- Reportes: trip-costs mantiene “unavailable” si faltan fuentes.

### Asientos concurrentes
Abrir dos sesiones, mismo viaje y mismo asiento. Crear la primera reserva y después la segunda. La segunda debe ser rechazada por el servidor.

### Mobile
Ejecutar por separado:

```bat
npm run mobile:passenger
npm run mobile:driver
```

En dispositivo físico usar `EXPO_PUBLIC_API_URL` con la IP LAN real del equipo.

Driver Mobile GPS nativo permanece pendiente hasta instalar/configurar `expo-location`.
