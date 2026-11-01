# Modelo de datos del cierre

Se mantienen reservas, rutas, viajes, vehículos, conductores y usuarios existentes. Se añadió `user_notifications` como bandeja persistida y relación con `users`.

El modelo de paquetería actual soporta registro, tracking y estados básicos. El mandato nuevo requiere además eventos inmutables, asignación histórica a viaje/vehículo/conductor, transferencias, evidencias, receptor autorizado y preferencias de notificación. Esas tablas y contratos no se inventan hasta definir permisos y política de retención.
