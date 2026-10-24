# Testing

Commands intended for workspace validation:

```text
npm test
npm run typecheck:api-client
npm run typecheck:passenger
npm run typecheck:passenger-mobile
npm run typecheck:driver-mobile
npm run build:passenger
```

The Node contracts, performance contract and all four typechecks pass in this
workspace. The server-routing/browser step is environment-blocked because the
sandbox cannot open a local listener; Passenger build is blocked by Vite's
read-only temporary directory. Laravel feature tests and migrations are
prepared but `php`, Composer and a test MySQL database are not installed in
this environment. Real browser E2E and physical mobile-device E2E remain
`NOT IMPLEMENTED`.

Additional coverage includes:

- `LiveNetworkTest` for the public latest-location payload and privacy boundary.
- Segment-aware seat availability through `SeatAvailabilityService`.
- `SeatConcurrencyTest` for same-seat overlap versus non-overlapping segments.
- Homepage live-network performance contracts: no initial seat fan-out, lazy map
  initialization, visible-tab polling and marker reuse.

The current container has no `php`, `composer`, MySQL service or browser
listener permission, so Laravel, local-server and visual-browser execution
must be completed in the project Windows/WSL validation environment.
