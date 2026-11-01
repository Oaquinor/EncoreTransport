# Matriz de completitud del producto

| Módulo | Estado | Evidencia | Próximo cierre |
|---|---|---|---|
| Website comercial | `VERIFIED` | navegación simplificada, búsqueda y browser visual | E2E autenticado completo |
| Admin dashboard | `PARTIAL` | KPI reales, sidebar, mapa, reportes, permisos | E2E por rol y tablas con volumen |
| Gestión de cuentas | `VERIFIED` | filtros server-side, paginación, permisos y ficha por pestañas con endpoints independientes | E2E por rol y datos de volumen |
| Passenger Web/PWA | `PARTIAL` | reservas, asientos, pagos configurables, boleto | aceptación completa de boleto/QR |
| Passenger Mobile | `PARTIAL` | typecheck y flujo de reservas/boleto | dispositivo/emulador y notificaciones |
| Driver Web/PWA | `PARTIAL` | viaje, abordaje, GPS foreground, paquetes e incidencias | cadena de custodia completa y offline real |
| Driver Mobile | `PARTIAL` | typecheck, GPS foreground y controles de custodia conectados al backend | cámara/foto nativa, dispositivo y GPS background |
| Boletos/QR | `PARTIAL` | emisión, validación transaccional y administración de estados con detalle/historial | cobertura completa de transiciones, scanner E2E y proveedor de pagos |
| Paquetería | `PARTIAL` | registro, estados, foto privada, tracking, QR, manifiesto conciliable, transferencia aceptada y UI Driver PWA/Mobile | evidencia nativa, terminal/vehículo/ubicación por evento y notificación externa confirmada |
| Reportes | `VERIFIED` | filtros, totales, gráficos y exportaciones existentes | reconciliación con entorno productivo |
| Integraciones externas | `BLOCKED` | contratos/local tests | pagos, correo, WhatsApp, push, TomTom con credenciales |
