# Database foundation

The sole migration, `20260919235930_identity_foundation.sql`, creates only the Phase 1 identity layer:

- `profiles`: one private profile per Supabase Auth user.
- `organizations`: a future-compatible organization identity.
- `organization_memberships`: a user can belong to several organizations and carry several operational roles.

The database does not yet contain customers, shops, vehicles, services, repairs, payments or marketplace data.

All three tables have primary keys, foreign keys, timestamps, bounded fields and RLS enabled. `profiles` permits a signed-in person to read and update only their own display name. Membership reads are limited to the signed-in user and active memberships. Organization reads require an active membership. Users receive no table inserts, deletes, membership updates or organization provisioning privileges.

Profile provisioning uses a trigger in the private schema. Its security-definer function has an empty search path, accepts no user-controlled arguments, and has no `PUBLIC`, `anon` or `authenticated` execute grant. It is only invoked by the `auth.users` trigger. The application Worker uses the user’s validated bearer token for ordinary database calls so these policies apply; it does not use a service-role key.

The full test matrix is in `tests/database.test.ts` and `supabase/tests/identity.test.sql`. PGlite provides a real PostgreSQL-compatible local engine for migration replay, roles, grants and RLS policy behavior. It emulates Supabase’s existing `auth` schema and `auth.uid()` function, so it does not prove GoTrue/Auth issuance, PostgREST behavior, Supabase storage policies or Docker service wiring. CI runs `supabase db reset` and the pgTAP test against the complete local Supabase stack.
# Core domain (Phase 2)

`20260921002148_core_domain.sql` extends `organizations` with legal identity, slug, descriptive metadata, type, lifecycle status, and update tracking. It adds locations, professional profiles/location assignments, private platform roles, vehicle reference tables, vehicles, ownership history, services and capability joins, and service requests.

Every Phase 2 table has RLS enabled. Anonymous users can read active vehicle/service reference data only. Authenticated access is scoped by current ownership, active organization membership, a real service request, or a private CN administrator role. The sole vehicle-create RPC is authenticated, inserts the vehicle and initial owner atomically, returns only its ID, and is followed by an RLS-protected read.
