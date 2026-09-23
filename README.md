# CNMechanic

CNMechanic is a two-sided automotive marketplace foundation: customers discover qualified repair professionals, and verified mechanics become eligible for qualified repair demand. Phase 3 adds public mechanic/shop/service discovery, authoritative provider eligibility, SEO pages, business provenance/claims, and five read-only WebMCP discovery tools. Booking, dispatch, job acceptance, payments, availability mutation, reviews, and admin workflows remain out of scope.

## Architecture

```text
Cloudflare Pages (React, TypeScript, Vite)
  -> Cloudflare Worker API (/api/v1)
  -> Supabase Auth + PostgreSQL protected by RLS

WebMCP adapter -> typed API client -> Worker -> shared domain services
Remote MCP is planned at api.cnmechanic.com/mcp; it is not implemented.
```

The canonical production origins are `https://www.cnmechanic.com` and `https://api.cnmechanic.com`. This Phase 3 branch is not deployed.

## Layout

```text
apps/web       Pages frontend
apps/worker    Worker API
packages/config      validated public configuration and canonical URLs
packages/schemas     shared runtime API contracts
packages/domain      framework-independent authorization/domain services
packages/api-client  typed Worker client
packages/webmcp      isolated browser-agent registry and adapter
supabase             local configuration, migration, RLS tests
tests                application, contract and embedded PostgreSQL tests
```

## Prerequisites

Node 22.12–26 and npm 10.9.8 are required. The Supabase CLI is required for the full Docker-backed database test. Docker is required only for the local Supabase stack and pgTAP integration test.

## Install and run

```bash
npm ci
cp apps/web/.env.example apps/web/.env.local
cp apps/worker/.dev.vars.example apps/worker/.dev.vars
npm run dev:worker
npm run dev:web
```

The frontend is served at `http://127.0.0.1:5173` and the Worker at `http://127.0.0.1:8787`. Without local Supabase values, sign-in and database-backed discovery are intentionally unavailable; static content still renders.

To enable local authentication, start Supabase, obtain its local URL and anonymous key from `supabase status`, and set the matching public values in both local environment files. Never place a service-role key in either file.

```bash
supabase start
supabase db reset --local --no-seed
supabase test db supabase/tests --local
```

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
```

`npm test` includes real PostgreSQL-compatible PGlite migration/RLS tests. The Docker-backed Supabase reset and pgTAP suite remain the integration check and run in CI.

## Deploying

Production deployment remains a reviewed manual operation. Phase 3 must not be deployed until its migration, data provenance, and release evidence are approved. See [Deployment](docs/DEPLOYMENT.md).

## WebMCP status

Five optional public `READ_SAFE` tools expose the same discovery paths as the website: mechanic/shop search, mechanic/shop profiles, and service search. They feature-detect browser support and never affect core search. See [WebMCP search](docs/WEBMCP_SEARCH.md).
