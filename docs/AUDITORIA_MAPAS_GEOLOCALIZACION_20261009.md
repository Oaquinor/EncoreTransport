# Auditoría crítica — Mapas, API Key y geolocalización

## Base auditada

- Repositorio: `Oaquinor/EncoreTransport`
- Rama remota: `main`
- Commit remoto observado: `87bdbfb0dc2549ffc051dac12c3977980009c791`

El `.env` real no está versionado y, correctamente, está ignorado por Git. Por ello no es posible afirmar desde el repositorio remoto que la clave local esté ausente, presente o sea válida. Esta corrección evita esa suposición y agrega una prueba de extremo a extremo que debe ejecutarse en el Laravel local.

## Flujo real de mapas

### Web

```text
Website / Passenger / Driver / Admin
            ↓
packages/shared/real-map.mjs
            ↓
/api/v1/maps/journey
/api/v1/maps/tiles/{z}/{x}/{y}.png
            ↓
Laravel MapController
            ↓
MapServiceInterface
            ↓
TomTomMapService
            ↓
TomTom Search / Routing / Map Display
```

La clave de TomTom permanece en Laravel y no se envía al navegador.

### Mobile

Passenger Mobile y Driver Mobile usan `react-native-maps` con:

```text
EXPO_PUBLIC_API_URL
      ↓
/api/v1/maps/journey
/api/v1/maps/tiles/{z}/{x}/{y}.png
```

Los móviles tampoco necesitan la clave TomTom directamente.

## Hallazgos verificables

### 1. La clave sí tiene una ruta de configuración correcta en código

`backend/laravel/.env` → `config/maps.php` → `config('maps.tomtom.api_key')` → `TomTomMapService::apiKey()`.

Por tanto, encontrar la clave en `.env` no demuestra que Laravel la haya recargado. Si la configuración estaba cacheada antes de añadir/cambiar la clave, el runtime puede seguir usando el valor anterior hasta ejecutar:

```bash
php artisan optimize:clear
```

### 2. La prueba existente solo validaba Geocoding

`TomTomIntegrationTest` únicamente probaba `geocode()`.

Eso permite esta situación:

```text
Geocoding: PASS
Routing:   no comprobado
Tiles:     no comprobado
```

Una key puede existir y aun así una solicitud concreta fallar por permisos, cuota o producto. La suite corregida prueba los tres servicios por separado.

### 3. Leaflet dependía exclusivamente de `unpkg.com`

`packages/shared/real-map.mjs` cargaba Leaflet dinámicamente desde:

```text
https://unpkg.com/leaflet@1.9.4/...
```

Ese renderer es una dependencia adicional a TomTom. Si el navegador no puede resolver/acceder a `unpkg.com`, el mapa falla aunque Laravel y la API key de TomTom estén correctos.

La corrección instala Leaflet localmente mediante npm y usa el CDN solo como fallback.

### 4. Los errores de tiles eran silenciosos

Leaflet solicita los tiles como imágenes después de crear el mapa. El código no observaba `tileerror`.

Consecuencia: `/maps/journey` podía funcionar, Leaflet podía cargar y el área cartográfica quedar vacía sin un diagnóstico útil.

La corrección:
- prueba el tile proxy antes de renderizar;
- valida que responda una imagen;
- escucha `tileerror`;
- muestra un estado de error en el mapa.

### 5. El backend ocultaba el tipo real de error TomTom

`TomTomMapService` hacía `$response->throw()`. `MapController` no capturaba `RequestException` explícitamente, por lo que muchos 400/403/429/5xx terminaban como un 502 genérico.

Además, reportar una excepción HTTP cruda puede incluir en trazas la URL completa de servicios legacy que transportan `key=...` en query string.

La corrección clasifica los errores sin devolver ni registrar el secreto:

- `MAP_PROVIDER_AUTHORIZATION_FAILED`
- `MAP_PROVIDER_RATE_LIMITED`
- `MAP_PROVIDER_BAD_REQUEST`
- `MAP_PROVIDER_UNAVAILABLE`
- `MAP_PROVIDER_REQUEST_FAILED`
- `MAP_PROVIDER_CONNECTION_FAILED`

### 6. Map Display no enviaba explícitamente el header de versión

La integración ya enviaba `apiVersion=1` en query string. La documentación actual de TomTom Map Display también define `TomTom-Api-Version: 1` como header del servicio.

La corrección envía ambos valores para eliminar ambigüedad y ajustarse al contrato actual.

### 7. Los endpoints legacy de Search y Routing siguen documentados

La arquitectura no se migra innecesariamente:

- Search/Geocode `search/2` sigue documentado.
- Routing `routing/1/calculateRoute` sigue documentado.
- Map Display Orbis raster sigue siendo compatible con `maps/orbis/map-display/tile/...`.

No se cambia a Routing v3/Geocoding Orbis solo por ser más nuevo, ya que eso implicaría cambiar contratos y normalización sin necesidad demostrada.

### 8. Los contenedores web sí tienen altura explícita

La auditoría encontró alturas para:
- Website.
- Passenger.
- Driver.
- Admin.

Por ello “contenedor con altura 0” no es la causa principal identificada en el estado remoto auditado.

### 9. Geolocalización Driver PWA

El Driver PWA usa `navigator.geolocation.getCurrentPosition` y persiste la ubicación vía `/driver/locations`.

La ubicación no se inventa.

Limitación operativa:
- `localhost` / `127.0.0.1` suele ser contexto confiable en navegador.
- en un teléfono accediendo por una IP LAN con HTTP, el navegador puede bloquear geolocalización por no ser contexto seguro.
- para pruebas reales desde otros dispositivos debe usarse HTTPS o un entorno que cumpla los requisitos de secure context.

### 10. Driver Mobile GPS nativo

Driver Mobile puede mostrar la última ubicación del backend pero no envía una nueva ubicación nativa.

`expo-location` no está instalado/configurado en el estado auditado. Continúa pendiente de forma explícita.

## Comando nuevo de diagnóstico real

Ejecutar dentro de `backend/laravel`:

```bash
php artisan optimize:clear
php artisan encore:maps:diagnose
```

Comprueba sin imprimir la API key:

- que Laravel cargó una key;
- geocoding;
- routing;
- raster Map Display.

Un resultado correcto debe mostrar:

```text
PASS geocoding
PASS routing
PASS map-display raster tile
All configured TomTom map services responded successfully.
```

Cualquier FAIL identifica el servicio exacto que está bloqueando el mapa.
