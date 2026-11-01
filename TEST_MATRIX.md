# Matriz de validación

| Área | Comando/evidencia | Resultado |
|---|---|---|
| Laravel | `php artisan test` | 72 pruebas, 434 aserciones |
| Frontend routing | `npm run test:server` | OK |
| Permisos | `npm run test:dashboard-permissions` | OK |
| Diseño | `npm run test:visual-contract`, `test:premium-design`, `test:premium-responsive` | OK contractual |
| TypeScript | `npm run typecheck:api-client`, `typecheck:passenger` | OK |
| GPS | `npm run test:native-gps` | OK contractual |
| Capturas reales | Playwright contra 7 rutas | HTTP 200; diferencias visuales documentadas |
| E2E autenticado | `tools/validate-admin-account-reference.mjs` | BLOQUEADO por credenciales del servidor persistente |
