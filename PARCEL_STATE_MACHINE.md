# Máquina de estados de paquetería

Estados requeridos por el mandato:

`draft -> registered -> received_at_origin -> assigned_to_trip -> loaded -> in_transit -> arrived_at_terminal -> available_for_pickup -> out_for_delivery -> delivered`

Terminales alternativas: `exception`, `returned`, `cancelled`.

La API actual expone el subconjunto básico de registro y tracking. Las transiciones avanzadas deben ser transaccionales, idempotentes y auditables antes de mostrarse como controles operativos.
