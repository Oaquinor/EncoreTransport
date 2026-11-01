# Encore Transport — sistema de diseño y estados

## Alcance

Este documento define el lenguaje visual aplicado a Website, Passenger, Driver, Admin, Tracking y Package Register. La configuración de cuenta de Admin sigue las referencias `REF_01`–`REF_10` del paquete de mandato sin copiar datos ilustrativos.

## Tokens

- Tinta: `#102130`; tinta secundaria: `#1b3548`.
- Azul primario: `#168dcc` / `#2da9df`; verde operativo: `#1f9d74`; peligro: `#d15858`.
- Fondos: `#eef3f6`, `#f8fcfd`, blanco.
- Radios: 10px para controles, 14–18px para tarjetas, 22–28px para superficies principales.
- Focus: outline de 3px con azul translúcido; todos los controles son navegables por teclado.

## Cuenta de Admin

La pantalla usa breadcrumb, encabezado, pestañas, tarjeta de avatar, información personal, acceso y estado de dispositivos. Las pestañas sin API no se presentan como funcionales: muestran `Unavailable` y explican el bloqueo. La carga de foto usa selección real, previsualización, recorte cuadrado centrado con zoom, validación de tipo/tamaño y persistencia en Laravel. La eliminación usa confirmación explícita `DELETE` y conserva la regla de anonimización del backend.

## Arquitectura del Website

La navegación pública principal expone únicamente `Home`, `Trips`, `Packages`, `Tracking` y `Help`. Cuenta y reservas son superficies separadas: el acceso a cuenta aparece como acción secundaria y no compite con la búsqueda principal. El acceso de Staff permanece en el pie como entrada operativa secundaria.

El recorrido comercial primario es hero/búsqueda → resultados → detalle → Passenger. `Platform`, `Journey Control` y la barra rápida no son superficies públicas; sus destinos válidos se conservan mediante enlaces contextuales en las áreas correspondientes. Se evita repetir botones que llevan al mismo `#book` sin aportar contexto.

## Estados de privacidad de paquetería

`recipient_email` se trata como dato de contacto: registrar un paquete no busca automáticamente una cuenta ni vincula o notifica a un pasajero. La vinculación requiere confirmación explícita. La evidencia fotográfica de entrega se guarda en almacenamiento privado y el tracking público solo expone el estado operativo mínimo, sin correo, teléfono ni notas internas.

## Responsive

Desktop usa dos columnas; tablet apila tarjetas manteniendo densidad intermedia; móvil convierte el formulario en una columna y mantiene botones táctiles. Las capturas se validaron a 390, 1024 y 1440 px sin overflow horizontal.

## Estados

Implementados: vacío, con datos, foto seleccionada, zoom, guardado, error de archivo, confirmación destructiva, dispositivo no disponible y cierre de sesión. No se inventan preferencias, dispositivos, actividad ni notificaciones sin endpoints reales.
