# Validación de mapas

## 1. Preparación

En `backend/laravel/.env` debe existir la configuración local, sin compartir la clave:

```env
MAP_PROVIDER=tomtom
TOMTOM_API_KEY=...
TOMTOM_SEARCH_BASE_URL=https://api.tomtom.com/search/2
TOMTOM_ROUTING_BASE_URL=https://api.tomtom.com/routing/1
TOMTOM_DISPLAY_BASE_URL=https://api.tomtom.com
TOMTOM_LANGUAGE=es-ES
TOMTOM_COUNTRY_SET=DO
TOMTOM_VIEW=Unified
TOMTOM_MAP_STYLE=street-light
TOMTOM_TILE_SIZE=256
TOMTOM_TRAVEL_MODE=car
TOMTOM_TIMEOUT=15
```

No pegar la API key en chats, commits, screenshots o logs.

## 2. Recargar Laravel

```bat
cd backend\laravel
php artisan optimize:clear
```

## 3. Diagnóstico directo de TomTom

```bat
php artisan encore:maps:diagnose
```

Interpretación:

- `API key loaded by Laravel: NO` → `.env` no cargado/config cache.
- `FAIL geocoding ... AUTHORIZATION` → key inválida o sin acceso Search/Geocoding.
- `FAIL routing ... AUTHORIZATION` → key sin acceso Routing.
- `FAIL map-display ... AUTHORIZATION` → key sin acceso Map Display.
- `RATE_LIMITED` → cuota/límite.
- `CONNECTION_FAILED` → Laravel no logra alcanzar TomTom.
- `PASS` en los tres → proveedor/backend funcionan; continuar con navegador.

## 4. Endpoints Laravel

Con `php artisan serve` activo:

```text
GET http://127.0.0.1:8000/api/v1/maps/geocode?address=Santo%20Domingo
GET http://127.0.0.1:8000/api/v1/maps/journey?origin=Santo%20Domingo&destination=Santiago
GET http://127.0.0.1:8000/api/v1/maps/tiles/0/0/0.png?style=street-light
```

El último debe devolver `200` y `Content-Type: image/png`.

La API key nunca debe aparecer en estas respuestas.

## 5. Frontend

Desde la raíz:

```bat
npm install
npm run validate:frontend
npm run build:passenger
npm run dev
```

Abrir DevTools → Network y filtrar:

```text
maps/journey
maps/tiles
leaflet
```

Esperado:

- Leaflet local: `/node_modules/leaflet/dist/leaflet.js` y `.css`.
- Journey: 200 JSON.
- Tiles: 200 image/png.
- Ninguna solicitud del navegador debe contener `key=<TOMTOM_API_KEY>`.

## 6. Pantallas

Validar:

```text
/website/
/passenger/
/driver/
/admin/
```

En cada mapa:
- tiles visibles;
- zoom y pan;
- origen/destino;
- polilínea real;
- error comprensible si falla provider;
- posición del vehículo solo si backend tiene coordenada válida.

## 7. Mobile

`EXPO_PUBLIC_API_URL` debe apuntar al backend accesible desde el dispositivo.

En teléfono físico NO usar:

```text
http://127.0.0.1:8000/api/v1
```

Usar IP LAN/HTTPS apropiados al entorno.

Validar Passenger Mobile y Driver Mobile por separado.

Driver Mobile no envía GPS nativo hasta implementar `expo-location`.
