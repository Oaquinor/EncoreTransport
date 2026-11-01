# Handoff de siguiente etapa

Rama `main`, referencia `2bfa966`; working tree con cambios no confirmados de esta revisión. `codex/funcionalidad-reservas-rutas` no agrega commits frente a `main` y no requiere merge automático.

1. Repetir Laravel en un entorno semejante a producción y validar la migración duplicada `2026_10_08_000200` sin renombrarla a ciegas.
2. Añadir la gestión administrativa de autorizaciones de paquetes y E2E por rol para la ficha de usuario.
3. Completar evidencia nativa de foto/cámara y validar la cadena de custodia en Driver PWA/Mobile sobre dispositivo/emulador.
4. Definir proveedor de pagos sandbox y completar callback/webhook firmado.
5. Ampliar lifecycle de boleto para cubrir individualmente vencido, cancelado, reembolso y scanner E2E bajo datos transaccionales.
6. Ejecutar E2E autenticado en entorno sembrado.
7. Validar Passenger Mobile y Driver Mobile en emulador/dispositivo.
8. Repetir captura visual y actualizar cierre solo con resultados reproducibles.

No marcar producción lista por compilación. Mantener los bloqueos externos hasta tener evidencia de ejecución.
