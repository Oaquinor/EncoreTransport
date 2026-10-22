# Routes and segments

Current operational stops are Georgetown, Rosignol and New Amsterdam. A route
may expose ordered stops and all valid forward pairs. A booking stores the
origin/destination stop sequence on every reserved seat.

Two reservations conflict only when their intervals overlap:

```text
existing.origin < requested.destination
AND existing.destination > requested.origin
```

The check and insertion run inside a transaction with row locks. A database
unique key prevents duplicate reservations for the same trip/seat/segment.
Segment prices are explicit in `route_segments`; an unpriced segment falls
back to the trip fare and is a documented Operations configuration gap.
