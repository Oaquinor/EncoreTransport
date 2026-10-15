# Passenger Web

## Responsibility

Transactional trip search, seats, passengers, review and booking.

## Entry point

```text
src/main.tsx
```

## Styling

```text
src/app.css
```

## Rules

- Do not import `packages/shared/mock-data.mjs` in production code.
- Do not duplicate API request infrastructure when a shared API module exists.
- Keep server-owned state authoritative.
- New files and classes should use domain-specific names.
- When an orchestrator grows, extract screens/services instead of adding another patch block.

See:

```text
/docs/ARCHITECTURE.md
/docs/FRONTEND_CONVENTIONS.md
```
