# Modelo de datos y migraciones

La migración `2026_10_30_000100_create_user_notifications_table.php` crea la bandeja persistida de notificaciones con:

- `user_id` con borrado en cascada;
- `type`, `title`, `body` y `data` JSON;
- `read_at` nullable e índice compuesto para listados recientes/no leídos;
- timestamps.

Se ejecutó `php artisan migrate --force` con PHP 8.3.30 y la migración aparece como `Ran` en `migrate:status`.

No se añaden tablas de custodia, transferencias o evidencias fotográficas sin reglas de negocio y contrato de autorización aprobados.
