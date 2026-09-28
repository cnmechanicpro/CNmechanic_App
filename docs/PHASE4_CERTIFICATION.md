# Phase 4 certification

Status: certified and ready for final merge review on `codex/phase4-job-marketplace`. PR #10 is open and unmerged. No Phase 4 production migration or deployment has been performed.

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

GitHub CI is verification-only. On 2026-09-28, the approved Cloudflare release controls were saved and read back from the authenticated dashboard:

- Pages project `cnmechanic-web`, **Settings > Build > Branch control**: production branch remains `main`; **Enable automatic production branch deployments** is off; preview branch policy remains **All non-Production branches**.
- Worker `cnmechanic-api`, **Settings > Builds**: production branch remains `main`; the persisted deploy command is `npx wrangler versions upload --config apps/worker/wrangler.jsonc --env production --keep-vars`. Production-branch builds can upload an inspectable Worker version, but a separate deployment action is required to promote it to active traffic.

The controls changed release behavior only. They did not publish application code:

- The active Pages production deployment remains `a7075a2a-e067-419f-9b87-9fcd80778f0d` from `main` commit `54b476e15863e69fe48e9492fbda8cc484b75ad2`.
- The active Worker remains version `f532ee52` at 100% traffic, from the same pre-Phase-4 `main` commit.
- The Phase 4 branch preview remains available, confirming non-production previews are still enabled.
- The Phase 4 Supabase migration remains unapplied.

Merging PR #10 will therefore update source control and may upload an inactive Worker version, but it will not deploy Pages production, promote Worker traffic, or apply the database migration. Those three production operations remain separately approved release steps.

## GitHub evidence

- Certified implementation commit: `0234103dd3e3a396b3f39be4ab131b0e812beec4`.
- Certified code and CI head before this release-control evidence update: `1015b8b0e38b5039a900c30670a8784b1bfb36a0`.
- Pull request: [#10](https://github.com/cnmechanicpro/CNmechanic_App/pull/10).
- GitHub CI run [36329078347](https://github.com/cnmechanicpro/CNmechanic_App/actions/runs/36329078347), job `verify`: PASS at `1015b8b0e38b5039a900c30670a8784b1bfb36a0`. `npm ci`, lint, typecheck, the 73-test application suite, build, Worker types, database-only `supabase start`, `supabase db reset --local --no-seed`, and `supabase test db supabase/tests --local` all passed. The CLI pgTAP command reports 1 file and 9 assertions; the broader migration/RLS behavioral suite reports 1 file and 26 tests and is included in the 73-test application gate.
- Cloudflare Pages branch preview: PASS for deployment `4052d24c-4718-4ac9-910a-f2b971d5daec`. Supabase Preview was skipped, as expected; the Phase 4 production migration was not applied.
- The initial `verify` attempts completed application lint, types, tests, and build, then failed before Docker database startup because GHCR image pulls were rate-limited. Read-only GHCR authentication succeeded but did not change the registry response, so it was removed. CI now uses Supabase CLI's documented `supabase start -x` support to exclude services that are not required by `db reset` or the pgTAP suite; the database gate itself remains unchanged. The first run with that supported correction passed end to end.
