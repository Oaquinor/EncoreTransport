# Arquitectura final auditada

Laravel conserva la autoridad de reservas, inventario de asientos, permisos, paquetes y GPS. Las superficies web consumen el gateway compartido; Admin y Passenger mantienen sus flujos separados. `packages/shared` contiene API, tokens y utilidades de UI compartidas.

El repositorio permanece en `main` con cambios locales sin commit. No se ejecutaron operaciones destructivas ni se modificó producción.
