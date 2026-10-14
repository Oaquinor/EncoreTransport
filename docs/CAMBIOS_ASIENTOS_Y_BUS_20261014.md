# EncoreTransport — Bus original + selector de asientos según referencia

## Qué corrige este paquete

### Website

Se restaura la imagen de autobús proporcionada por el usuario como:

```text
assets/media/Autobus.png
```

El hero vuelve a consumir:

```text
/assets/media/Autobus.png
```

No se sustituye por otra ilustración generada.

También se agrega `visual-reference.css` como última capa visual para evitar que los estilos anteriores vuelvan a dominar el inicio.

### Passenger

El selector de asientos deja de ser una lista vertical.

La nueva estructura visual sigue la referencia suministrada:

- autobús horizontal;
- frente redondeado a la izquierda;
- parabrisas/cockpit;
- conductor;
- puerta;
- dos asientos arriba;
- pasillo longitudinal central;
- dos asientos abajo;
- filas que avanzan horizontalmente;
- asientos traseros contra la pared cuando la última fila persistida tiene 3 o más asientos;
- salida trasera;
- asientos más pequeños y físicos.

La lógica continúa usando los datos reales del backend:

```text
row_number
position_index
blocked
accessible
available
```

No se inventa la disponibilidad.

## Por qué antes se veía igual

En el `main` revisado, `apps/passenger/src/main.tsx` seguía importando:

```text
styles.css
enhancements.css
visual-gap.css
mandate-motion.css
```

pero no cargaba la capa nueva de asientos.

Además `seat-map.tsx` seguía renderizando cada fila de forma vertical.

Por eso volver a compilar no podía producir el diseño horizontal de la referencia.

## Aplicación

Desde la raíz:

```powershell
powershell -ExecutionPolicy Bypass -File .\EncoreTransport_ASIENTOS_REFERENCIA_Y_BUS_ORIGINAL_20261014\APLICAR_CAMBIOS_ASIENTOS_Y_BUS.ps1 .
```

Luego:

```bat
npm run typecheck:passenger
npm run build:passenger
npm run test:seat-layout
npm run test:premium-design
npm run validate:frontend
npm run dev
```

Si Chrome mantiene el build anterior:

```text
DevTools → Application → Service Workers → Unregister
DevTools → Application → Storage → Clear site data
Ctrl + Shift + R
```
