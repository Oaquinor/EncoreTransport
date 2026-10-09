# Archivos modificados

| Archivo | Cambio |
|---|---|
| `apps/website/index.html` | Staff access, menú móvil accesible, separación público/admin, retira Operations de marketing. |
| `apps/website/app.mjs` | Reveal robusto, reduced motion, menú móvil, seats sin inventar datos, errores aislados de mapa. |
| `apps/website/enhancements.mjs` | Elimina conflictos de transform y conserva parallax/scroll progress de forma segura. |
| `apps/website/mandate-fixes.css` | Progressive animation, menú móvil, layout header, seat fallback. |
| `apps/admin-dashboard/index.html` | Carga capa correctiva. |
| `apps/admin-dashboard/app.mjs` | Corrige Loading infinito de no-admin y acceso denegado. |
| `apps/admin-dashboard/mandate-fixes.css` | Estados Loading/Error/Access denied y reduced motion. |
| `apps/passenger/src/main.tsx` | Importa motion layer. |
| `apps/passenger/src/mandate-motion.css` | Transiciones de vista y microfeedback respetando reduced motion. |
| `apps/driver-pwa/index.html` | Importa motion layer. |
| `apps/driver-pwa/mandate-motion.css` | Feedback y transiciones sin interferir con mapas/acciones. |
| `backend/laravel/app/Http/Controllers/Api/V1/SeatController.php` | Corrige SQL de `row_number`/`position_index`. |
| `tests/ux-regression.test.mjs` | Previene regresiones de reveal, admin loading, staff access y SQL. |
| `package.json` | Integra `test:ux-regression`. |
| `README.md` | Documenta arquitectura y estado real actual. |
