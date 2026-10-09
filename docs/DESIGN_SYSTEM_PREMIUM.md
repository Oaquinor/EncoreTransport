# EncoreTransport Premium Design System

## Principios

1. **El contenido manda.** Cada pantalla debe tener una acción principal reconocible.
2. **La marca no compite con la operación.** Navy/white dominan; cyan y green son acentos.
3. **Menos contenedores.** No envolver cada dato en una tarjeta.
4. **Una sombra tiene que tener una razón.** Hero overlays, floating header y paneles elevados.
5. **Estados claros.** Success, warning, error y unavailable deben ser legibles sin depender solo del color.
6. **Responsive por composición, no solo por reducción.**
7. **Nada decorativo debe parecer funcional.**

## Paleta

- Navy 950: `#071722`
- Navy 900: `#0b2232`
- Navy 800: `#12364c`
- Blue 600: `#138bc1`
- Blue 500: `#2aa9df`
- Green 500: `#1f9d74`
- Background: `#f5f8fa`
- Surface: `#ffffff`
- Border: `#dce5ea`
- Text: `#0d1c28`
- Muted: `#617381`

## Tipografía

Se conserva la pila nativa/system para evitar una dependencia tipográfica externa:

`Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

Jerarquía:
- Hero: peso 900, tracking negativo.
- H1/H2 de producto: 800–900.
- Datos de operación: 700–850.
- Eyebrow/kicker: uppercase, tracking amplio.
- Texto funcional: 14–16 px equivalente.

## Espaciado

Base de 4 px:
- 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96.

## Radios

- Inputs: 10–13 px.
- Botones: 11–13 px.
- Cards operativas: 14–18 px.
- Hero/piezas editoriales: 20–28 px.
- No usar 30–60 px indiscriminadamente en tablas y herramientas empresariales.

## Sombras

- `--et-shadow-sm`: pequeñas superficies elevadas.
- `--et-shadow-md`: search, floating panels.
- `--et-shadow-lg`: hero/booking overlay.
- Admin usa preferentemente bordes en vez de sombras.

## Botones

- Primary: navy.
- Accent: blue solo para acciones destacadas específicas.
- Success se reserva para estados, no como color general de navegación.
- Ghost: blanco con borde.
- Disabled: opacidad + cursor.

## Forms

- Label visible.
- Focus ring azul.
- Error cerca del control o en mensaje de formulario.
- Altura mínima táctil ~44–50 px.

## Mapas

- Cartografía real únicamente.
- Overlay UI mínimo.
- Un marcador de vehículo solo aparece con dato GPS.
- El proveedor no se presenta como texto técnico al pasajero, salvo atribución requerida por el mapa.

## Asientos

Estados:
- Available: blanco.
- Selected: verde.
- Occupied: gris.
- Blocked: rojo/gris cálido.
- Accessible: contorno/acento azul + símbolo.

La estructura se deriva de `row_number` y `position_index`.

## Admin

- Sidebar oscuro.
- Contenido claro.
- KPI con borde, no con exceso de sombra.
- Tablas con búsqueda, orden, paginación.
- Forms a la izquierda solo cuando complementan la lista de la derecha.
