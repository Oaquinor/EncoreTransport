# EncoreTransport — Auditoría del mandato integral

## Línea base revisada

- Repositorio: `Oaquinor/EncoreTransport`
- Rama: `main`
- Commit de referencia: `b6caa73a52b516be09a1ef9ba91c66d47252b90a` (`Correciones`)
- El commit anterior `fb1e341e43215beae26758318e201d7409793b58` fue contrastado para identificar exactamente qué cambió en el último bloque.

## Arquitectura encontrada

- Servidor frontal Node personalizado: `server.mjs`, puerto 4173.
- Website público: HTML/CSS/ES modules.
- Passenger Web: React + Vite.
- Passenger PWA legado: permanece en el repo, pero este entregable redirige `/move/` al Passenger vigente para evitar dos flujos productivos divergentes.
- Driver PWA: HTML/CSS/ES modules.
- Driver/Passenger mobile: React Native/Expo existentes; no se sustituyen por la PWA.
- Admin Dashboard: HTML/CSS/ES modules.
- API: Laravel + MySQL.
- Autenticación actual: tokens propios hash SHA-256 almacenados en `api_tokens`.
- Mapas: TomTom centralizado detrás de Laravel.
- Reservas: servicio transaccional con `lockForUpdate` y restricción única por viaje/asiento.
- Pagos: interfaz de gateway existente; gateway real todavía no configurado.
- Tickets: emisión y validación de token opaco ya presentes en el head actual.

## Defectos críticos encontrados

1. El repositorio todavía exponía dos Passenger distintos (`/passenger` y `/move`) con riesgo de reglas divergentes.
2. La autenticación visual estaba duplicada entre aplicaciones. Se agrega `/login/` como punto de entrada común y se valida el rol antes de respetar `return`.
3. El token se guardaba únicamente en `localStorage`. Se cambia el cliente compartido a `sessionStorage` por defecto, manteniendo lectura del almacenamiento anterior para transición.
4. El mapa de asientos seguía infiriendo 2+2 a partir de letras. Se agregan metadatos persistentes `row_number` y `position_index`, además de `accessible` y `blocked`.
5. Website y Passenger no compartían un componente/configuración suficientemente flexible para la disposición de asientos.
6. Los requisitos de paquetes, horarios de conductores y estado operativo del vehículo no tenían persistencia ni endpoints.
7. Admin continuaba concentrando navegación/renderizado en un único archivo. Se separan registro de módulos, API y vistas.
8. Los reportes especializados no estaban diferenciados. Se agregan contratos distintos para Travel, Vehicle y Trip. Trip Cost Summary queda explícitamente bloqueado hasta que existan fuentes reales de costos.
9. El contenido comercial del Website exponía terminología técnica como Laravel/API/MySQL. Se reemplaza por texto orientado al pasajero.
10. El logo corporativo no se usaba consistentemente como marca principal en Website/login.
11. El PWA Driver todavía necesitaba cubrir las prioridades del cliente: schedule, vehicle status y package intake.
12. Faltaban pruebas específicas para las prioridades nuevas y una prueba automática del enrutamiento `/ -> /website/`.

## Implementado en este entregable

### COMPLETADA EN CÓDIGO, PENDIENTE DE VALIDACIÓN EN EL ENTORNO DEL USUARIO

- Redirección raíz y resolución segura de recursos estáticos.
- `/login/` centralizado con redirección por rol.
- `/track-package/` público con token opaco y sin contacto del destinatario.
- Website con logo real, contenido comercial y datos reales.
- Passenger con selección de asientos configurada por datos persistidos.
- Metadata de layout de asientos en `bus_seats`.
- Driver schedules con validación de solapamientos.
- Estado operativo de vehículo reportado por Driver.
- Registro y avance de paquetes desde Driver.
- Admin modularizado para las áreas respaldadas por datos reales.
- Reportes diferenciados: Executive, Travel, Vehicle y Trip.
- Trip Cost Summary explícitamente bloqueado cuando no existen costos reales.
- Endpoints y documentación OpenAPI para prioridades nuevas.
- Pruebas de paquete, schedule conflict y metadata de asientos.
- Guard contra hardcode productivo conocido.
- Prueba de raíz/estilos/redirect legacy.

### BLOQUEADA EXTERNAMENTE

- PowerTranz: falta documentación/credenciales de la cuenta real autorizada.
- Stripe: falta cuenta/credenciales/webhook autorizado para validar end-to-end.
- PayPal: falta cuenta/credenciales/webhook autorizado para validar end-to-end.
- WhatsApp Business: faltan cuenta, plantillas y token autorizado.
- FCM/push: faltan proyecto y credenciales.
- SMTP/transaccional real: falta proveedor real si se quiere salir del mailer de log.

### PENDIENTE POR DEFINICIÓN DE NEGOCIO O FUENTE DE DATOS

- Credit Note, Invoice, Supplier Payments, Customer Payments, Accounts.
- Expense, Salary, Tours, Event, Campaign, CRM, Enquiry.
- Maintenance, Inspection, Toll, Fuel cost ledger, odometer history.
- Employee/Leave, Clients/Suppliers/Offices y demás maestros indicados en el mandato.
- Trip Cost Summary monetario: no se calcula hasta existir fuel/tolls/maintenance/other trip expenses reales.

No se crearon CRUD ficticios para esos nombres. Se mantienen documentados como alcance pendiente hasta que exista definición y modelo de datos.

## Riesgos conocidos

- El esquema actual usa tokens Bearer propios. La mejora a cookies HttpOnly requeriría rediseñar el middleware y los clientes; no se hizo de forma parcial para evitar romper mobile/API.
- Las mobile apps existentes requieren una fase separada de integración con los mismos endpoints nuevos.
- La notificación de paquetes está preparada a nivel de datos/eventos, pero no debe reportarse como enviada hasta configurar proveedores externos.
- Los costos de viajes no pueden derivarse de valores inventados.

## Resultado esperado al aplicar

- `/` redirige a `/website/`.
- `/move/` redirige a `/passenger/`.
- `/login/` centraliza el acceso.
- `/track-package/` permite consultar un token válido.
- Website, Passenger, Driver y Admin usan el mismo backend y no tienen fallback silencioso a mocks.
