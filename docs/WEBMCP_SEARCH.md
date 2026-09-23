# WebMCP public search

Phase 3 registers exactly five optional browser tools:

1. `search_mechanics`
2. `search_shops`
3. `get_mechanic_profile`
4. `get_shop_profile`
5. `search_services`

Every tool is public, `READ_SAFE`, classified `READ`, confirmation-free, audited through the Worker request log, and limited to 60 requests per 60 seconds. Inputs and outputs use shared Zod/JSON schemas. Results are bounded and contain only the same curated DTOs used by human search.

Tools call the shared API client; the client calls canonical Worker routes; the Worker calls the shared domain service and RLS-constrained Supabase operations. Tools have no database client and cannot bypass authorization. They expose no booking, service-request mutation, dispatch, job acceptance, payment, availability, claim, admin, customer, private mechanic, or raw database operation.

Registration feature-detects `document.modelContext`. Unsupported browsers receive `unsupported`; rejected experimental registration returns `failed`; neither path interrupts application startup or human search.
