# Frontend Conventions

## Goal

A future developer should understand where code belongs before editing it.

## Naming

Prefer domain-specific names.

Good:

```text
renderTripSummary
renderDriverSchedule
booking-summary
driver-trip-card
admin-report-toolbar
et-ui-badge
```

Avoid adding new vague names:

```text
box
container2
thing
data
item2
card-new
fix
final-fix
gap-close
mandate-fix
```

Existing generic compatibility classes such as `.card`, `.button`, `.badge` remain temporarily because several applications already depend on them.

New reusable classes should be prefixed:

```text
et-ui-*
```

Application-specific classes should identify the application/domain:

```text
public-*
passenger-*
driver-*
admin-*
tracking-*
auth-*
```

## Files

Do not create files named:

```text
*-fix.css
*-final.css
*-new.css
*-gap.css
*-mandate.css
```

Instead modify the owning module or add a clearly named feature file.

## CSS

Each application loads one CSS entrypoint only.

Do not add style imports directly to HTML/main files.

## JavaScript / TypeScript

Large application files are orchestration layers, not dumping grounds.

When a file approaches 500 lines:
- extract API/service logic;
- extract formatters;
- extract screen/view components;
- extract state helpers.

At 900+ lines, splitting should be treated as required maintenance.

## Shared HTML

Do not copy/paste HTML escaping helpers.

Use:

```js
import {
  escapeHtml,
  humanizeStatus,
} from '../../packages/shared/html.mjs';
```

## API

Application code should continue importing from:

```js
packages/shared/api.mjs
```

The facade routes functions to smaller domain modules.

## Comments

Comments should explain why, constraints and invariants.

Good:

```js
// Driver location is shown only after server authorization for the assigned trip.
```

Avoid comments that merely repeat the code.

## Mock/demo data

`packages/shared/mock-data.mjs` is a legacy fixture.

Production apps must not import it.

The architecture test enforces that rule.
