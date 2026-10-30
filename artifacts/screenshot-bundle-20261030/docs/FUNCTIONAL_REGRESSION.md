# Regresión funcional

## Pruebas ejecutadas

`npm test` pasó en la línea base, incluyendo negocio, routing, permisos, reportes, mapas, asientos, UX, diseño premium, responsive, SEO y rendimiento.

También pasaron:

- `npm run typecheck:api-client`
- `npm run typecheck:passenger`
- `npm run typecheck:passenger-mobile`
- `npm run typecheck:driver-mobile`
- `npm run test:visual-browser` para Passenger a 390px y 1440px

## Cambios recientes verificados

- Configuración de cuenta oculta por defecto y abierta desde Settings.
- Cierre mediante botón, clic en backdrop y `Escape`.
- Foto de perfil con fallback de iniciales.
- Flujo de historial de viajes preservado.
- Selectores de búsqueda, pago y resultados con estilos consistentes.
- Inicio autenticado de Passenger sin cambio intermedio de Home a Account.
- Estado autenticado de Website hidratado desde caché y confirmado por `/auth/me`.
- Perfil Passenger: guardado deshabilitado sin cambios y validación de teléfono comprobada.
