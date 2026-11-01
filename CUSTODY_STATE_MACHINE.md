# Estado de encomiendas y cadena de custodia

La aplicación actual soporta el registro y tracking básico de paquetes (`received`, `in_transit`, `delivered`).

La cadena de custodia avanzada todavía requiere un contrato explícito para:

`registered -> assigned -> loaded -> in_transit -> transferred -> out_for_delivery -> delivered | exception`

Cada transición deberá guardar actor, viaje/vehículo, fecha, ubicación autorizada y evidencia fotográfica cuando aplique. No se implementa como dato simulado hasta contar con esos permisos y endpoints.
