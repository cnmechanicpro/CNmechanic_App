# CNMechanic architecture audit

Audit date: 2026-09-19. Scope: local repository, supplied product brief, and supplied logo. Status: Phase 0 only; no application or infrastructure implemented.

## Inputs and evidence

The user supplied `www.cnmechanic.com`, a logo, and the CNMECHANIC MASTER BUILD PROMPT V2. The brief is product reference material; its desired capabilities are not evidence of working features or authorization to change external infrastructure.

Repository: `/Users/vytreon/Documents/ChatGPT/CNMechanic_App`.

| Inspection | Observed result |
| --- | --- |
| `ls -la` | Only `.git` exists in the project root before this audit |
| `rg --files --hidden -g '!.git' -g '!node_modules'` | No project files |
| `git ls-files` | No tracked files |
| `git status --short --branch` | No commits yet on main; initially clean |
| `git log -1 --oneline` | No commits; expected failure on unborn branch |
| `git remote -v` | No configured remote |
| Applicable ancestor/project `AGENTS.md` search | None found |

External reference files inspected:

- `/Users/vytreon/.codex/attachments/e559a0d1-3b7d-4102-89cc-ffc814b2c42d/Pasted text.txt`: supplied architecture and phased scope.
- `/Users/vytreon/Desktop/CNMechanic_Premium European Auto Mechanic Logo.png`: user-rendered image and file existence checked; 1,887,014 bytes. Black, metallic silver and electric blue branding, European specialization wording, and manufacturer marks. Not yet copied into application assets.

There are no source files to inspect. Git internals are repository metadata, not an application. No credentials, cloud accounts, live database, DNS zone, or production deployment were inspected. An empty repository does not establish that external infrastructure is absent.

## Current implementation inventory

| Area | Finding |
| --- | --- |
| Framework, components, routing, design system | Absent |
| Package manifests, dependency lockfiles | Absent; no dependency vulnerability analysis possible |
| Pages, Workers, Wrangler, domain routing | Absent locally |
| Supabase integration, auth, migrations, RLS | Absent locally |
| API, shared contracts, domain services | Absent |
| Customer, shop and administrative workflows | Absent |
| Stripe, uploads, notifications | Absent |
| WebMCP, remote MCP, tool registry | Absent |
| SEO metadata, structured data, sitemaps | Absent |
| Environment configuration and secret exclusions | Absent |
| Tests, CI, deployment and rollback procedures | Absent |

## Problems, security and technical debt

No exploitable code defect, exposed application secret, duplicate implementation, dead code, or legacy migration issue was found: there is no application code. This is not a security certification. Authentication, tenant isolation, consent, private storage, auditability and payment integrity are unimplemented controls.

The principal risk is scope: the brief describes a multi-sided marketplace and shop operating system, not a small website. Shipping screens before transaction and authorization boundaries would create misleading functionality. A generic service-role database client would also defeat the intended RLS defense if used for every request.

There is no inherited code debt. There are unresolved product and operations dependencies: actual founding business identity/contact details, verification evidence and standard, approved public listing data, cloud project identifiers, domain control, transactional email delivery, payment account setup, and production support/restore ownership. These do not prevent local foundation work.

The supplied logo is a brand reference, not evidence of manufacturer affiliation or CN verification. The founding mechanic must pass the same verification workflow as subsequent members before a verified badge or number is published.

## Architecture decision and migration plan

Use the proposed architecture in [CNMECHANIC_TARGET_ARCHITECTURE.md](./CNMECHANIC_TARGET_ARCHITECTURE.md): React/TypeScript on Pages, a separate Worker business API, Supabase PostgreSQL/Auth, shared contracts, and isolated agent adapters. Canonical public origin: `https://www.cnmechanic.com`; apex redirect is a proposed deployment change, not completed work.

This is a greenfield bootstrap. No application data, routes, dependencies or users require migration. Create numbered migrations from an empty database, prove clean replay, and keep synthetic fixtures out of production and sitemaps. Do not import a founder as verified merely because the brief describes that future designation.

## Recommended Phase 1 and exact sequence

1. Create a `codex/phase-1-foundation` branch and workspace manifests with pinned dependencies, lockfile, `.gitignore`, formatting, lint and TypeScript configuration.
2. Scaffold `apps/web`, `apps/worker`, shared schema/domain/API packages and local configuration. Add validated environment examples containing placeholders only.
3. Build a minimal Pages shell and Worker health/error endpoints; reject invalid input and unsupported methods. Include request identifiers and redacted logging.
4. Set up local Supabase migrations for profiles, organizations and memberships. Implement authentication, Worker authorization, and deny-by-default RLS with explicit grants.
5. Prove an authenticated identity endpoint and an organization-scoped read using two users in different tenants. Keep browser database access outside privileged workflows.
6. Add CI for lint, types, tests, clean migration replay, RLS isolation, frontend production build and Worker dry-run build. Define preview deployment and rollback procedures.
7. Review the foundation change before connecting production resources. Confirm cloud identifiers and domain ownership at deployment time; store secrets using provider secret mechanisms.

Phase 1 should deliver a tested foundation, not pretend booking, verification, payments or agent writes work. Later phases follow the supplied brief with explicit acceptance gates.

## Tests required

| Gate | Required evidence |
| --- | --- |
| Foundation | Lint/type checks, schema and error tests, web build, Worker dry run, environment failure tests |
| Auth and tenancy | Missing/expired/wrong-issuer credentials rejected; customer A/organization A cannot read or mutate B; role revocation; forged tenant/owner fields rejected |
| Database | Empty database migration replay; constraints; RLS SELECT/INSERT/UPDATE/DELETE; direct Data API bypass attempts; no public privileged functions |
| Browser | Login/logout/error states, keyboard access, mobile layouts, no secret-bearing bundles, no console errors |
| Search and SEO | Public projection privacy, deterministic pagination, canonical redirects, valid HTML/JSON-LD agreement, only eligible sitemap entities |
| Agent integration | Supported/unsupported WebMCP behavior, schema validation, OAuth audience/scopes, tool parity, consent replay/tampering rejection |
| Repair and commerce | State transitions, estimate version conflict, line-item approvals, duplicate/out-of-order webhooks, idempotency and payment reconciliation |
| Trust and passport | Claim takeover attempts, verified-job eligibility, revocable sharing and private-field exclusion |

None of these application checks can run yet: there is no manifest, implementation, database or test harness. The audit verified repository state and reviewed the two resulting documents. Production DNS, TLS, performance, accessibility, cloud configuration and deployment health remain unverified.

## Outcome

Phase 0 establishes the actual empty-repository baseline and an implementable target. Documentation completion is not product completion. The next executable milestone is the Phase 1 foundation above; no production service has been deployed or certified.
