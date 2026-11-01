# Handoff de siguiente etapa

Rama `main`, referencia `d91c2b8`; working tree con cambios no confirmados de esta revisión. `codex/funcionalidad-reservas-rutas` no agrega commits frente a `main` y no requiere merge automático.

1. Repetir Laravel en un entorno semejante a producción y validar la migración duplicada `2026_10_08_000200` sin renombrarla a ciegas.
2. Extender la custodia con transferencias, QR y manifiesto conciliable, manteniendo las pruebas Feature existentes.
3. Definir proveedor de pagos sandbox y completar callback/webhook firmado.
4. Implementar transferencias, QR, manifiesto y auditoría de custodia.
5. Ejecutar E2E autenticado en entorno sembrado.
6. Validar Passenger Mobile y Driver Mobile en emulador/dispositivo.
7. Repetir captura visual y actualizar cierre solo con resultados reproducibles.

No marcar producción lista por compilación. Mantener los bloqueos externos hasta tener evidencia de ejecución.
