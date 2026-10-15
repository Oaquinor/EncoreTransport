# EncoreTransport — Auditoría interna exhaustiva

Fecha: 2026-10-15  
Repositorio auditado: `Oaquinor/EncoreTransport`  
Rama: `main`

## Conclusión

El problema principal ya no es una sola pantalla.

El repositorio contiene funcionalidad real, pero también contiene demasiadas capas históricas de corrección que se contradicen entre sí. Esto explica por qué una corrección puede existir en un archivo y no verse en runtime.

Los defectos observados se agrupan en cinco categorías:

1. **entrypoints que no usan las capas canónicas creadas;**
2. **tests que verifican arquitecturas antiguas;**
3. **CSS histórico superpuesto;**
4. **archivos de parche/auditoría que ya forman parte del ruido del repositorio;**
5. **áreas de producto que todavía dependen de decisiones o integraciones externas.**

---

## 1. Passenger Web — CRÍTICO

### 1.1 `main.tsx` ignora `app.css`

El repositorio ya contiene:

```text
apps/passenger/src/app.css
```

pero `main.tsx` importa individualmente:

```text
premium.css
styles.css
premium.css
enhancements.css
visual-gap.css
mandate-motion.css
flow-refresh.css
seat-reference.css
```

Esto significa que el entrypoint canónico existe, pero no se usa.

### 1.2 Existen demasiadas implementaciones de SeatMap/CSS acumuladas

Actualmente conviven:

```text
seat-reference.css
seat-premium.css
vector-seat-map.css
passenger-integrated.css
passenger-final.css
layout-alignment.css
seat-map.tsx
```

Algunas usan clases:

```text
reference-*
```

otras:

```text
et-seat-*
```

y el navegador puede terminar con un componente y un CSS que no se corresponden.

### 1.3 Tests de asientos incompatibles entre sí

Un test exige:

```text
--seat-columns
```

otro exige:

```text
et-seat-bus
```

otro exige CSS en:

```text
vector-seat-map.css
```

y otro espera SVG autocontenido.

No pueden ser simultáneamente la arquitectura final.

### Corrección aplicada por este paquete

Passenger queda con:

```text
main.tsx
  ↓
app.css
```

y `seat-map.tsx` dibuja el bus/asientos como SVG interactivo autocontenido.

Los experimentos anteriores se archivan, no se eliminan.

---

## 2. Website — ALTO

### Problema

Existe:

```text
apps/website/app.css
```

pero `index.html` todavía carga múltiples CSS directamente.

Eso contradice `architecture-contract.test.mjs`.

### Corrección

El HTML queda con:

```html
<link rel="stylesheet" href="./app.css">
```

y `app.css` conserva el orden histórico de las capas.

### Deuda restante

Aún existen muchos estilos históricos:

```text
gap-close.css
home-exhaustive.css
visual-reference.css
visual-refresh.css
...
```

No todos están activos.

No se eliminan automáticamente porque primero deben verificarse dependencias visuales.

---

## 3. Driver Web — ALTO

El entrypoint todavía cargaba siete hojas CSS.

Se consolida en:

```text
apps/driver-pwa/app.css
```

La funcionalidad real existente incluye:

- viaje asignado;
- pasajeros;
- boarding;
- horarios;
- incidencias;
- estado del vehículo;
- registro de paquetes;
- GPS;
- mapa de ruta.

### Deuda

`app.mjs` sigue mezclando:

- estado;
- render;
- wiring;
- formularios;
- mapa;
- GPS;
- packages.

Debe dividirse en una refactorización posterior, no junto a esta limpieza.

---

## 4. Admin — ALTO

El Admin cargaba diez CSS directamente.

Se consolida en:

```text
apps/admin-dashboard/app.css
```

### Bien implementado

Los módulos visibles se limitan mayormente a áreas respaldadas por API real.

### Deuda

Separar gradualmente:

```text
state
renderers
tables
report filters
actions
dialogs
```

No se recomienda un rewrite completo.

---

## 5. Login — ALTO

El `server.mjs` de `main` ya contiene:

```text
/login -> apps/auth
```

Si localmente `/login/` sigue mostrando el 404 viejo, el proceso que escucha `4173` no está ejecutando el `server.mjs` actual o el repo local no está sincronizado.

Este paquete incluye el `server.mjs` canónico y un `VERIFICAR_ENTORNO.ps1`.

---

## 6. Tracking — MEDIO

Tracking es una superficie pública y debe permanecer indexable.

Se consolida su CSS.

No debe exponer mensajes internos del backend.

---

## 7. Server — BIEN, con condición local

El servidor actual de `main`:

- tiene allowlist de aplicaciones;
- evita servir `package.json`;
- evita servir backend source;
- expone login/tracking;
- redirige `/move/`;
- agrega `X-Robots-Tag` a API.

La principal inconsistencia encontrada fue entre **el código remoto actual y lo que estaba respondiendo el puerto 4173 del entorno local**.

---

## 8. Service Workers — ALTO

Passenger tenía:

```text
encore-passenger-v1
```

y una estrategia muy mínima.

Cuando se hacen muchas iteraciones visuales, un service worker antiguo puede aumentar la confusión de runtime.

Se sube el cache a:

```text
encore-passenger-shell-v6
```

con:

```text
skipWaiting()
clients.claim()
network-first
```

---

## 9. Tests — CRÍTICO

Los tests no son solamente insuficientes: algunos verificaban estados históricos incompatibles.

### Ejemplo

`seat-layout-visual-contract.test.mjs` esperaba una implementación distinta a la actual.

`architecture-contract.test.mjs` esperaba `app.css`, pero los entrypoints todavía importaban CSS individualmente.

`premium-design-contract.test.mjs` esperaba exactamente lo contrario: CSS individual.

Es decir: dos contratos del mismo repositorio pedían arquitecturas distintas.

### Corrección

Este paquete actualiza esos contratos para que todos validen:

```text
un app.css por aplicación
SeatMap SVG autocontenido
server aliases reales
sin mock data en producción
```

---

## 10. Root repository — MEDIO

Todavía hay varios:

```text
APLICAR_*.ps1
```

en root.

Son evidencia histórica útil, pero no deben confundirse con el flujo normal de desarrollo.

Se archivan en:

```text
tools/legacy-patches/
```

---

## 11. Documentación — MEDIO

El directorio `docs/` contiene decenas de auditorías históricas:

```text
AUDITORIA_*
FIX_*
RESULTADOS_*
VALIDACION_*
```

Esto dificulta saber cuál documento representa el estado actual.

No se mueven automáticamente en este paquete porque algunos pueden estar enlazados desde trabajo externo.

Recomendación:

```text
docs/current/
docs/archive/2026-10/
docs/reference/
```

---

## 12. Mobile — ALTO

### Passenger Mobile

`App.tsx` sigue siendo demasiado grande y contiene:

- API;
- navegación;
- search;
- map;
- seats;
- login;
- booking;
- estilos.

Debe dividirse.

### Driver Mobile

Es todavía más grande e incluye:

- auth;
- viaje;
- passengers;
- GPS;
- schedule;
- incidences;
- vehicle;
- packages;
- mapa.

No debe seguir creciendo en `App.tsx`.

### Refactor recomendado

```text
src/
  api/
  components/
  screens/
  hooks/
  domain/
  location/
  styles/
```

No se aplica automáticamente porque necesita pruebas reales de Expo/device.

---

## 13. Backend Laravel — BUENA BASE

La estructura actual de Laravel está mejor separada que la del frontend:

```text
Controllers
Requests
Resources
Middleware
Services
Models
Jobs
```

No se recomienda reorganizar por moda.

### Riesgo importante: migraciones

Hay dos migraciones con el prefijo:

```text
2026_10_08_000200
```

No deben renombrarse ciegamente si alguna instalación ya las ejecutó.

Se debe comparar:

```text
php artisan migrate:status
```

en cada ambiente antes de modificar historial.

---

## 14. Pagos — BLOQUEADO EXTERNAMENTE

Actualmente:

```text
ENCORE_PAYMENT_GATEWAY=unconfigured
```

y solo existe:

```text
UnconfiguredPaymentGateway
```

Esto es seguro porque falla cerrado, pero **no es un sistema de pagos terminado**.

Faltan:

- proveedor aprobado;
- credenciales sandbox;
- webhook secret;
- callback URLs;
- verificación webhook;
- success/failure flow;
- prueba E2E.

---

## 15. Product configuration — DECISIÓN PENDIENTE

Los defaults actuales siguen apuntando a:

```text
Dominican Republic
DOP
America/Santo_Domingo
```

Durante el proyecto también han existido requisitos asociados a Guyana.

No debe resolverse inventando.

Debe definirse el mercado final y después configurar:

```text
country
currency
locale
timezone
SEO locations
seed/demo data
```

---

## 16. Mock/demo data — BAJO pero debe aislarse

`packages/shared/mock-data.mjs` todavía existe.

No es un problema mientras ninguna app productiva lo importe.

Debe quedar únicamente como fixture de desarrollo o moverse posteriormente a:

```text
fixtures/
tests/fixtures/
```

---

## 17. SEO — PARCIALMENTE CERRADO

Indexables:

```text
/website/
/track-package/
```

No indexables:

```text
/passenger/
/driver/
/admin/
/login/
/api/
```

Falta para producción:

- hostname final;
- canonical absoluto;
- sitemap absoluto;
- og:image final;
- Search Console.

---

# Estado real

## Puede consolidarse ahora

- CSS entrypoints.
- SeatMap.
- tests contradictorios.
- root patch scripts.
- service worker Passenger.
- server local canónico.
- repository audit automation.

## Requiere una segunda refactorización con pruebas

- Passenger `passenger-app.tsx`.
- Passenger Mobile.
- Driver Mobile.
- Driver PWA.
- Admin renderer decomposition.

## Bloqueado fuera del código

- payment provider;
- notification provider;
- domain/HTTPS;
- final market configuration;
- device E2E;
- browser E2E;
- deployment/rollback acceptance.

---

# No declarar “completo” todavía

Después de este paquete, la estructura queda mucho más coherente, pero el cierre real requiere que:

```text
npm run validate:frontend
npm run validate:mobile
npm run validate:backend
```

pasen en el entorno del proyecto y que las aplicaciones se revisen en navegador/dispositivo.
