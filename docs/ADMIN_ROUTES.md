# Admin routes (canonical vs legacy)

Source helpers: [`src/lib/admin-deep-links.ts`](../src/lib/admin-deep-links.ts), [`src/lib/admin-slug.ts`](../src/lib/admin-slug.ts).  
Domain language: [`ADR-dual-model-retirement.md`](ADR-dual-model-retirement.md).

## Canonical

| Surface | Path |
|---------|------|
| Dashboard | `/admin` |
| Projects list | `/admin/projects` |
| Project | `/admin/projects/{adminSlug\|id}` (`#workflow`, `#messages`) |
| Session wizard | `/admin/projects/{adminSlug\|id}/sessions/{adminSlug\|id}?step=` |
| Session-first entry | `/admin/sessions/{adminSlug\|id}` → redirects to project/session path |
| Session prep / shoot day / delivery | `?step=prep` · `shoot-day` · `delivery` |
| Bookings | `/admin/bookings` |
| Library (shot lists / packages) | `/admin/prep?tab=shots` · `?tab=packages` *(nav label Library; session wizard step stays Prep)* |
| Galleries index | `/admin/galleries` |
| Documents | `/admin/documents?tab=contracts` · `questionnaires` · `templates` *(templates + inventory; send from project)* |
| Payments hub | `/admin/payments` *(inventory; create deposit from project workflow)* |
| Payments | `/admin/payments` |
| Analytics | `/admin/analytics` |
| Settings | `/admin/settings/…` |

Session day-of helper: `/admin/shoots/{sessionId}/helper` (shared `SessionShootDay` with wizard step — AURA-068).

### Pretty URLs (AURA-370)

- `Project.adminSlug` / `ProjectSession.adminSlug` are optional path segments (unique per studio / per project).
- Opaque nanoid deep-links keep working forever; pages canonicalize to the slug form when present.
- No studio slug in the admin path (duplicate studio names are allowed).
- Prefer `adminPathSegment(entity)` and `sessionToolsHref` when the entity is loaded; id-only helpers remain valid for notifications.

## Legacy aliases (server redirect)

Keep these paths for bookmarks; they must not be linked from new UI.

| Legacy | Canonical |
|--------|-----------|
| `/admin/clients` | `/admin/projects` |
| `/admin/clients/{id}` | `/admin/projects/{id}` |
| `/admin/clients/{id}/shoots/{sessionId}` | `/admin/projects/{id}/sessions/{sessionId}` (+ `?step=`) |
| `/admin/shoots` | `/admin/projects` |
| `/admin/shoots/{sessionId}` | `/admin/sessions/{sessionId}` → pretty project path |
| `/admin/proposals` | `/admin/projects` |
| `/admin/galleries/{id}` | session delivery step |
| `/admin/ideas` | `/admin/prep` |
| `/admin/shot-lists` | `/admin/prep?tab=shots` |
| `/admin/packages` | `/admin/prep?tab=packages` |

Nav highlight: only **Projects** matches remaining live legacy session/helper/gallery-detail URLs (`/admin/shoots*`, `/admin/galleries/{id}`, `/admin/clients*`). Index aliases redirect before paint.
