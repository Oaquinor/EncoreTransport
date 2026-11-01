# Seguridad y privacidad

- Los listados de notificaciones se filtran por el usuario autenticado; no aceptan `user_id` desde el cliente.
- Marcar como leído comprueba pertenencia antes de modificar el registro.
- La foto de perfil se valida por MIME/extensión y tamaño antes de persistirla.
- La eliminación de cuenta exige confirmación explícita en UI y respeta la autorización del backend.
- No se incluyen secretos, API keys ni credenciales OAuth en el repositorio ni en el ZIP.
- La ubicación GPS y las fotos de entrega requieren consentimiento, permisos del dispositivo y política de retención antes de activarse.
