# Matriz de módulos administrativos

| Módulo solicitado | Estado real después del pack | Fuente / decisión |
|---|---|---|
| Dashboard | Implementado, pendiente de validación | trips/bookings/payments/incidents/packages/schedules |
| Operations | Parcial | Trips, routes, incidents, packages y schedules disponibles |
| Booking | Implementado | bookings + booking_passengers + booking_seats |
| Vehicle | Implementado parcial | buses + trips + vehicle_status_reports |
| Drivers | Implementado parcial | drivers + trips + schedules |
| Reports | Implementado parcial | executive/travel/vehicle/trip |
| Trip Cost Summary | Bloqueado por datos | no hay fuentes persistidas de fuel/tolls/maintenance costs |
| Travel Report | Implementado | trips/bookings/capacity |
| Vehicle Report | Implementado parcial | buses/trips/latest vehicle status |
| Trip Report | Implementado | trip + route + bus + driver + bookings + incidents |
| Incident | Implementado | incidents |
| Shift / horarios | Implementado como Driver schedules | driver_schedules |
| Package tracking | Implementado | packages + package_events |
| Fuel indicator | Implementado como estado manual | vehicle_status_reports; no equivale a consumo/costo real |
| Maintenance | Pendiente | falta dominio y esquema de mantenimiento |
| Inspection | Pendiente | falta dominio y esquema |
| Toll | Pendiente | falta fuente de peajes/costos |
| Finance | Parcial | pagos confirmados e ingresos disponibles; contabilidad completa no existe |
| Invoice / Credit Note | Pendiente | no existe modelo financiero suficiente |
| Supplier/Customer Payments | Pendiente | no existe dominio CxP/CxC en este repo |
| Accounts | Pendiente | falta definición contable |
| Expense / Salary | Pendiente | falta dominio y reglas |
| CRM / Enquiry / Campaign | Pendiente | falta dominio y contrato |
| Users / roles | Parcial | users.role actual; no existe RBAC granular |
| Masters / Configuration / Admin Center | Pendiente de arquitectura | no duplicar hasta definir catálogos reales |
| Clients / Suppliers / Offices | Pendiente | falta modelo persistente |
| Support-Contact / Connect Support | Pendiente | falta definición y proveedor |
