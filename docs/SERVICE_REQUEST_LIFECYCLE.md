# Service request lifecycle

The database trigger is authoritative. Clients call purpose-specific RPCs and never set status directly.

| From | Allowed next states |
|---|---|
| `DRAFT` | `SUBMITTED`, `CANCELLED` |
| `SUBMITTED` | `MATCHING`, `CANCELLED`, `EXPIRED` |
| `MATCHING` | `OFFERS_SENT`, `NO_MATCH`, `CANCELLED`, `EXPIRED` |
| `OFFERS_SENT` | `MECHANIC_RESPONDED`, `NO_MATCH`, `CANCELLED`, `EXPIRED` |
| `MECHANIC_RESPONDED` | `PENDING_CUSTOMER_CONFIRMATION`, `OFFERS_SENT`, `NO_MATCH`, `CANCELLED`, `EXPIRED` |
| `PENDING_CUSTOMER_CONFIRMATION` | `ASSIGNED`, `OFFERS_SENT`, `CANCELLED`, `EXPIRED` |
| `ASSIGNED` | `ACTIVE`, `CANCELLED` |
| `ACTIVE` | `CLOSED`, `CANCELLED` |
| `CANCELLED`, `NO_MATCH`, `EXPIRED`, `REJECTED`, `CLOSED` | terminal |

`submitted_at`, `matching_started_at`, `cancelled_at`, assignment fields, and `closed_at` are derived at the authoritative transition. Historical Phase 2 `CLOSED` records remain valid without requiring a new assignment.
