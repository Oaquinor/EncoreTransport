# Matriz de estado despues de aplicar el pack

| Area | Estado esperado | Fuente de verdad | Observacion |
|---|---|---|---|
| Website layout | Restaurado | Git main | HTML/CSS/assets no se redisenan |
| Website routes | Real | Laravel/MySQL | `/api/v1/routes` |
| Website search handoff | Real | Query params | Abre Passenger con filtros |
| Website route geometry | Real si TomTom esta configurado | Laravel -> TomTom | Se dibuja geometria real; no key en browser |
| Passenger search | Real | Laravel/MySQL | `/trips/search` |
| Passenger trip | Real | Laravel/MySQL | `/trips/{id}` |
| Passenger seats | Real | Laravel/MySQL | `/trips/{id}/seats` |
| Passenger booking | Real | Laravel transaction | seat IDs + passengers |
| Booking hold | Real | booking_seats / expires_at | conserva locks existentes |
| Payment | Dependencia externa | PaymentGatewayInterface | NO se simula exito |
| Ticket final | Pendiente de pago real | tickets | no se muestra como emitido antes de pago |
| Driver login | Real | API token | sin user/code hardcodeado |
| Driver assigned trip | Real | trips.driver_id | `/driver/trips/current` |
| Driver start/complete | Real | MySQL | transiciones controladas |
| Boarding | Real | booking_passengers.boarded_at | persistente |
| GPS | Real | driver_locations | usa navegador + API |
| Incidents | Real | incidents | migracion nueva |
| Admin login | Real | API token role admin | middleware `api.token:admin` |
| Admin dashboard | Real | MySQL | sin fallback a mocks |
| Admin report | Real | MySQL | periodo real |
| Swagger | Real | Controller attributes | se elimina supplement duplicado |
| WhatsApp/email | No configurado | proveedor externo | no simulado |
| Realtime websocket | No configurado | futuro broadcaster | latest location sigue disponible |
| Mobile apps nativas | No incluidas en esta reparacion visual web | codigo existente | requieren fase separada de integracion de API nativa |
