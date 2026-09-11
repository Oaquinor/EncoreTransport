# Encore Transport

Preview monorepo para una plataforma de movilidad con cuatro experiencias separadas y una API central preparada para evolucionar a produccion.

## Estado actual

Encore Transport mantiene una foundation funcional basada en HTML, CSS manual y JavaScript ES Modules. Esta base conserva flujos importantes de producto:

- Website publico.
- Passenger PWA.
- Driver PWA.
- Admin Dashboard.
- Reglas de negocio y datos mock compartidos.
- Manifest y Service Worker para las PWAs.
- Base Laravel para futura API central.
- Documentacion tecnica inicial.
- Pruebas de reglas criticas.

La migracion debe ser progresiva. No se debe reescribir todo desde cero ni eliminar mocks antes de tener una API real equivalente.

## Arquitectura

```text
Website + Passenger PWA + Driver PWA + Admin Dashboard
  -> Encore API
  -> Laravel
  -> MySQL
```

En el preview actual, las aplicaciones consumen `packages/shared` como contrato temporal de dominio, reglas, datos mock y utilidades UI.

## Requisitos

- Node.js 24 o superior para el preview frontend.
- PHP 8.2 y Composer para trabajar con `backend/laravel`.

## Ejecucion

```bash
npm run dev
```

Luego abre la URL que muestre el servidor local.

Para probar la nueva foundation React/TypeScript de Passenger, instala dependencias y ejecuta:

```bash
npm run dev:passenger
```

La app legacy de Passenger sigue disponible en `/move` con el servidor actual.

## Pruebas

```bash
npm test
```

## Estructura

- `apps/website` - sitio publico comercial.
- `apps/passenger-pwa` - experiencia mobile-first para pasajeros.
- `apps/driver-pwa` - herramienta operacional para conductores.
- `apps/admin-dashboard` - base del futuro Encore Operations Center.
- `packages/shared` - contratos, reglas, datos mock y componentes reutilizables del preview.
- `backend/laravel` - foundation Laravel para la API central real.
- `docs` - documentacion arquitectonica y de migracion.
- `tests` - pruebas de reglas criticas.

## Documentacion clave

- [Architecture](docs/architecture.md)
- [API](docs/api.md)
- [Business Rules](docs/business-rules.md)
- [Database](docs/database.md)
- [Development](docs/development.md)
- [Repository Health](docs/repository-health.md)

## Variables de entorno

Revisa `.env.example` para los valores base del preview y la futura API.
