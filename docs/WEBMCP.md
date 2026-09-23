# WebMCP discovery interface

`packages/webmcp` isolates optional browser-agent registration from application code. Phase 3 enables exactly five public tools: `search_mechanics`, `search_shops`, `get_mechanic_profile`, `get_shop_profile`, and `search_services`.

Every tool is `READ_SAFE`, classified `READ`, public, confirmation-free, schema-validated, bounded, rate-limited, and routed through the same typed API client, Worker endpoints, domain service, Supabase grants, and RLS used by the human search experience. No tool has a database client or mutation path.

The adapter feature-detects `document.modelContext`, registers through a lifecycle `AbortSignal`, propagates cancellation, and returns `unsupported` or `failed` without affecting the website. Core search works when the experimental browser API is absent. See [WebMCP search](./WEBMCP_SEARCH.md) for schemas and security boundaries.
