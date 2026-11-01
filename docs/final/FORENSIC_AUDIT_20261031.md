# Auditoría forense de hallazgos confirmados

Fecha: 2026-10-31

## Confirmado

- `main` y `codex/funcionalidad-reservas-rutas` tienen alcances distintos. `main` contiene la PWA `apps/package-register`; no se fusionaron ramas automáticamente para evitar perder funcionalidades.
- Los enlaces legales del Website apuntaban a `#contact`. Ahora apuntan a apartados Privacy, Terms y Accessibility persistentes dentro del footer.
- La transición de paquetes a `delivered` no exigía evidencia. Ahora requiere confirmación del receptor y una fotografía de entrega; se almacenan `recipient_verified_at` y `delivery_photo_path`.
- La PWA de paquetes ya contempla el flujo de registro y persistencia de la referencia; la evidencia de entrega queda respaldada por el endpoint Laravel.
- La documentación de diseño y cierre existe en `DESIGNER.md` y `docs/final/FINAL_DELIVERY.md`.

## Pendiente o bloqueado

- No se reconcilian ramas sin una decisión explícita sobre qué historial debe conservarse.
- La entrega de notificaciones externas, GPS en segundo plano y proveedores OAuth depende de credenciales y dispositivos no disponibles en este entorno.
- La validación E2E autenticada contra un entorno de producción no se declara ejecutada sin credenciales de prueba reproducibles.

## Validación

- `npm test`: aprobado.
- PHP lint de controlador, modelo y migración: aprobado.
- Auditoría Playwright de botones: siete rutas, 375/768/1440 px, sin desbordes ni controles visibles fuera del viewport.
