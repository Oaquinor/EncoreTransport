# EncoreTransport — cierre técnico

## Corrección del fallo `200 !== 302`

La aserción que fallaba estaba en la misma línea compactada que validaba la ruta legacy `/move/`.

El servidor remoto mantenía `/move` dentro de `appAliases`, por lo que `/move/` resolvía el antiguo `apps/passenger-pwa/index.html` con HTTP 200.

La prueba, correctamente, esperaba que la ruta legacy redirigiera al Passenger actual:

```text
/move/ -> 302 /passenger/
```

Se elimina `/move` de los aliases servidos y pasa a ser una redirección explícita.

El test ya no lanza un proceso hijo en un puerto fijo. Ahora importa `server.mjs`, levanta el mismo servidor en un puerto efímero (`port: 0`) y espera `server.close()`. Esto elimina:
- conflictos con procesos previos en `4197`;
- carreras entre `child.kill()` y libuv;
- el `UV_HANDLE_CLOSING` reportado en Windows.

También se incorporan al servidor las rutas que ya usa la interfaz:
- `/login/`
- `/track-package/`

## GPS Driver Mobile

Se incorpora `expo-location` compatible con Expo SDK 57.

Implementado:
- permiso foreground;
- lectura puntual;
- tracking foreground;
- publicación a `/api/v1/driver/locations`;
- heading;
- velocidad en km/h;
- `recorded_at` real;
- actualización del marcador del vehículo;
- stop automático si el viaje deja de estar `boarding` o `in_progress`;
- cleanup al desmontar/sign out;
- ninguna coordenada ficticia.

No se habilita background location porque eso requiere una política operacional explícita, permisos de background y configuración específica de las stores. La implementación real disponible es foreground, suficiente para no simular GPS.

## Backend

La suite informada por el usuario:

```text
21 passed
70 assertions
```

ya valida:
- login;
- datos DB de viajes/asientos;
- metadata del layout;
- reserva real;
- prevención de asiento duplicado;
- constraint de concurrencia;
- liberación de holds;
- package tracking seguro;
- solapamiento de horario de conductor;
- gateway no configurado falla explícitamente;
- TomTom geocoding;
- TomTom routing;
- TomTom Map Display;
- tile proxy y no exposición de la API key;
- fallback de countrySet.

## Bloqueos que no pueden declararse terminados sin terceros

No se falsea estado de producción para:
- PowerTranz;
- Stripe;
- PayPal;
- webhooks reales;
- servicios de notificación externos.

El backend correctamente deja el gateway en `unconfigured` si no existe una integración/credencial confirmada. Las pruebas ya comprueban que el sistema no simula un pago exitoso.

## Validación final

```text
npm install
npm run validate:frontend
npm run validate:mobile

cd backend/laravel
php artisan optimize:clear
php artisan encore:maps:diagnose
php artisan l5-swagger:generate
php artisan test
```

Para Expo Driver:

```text
npm run mobile:driver
```

En un dispositivo físico, `EXPO_PUBLIC_API_URL` debe usar una URL del backend accesible desde el dispositivo y no `127.0.0.1`.
