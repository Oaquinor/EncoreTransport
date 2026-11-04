# Handoff de siguiente etapa

Rama `main`, referencia actual `c4bbd97`; working tree con cambios no confirmados de esta revisión. `codex/funcionalidad-reservas-rutas` no agrega commits frente a `main` y no requiere merge automático.

1. Repetir Laravel en un entorno semejante a producción y validar la migración duplicada `2026_10_08_000200` sin renombrarla a ciegas.
2. Añadir la gestión administrativa de autorizaciones de paquetes y E2E por rol para la ficha de usuario.
3. Completar evidencia nativa de foto/cámara y validar la cadena de custodia en Driver PWA/Mobile sobre el AVD/dispositivo, incluyendo fotografía, reintentos y persistencia offline. En AVD ya quedaron aceptados permiso de cámara, apertura de QR y GPS background.
4. Definir proveedor de pagos sandbox y completar callback/webhook firmado.
5. Ampliar lifecycle de boleto para cubrir individualmente vencido, cancelado, reembolso y scanner E2E bajo datos transaccionales.
6. Ejecutar E2E autenticado en entorno sembrado.
7. Completar la matriz de aceptación de Passenger Mobile y Driver Mobile en AVD/dispositivo: foto, offline, sincronización y pago. Auth, viaje demo, QR y GPS background de Driver ya tienen evidencia en AVD; el mapa nativo requiere `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` autorizado.
8. Repetir captura visual y actualizar cierre solo con resultados reproducibles.
9. Ejecutar browser focal del sidebar Admin a 390, 768 y 1440 px; comprobar teclado, colapso, expand/collapse all y estado activo.
10. Configurar credenciales/fixtures de revisión para que el punto 9 pueda ejecutarse sin sembrar la base compartida durante la validación.

No marcar producción lista por compilación. Mantener los bloqueos externos hasta tener evidencia de ejecución.
