# Encore Assistant

Status: `PARTIAL` — the authorization boundary and tool contract are defined;
OpenClaw, WebChat and WhatsApp credentials are external blockers.

OpenClaw is an internal gateway only. It must never connect to MySQL or bypass
Laravel. Every tool calls a Laravel service/API endpoint, and Laravel remains
the authority for identity, permissions, validation, transactions and audit.

Tool classes:

- `READ`: search trips, routes, seats, bookings, tickets, package tracking and reports.
- `WRITE-SAFE`: support cases and notes.
- `CONFIRMATION-REQUIRED`: cancellation, trip changes, package-status changes and driver assignment.
- `HIGH-RISK`: refunds, deletion, deactivation, permission changes and financial adjustments.

Required audit fields are agent, channel, authenticated user, role, permission
snapshot, session, tool, sanitized arguments, result, timestamp, confirmation
state and error. Secrets and raw payment data are excluded.

Laravel persistence is provided by `AiActionLog`; OpenClaw is not allowed to
write this record directly and must submit the sanitized event through the
Encore boundary.

Deployment inputs still required: OpenClaw gateway URL/token, agent bindings,
allowlist/pairing, session health and reconnection policy. WhatsApp remains
`NOT IMPLEMENTED` until a dedicated number and approved gateway are supplied.
