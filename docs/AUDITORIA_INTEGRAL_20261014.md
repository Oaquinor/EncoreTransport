# Auditoría integral EncoreTransport — 2026-10-14

## Base revisada

Repositorio remoto: `Oaquinor/EncoreTransport`  
Rama de referencia: `main`  
Commit remoto inspeccionado: `75e419f23c2b51e04c78218db16fe692e9d2fa54`

No fue posible consultar el `git status` del equipo local del usuario desde GitHub. Por esa razón este entregable no escribe sobre el remoto ni pretende descartar cambios locales.

## P0 reproducidos por inspección

### Servidor y pruebas

El `tests/server-routing.test.mjs` publicado importa:

```text
startEncoreServer
```

pero el `server.mjs` publicado:

- no exporta `startEncoreServer`;
- inicia el servidor inmediatamente al ser importado;
- conserva `/move` como alias físico a `apps/passenger-pwa`;
- no registra `/login`;
- no registra `/track-package`.

La implementación y su test están fuera de contrato entre sí.

### Exposición estática del repositorio

El fallback publicado resuelve cualquier URL contra la raíz del repositorio. En un entorno local eso permitiría intentar servir rutas como:

```text
/package.json
/backend/laravel/composer.json
/backend/laravel/.env
```

La corrección elimina el fallback abierto y sirve únicamente:

- aplicaciones registradas;
- `/assets/`;
- `/packages/shared/`;
- Leaflet `dist`;
- `logo.svg`;
- `robots.txt`.

### Suite Node incompleta

Existen tests que no están conectados a `npm test`:

- `native-gps-contract.test.mjs`;
- `premium-design-contract.test.mjs`;
- `premium-responsive-contract.test.mjs`.

Se integran explícitamente.

### Premium design contract

Al integrar esas pruebas aparecen discrepancias reales:

- Website no cargaba `packages/shared/premium.css` ni `apps/website/premium.css`.
- Driver PWA no cargaba el design system premium.
- Admin no cargaba el design system premium.
- Passenger PWA no importaba el shared premium system ni su `premium.css`.

El script de aplicación del pack agrega esos imports únicamente si aún faltan.

### Mobile validation

Driver Mobile ya declara `expo-location` y su plugin. La documentación seguía afirmando lo contrario.

Passenger Mobile no tenía script `typecheck`, aunque existe `tsconfig.json`.

Se agrega `typecheck` para Passenger Mobile y un `validate:mobile` real para ambos proyectos. No se presenta ese comando como prueba en dispositivo.

## Estado por dominio

### APROBADO con evidencia previa proporcionada por el usuario

Backend Laravel:

```text
21 tests passed
70 assertions
```

Incluye reservas, concurrencia de asientos, package tracking, schedules, mapas TomTom y rechazo explícito de gateway no configurado.

TomTom real:

```text
PASS geocoding
PASS routing
PASS map-display raster tile
```

### CORREGIDO EN ESTE ENTREGABLE, PENDIENTE DE EJECUCIÓN LOCAL

- Servidor reutilizable y testeable.
- `/move/` → `/passenger/`.
- `/login/`.
- `/track-package/`.
- MIME de recursos principales.
- bloqueo de exposición arbitraria del repositorio.
- suite Node completa.
- Passenger Mobile typecheck.
- comandos `validate:mobile`, `validate:backend`, `validate:local`.
- imports premium faltantes.
- README coherente con GPS actual.

### IMPLEMENTADO PARCIALMENTE

- Passenger Mobile: reserva existe; pago/ticket completo aún depende de flujo de proveedor y validación nativa.
- Admin: diez módulos registrados; varios son principalmente consulta y no CRUD completo.
- Packages: creación autorizada por Driver y seguimiento público existen; Admin no tiene creación completa en el estado remoto inspeccionado.
- Reports: reportes existentes consumen backend, pero Trip Cost continúa condicionado a fuentes reales de costos.
- Passenger: flujo de reserva existe; pagos comerciales permanecen bloqueados.

### BLOQUEADO

- PowerTranz / Stripe / PayPal comerciales: credenciales, sandbox autorizado, callbacks y webhooks.
- email / WhatsApp / SMS / push: proveedor real y credenciales.
- background GPS: definición operacional, permisos Android/iOS y validación en stores.
- canonical/sitemap de producción: dominio público definitivo.

### PENDIENTE DE VALIDACIÓN LOCAL/E2E

- `npm install`.
- `npm run validate:frontend`.
- `npm run validate:mobile`.
- `npm run validate:backend`.
- navegador real para Website/Login/Tracking/Passenger/Driver/Admin.
- Passenger Mobile en Android/iOS.
- Driver Mobile GPS en dispositivo.
- flujos E2E A–E del mandato.

## Instrucción de cierre

Después de aplicar el pack:

```bat
npm install
npm run validate:frontend
npm run validate:mobile
npm run validate:backend
```

No ejecutar `build:passenger` desde `backend\laravel`; es un script del `package.json` raíz.
