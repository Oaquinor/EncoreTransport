# Auditoría y corrección integral — 2026-10-09

## Base auditada

- Repositorio remoto: `Oaquinor/EncoreTransport`
- Rama: `main`
- Commit remoto verificado: `87bdbfb0dc2549ffc051dac12c3977980009c791`

El estado local del equipo del usuario no puede inspeccionarse desde este entorno remoto. El script de aplicación incluido ejecuta `git status --short` y `git rev-parse HEAD` antes de tocar archivos, crea un backup y no borra cambios locales.

## Hallazgos y causas raíz

### Animaciones Website

**Causa raíz 1:** `styles.css` oculta todos los `[data-reveal]` por defecto:

```css
[data-reveal] { opacity:0; transform:translateY(28px) }
```

Si `app.mjs` falla antes de inicializar `IntersectionObserver`, el contenido queda invisible.

**Corrección:** el contenido ahora es visible por defecto. Solo se oculta progresivamente cuando `app.mjs` ha inicializado correctamente el sistema (`html.motion-ready`).

**Causa raíz 2:** `app.mjs` construía `new IntersectionObserver(...)` sin comprobar disponibilidad ni `prefers-reduced-motion`.

**Corrección:** fallback explícito, reduced motion y elementos inicialmente visibles antes de activar el estado animable.

**Causa raíz 3:** `enhancements.mjs` escribía directamente `style.transform` sobre el autobús y las tarjetas. Esto podía competir con transforms de reveal/hover.

**Corrección:** el bus usa una variable CSS `--bus-parallax-y`; se retiró el tilt JavaScript de cards.

### Navegación pública

**Hallazgo:** `Sign in` se presentaba como CTA principal junto al menú del pasajero y la portada publicitaba `Operations`.

**Corrección:** se sustituye por `Staff access`, se elimina la tarjeta comercial de Operations y se priorizan Passenger + Package tracking.

**Hallazgo:** a <=980px `.nav` simplemente se ocultaba.

**Corrección:** menú móvil real con botón, `aria-expanded`, `aria-controls`, Escape, foco al abrir y cierre al cambiar a desktop.

### Seat preview

**Hallazgo funcional:** el preview tomaba siempre `result.trips[0]`. Si ese viaje no tenía seat records, el home mostraba “No seat layout...” aunque otro viaje actual sí estuviera configurado.

**Corrección:** se inspeccionan los viajes devueltos por el servidor y se usa el primero con seats reales. No se crean asientos ficticios.

**Hallazgo backend:** `SeatController` usa `COALESCE(row_number, 9999)` en `orderByRaw`, que ya produjo error 1064 en MySQL por el identificador `row_number`.

**Corrección:** nombres escapados con backticks.

### Admin

**Causa raíz del Loading infinito:** cuando `me()` devolvía un usuario no admin, `ensureAdmin()` configuraba `state.error` pero dejaba `state.loading = true`. `content()` evaluaba loading antes que error, por lo que nunca mostraba el acceso denegado.

**Corrección:** `state.loading = false`, estado explícito `accessDenied`, mensaje comprensible y enlace a la aplicación correspondiente al rol.

### Passenger / Driver

Se añaden microtransiciones de vista y feedback visual sin alterar sus operaciones reales. `prefers-reduced-motion` elimina el movimiento sin ocultar contenido.

## Seguridad / integridad

- No se añadieron credenciales.
- No se expone el secreto TomTom.
- No se crea autenticación administrativa paralela.
- No se agregan módulos ficticios.
- No se simula GPS.
- No se simula pago.
- No se elimina concurrencia de asientos; se conserva la transacción + locks del BookingService.

## Pendientes externos

- Driver Mobile GPS nativo: requiere `expo-location` y permisos Android/iOS.
- PowerTranz / Stripe / PayPal: requieren credenciales/sandbox/webhooks reales.
- Notificaciones externas: requieren credenciales.
- Capturas reales y browser E2E contra Laragon requieren el entorno local del usuario.
