# Auditoría de acciones y controles

La inspección recursiva encontró 364 archivos fuente bajo `apps`, `backend/laravel` y `packages`; hay 228 etiquetas `<button>`/`<a>` y 122 formularios o listeners de interacción detectables estáticamente. El inventario dinámico completo depende de ejecutar cada superficie autenticada con datos reales.

| Aplicación/pantalla | Control | Acción real | Estado/evidencia |
|---|---|---|---|
| Website/inicio | Buscar viajes | consulta backend y resultados | IMPLEMENTADO; browser visual |
| Website/inicio | Intercambiar origen/destino | intercambia campos | IMPLEMENTADO; contrato UX |
| Website/paquetería | Rastrear encomienda | navega a `/track-package/` | IMPLEMENTADO; server/browser |
| Passenger/asientos | Seleccionar asiento | consulta disponibilidad backend | IMPLEMENTADO; seat contracts |
| Driver/operación | Registrar paquete | POST autenticado del viaje actual | IMPLEMENTADO; browser existente |
| Tracking/resultado | Refresh status | repite consulta por token | IMPLEMENTADO; browser visual |
| Admin/reportes | CSV/JSON/PDF | exporta o imprime el reporte cargado | IMPLEMENTADO; report contracts |
| Admin/perfil | Delete account | confirmación explícita y preservación histórica | IMPLEMENTADO; revisión visual |
| Admin/configuración | Security/Devices/Preferences | control deshabilitado con explicación | BLOQUEADO; API inexistente |
| Pago | Iniciar pago | gateway configurable; por defecto 503 | BLOQUEADO; proveedor/credenciales |

No se eliminaron controles funcionales en esta revisión. Las capacidades no operativas permanecen deshabilitadas y explicadas; el acceso a cuenta sigue separado del flujo comercial.
