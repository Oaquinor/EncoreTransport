# Brechas y viabilidad

| Función | Viabilidad | Estado | Motivo |
|---|---|---|---|
| Foto de perfil con recorte | Alta | IMPLEMENTADA | API Laravel existente |
| Preferencias de usuario | Media | PENDIENTE | requiere modelo y endpoint |
| Sesiones/dispositivos | Media | BLOQUEADA | backend no expone sesiones activas |
| Centro de notificaciones | Media | BLOQUEADA | no existe fuente de datos |
| Eliminación segura | Alta | IMPLEMENTADA | backend exige confirmación y preserva histórico |
| GPS móvil background | Alta complejidad | PENDIENTE | requiere permisos y validación en dispositivo |
