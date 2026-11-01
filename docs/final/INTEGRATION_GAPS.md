# Brechas de integración

| Integración | Estado | Motivo | Criterio de cierre |
|---|---|---|---|
| Laravel/MySQL | PASS local | 75 pruebas y 469 aserciones con PHP 8.3.30/MySQL Laragon; producción aún no verificada | entorno semejante a producción, migraciones y rollback |
| Pagos | BLOQUEADO | gateway `unconfigured` | sandbox, webhook firmado, idempotencia y conciliación |
| TomTom | Contrato implementado | falta clave de entorno | geocodificación/ruta con cuota y dominio final |
| Gmail API | PARCIAL | falta OAuth refresh token | entrega confirmada y reintentos |
| WhatsApp/push | BLOQUEADO | proveedor no seleccionado | entrega real y preferencias |
| Mobile native | PARCIAL | typecheck sí; dispositivo no | aceptación Android/iOS y GPS background |
| SEO público | PARCIAL | hostname final no definido | canonical, sitemap y robots publicados |
| Custodia avanzada | PARCIAL | no hay transferencias/QR/manifiesto | contrato, permisos, eventos y conciliación |
