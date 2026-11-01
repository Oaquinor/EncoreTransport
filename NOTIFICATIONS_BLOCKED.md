# Centro de notificaciones — estado verificable

El centro de notificaciones ya tiene persistencia y contrato para avisos internos derivados de paquetes:

- `GET /api/v1/notifications?limit=12` devuelve notificaciones del usuario autenticado y `unread_count`.
- `PATCH /api/v1/notifications/{id}/read` marca un aviso como leído.
- `POST /api/v1/notifications/read-all` marca todos los avisos como leídos.
- El panel de Admin reutiliza el menú superior y no muestra datos ficticios si el endpoint no está disponible.

La implementación sigue siendo parcial para canales externos: preferencias por canal, push/web-push, plantillas de producción y entregabilidad SMTP/WhatsApp dependen de credenciales y configuración del entorno. No se declara completada esa parte.
