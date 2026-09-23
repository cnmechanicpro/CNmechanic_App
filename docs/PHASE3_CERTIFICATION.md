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

`npm test` passed **63 tests in 5 files**. `npm run test:db` passed **23 database/RLS tests**. New evidence covers:

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
- Pages provider metadata and HTTP 404 behavior,
- preservation of provider edge metadata through React hydration,
- service/brand taxonomy metadata through React hydration,
- genuine unknown-route 404 metadata, `noindex`, and JSON-LD removal.

## External review correction — metadata hydration

External review found that `Metadata()` in `apps/web/src/App.tsx` used a static route map and assigned `Page not found | CNMechanic` to every unmatched route. Valid dynamic mechanic, shop, service, and brand URLs could therefore start with correct edge/prerendered metadata and lose it after React hydration.

Implementation fix commit: `f0a30f320741acc2e26ef1b20facac019bd474ce`.

The fix adds one route metadata resolver used by React, preserves matching edge metadata for mechanic/shop routes until real profile data loads, then intentionally sets profile metadata from the loaded public DTO. Known service and brand slugs receive taxonomy-specific title, description, canonical, robots, and JSON-LD. Invalid taxonomy routes and unknown routes receive `Page not found | CNMechanic`, `noindex, nofollow`, no canonical, and no JSON-LD. Provider misses continue to return a real HTTP 404 from the Pages edge renderer.

Final evidence reconciliation confirmed that this policy is implemented consistently: not-found metadata represents canonical as intentionally absent, removes any canonical left by the prior SPA route, and removes CN JSON-LD. Regression coverage explicitly asserts `document.querySelector('link[rel="canonical"]') === null` for generic unknown, invalid service, and invalid brand routes. Legitimate provider, service, brand, and normal public pages retain their canonical URLs.

The review also exposed two adjacent pre-hydration defects: static/edge title replacement targeted an obsolete base-title literal, and generated pages could contain duplicate robots tags. The renderer now matches the actual base title and deterministically replaces the existing robots tag.

Eight focused metadata regression cases prove valid dynamic routes do not become `Page not found | CNMechanic` after hydration. Production-build browser QA confirmed:

| Route | Before hydration | After hydration | Canonical / robots / JSON-LD |
|---|---|---|---|
| `/mechanics/alex-technician` | `Alex Technician | CNMechanic` | unchanged | exact canonical; `index, follow`; one Person JSON-LD block |
| `/shops/euro-garage` | `Euro Garage | CNMechanic` | unchanged | exact canonical; `index, follow`; one AutoRepair JSON-LD block |
| `/services/diagnostics` | `Diagnostics specialists | CNMechanic` | unchanged | exact canonical; `index, follow`; one taxonomy JSON-LD block |
| `/brands/bmw` | `BMW mechanics | CNMechanic` | unchanged | exact canonical; `index, follow`; one taxonomy JSON-LD block |
| unknown provider | HTTP 404; `Page not found | CNMechanic` | unchanged | no canonical; `noindex, nofollow`; no JSON-LD |

Descriptions also remained exact before and after hydration, and the browser reported no console errors.

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
| `npm test` | PASS — 63/63 |
| `npm run test:db` | PASS — 23/23 |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `WRANGLER_LOG=none npm run worker:types:check` | PASS |
| `WRANGLER_LOG=none npm run build` | PASS — web build + Worker dry run |
| `git diff --check` | PASS |
| Desktop/mobile Playwright QA | PASS — no console errors |
| Linked Supabase lint | PASS — no textual findings |

GitHub Actions `verify` passed for the implementation fix commit in **2m 9s** ([run 35867732395](https://github.com/cnmechanicpro/CNmechanic_App/actions/runs/35867732395)). The Cloudflare Pages branch-preview check also passed; no production deployment was performed.

## Release boundary and limitations

- The migration is not applied to production, and no production provider data was created.
- Search will correctly return an empty result until legally sourced, reviewed records are published.
- PostGIS is deferred; bounded Haversine search is the current safe scale. Adopt PostGIS in a separate extension migration when inventory/query volume warrants it.
- Provider sitemap entries require an approved production inventory feed; no invented provider URLs are emitted.
- Local Docker-backed `supabase db reset` and pgTAP were unavailable because Docker was stopped; PGlite replay/RLS tests passed.
- Booking, matching/dispatch, availability, payments, reviews, claim review, and admin merge execution remain future phases.

**PHASE 3 PASS — SEARCH + SEO + MARKETPLACE FOUNDATION CERTIFIED FOR REVIEW**
