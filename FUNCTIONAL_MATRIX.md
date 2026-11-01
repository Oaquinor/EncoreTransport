# Matriz funcional del mandato único

| Área | Estado | Evidencia/endpoint | Nota |
|---|---|---|---|
| Website y búsqueda de viajes | IMPLEMENTADO | `/website/`, `/api/v1/trips/search` | usa datos del backend |
| Passenger reservas/asientos | IMPLEMENTADO | `/passenger/`, reservas y seats | reglas de solapamiento probadas |
| Driver viaje/GPS/incidencias | IMPLEMENTADO/PARCIAL | `/driver/`, `/api/v1/driver/*` | GPS foreground verificado; background nativo pendiente |
| Registro y tracking de paquetes | IMPLEMENTADO | `/package-register/`, `/track-package/`, `PackageController` | referencia privada y estados recibidos/en tránsito/entregado |
| Fotos de perfil | IMPLEMENTADO | `/auth/profile/photo` | validación y almacenamiento real |
| Admin cuenta | IMPLEMENTADO | `/admin/` perfil/configuración | evidencia en `artifacts/reference-implementation-20261030/` |
| Notificaciones por hitos | PARCIAL | `NotificationService` + `/notifications` + inbox Admin | inbox interno implementado; preferencias, push y entregabilidad externa requieren credenciales/contrato |
| Cadena de custodia, transferencias y fotos de entrega | PENDIENTE | sin endpoints actuales | no se simula como terminado |
| App móvil nativa | PENDIENTE | Expo/emulador requerido | typecheck no sustituye QA en dispositivo |
