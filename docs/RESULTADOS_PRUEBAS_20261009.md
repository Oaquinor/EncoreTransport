# Resultados de pruebas del entregable

## Ejecutables en este entorno sin dependencias externas

- Sintaxis `apps/website/app.mjs`
- Sintaxis `apps/website/enhancements.mjs`
- Sintaxis `apps/admin-dashboard/app.mjs`
- Test estático `tests/ux-regression.test.mjs`
- Sintaxis PHP `SeatController.php`

## No se marcan aprobadas sin el entorno real

Los siguientes comandos deben ejecutarse en el repositorio del usuario porque este entorno de construcción no tiene su `node_modules`, `vendor`, MySQL, credenciales TomTom ni dispositivos:

```text
npm install
npm run validate:frontend
npm run mobile:passenger
npm run mobile:driver
php artisan test
php artisan l5-swagger:generate
```

La falta de ejecución aquí se documenta como pendiente, no como aprobado.
