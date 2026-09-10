# Copilot Instructions

- Mantener la lógica crítica centralizada en la capa API o en contratos compartidos que simulen esa frontera durante el preview.
- No duplicar reglas de reservas, precios, disponibilidad, estados o permisos entre apps.
- Priorizar separación de responsabilidades, bajo acoplamiento y Single Source of Truth.
- Reutilizar componentes y utilidades existentes antes de crear nuevas variantes.
- Documentar decisiones arquitectónicas cuando afecten la evolución futura.
- Actualizar pruebas y documentación cuando se cambie una regla de negocio.
- Mantener las experiencias de website, passenger, driver y admin visualmente distintas.
- Preparar el código para reemplazar los mocks por Laravel + MySQL sin reescribir las interfaces.