<<<<<<< HEAD
# EncoreTransport
=======
# Encore Transport

Preview monorepo para una plataforma de transporte y viajes con cuatro experiencias separadas y una API central pensada para evolucionar a producción.

## Qué incluye

- Website público.
- Passenger PWA.
- Driver PWA.
- Admin Dashboard.
- Contratos y reglas compartidas para evitar duplicación.
- Documentación de arquitectura, API, base de datos y reglas de negocio.
- Base preparada para integrar Laravel + MySQL como backend central.

## Arquitectura

La plataforma sigue este principio:

Website + Passenger PWA + Driver PWA + Admin Dashboard -> Laravel API -> MySQL

En este preview, la API central se simula con contratos y reglas compartidas para permitir navegar y validar los flujos desde el navegador sin duplicar lógica crítica en cada app.

## Requisitos

- Node.js 24 o superior.
# Encore Transport

PHP y Composer se contemplan para la futura API Laravel real, pero no son necesarios para este preview inicial.

## Ejecución

```bash
npm run dev
```

Luego abre la URL que muestre el servidor local.

## Pruebas

```bash
npm test
```

## Estructura

- `apps/website` - sitio público.
- `apps/passenger-pwa` - experiencia mobile-first para pasajeros.
- `apps/driver-pwa` - interfaz operativa para conductores.
- `apps/admin-dashboard` - panel administrativo.
- `packages/shared` - contratos, reglas y componentes reutilizables.
- `backend/laravel` - referencia y preparación para la API central real.
- `docs` - documentación arquitectónica.
- `tests` - pruebas de reglas críticas.

## Variables de entorno

Revisa `.env.example` para los valores base del preview y la futura API.
>>>>>>> ce72ae9 (Flatten backend Laravel into main repo)
