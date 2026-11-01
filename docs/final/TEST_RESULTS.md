# Resultados de pruebas

- `npm test`: OK en todas las suites contractuales del repositorio.
- `npm run typecheck:api-client`: OK.
- `npm run typecheck:passenger`: OK.
- Laravel `php artisan test`: 72 pruebas, 434 aserciones.
- Playwright: rutas principales responden HTTP 200 y se generaron capturas; E2E autenticado Admin bloqueado por credenciales del servidor persistente.
- Mobile nativo: no ejecutado sin emulador/dispositivo.
