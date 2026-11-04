# EncoreTransport — paquete de preparación para producción

Este directorio contiene plantillas operativas para publicar EncoreTransport
detrás de Nginx, con Laravel/PHP-FPM, el servidor Node de las aplicaciones y un
worker de colas. No contiene credenciales, certificados, dominios reales ni
comandos que hagan `git reset`, borren releases o migren producción sin una
confirmación explícita.

## Topología prevista

```text
Internet
   │ HTTPS
   ▼
Nginx ── /api/* y /up ──> PHP-FPM ──> backend/laravel
   │
   └── /website, /passenger, /driver, /admin, /login, /track-package,
       /package-register ──> Node server.mjs :4173
```

El navegador conserva un único origen. Nginx mantiene la clave TomTom y los
secretos de Laravel fuera del frontend; Node solo sirve las aplicaciones
estáticas y los recursos compartidos.

## Archivos de esta carpeta

- `nginx/encoretransport.conf.example`: reverse proxy HTTPS y PHP-FPM.
- `systemd/encore-web.service`: servidor Node estático.
- `systemd/encore-queue.service`: worker de Laravel.
- `systemd/encore-schedule.service` y `.timer`: scheduler de Laravel cada minuto.
- `scripts/preflight.sh`: revisión sin secretos antes de publicar.
- `scripts/build-release.sh`: instala dependencias y prepara una release; no
  ejecuta migraciones.
- `scripts/healthcheck.sh`: comprueba la API y las rutas públicas por HTTPS.
- `env/node.production.example`: variables no secretas del proceso Node.
- `env/laravel.production.example`: plantilla de configuración Laravel; los
  marcadores `CHANGE_ME` deben sustituirse únicamente en el VPS.
- `.github/workflows/ci-cd.yml`: ejecuta la suite y el build en cada push; el
  job de despliegue se activa solo con los secretos/variables de producción.

## Secuencia segura en el VPS

1. Crear un usuario de servicio sin acceso SSH interactivo, por ejemplo
   `encoreapp`, y un directorio de releases fuera del web root público.
2. Instalar PHP 8.2+, PHP-FPM, Composer, Node 22+, npm, MySQL/MariaDB,
   Nginx y Certbot según la distribución mantenida del VPS.
3. Copiar el repositorio a una release y crear el enlace `current`.
4. Crear `backend/laravel/.env` directamente en el servidor a partir de
   `deploy/env/laravel.production.example`. Nunca copiar el `.env` local ni
   subirlo al repositorio.
5. Ejecutar `scripts/preflight.sh` y luego `scripts/build-release.sh`.
6. Confirmar un backup verificable y ejecutar manualmente:

   ```bash
   cd /var/www/encoretransport/current/backend/laravel
   php artisan migrate --force
   php artisan storage:link
   ```

7. Sustituir los marcadores del archivo Nginx por el dominio, certificado,
   ruta de release y socket PHP-FPM reales. Validar con `nginx -t`.
8. Instalar los servicios systemd, ejecutar `systemctl daemon-reload`,
   habilitar `encore-web`, `encore-queue` y `encore-schedule.timer`, y revisar
   sus logs antes de abrir tráfico.
9. Ejecutar `scripts/healthcheck.sh https://DOMINIO_REAL` y las comprobaciones
   post-deploy de `docs/current/DEPLOYMENT.md`.

## Entradas que todavía debe proporcionar el responsable del VPS

- acceso SSH por clave pública o una sesión administrada para operar el host;
- dominio final y registros DNS;
- versión y socket de PHP-FPM;
- base de datos de producción y backup verificado;
- `APP_KEY`, correo, TomTom, pagos, webhooks y proveedores de notificaciones;
- certificados TLS o autorización para emitirlos.

Mientras falte cualquiera de esas entradas no se debe marcar el sistema como
`READY_FOR_RELEASE` ni activar pagos, correo real o webhooks productivos.

## Activar CI/CD

En GitHub, dentro del repositorio, configurar estos **Secrets**:

- `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`.
- `PRODUCTION_DOMAIN`.

Configurar estas **Variables**:

- `DEPLOY_ENABLED=true` solo cuando el VPS ya tenga el archivo
  `/var/www/encoretransport/shared/laravel.env` y el usuario `encoreapp`.
- `TLS_READY=true` solo cuando DNS y el certificado HTTPS ya estén listos.
- `AUTO_MIGRATE=false` inicialmente; cambiarlo a `true` únicamente con una
  política de backups y migraciones compatibles hacia atrás.
- `PHP_FPM_SOCKET` si el socket no es `/run/php/php8.3-fpm.sock`.

El pipeline nunca usa la contraseña del VPS. Cada push a `main` debe pasar
frontend, navegador, typecheck, build y Laravel antes de que el job de deploy
pueda ejecutarse.
