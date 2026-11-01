# Auditoría de custodia de paquetería

## Verificado

- Registro y cambio de estado dentro de transacciones Laravel.
- Transiciones inválidas rechazadas.
- Reintentos del mismo estado idempotentes.
- Autorización limitada al conductor asignado.
- Entrega exige `recipient_verified` y fotografía.
- Foto en disco privado `local`; tracking público no expone correo, teléfono ni notas internas.
- Eventos con estado y actor se conservan; el destinatario no se vincula automáticamente por correo.
- Cada paquete nuevo recibe un QR operativo opaco; el endpoint de escaneo nunca devuelve datos de contacto.
- Los manifiestos agrupan paquetes por viaje, cuentan escaneos, rechazan paquetes fuera de lista y solo se reconcilian cuando no quedan faltantes.
- Las transferencias requieren conductor receptor, aceptación explícita, bloqueo transaccional y reintento idempotente.

## Cadena todavía incompleta

Los estados base siguen siendo (`received`, `in_progress`, `delivered`) y ahora la custodia avanzada vive en eventos de manifiesto y transferencia. Para el cierre operativo completo faltan terminales, vehículo/ubicación por evento, evidencia por transferencia, integración UI en Driver Mobile/PWA y notificaciones externas confirmadas. Esas capacidades quedan `PARTIAL`, no se simulan en la interfaz.

## Criterio de cierre

Cada transferencia debe crear un evento inmutable con actor, viaje/vehículo anterior y nuevo, terminal, estado anterior/nuevo y evidencia. Un manifiesto debe poder reconciliar sus paquetes sin permitir doble carga simultánea. La entrega debe cerrar la cadena y notificar solo por un canal autorizado y confirmado.
