# Validación final de línea base

## Comandos aprobados

- `npm test`
- `npm run typecheck:api-client`
- `npm run typecheck:passenger`
- `npm run typecheck:passenger-mobile`
- `npm run typecheck:driver-mobile`
- `npm run test:visual-browser` (Passenger 390/1440)
- `git diff --check`

La suite `npm test` volvió a ejecutarse después de retirar las hojas CSS sin consumidores y permaneció aprobada.

## Limitaciones

`php artisan test` no pudo ejecutarse en este entorno porque PHP no está disponible en el PATH del proceso. Las validaciones locales no sustituyen pruebas de pasarela de pago, GPS de hardware, notificaciones reales, OAuth productivo ni despliegue Laragon/hosting.
