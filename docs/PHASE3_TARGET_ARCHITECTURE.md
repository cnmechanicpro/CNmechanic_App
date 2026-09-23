# Phase 3 target architecture

```text
Customer search / browser agent
            |
            v
Cloudflare Pages + five READ_SAFE WebMCP adapters
            |
            v
Canonical API client -> Cloudflare Worker routes and rate limiter
            |
            v
ProviderSearchService (domain boundary)
            |
            v
Supabase SECURITY INVOKER RPC / curated tables
            |
            v
PostgreSQL grants + RLS + authoritative publication rules
```

The human UI and WebMCP call the same API client, Worker routes, domain service, Supabase RPCs, grants, and RLS. WebMCP is optional progressive enhancement. If `document.modelContext` is unavailable, registration returns `unsupported` and human search continues normally.

Cloudflare serves the SPA and pre-rendered service/brand pages. Pages Functions render direct mechanic/shop profile requests from canonical API DTOs and return a real HTTP 404 when the API returns 404. The Worker is the public search API and enforces strict query schemas, 50-result maximums, offset bounds, request logging without query values, and a 60-request/minute Cloudflare rate-limit binding.
