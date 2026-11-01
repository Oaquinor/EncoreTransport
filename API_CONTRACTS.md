# Contratos API integrados

## Notificaciones autenticadas

Todos los endpoints requieren el middleware `api.token`.

| Método | Ruta | Respuesta principal |
|---|---|---|
| GET | `/api/v1/notifications?limit=12` | `{data: Notification[], unread_count: number}` |
| PATCH | `/api/v1/notifications/{id}/read` | `{data: Notification}` |
| POST | `/api/v1/notifications/read-all` | `{message: string}` |

Una notificación contiene `id`, `type`, `title`, `body`, `data`, `read_at`, `created_at` y `updated_at`. El alcance siempre se limita al usuario autenticado.

## Perfil

`PATCH /api/v1/auth/profile` mantiene los datos del usuario y `POST /api/v1/auth/profile/photo` valida una imagen real (JPG, PNG o WebP). La respuesta de `/auth/me` incluye `avatar_url` cuando existe una ruta persistida.

## Paquetes existentes

El módulo de paquetes mantiene sus endpoints actuales (`/packages`, tracking y actualización de estado). La transición a `delivered` exige `recipient_verified=true` y una imagen `delivery_photo`; el servidor almacena la fecha de verificación y la ruta privada de la evidencia. Transferencias entre vehículos y QR operativo no se exponen todavía como completados porque falta el contrato de dominio y permisos correspondientes.
