# Business Rules

## Reglas centrales

- La disponibilidad de asientos se determina por viaje y bus asignado.
- El precio se calcula desde la API o su equivalente central, nunca en la UI.
- Una reserva no puede confirmar asientos ya ocupados.
- Los estados de viaje siguen una transición controlada.
- Las cancelaciones deben validar estado, ventanas y permisos.
- La asignación de bus y conductor no se decide desde el frontend.

## Estados del viaje

- scheduled
- boarding
- in_progress
- completed
- cancelled

## Estados del conductor en preview

- next
- active
- finished

## Estrategia de no duplicación

Las interfaces consumen reglas y respuestas consistentes desde `packages/shared`, que actúa como contrato de preview hasta que Laravel sea la fuente real de verdad.