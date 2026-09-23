# Phase 3 certification

Date: 2026-09-23
Branch: `codex/phase3-search-marketplace`
Status: **PASS — implementation certified for review; not merged or deployed**

## Certified scope

- two-sided customer-to-certified-mechanic marketplace model,
- authoritative mechanic lifecycle, verification, publication, service/make/specialty and service-area graph,
- shop/location/service/make graph,
- provenance, claims, aliases, private duplicate candidates and merge history,
- RLS-constrained public mechanic/shop search RPCs,
- five canonical public Worker endpoints plus shared schemas/client/domain services,
- exactly five public `READ_SAFE` WebMCP tools,
- real mechanic search UI with honest empty states,
- pre-rendered service/brand pages, dynamic provider edge rendering, canonical metadata, JSON-LD, sitemap/robots/noindex, and real provider 404s,
- Cloudflare search rate limiting and request observability without logging search terms.

No booking, dispatch, job acceptance, payment, mechanic-availability mutation, claim mutation tool, admin tool, private customer/mechanic data, service-role credential, or direct WebMCP database path was introduced.

## Behavioral evidence

`npm test` passed **55 tests in 4 files**. `npm run test:db` passed **23 database/RLS tests**. New evidence covers:

- verified publication and hidden-provider exclusion,
- mechanic/shop service, make, specialty and location filtering,
- exact canonical profile lookup,
- private auth identity exclusion from anonymous reads,
- self-verification/lifecycle escalation denial,
- owner-scoped claim insertion and cross-user isolation,
- private duplicate-review denial,
- pagination and query validation,
- Worker RPC routing and rate-limit rejection,
- eligibility/ranking separation,
- five-tool READ_SAFE classification and schema registration,
- optional/failed WebMCP support without app failure,
- Pages provider metadata and HTTP 404 behavior.

## Security review

The migration enables RLS on every new exposed table and keeps private review tables deny-all to browser roles. Search functions are `SECURITY INVOKER`. Anonymous grants are curated; `professional_profiles.profile_id`, memberships, claims, provenance, customer records, and platform roles are absent from public DTOs. Professional self-edit grants exclude verification, lifecycle, publication, and verification timestamps. Claims never create membership or verification.

One production defect found during testing was fixed: anonymous policies could not resolve explicitly granted private RLS helpers because the role lacked namespace usage. The migration now grants schema usage only; no private table or additional private function permission is granted. Regression tests prove private provisioning and duplicate-review objects remain inaccessible.

## Supabase advisor review

The production Advisor Center was inspected read-only before applying Phase 3 (this branch does not deploy). It reported leaked-password protection disabled, multiple-permissive-policy notices on existing Phase 2 tables, one expected authenticated `SECURITY DEFINER` RPC notice, intentional deny-all RLS on `private.platform_role_assignments`, four unindexed foreign keys, and low-traffic unused indexes.

The four foreign-key indexes are added by this migration. The security-definer RPC is the tested atomic owner-derived vehicle creation boundary. The private no-policy table intentionally denies all browser access. Existing multiple-policy and unused-index notices are documented for later tuning with representative traffic. Leaked-password protection is an Auth dashboard setting and was not changed by this code-only, no-production-mutation phase. Linked `supabase db lint --linked --level warning` exited successfully without textual lint errors. Local Docker was stopped, so local CLI lint/reset could not run; deterministic migration replay ran in PostgreSQL-compatible PGlite.

## Frontend QA

Playwright used installed Chrome because the Browser plugin was unavailable. The tested path was `/mechanics` -> empty result -> enter Boston -> filtered result -> mobile reload. Page identity, meaningful render, framework-overlay absence, console health, URL update, empty state, result card, and responsive layout passed at 1440×1000 and 390×844. The first pass found and fixed low-contrast filter labels and overly tight mobile heading tracking.

## Verification gate

| Command | Result |
|---|---|
| `npm test` | PASS — 55/55 |
| `npm run test:db` | PASS — 23/23 |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `WRANGLER_LOG=none npm run worker:types:check` | PASS |
| `WRANGLER_LOG=none npm run build` | PASS — web build + Worker dry run |
| `git diff --check` | PASS |
| Desktop/mobile Playwright QA | PASS — no console errors |
| Linked Supabase lint | PASS — no textual findings |

## Release boundary and limitations

- The migration is not applied to production, and no production provider data was created.
- Search will correctly return an empty result until legally sourced, reviewed records are published.
- PostGIS is deferred; bounded Haversine search is the current safe scale. Adopt PostGIS in a separate extension migration when inventory/query volume warrants it.
- Provider sitemap entries require an approved production inventory feed; no invented provider URLs are emitted.
- Local Docker-backed `supabase db reset` and pgTAP were unavailable because Docker was stopped; PGlite replay/RLS tests passed.
- Booking, matching/dispatch, availability, payments, reviews, claim review, and admin merge execution remain future phases.

**PHASE 3 PASS — SEARCH + SEO + MARKETPLACE FOUNDATION CERTIFIED FOR REVIEW**
