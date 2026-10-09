# Pendientes y dependencias

## Pagos
Continúan dependiendo de credenciales/sandbox/webhooks reales:
- PowerTranz
- Stripe
- PayPal

No se marca ninguna operación como exitosa sin confirmación del proveedor.

## TomTom
Se necesita:
- `TOMTOM_API_KEY`
- acceso habilitado a Search, Routing y Map Display.

## Leaflet web
La integración compartida actual carga Leaflet desde `unpkg.com`.
Para una CSP de producción estricta:
- permitir ese origen, o
- empaquetar Leaflet localmente.

## GPS Driver Mobile
La UI nativa muestra ruta y última posición registrada por backend.
Enviar nueva posición GPS desde Driver Mobile sigue requiriendo:
- `expo-location`
- permisos Android/iOS
- decisión de background tracking.

## Notificaciones
WhatsApp/FCM requieren cuentas/tokens de proveedor.

## Admin
No se crearon pantallas ficticias para módulos que siguen sin entidades/reglas de negocio. Esos módulos deben permanecer documentados como pendientes.
