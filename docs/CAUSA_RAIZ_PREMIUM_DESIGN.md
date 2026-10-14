# Causa raíz — premium-design-contract

La prueba es correcta.

El repositorio ya contiene:

- `packages/shared/premium.css`
- `apps/website/premium.css`
- `apps/driver-pwa/premium.css`
- `apps/admin-dashboard/premium.css`
- `apps/passenger/src/premium.css`

pero varias aplicaciones no los cargaban.

## Website

Faltaban:

```html
<link rel="stylesheet" href="../../packages/shared/premium.css" />
<link rel="stylesheet" href="./premium.css" />
```

## Driver PWA

Faltaban:

```html
<link rel="stylesheet" href="../../packages/shared/premium.css" />
<link rel="stylesheet" href="./premium.css" />
```

## Admin

Faltaban:

```html
<link rel="stylesheet" href="../../packages/shared/premium.css">
<link rel="stylesheet" href="./premium.css">
```

## Passenger PWA

Faltaban:

```ts
import '../../../packages/shared/premium.css';
import './premium.css';
```

No se modifica el test para hacerlo pasar. Se corrige la integración real del design system que el test está verificando.
