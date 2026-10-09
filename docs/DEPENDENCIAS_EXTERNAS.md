# Dependencias externas y credenciales

## TomTom
Necesario:
- `TOMTOM_API_KEY`
- Acceso válido a Search, Routing y Map Display Raster Tile.

La clave se usa únicamente en Laravel. El navegador consume el proxy interno.

## Leaflet
Los clientes web cargan Leaflet 1.9.4 desde `unpkg.com`.
Si producción aplica CSP estricta, debe autorizarse ese origen o empaquetarse Leaflet localmente.

## Passenger/Driver Mobile
`EXPO_PUBLIC_API_URL` debe apuntar a una URL alcanzable por el dispositivo/emulador.
`127.0.0.1` no sirve desde un teléfono físico.

## GPS nativo Driver Mobile
Pendiente:
- `expo-location`
- permisos Android/iOS
- política de background location si el negocio requiere tracking fuera de foreground

No se simula una posición.

## Pagos
PowerTranz / Stripe / PayPal siguen necesitando credenciales, sandbox y webhooks verificables. Este entregable no marca ningún proveedor como operativo sin esas pruebas.

## Notificaciones
WhatsApp Business y FCM requieren tokens/cuentas reales. No se reporta envío exitoso sin confirmación del proveedor.
