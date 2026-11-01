# Handoff de siguiente etapa

Rama `main`, referencia `b950cc9`; working tree con cambios no confirmados de esta revisión. `codex/funcionalidad-reservas-rutas` no agrega commits frente a `main` y no requiere merge automático.

1. Repetir Laravel en un entorno semejante a producción y validar la migración duplicada `2026_10_08_000200` sin renombrarla a ciegas.
2. Completar la ficha profunda de cuenta con endpoints paginados de reservas, boletos, paquetes y actividad.
3. Integrar la API de custodia ya disponible en Driver PWA/Mobile con escaneo QR, bandeja de transferencias y reconciliación de manifiestos.
4. Definir proveedor de pagos sandbox y completar callback/webhook firmado.
5. Completar lifecycle de boleto para no presentado, vencido, reembolso y scanner E2E.
6. Ejecutar E2E autenticado en entorno sembrado.
7. Validar Passenger Mobile y Driver Mobile en emulador/dispositivo.
8. Repetir captura visual y actualizar cierre solo con resultados reproducibles.

No marcar producción lista por compilación. Mantener los bloqueos externos hasta tener evidencia de ejecución.
