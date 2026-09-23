# Phase 3 audit

## Baseline

Phase 3 starts from `main` merge commit `440f454a03586819f3f19b34347c3057287fff94`. The Phase 2 foundation already provided authenticated profiles, organization membership, private vehicles and ownership, service taxonomies, organization/location capabilities, four-state service requests, Worker authentication, RLS, Cloudflare Pages, and one experimental read-only WebMCP platform-info tool.

## Gaps found

The earlier schema had no authoritative mechanic verification lifecycle, no public provider publication state, no public provider/service-area graph, no business provenance or claim workflow, no duplicate/alias records, and no database-backed public search. The web search form redirected to authentication and the only static SEO pages were the home and professional landing pages. Direct provider URLs had no edge rendering strategy.

`professional_profiles.status = ACTIVE` described record state, not verification. Self-manage grants allowed the owner to mutate the whole row, which was unsafe once verification and lifecycle fields existed. Phase 3 replaces those broad grants with column-level profile-edit grants; verification, lifecycle, and publication remain authoritative.

## Data truth

Production is not seeded by this branch. Search returns only real approved rows after the migration is applied and records are curated. Test providers exist only inside the disposable PGlite test database.

No third-party listing acquisition was performed. Future acquisition must record provenance, rights, retrieval date, confidence, refresh date, and owner confirmation in `organization_provenance` before publication.

## Existing production advisor snapshot

The Supabase Advisor Center was reviewed read-only on 2026-09-23 before this un-deployed migration. It reported:

- leaked-password protection disabled (Auth configuration; no code change made),
- multiple permissive-policy notices on six Phase 2 tables,
- an informational warning for the intentionally authenticated `SECURITY DEFINER` vehicle-creation RPC,
- `private.platform_role_assignments` with RLS and no policy (intentional deny-all),
- four unindexed foreign-key warnings, addressed in the Phase 3 migration,
- unused-index notices on the low-traffic production foundation, retained until representative traffic exists.

The CLI linked-project lint returned no textual lint errors. Local Docker was stopped, so `supabase db lint --local` could not run; full migration replay and behavioral RLS tests ran against PostgreSQL-compatible PGlite instead.
