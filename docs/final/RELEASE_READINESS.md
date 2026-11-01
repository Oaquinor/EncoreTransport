# Preparación para producción

Actualizado: 2026-11-01. Clasificación actual: `PARTIALLY_COMPLETE`.

Cumplido: reglas de reservas, permisos, perfil Admin, directorio de cuentas con búsqueda server-side, ficha administrativa por pestañas, lifecycle administrativo inicial de boletos, persistencia de notificaciones, navegación pública simplificada, polling Live adaptativo, controles móviles nativos implementados en código, suites automatizadas y pruebas Laravel locales.

No cumplido: cobertura exhaustiva del lifecycle de boletos, proveedor de pagos con sandbox, integración externa con credenciales reales, aceptación de cámara/GPS en dispositivo móvil, push y E2E autenticado por cada rol.

La navegación Admin tiene ahora una estructura por dominios y contrato automatizado; el flujo focal autenticado pasa con el entorno local sembrado. La aceptación por rol y en dispositivo real siguen pendientes, por lo que no se declara `READY_FOR_RELEASE`.
