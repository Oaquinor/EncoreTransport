# Operación y rollback

La migración de notificaciones es aditiva y no altera reservas, rutas ni viajes históricos. Para revertirla en un entorno controlado:

```powershell
php artisan migrate:rollback --step=1
```

Antes de revertir en producción debe comprobarse que no existan consumidores de la bandeja y realizar un respaldo de la base de datos. No se ejecutó rollback automáticamente.
