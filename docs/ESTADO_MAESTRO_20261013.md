# EncoreTransport — Estado maestro de cierre (2026-10-13)

## Alcance de este entregable

Este paquete consolida únicamente correcciones que ya fueron auditadas y para las que existe evidencia técnica reproducible en los artefactos de trabajo disponibles. No declara terminado lo que depende de credenciales, dispositivos, reglas de negocio todavía no definidas o del estado local del repositorio que no puede inspeccionarse desde este entorno.

El aplicador incluido inspecciona `HEAD`, `git status --short` y aborta si detecta cambios locales en archivos objetivo, salvo que se use `-Force` de forma explícita.

## Estado por módulo

| Módulo | Estado | Evidencia / límite |
|---|---|---|
| Website | IMPLEMENTADO, PENDIENTE DE VALIDACIÓN EXTERNA | Corrige acceso público/admin, menú móvil, animaciones progresivas, seats y manejo de mapa. Requiere validación real en navegador local. |
| Passenger PWA | IMPLEMENTADO, PENDIENTE DE VALIDACIÓN EXTERNA | Motion layer sin alterar contratos; build/typecheck deben ejecutarse en el repo real. |
| Passenger Mobile | PARCIAL | Ya consume API/mapas; requiere prueba separada Expo Android/iOS. |
| Driver PWA | IMPLEMENTADO, PENDIENTE DE VALIDACIÓN EXTERNA | Geolocalización de navegador existente; requiere HTTPS/contexto seguro y prueba real. |
| Driver Mobile | PARCIAL | `expo-location` nativo continúa pendiente; no se simula GPS. |
| Admin | IMPLEMENTADO, PENDIENTE DE VALIDACIÓN EXTERNA | Corrige loading infinito para no-admin y estados de acceso; módulos sin definición suficiente no se inventan. |
| Backend Laravel | IMPLEMENTADO, PENDIENTE DE VALIDACIÓN EXTERNA | Seat SQL, errores de mapas, TomTom, tests de provider y consola diagnóstica. Suite completa debe ejecutarse localmente. |
| Mapas TomTom | IMPLEMENTADO, PENDIENTE DE VALIDACIÓN EXTERNA | Diagnóstico previo del usuario mostró Search/Routing/Map Display PASS; se corrige resolución de rutas fuera de `countrySet=DO`. |
| GPS | PARCIAL | Browser Driver PWA sí puede persistir coordenadas; native mobile sigue pendiente. |
| Paquetes | PARCIAL | No se amplía sin volver a verificar endpoints/reglas en el repo actual. |
| Pagos | BLOQUEADO | PowerTranz/Stripe/PayPal requieren sandbox, credenciales, webhook y confirmación comercial. No se simula aprobación. |
| Notificaciones | BLOQUEADO | SMTP/WhatsApp/FCM requieren cuentas/credenciales y pruebas del proveedor. |
| Finance/CRM/Suppliers/Maintenance/etc. | PENDIENTE | No se crean CRUD ficticios sin modelos, reglas y permisos confirmados. |

## Correcciones consolidadas

### 1. Website público
- El contenido `[data-reveal]` queda visible si JS falla.
- `IntersectionObserver` se activa como mejora progresiva.
- `prefers-reduced-motion` conserva una UI legible.
- Menú móvil real con `aria-expanded`, `aria-controls`, Escape y foco.
- `Staff access` separado de la navegación comercial.
- No se promociona Operations como tarjeta pública.
- El preview de asientos usa la configuración real y no inventa layout.

### 2. Admin
- Un usuario autenticado sin rol admin deja de quedar atrapado en `Loading…`.
- Se muestra `Access denied` o se navega al área correcta.
- Se preserva autenticación centralizada por rol.

### 3. Asientos backend
- Se corrige MySQL para `row_number` y `position_index` escapando identificadores.
- Se preserva la disponibilidad calculada desde registros persistidos.

### 4. Mapas
- Leaflet se intenta cargar localmente antes del CDN.
- Se prueba el tile proxy antes del render.
- Se manejan `tileerror` y estados visibles.
- Los errores TomTom se clasifican sin exponer la key.
- `encore:maps:diagnose` comprueba configuración, geocoding, routing, tiles y ahora también el viaje actual.
- Si el `countrySet` configurado devuelve cero resultados, la geocodificación reintenta sin filtro geográfico; no usa coordenadas ficticias.

### 5. Servidor raíz
- `/` redirige a `/website/` para evitar que CSS/JS relativos se resuelvan contra la raíz y dejen la página sin estilos.

## Pendientes que NO se consideran cerrados

1. Verificar el estado local actual y reconciliar cualquier cambio del usuario antes de aplicar.
2. Ejecutar la suite completa Laravel y resolver cualquier falla nueva del estado local.
3. Ejecutar build/typecheck frontend sobre las dependencias reales.
4. Probar Passenger Mobile y Driver Mobile por separado.
5. Implementar GPS nativo con `expo-location` solo tras definir permisos/background behavior.
6. Probar gateways de pago con sandbox/webhooks reales.
7. Validar notificaciones con proveedor configurado.
8. Ejecutar E2E completo contra MySQL y navegador real.
9. Revisar módulos Admin pendientes contra modelos/reglas existentes antes de construir CRUD.
