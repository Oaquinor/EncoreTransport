# Application Catalog

| Application | Path | Responsibility | Indexing |
|---|---|---|---|
| Website | `/website/` | Public discovery, routes, SEO, conversion | index |
| Passenger | `/passenger/` | Booking transaction | noindex |
| Driver | `/driver/` | Driver operations | noindex |
| Admin | `/admin/` | Central operations | noindex |
| Login | `/login/` | Authentication | noindex |
| Tracking | `/track-package/` | Public package status | index |
| API | `/api/*` | Backend JSON | noindex |
| Passenger Mobile | Expo | Native passenger flow | n/a |
| Driver Mobile | Expo | Native driver operations/GPS | n/a |

## Legacy

`/move/` is retained only as a redirect to `/passenger/`.

`apps/passenger-pwa` must not regain business logic.
