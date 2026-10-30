# Arquitectura frontend y decisiones tecnológicas

## Decisiones

- React 19 + TypeScript se mantiene en Passenger y aplicaciones móviles por sus estados y flujos complejos.
- Vite se mantiene como empaquetador.
- Las aplicaciones estáticas existentes no se migran indiscriminadamente a React.
- Se utilizan APIs nativas modernas cuando aportan valor: `<dialog>`, View Transitions API, `backdrop-filter`, SVG inline y `prefers-reduced-motion`.
- No se introduce canvas para formularios, selects o autenticación: rompería accesibilidad y semántica.
- No se añaden Tailwind, shadcn, Motion o TanStack Query automáticamente; el coste de migración no está justificado sin una etapa dedicada y métricas.

## Responsabilidades

- Laravel: autoridad de reglas comerciales, permisos, reservas y disponibilidad.
- Node: servidor local/proxy y composición de aplicaciones.
- Paquetes compartidos: API, mapas, formatos, iconos y tokens reutilizables.
- Frontends: presentación, interacción y estados transitorios; no inventan disponibilidad ni GPS.
