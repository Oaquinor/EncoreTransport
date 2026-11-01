# Matriz de completitud del producto

| Módulo | Estado | Evidencia | Próximo cierre |
|---|---|---|---|
| Website comercial | `VERIFIED` | navegación simplificada, búsqueda y browser visual | E2E autenticado completo |
| Admin dashboard | `PARTIAL` | KPI reales, sidebar, mapa, reportes, permisos | E2E por rol y tablas con volumen |
| Gestión de cuentas | `VERIFIED` | filtros server-side, paginación y permisos | ficha profunda por pestañas |
| Passenger Web/PWA | `PARTIAL` | reservas, asientos, pagos configurables, boleto | aceptación completa de boleto/QR |
| Passenger Mobile | `PARTIAL` | typecheck y flujo de reservas/boleto | dispositivo/emulador y notificaciones |
| Driver Web/PWA | `PARTIAL` | viaje, abordaje, GPS foreground, paquetes e incidencias | cadena de custodia completa y offline real |
| Driver Mobile | `PARTIAL` | typecheck y GPS foreground | paquetes, escaneo y GPS background |
| Boletos/QR | `PARTIAL` | emisión y validación transaccional | no presentado, vencido, reembolso, scanner E2E |
| Paquetería | `PARTIAL` | registro, estados básicos, foto privada, tracking, QR, manifiesto conciliable y transferencia aceptada | UI de escaneo en apps Driver, terminal/vehículo/ubicación por evento y notificación externa confirmada |
| Reportes | `VERIFIED` | filtros, totales, gráficos y exportaciones existentes | reconciliación con entorno productivo |
| Integraciones externas | `BLOCKED` | contratos/local tests | pagos, correo, WhatsApp, push, TomTom con credenciales |
