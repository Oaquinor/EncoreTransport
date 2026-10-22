# Booking contract

Booking states are `draft`, `pending_payment`, `processing_payment`,
`confirmed`, `cancelled`, `expired` and `failed`. A seat hold is created only
inside Laravel's transaction after the trip, segment, seat metadata and
current overlapping reservations are revalidated.

The frontend may display a pending hold, but must not display confirmation or
issue a paid ticket until the backend confirms payment and booking state.
