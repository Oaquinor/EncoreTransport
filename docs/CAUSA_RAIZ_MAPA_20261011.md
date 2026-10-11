# Causa raíz confirmada — mapa del Website

## Evidencia

El diagnóstico del usuario devolvió:

```text
API key loaded by Laravel: YES
PASS geocoding
PASS routing
PASS map-display raster tile
```

Eso descarta:

- API key ausente en el runtime;
- fallo general de TomTom Search;
- fallo general de TomTom Routing;
- fallo general de TomTom Map Display;
- incapacidad general del servidor Laravel para conectarse a TomTom.

Sin embargo, el Website recibe:

```text
Unable to resolve origin or destination.
```

Ese mensaje solo aparece después de que la llamada a TomTom fue exitosa pero `MapController` no obtuvo una coordenada normalizada para el origen o destino del viaje seleccionado.

## Conflicto real encontrado

El demo seeder de `main` crea:

```text
Origin: Boston
Destination: New York
```

mientras `config/maps.php` define por defecto:

```text
TOMTOM_COUNTRY_SET=DO
```

`TomTomMapService::geocode()` enviaba siempre:

```text
countrySet=DO
```

Por tanto, la prueba diagnóstica con Santo Domingo pasa, pero el viaje demo Boston → New York queda restringido a resultados de República Dominicana y puede producir `results: []`.

El mapa no falla por la API key: falla por la resolución de los nombres concretos del viaje.

## Corrección

La geocodificación ahora:

1. prueba primero con el `countrySet` configurado;
2. si TomTom respondió correctamente pero `results` está vacío;
3. reintenta el mismo proveedor real sin `countrySet`.

No se aplica fallback:
- cuando TomTom responde 401/403;
- cuando responde 429;
- cuando hay error de red;
- cuando el primer lookup sí resuelve;
- con coordenadas ficticias.

Además `encore:maps:diagnose` ahora valida también el primer viaje actual de la BD, no solo ejemplos fijos.
