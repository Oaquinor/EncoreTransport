# Decisiones tecnológicas

| Decisión | Motivo | Riesgo/pendiente |
|---|---|---|
| HTML/JS multipágina para Website | Conserva rutas indexables y evita duplicar la lógica de Passenger | Falta validar dominio/SEO final |
| Registro central de módulos Admin | Permisos y navegación nacen de la misma fuente | La matriz E2E por rol sigue pendiente |
| SVG compartido | Consistencia, peso bajo y accesibilidad controlable | Completar aceptación visual |
| Laravel/MySQL para operaciones críticas | Transacciones, locks y autorización del backend | Ejecutar entorno sembrado repetible |
| Leaflet/TomTom existente | Fallback y continuidad de la implementación actual | Credenciales y realtime productivo pendientes |
| Expo para Mobile | Mantiene el stack actual | Cámara, background GPS, push y offline requieren pruebas reales |

No se aprueban nuevas dependencias ni datos simulados para cerrar una capacidad funcional.
