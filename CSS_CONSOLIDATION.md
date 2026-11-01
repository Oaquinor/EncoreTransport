# Consolidación CSS

La cuenta de Admin se integró en `apps/admin-dashboard/app.css` y reutiliza los tokens compartidos. No se añadió una capa `final-fixes.css` ni un parche externo. Las reglas de modal, tarjetas, pestañas, avatar y responsive están agrupadas por dominio y usan los breakpoints existentes del dashboard.

Pendiente de una siguiente iteración: eliminar gradualmente hojas históricas no referenciadas después de una medición completa de cobertura CSS; no se eliminaron reglas activas sin prueba de consumidores.
