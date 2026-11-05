# Variables necesarias para producción

No se copiaron credenciales reales al repositorio ni al ZIP. En el `.env` de Laravel deben configurarse, según los servicios que se activen:

- `TOMTOM_API_KEY` para mapas, tiles, geocodificación y rutas.
- `MAIL_MAILER=gmail_api`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` y `GMAIL_REFRESH_TOKEN` para correo transaccional.
- Credenciales de WhatsApp si se habilita ese canal.
- `APP_URL`, `FRONTEND_URL`, `SESSION_DOMAIN` y las variables de base de datos del entorno.

Después de actualizar el entorno ejecutar `php artisan config:clear`, `php artisan route:cache` y la migración pendiente. Las claves deben permanecer fuera del frontend y nunca enviarse en respuestas de API.

## Despliegue automatizado

Cada push a `main` ejecuta las pruebas frontend y Laravel contra MySQL 8.4. Si ambas verificaciones terminan correctamente, GitHub Actions publica el release en el VPS mediante SSH, actualiza los servicios y ejecuta el health check HTTPS.
