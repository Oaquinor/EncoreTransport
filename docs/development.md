# Development

## Arranque rápido

```bash
npm run dev
```

## Passenger React/TypeScript

La nueva foundation se implementa en paralelo para no romper `/move`.

```bash
npm install
npm run dev:passenger
```

Mientras migra, la app React consume `@encore/api-client` con mocks tipados. El objetivo es poder cambiar ese cliente hacia Laravel API sin reescribir pantallas.

## Pruebas

```bash
npm test
```

## Convenciones

- Reutilizar reglas y componentes compartidos antes de crear variantes nuevas.
- Mantener nombres descriptivos y funciones pequeñas.
- Documentar cualquier decisión que afecte contratos o migración futura.
- No introducir credenciales ni secretos en el repositorio.

## Futuro backend Laravel

Cuando PHP y Composer estén disponibles, la carpeta `backend/laravel` debe convertirse en la API central real manteniendo los contratos del preview.
