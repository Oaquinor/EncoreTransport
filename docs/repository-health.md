# Repository Health

## Fase 0 - diagnostico inicial

Este documento registra el inventario inicial para transformar Encore Transport sin perder funcionalidad existente.

## Archivos y carpetas a conservar

- `apps/passenger-pwa`: conserva el flujo conceptual Search -> Results -> Seat -> Passenger -> Review -> Payment -> Confirmation, la PWA foundation y el uso de reglas compartidas.
- `apps/driver-pwa`: conserva el contexto operacional del conductor, proximo viaje, pasajeros, abordaje, incidencias y bitacora.
- `apps/admin-dashboard`: conserva metricas, modulos operativos, tablas y mock dashboard como punto de partida para Encore Operations Center.
- `apps/website`: conserva estructura comercial publica, assets y CTA hacia Passenger.
- `packages/shared/business-rules.mjs`: conserva reglas de precio, busqueda, disponibilidad de asientos, reservas y transiciones de viaje.
- `packages/shared/domain.mjs`: conserva estados y formatters compartidos.
- `packages/shared/api.mjs`: conserva la capa mock como adaptador temporal sustituible por Laravel API.
- `packages/shared/mock-data.mjs`: conserva datos de preview para migracion controlada y pruebas UI.
- `packages/shared/styles.css` y `packages/shared/ui.mjs`: conservan tokens/componentes de preview mientras nace el Design System Encore.
- `apps/*/manifest.webmanifest` y `apps/*/service-worker.mjs`: conservan installability y base PWA.
- `backend/laravel`: conserva la foundation Laravel 11 para evolucionar dominio, API versionada y persistencia.
- `docs`: conserva decisiones iniciales de arquitectura, API, base de datos, desarrollo y reglas.
- `tests/business-rules.test.mjs`: conserva cobertura de reglas criticas durante la migracion.
- `assets/media`: conserva assets actuales como recursos de marca, sin convertirlos en centro obligatorio del producto.

## Archivos y carpetas a migrar

- `apps/passenger-pwa/app.mjs`: migrar por vertical slices a React + TypeScript + rutas, preservando cada paso del booking.
- `apps/driver-pwa/app.mjs`: migrar a una herramienta operacional React + TypeScript con acciones primarias claras.
- `apps/admin-dashboard/app.mjs`: migrar a Encore Operations Center, reemplazando graficos simulados por visualizaciones reales cuando haya datos adecuados.
- `apps/website/index.html` y `apps/website/app.mjs`: migrar progresivamente a una experiencia comercial orientada al cliente.
- `packages/shared`: dividir con cuidado hacia paquetes como `domain`, `types`, `api-client`, `ui`, `config` y `utilities` cuando exista una base React/TypeScript.
- `backend/laravel/routes` y `backend/laravel/app`: migrar desde skeleton a API versionada `/api/v1` con servicios de dominio.
- `tests`: ampliar cobertura al migrar reglas, booking, asientos, pagos, autorizacion y estados.

## Archivos que eventualmente podrian eliminarse

- `apps/*/app.mjs`: solo despues de que su reemplazo React cubra el flujo equivalente.
- `apps/*/styles.css`: solo despues de consolidar tokens y estilos en el Design System Encore.
- `packages/shared/ui.mjs`: cuando los componentes base existan en `packages/ui`.
- `packages/shared/api.mjs`: cuando `packages/api-client` pueda apuntar a Laravel API o a mocks por configuracion.
- Graficos simulados con `div` en `apps/admin-dashboard`: cuando se introduzcan visualizaciones reales.
- Textos visibles como `Passenger PWA`, `Driver PWA`, `Admin Dashboard`, `preview` o referencias tecnicas internas en superficies de cliente.

## Dependencias actuales

### Root

- Sin dependencias npm declaradas.
- Scripts actuales: `dev`, `start`, `test`, `check`.
- Requisito declarado: Node.js `>=24`.

### Backend Laravel

- PHP `^8.2`.
- `laravel/framework` `^11.0`.
- `laravel/tinker` `^2.9`.
- Dev: Faker, Pint, Sail, Mockery, Collision, PHPUnit, Laravel Ignition.

## Dependencias nuevas propuestas

Estas dependencias no deben instalarse hasta iniciar la fase correspondiente y confirmar que resuelven una necesidad real.

- Fase 1: `vite`, `typescript`, `react`, `react-dom`, `react-router-dom`.
- Fase 1: `tailwindcss`, `postcss`, `autoprefixer` para foundation visual coherente.
- Fase 2: `lucide-react` para iconografia consistente.
- Fase 2/3: Radix UI por componente, no como paquete indiscriminado.
- Fase 2/3: Motion o Framer Motion para transiciones moderadas y respetando reduced motion.
- Fase 6: `recharts` para Operations cuando reemplace graficos simulados por datos utiles.
- Fase 8: `maplibre-gl` solo en pantallas donde el mapa aporte valor real.
- Backend futuro: Laravel Sanctum si encaja con el modelo de autenticacion por Passenger, Driver y Operations.

## Estructura final propuesta

```text
apps/
  website/
  passenger/
  driver/
  operations/
packages/
  api-client/
  config/
  domain/
  types/
  ui/
  utilities/
backend/
  laravel/
docs/
tests/
assets/
```

Los nombres actuales (`passenger-pwa`, `driver-pwa`, `admin-dashboard`) pueden convivir durante la migracion para evitar un big bang rewrite.

## Riesgos de migracion

- Perder reglas compartidas al reescribir pantallas React sin reutilizar `packages/shared`.
- Romper PWA installability al mover entrypoints, manifest o service workers.
- Duplicar logica de precio, disponibilidad o estados entre frontend y backend.
- Introducir demasiadas dependencias antes de estabilizar arquitectura.
- Convertir Operations en CRUD generico en vez de centro operacional.
- Simular pagos exitosos desde frontend sin autoridad backend.
- Renombrar carpetas antes de que existan rutas/builds equivalentes.
- Mantener textos tecnicos internos visibles al cliente durante demasiado tiempo.
- No poder verificar pruebas si Node/npm no estan disponibles en el entorno local.

## Orden exacto de implementacion

1. Resolver salud del repo: conflictos, README, scripts, pruebas actuales y documentacion de foundation.
2. Crear foundation frontend paralela con Vite + React + TypeScript sin destruir apps actuales.
3. Extraer tipos y reglas de dominio desde `packages/shared` hacia paquetes typed.
4. Crear Design System Encore minimo: Button, Input, Card, Badge, Skeleton, EmptyState, ErrorState, Progress, Stepper, StatusBadge.
5. Migrar Passenger por vertical slice: Search, Results, Trip Details, Seat Selection, Passenger Details, Review, Payment, Confirmation, Ticket.
6. Evolucionar Laravel API v1: health, routes, trips/search, trip details, seat availability.
7. Implementar booking backend progresivo: bookings, passengers, seats, pricing.
8. Migrar Driver como herramienta operacional: status, active trip, boarding, incidents, history.
9. Migrar Admin hacia Encore Operations Center con metricas reales y Recharts donde aporte valor.
10. Transformar Website a experiencia comercial sin lenguaje tecnico interno.
11. Integrar MapLibre en pantallas especificas: route preview, trip tracking, active driver route, fleet view.
12. Preparar payments con servicio backend, gateway adapters, estados e idempotencia.
13. Mejorar PWA/offline: estrategias de cache, update available, offline state y recovery.
14. Ejecutar auditoria de QA, performance, accesibilidad y seguridad.

## Verificacion inicial

- `git status --short`: sin cambios antes de iniciar Fase 0.
- `npm test`: no ejecutado correctamente porque `npm` no esta disponible en el PATH de PowerShell actual.
- `node`: no disponible en el PATH de PowerShell actual.

## Cambios de Fase 0 aplicados

- README corregido para eliminar marcadores de conflicto Git.
- Inventario de migracion documentado.
- Textos visibles tecnicos removidos de las superficies principales de cliente: hub, website, Passenger, Driver y Operations.
- `reserveSeats` corregido para no descontar asientos cuando la solicitud incluye asientos ya reservados o bloqueados.
- Prueba agregada para reserva de asientos no disponibles.
- Servidor local corregido para impedir escape de directorios al servir rutas con alias de apps.
- Passenger ya no presenta como confirmada una reserva cuyo estado mock queda en `pending_payment`.
- Valores de formularios Passenger escapados antes de renderizarse con `innerHTML`.
- Cache names PWA limpiados para remover nomenclatura de preview.
- Foundation React/TypeScript creada en paralelo en `apps/passenger`.
- Paquetes typed iniciales creados: `@encore/types`, `@encore/domain`, `@encore/api-client`, `@encore/ui`, `@encore/config`, `@encore/utilities`.
- Script `dev:passenger` agregado para probar la nueva app sin reemplazar `/move`.
- Primera capa visual premium de Passenger React codificada: hero mobile, progreso compacto, TripCards refinadas, route rail, seat map con cabina/pasillo/leyenda, resumen sticky, estados de pago y confirmacion.
- Se modifico logica funcional de forma acotada para corregir disponibilidad de asientos, estado de pago y seguridad del servidor local.
