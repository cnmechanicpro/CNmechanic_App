# CNMechanic

CNMechanic is building a trusted mechanic network. This repository currently contains Phase 1: the secure Cloudflare and Supabase foundation. Discovery, booking, repair, payments, reviews and vehicle records are deliberately out of scope.

## Architecture

```text
Cloudflare Pages (React, TypeScript, Vite)
  -> Cloudflare Worker API (/api/v1)
  -> Supabase Auth + PostgreSQL protected by RLS

WebMCP adapter -> typed API client -> Worker -> shared domain services
Remote MCP is planned at api.cnmechanic.com/mcp; it is not implemented.
```

The canonical production web origin is `https://www.cnmechanic.com`; the planned API origin is `https://api.cnmechanic.com`.

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

The frontend is served at `http://127.0.0.1:5173` and the Worker at `http://127.0.0.1:8787`. Without local Supabase values, the public foundation remains usable but sign-in is intentionally unavailable.

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

No deployment is configured or performed by this repository. See [Deployment](docs/DEPLOYMENT.md) for the required manual environment, secret and domain steps. CI validates builds only.

## WebMCP status

`get_platform_info` is the sole registered browser-agent proof tool: a public, read-only call to the Worker version endpoint. It uses feature detection and harmlessly skips unsupported browsers. Remote MCP, account-scoped tools and all transactional tools are future work.
