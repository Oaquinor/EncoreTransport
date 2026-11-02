# EncoreTransport — informe de rendimiento de mapas

Fecha: 2026-11-01  
Alcance: Website/Encore Live, proxy Laravel de mosaicos TomTom y revisión de Passenger/Driver Mobile.

## Resultado ejecutivo

Se corrigieron tres fuentes comprobables de trabajo innecesario en los mapas web:

1. El proxy TomTom no conservaba mosaicos válidos en un caché de servidor ni respondía con `304 Not Modified`.
2. Encore Live volvía a calcular el `fitBounds` usando las posiciones móviles; cada actualización podía recentrar o saltar el mapa.
3. Cada actualización recreaba iconos y contenido de popup aunque no hubiera cambiado.

Ahora el navegador expone métricas en `window.__ENCORE_MAP_METRICS__` y `window.__ENCORE_API_METRICS__`, el backend devuelve `X-Map-Cache`, `X-Map-Upstream-Ms` y `Server-Timing`, y la animación usa la separación temporal real entre muestras GPS. Las posiciones fuera de orden se ignoran para el movimiento.

## Cambios implementados

### Mosaicos TomTom

- Caché Laravel por coordenada, estilo, tamaño, idioma y vista.
- El TTL se deriva de `Cache-Control` de TomTom, respeta `no-store`/`private` y queda limitado por `TOMTOM_TILE_CACHE_MAX_TTL` (por defecto 3600 s).
- TTL predeterminado de 300 s cuando TomTom no envía `max-age`.
- `ETag` conservado y `If-None-Match` atendido con `304`.
- La clave TomTom continúa solo en Laravel; nunca se entrega al navegador.
- Se añadieron señales de medición sin incluir contenido sensible.

### Leaflet y ciclo de vida

- Se mantiene un solo mapa Live por contenedor y se destruyen animaciones/observadores al desmontar.
- `ResizeObserver` invalida el tamaño de forma agrupada.
- El encuadre usa geometría estática de ruta y paradas; las coordenadas GPS no vuelven a disparar `fitBounds`.
- Los iconos se reutilizan por estado y los popups solo se actualizan cuando cambia su contenido.
- Se evita volver a asignar polilíneas idénticas.
- Las métricas registran inicialización Leaflet, primera imagen, carga completa, mosaicos, errores, duplicados, bytes, actualizaciones de marcadores, FPS de interacciones y memoria cuando Chromium la expone.

### Encore Live

- La duración de interpolación se calcula con `last_location_at`: entre 350 ms y 5 s, proporcional al intervalo observado.
- Una señal obsoleta, sin timestamp válido o fuera de orden no genera movimiento interpolado.
- Se eliminan posiciones, marcadores y frames de vehículos que desaparecen.
- El polling continúa adaptativo: 25 s normal y backoff hasta 120 s ante fallos, solo con la pestaña visible.

### Driver y Passenger Mobile

- Se verificó el código nativo existente: ambos usan `react-native-maps`/`UrlTile`; Driver usa GPS foreground/background con intervalos de 10 s y distancia de 25 m.
- Los typechecks de Passenger Mobile y Driver Mobile pasan.
- No se modificó React Native Maps con supuestos de Leaflet. No se marca aceptación de rendimiento nativo sin un dispositivo o emulador conectado.

## Medición reproducible ejecutada

Comando: `npm run test:map-performance-browser`  
Entorno: Chromium local, escritorio 1440×900, servidor local, mosaicos PNG de fixture con caché HTTP simulado. Esta prueba mide el pipeline del navegador; no sustituye una medición contra TomTom real.

| Métrica | Primera carga | Recarga local | Observación |
|---|---:|---:|---|
| Carga de Leaflet | 51.4 ms | 18.8 ms | recurso local reutilizado |
| Primera imagen de mosaico | 39.5 ms | 19.9 ms | fixture local |
| Carga completa de mosaicos | 114.7 ms | 77.4 ms | fixture local |
| Solicitudes de mosaico | 14 | 14 | depende de la decisión de caché del navegador en la recarga |
| Bytes transferidos | 5,152 | 5,152 | fixture de 1×1 px |
| Actualización de marcadores | 20.9 ms | 7.4 ms | primer render: 2 actualizaciones, recarga: 2 |
| FPS durante desplazamiento | 60.8 | — | interacción de arrastre en Chromium |
| Errores de mosaico | 0 | 0 | fixture local |
| Browser → API Live | 65.3 ms | se registra en artefacto | incluye servidor local |
| Laravel → TomTom | no medible en fixture | no medible | `Server-Timing` queda instrumentado en backend |
| Memoria Chromium | 10,000,000 bytes | 10,000,000 bytes | solo disponible en este Chromium |

Artefactos:

- `artifacts/performance/map-live-after.png`
- `artifacts/performance/map-live-cached-reload.png`
- `artifacts/performance/map-live-first.json`

## Antes y después verificable

| Área | Antes observado en código | Después |
|---|---|---|
| Proxy de tiles | llamada externa por mosaico; sin caché Laravel ni `304` | caché acotado, `ETag`, `304` y señales HIT/MISS |
| Live viewport | `fitBounds` incluía cada posición GPS | el encuadre depende de ruta/paradas; se conserva durante el movimiento |
| Animación | duración fija de 900 ms | duración basada en muestras reales, sin movimiento si la muestra no es confiable |
| Marcadores | icono y popup recreados en cada refresh | iconos reutilizados y popup comparado antes de actualizar |
| Instrumentación | sin métricas de tiles/markers/FPS | métricas de navegador y `Server-Timing` |

La comparación de tiempos anteriores no se presenta como una A/B histórica de producción: el repositorio no tenía una captura de baseline guardada. PHP y la clave TomTom sí estuvieron disponibles para la suite Laravel, pero no se capturó un benchmark de red de producción. La tabla anterior identifica diferencias de implementación comprobadas y la prueba aporta el primer registro reproducible posterior.

## Pruebas y bloqueos

Pasaron:

- `npm run test:map-runtime`
- `npm run test:live-network`
- `npm run test:real-map`
- `npm run test:performance-browser`
- `npm run test:map-performance-browser`
- `npm run typecheck:passenger-mobile`
- `npm run typecheck:driver-mobile`
- `C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe artisan test` — 84 pruebas, 560 aserciones; el test específico del proxy incluye 28 aserciones aprobadas.

Pendiente o limitado:

- La suite Laravel ejecutó además las comprobaciones de integración real de geocoding, routing y map display cuando la clave estuvo configurada; no se realizó un benchmark de latencia contra TomTom de producción.
- No se pudo medir una red móvil limitada ni FPS/memoria en un dispositivo real.
- No se pudo aceptar GPS background, consumo de batería ni caché nativa de React Native Maps sin dispositivo/emulador.
- El fixture del navegador no demuestra el TTL ni el hit ratio real del caché Laravel; para eso queda pendiente ejecutar dos cargas contra un Laravel configurado con un store persistente y una clave TomTom válida.
- No existe configuración Nginx en este repositorio; la revisión de cabeceras Nginx queda pendiente del entorno desplegado.

## Siguiente aceptación necesaria

En un entorno de staging/producción instrumentado y con un dispositivo/emulador:

1. Cargar el mismo tile dos veces y comprobar `X-Map-Cache: MISS` seguido de `HIT` y después `304` con `If-None-Match`.
2. Medir `X-Map-Upstream-Ms`, `Server-Timing`, respuestas 429/502/503 y ratio de caché bajo carga.
3. Probar Live con dos muestras separadas por 10–30 s, una obsoleta, una fuera de orden y reconexión.
4. Repetir primera carga, zoom, desplazamiento, cambio de ruta y liberación en Android/iOS para Passenger y Driver.

