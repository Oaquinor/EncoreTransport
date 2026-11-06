# User access maintenance

## Reference model

The local `JoS-Asociados-SRL/SJ_ERP` repository was reviewed as a domain reference. Its user maintenance separates:

- the user master record and operational status;
- profiles that bundle reusable access;
- screen/module access;
- action-level permissions such as view, create and modify;
- context-specific access and user defaults;
- permission copying and transaction logs.

EncoreTransport adopts the useful parts of that model without copying legacy plaintext-password or hard-coded screen rules. Its operational contexts are transport resources (routes, trips, tickets, cargo, fleet and settings), not accounting companies or warehouses.

## Implemented in EncoreTransport

- The user detail permission tab now exposes a summary and a matrix grouped by resource.
- Each permission shows whether it is inherited from a role, directly allowed, directly denied or not granted, including the role sources.
- Roles are listed with their assigned-user and permission counts.
- The permission catalog exposes resource, action, key and label.
- Access copying has a review step before applying changes:
  - `GET /api/v1/admin/users/{user}/access/preview`
  - `POST /api/v1/admin/users/{user}/access/copy`
- Copying roles and direct overrides requires the corresponding permissions and cannot grant access the actor does not hold.
- User, role and access changes are saved transactionally and recorded in the audit log. Password changes revoke the user’s API tokens.

## Security boundaries

- `roles.manage` is required to assign or copy roles.
- `permissions.assign` is required to assign or copy direct overrides.
- A non-system administrator cannot grant a permission they do not possess.
- A user cannot disable their own account.
- Passwords remain hashed and are never included in the maintenance payload.

## Deliberate follow-up

SJ ERP has company, branch and warehouse scopes. EncoreTransport does not yet have equivalent operational-scope entities in its data model, so no fake scope selector was added. If the business needs regional or terminal-level administration, the next safe step is to model explicit scopes (for example, terminal or route ownership) and enforce them server-side on every affected query.
