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

El Website es ahora multipágina. La navegación primaria expone `Inicio`, `Viajes`, `Paquetería`, `Seguimiento` y `Empresa y ayuda`; cada grupo despliega destinos reales con hover, clic y teclado en escritorio, y se comporta como acordeón en móvil. Escape, navegación a un enlace, pérdida de foco y cambio de breakpoint cierran los menús abiertos.

Las páginas públicas son `/website/`, `/website/routes/`, `/website/trips/`, `/website/packages/`, `/website/services/`, `/website/live/`, `/website/about/`, `/website/contact/` y `/website/help/`. La home conserva únicamente la decisión inicial: hero, búsqueda, rutas destacadas, acceso contextual a paquetería, resumen de Encore Live, servicios y ayuda. Las explicaciones extensas viven en sus páginas propias.

El recorrido comercial primario es inicio/búsqueda → resultados → detalle → asientos → pasajeros → pago → boleto en Passenger. El Website solo construye y transfiere `origin`, `destination`, `date` y `passengers`; no duplica la lógica de reserva. `Platform`, `Journey Control` y la barra rápida no son superficies públicas. El acceso de personal se mantiene discreto en el footer y la cuenta/reservas permanecen separadas.

## Estados de privacidad de paquetería

`recipient_email` se trata como dato de contacto: registrar un paquete no busca automáticamente una cuenta ni vincula o notifica a un pasajero. La vinculación requiere confirmación explícita. La evidencia fotográfica de entrega se guarda en almacenamiento privado y el tracking público solo expone el estado operativo mínimo, sin correo, teléfono ni notas internas.

## Reglas por aplicación

- **Website:** identidad comercial, una búsqueda principal, rutas y paquetes como accesos contextuales; no expone herramientas internas de operación.
- **Admin:** producto empresarial con sidebar por dominio, header persistente, breadcrumbs, búsqueda server-side, tablas paginadas, filtros combinables, acciones contextuales, permisos visibles y estados de carga/error/vacío.
- **Passenger:** aplicación personal centrada en el próximo viaje, con reservas, boletos vigentes e historial separados; el pago y la emisión del boleto muestran estados reales del backend.
- **Driver:** operación primero: viaje activo, pasajeros, paquetes, vehículo, GPS e incidencias; cada acción debe ser rápida, reversible cuando corresponda y autorizada por Laravel.
- **Paquetería:** la referencia, estado actual, próxima acción y línea temporal son el eje; los detalles administrativos y la evidencia privada no se mezclan con el tracking público.

## Navegación Admin premium

El sidebar organiza únicamente módulos existentes y autorizados en `Operations`, `Fleet`, `Clients`, `Paquetería`, `Control` y `System`. Cada grupo es expandible, persistente y navegable por teclado; el módulo activo expone `aria-current="page"`. En modo colapsado se conservan el tooltip/nombre accesible, el icono y una abreviatura visual del grupo. La especificación de aceptación está en `docs/final/ADMIN_NAVIGATION_ACCEPTANCE.md`.

## Componentes compartidos

Se reutilizan los patrones de `packages/shared`: botones con foco visible, badges semánticos, tablas con búsqueda/paginación, tarjetas de viaje, mensajes de estado, mapas con fallback explícito y controles táctiles. No se crea una hoja correctiva nueva para ocultar problemas; las reglas específicas permanecen junto a la aplicación responsable y los contratos de comportamiento se prueban en frontend o Laravel.

## Responsive

Desktop usa dos columnas; tablet apila tarjetas manteniendo densidad intermedia; móvil convierte el formulario en una columna y mantiene botones táctiles. Las capturas se validaron a 390, 1024 y 1440 px sin overflow horizontal.

## Estados

Implementados: vacío, con datos, foto seleccionada, zoom, guardado, error de archivo, confirmación destructiva, dispositivo no disponible y cierre de sesión. No se inventan preferencias, dispositivos, actividad ni notificaciones sin endpoints reales.
