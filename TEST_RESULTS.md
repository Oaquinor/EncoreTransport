# Resultados de pruebas

- `node --check apps/admin-dashboard/app.mjs`: OK.
- `npm run test:server`: OK.
- `npm run test:dashboard-permissions`: OK.
- `node tools/validate-admin-account-reference.mjs`: preparado para 390×844, 1024×768 y 1440×900; en esta ejecución no pudo autenticarse contra el servidor local persistente porque las credenciales demo no coinciden.
- El botón `Save changes` inicia deshabilitado y se habilita al modificar nombre/teléfono.
- Foto: selección real, preview y zoom verificados; persistencia usa `/auth/profile/photo`.
- Eliminación: diálogo exige `DELETE`; no se ejecutó borrado real durante la prueba.
- Nativo móvil: no ejecutado sin emulador/dispositivo; queda documentado como pendiente.
- Laravel con PHP de Laragon (`C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe artisan test`): 72 pruebas pasadas, 434 assertions.
- Notificaciones: rutas y persistencia migradas; push, preferencias por canal y entrega SMTP/WhatsApp de producción dependen de credenciales externas.
