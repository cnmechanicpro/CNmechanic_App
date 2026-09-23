# Phase 4 certification

Status: locally certified for review on `codex/phase4-job-marketplace`; GitHub PR and CI evidence are recorded after push.

## Certification answer

Yes. CNMechanic can support the Phase 4 transaction from an owned vehicle through request creation, authoritative eligibility, ranked and bounded candidates, job offers, mechanic response, customer confirmation, and exactly one assignment. Identity comes from `auth.uid()`, every exposed Phase 4 table has RLS, browser roles cannot create offers or assignments directly, mechanics cannot self-verify, and public/WebMCP DTOs contain no private marketplace data.

## Implemented evidence

- Owner-authorized, idempotent service-request creation with strict geography, timing, urgency, and mode validation.
- Explicit database-enforced request and offer lifecycles.
- Eligibility-before-ranking candidate generation with a ten-provider bound and a second eligibility check at offer creation and acceptance.
- First-class offers, mechanic acceptance/decline, customer confirmation, and one authoritative assignment.
- Row locking, uniqueness constraints, RLS, least-privilege grants, and append-only transition events.
- Authenticated customer and mechanic workspaces using the canonical Worker and API client.
- Separate Cloudflare rate limits for public discovery and authenticated marketplace actions.
- Shared schemas and generated OpenAPI contracts.
- Five Phase 3 public `READ_SAFE` WebMCP tools unchanged; no transactional Phase 4 tool was added.

## Behavioral coverage

The PostgreSQL/PGlite suite replays every migration in filename order against a real PostgreSQL-compatible engine and proves:

- another customer cannot create, read, cancel, or mutate a request for a vehicle they do not own;
- direct authenticated writes to offers and authoritative assignments are denied;
- only active, published, verified professionals with `ELIGIBLE_FOR_JOBS`, matching service, vehicle make, service area, and service mode become candidates;
- an addressed mechanic cannot read another mechanic's offer or respond for another mechanic;
- expired, cancelled, and ineligible offers fail closed;
- acceptance remains distinct from assignment;
- stale customer confirmation fails and unique constraints leave exactly one assignment;
- request transition guards reject jumps and reopening terminal states;
- every public table has RLS enabled.

## Verification gate

| Command | Result |
|---|---|
| `npm test` | PASS — 6 files, 73 tests |
| `npm run test:db` | PASS — 1 file, 26 database/RLS tests |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run worker:types:check` | PASS — generated bindings are current |
| `npm run build` | PASS — Vite production build and Wrangler dry-run |
| `git diff --check` | PASS |

The 73-test application total includes the 26 database tests. The explicit database command reruns those 26; there are 73 unique certified tests, comprising 47 non-database tests and 26 database/RLS tests.

## Supabase advisor review

The authenticated production dashboard was reviewed read-only on 2026-09-23. The Phase 4 migration was intentionally not applied, so these results describe the certified Phase 3 production baseline:

- Security Advisor: 0 errors, 2 warnings. The warnings are the deliberately narrow `SECURITY DEFINER` vehicle-creation RPC being executable by signed-in users and leaked-password protection being disabled in Auth.
- Performance Advisor: 0 errors, 6 warnings. Each is the existing multiple-permissive-policy advisory on `location_services`, `locations`, `organization_services`, `organizations`, `professional_location_assignments`, or `professional_profiles`.
- The CLI remote lint path could not authenticate with the linked read-only role and no production database password was supplied. No credential or production change was made.

## Frontend QA

Local Vite QA covered the protected customer `/service-requests` and mechanic `/mechanic/jobs` entry routes at the default desktop viewport and 390 × 844 mobile viewport. Both routes rendered meaningful protected-state content with correct metadata; the mobile menu expanded and exposed its navigation; no Vite/framework overlay, clipping, blank page, console warning, or console error was observed. The sign-in interaction navigated to `/auth` and rendered the correct account-access state.

Authenticated live-data rendering was not exercised in browser QA because the local environment intentionally had no Supabase browser credentials or fabricated marketplace records. The authenticated contracts, authorization, response states, and state transitions are covered by Worker, API-client, domain, and database behavioral tests.

## Security findings

No Phase 4 production/domain defect remains open. No service-role credential is present in browser or Worker configuration. Controlled matching and activation are service-role-only database operations; the customer and mechanic browser routes use the caller's access token and remain subject to RLS. Notification events are provider-neutral and delivery is deferred.

## Known limitations

- Phase 4 does not implement availability/presence, scheduling, notification delivery, estimates, repair execution, payments, reviews, or Phase 5 behavior.
- Matching is exposed only to a controlled internal service-role runner; no admin dispatch UI, scheduler, or public dispatch endpoint is introduced.
- Production database/Worker/Pages changes were not applied, as required.

## Release control

GitHub CI is verification-only. Cloudflare Git integrations currently publish `main`; production auto-deploy settings must be changed manually before merge as documented in `PHASE4_AUDIT.md`. Keep preview builds enabled, move production publication to an explicitly advanced release branch or disable production auto-deploy, and retain separate approval steps for database migration, Worker deployment, and Pages deployment. This branch changes no external production setting.

## GitHub evidence

- Certified implementation commit: `0234103dd3e3a396b3f39be4ab131b0e812beec4`.
- Pull request: [#10](https://github.com/cnmechanicpro/CNmechanic_App/pull/10).
- The first two `verify` attempts completed application lint, types, tests, and build, then failed before Docker database startup because anonymous GHCR image pulls were rate-limited. The branch now authenticates those read-only pulls with the workflow's short-lived `GITHUB_TOKEN`; the final rerun result is recorded in the PR checks.
