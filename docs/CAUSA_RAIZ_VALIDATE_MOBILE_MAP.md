# Causa raíz — validate:mobile y real-map-contract

## Passenger Mobile

`apps/passenger-mobile/App.tsx` usa:

```ts
process.env.EXPO_PUBLIC_API_URL
```

Expo soporta variables `EXPO_PUBLIC_*`, pero el `tsconfig.json` de la aplicación restringe `types` a `react`. TypeScript no conoce el símbolo global `process`.

No es necesario agregar todos los tipos de Node a una aplicación React Native únicamente para declarar una variable Expo. Se agrega `env.d.ts` con el contrato mínimo necesario.

Se añade el mismo contrato a Driver Mobile porque utiliza la misma variable y su typecheck se ejecuta inmediatamente después.

## Real map contract

La implementación real compone el tile URL así:

```js
`${appConfig.apiBaseUrl}/maps/tiles/{z}/{x}/{y}.png?style=street-light`
```

`appConfig.apiBaseUrl` tiene el prefijo de API (`/api/v1` en la configuración normal).

El test anterior buscaba el literal completo:

```text
/api/v1/maps/tiles/{z}/{x}/{y}.png
```

dentro de `real-map.mjs`.

Ese literal no debe existir porque el prefijo se centraliza en `appConfig`.

La implementación no estaba incumpliendo el contrato. El test estaba comprobando la composición de la URL de una forma incorrecta.

El test corregido comprueba por separado:

- uso de `appConfig.apiBaseUrl`;
- uso de `/maps/tiles/{z}/{x}/{y}.png`;
- ruta Laravel `maps/tiles/{z}/{x}/{y}.png`;
- ausencia de `TOMTOM_API_KEY` en browser code.
