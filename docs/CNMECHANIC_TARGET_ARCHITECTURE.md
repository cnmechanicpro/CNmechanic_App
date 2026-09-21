# CNMechanic target architecture

Date: 2026-09-19. Status: target design. Phase 1 now implements the foundation described in [README](../README.md), [Cloudflare architecture](./CLOUDFLARE_ARCHITECTURE.md), [database foundation](./DATABASE.md), [security baseline](./SECURITY.md), [WebMCP](./WEBMCP.md), [remote MCP](./MCP.md), and [deployment](./DEPLOYMENT.md). Product-domain sections below remain planned unless those Phase 1 documents explicitly state otherwise. Read alongside the [repository audit](./CNMECHANIC_ARCHITECTURE_AUDIT.md).

## Product and domain

CNMechanic is a trusted mechanic network built around owner, vehicle, business, service, location, transaction and history. Providence is configurable launch-market data. European expertise is the initial marketing emphasis, not a database restriction. CN Search, Repair, Verified, Garage, Passport and Pro share one domain layer. CN Agent exposes controlled capabilities of that layer.

Use `https://www.cnmechanic.com` as the canonical public origin supplied by the user. Plan an apex-to-www permanent redirect preserving paths and query strings. Reserve `https://api.cnmechanic.com/api/v1` for the Worker API and `https://api.cnmechanic.com/mcp` for remote MCP. These are proposed routes, not configured DNS records.

## Deployment and package boundaries

```text
Pages: React UI + prerendered public HTML
    | HTTPS domain API
Worker: transport -> authentication -> authorization -> domain services
    | user-scoped database calls / narrowly privileged system operations
Supabase: PostgreSQL + Auth + private Storage

WebMCP adapter -> same HTTPS domain API
Remote MCP Worker adapter -> same authorization and domain services
```

Cloudflare Pages serves React, TypeScript and Vite output, with Tailwind and shadcn/ui where useful. Pre-render public entity routes once real content exists; private application routes may use client rendering. The separate Worker owns business logic. Pages Functions, if later needed for rendering, must call that API rather than duplicate rules. Cloudflare documents a React deployment path on Pages: [official guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/).

```text
apps/web/                 UI, routes, public HTML generation
apps/worker/              HTTP/MCP transports, middleware, adapters
packages/schemas/         Runtime schemas, public DTOs, generated types
packages/domain/          Use cases, policy interfaces, state machines
packages/api-client/      Typed HTTP client and error handling
packages/webmcp/          Registry, metadata, feature-detected adapter
packages/ui/              Shared presentation components
packages/config/          Validated non-secret configuration
supabase/migrations/      Reviewed SQL and grants/RLS
supabase/tests/           Database and isolation tests
tests/                    Integration, browser and contract tests
docs/                     Decisions, evidence and operational runbooks
```

Only create packages when used. Domain code must not depend on browser or MCP APIs. Public schemas must not export database row types or private columns. Generate OpenAPI 3.x and tool JSON Schemas from shared contracts, with CI drift checks.

Use separate local, preview and production credentials/data/storage; staging is optional. Preview environments must never access production data or accept arbitrary preview origins against production. Define Workers and Pages configuration separately, validate secrets at startup, and provide placeholder-only examples. Protect production through reviewed CI. Record restore procedures and test database restoration before launch.

## Supabase, authentication and RLS

Supabase provides PostgreSQL and Auth. Initial browser authentication may use the publishable key and PKCE; send access tokens to the API as bearer credentials, avoid long-lived browser token persistence, and apply a restrictive CSP. The Worker verifies signature, issuer, audience and expiry and resolves live authorization from memberships. Never trust user-editable metadata, supplied role headers, or frontend state.

Ordinary user database operations use the verified user's token so RLS remains effective. A service-role credential is reserved for separately authorized system tasks. It is not a general application client. Supabase explains that service keys can bypass RLS and that exposed tables require row policies: [RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security).

Separate private data from intentionally exposed API projections. Enable RLS and explicit grants on exposed relations and apply defense in depth internally. Revoke default function execution privileges where inappropriate. Worker-only mutations use transactional, narrowly scoped functions: grant no direct table write permission where it would bypass state-machine checks. Prefer invoker rights; any necessary definer function needs a fixed search path, explicit identity/permission checks, narrow execution grants and security review.

| Data | Authorization predicate |
| --- | --- |
| Public businesses/services | Published projection only; exclude evidence, owner identity and private contact data |
| Vehicles and customer records | Active ownership or a narrowly authorized related job; no global mechanic access |
| Organizations and locations | Active membership plus capability and location scope |
| Jobs/inspections/estimates | Participating customer or authorized organization staff; field/action-specific rights |
| Claims and verification evidence | Claimant access to their submission; assigned reviewers; no public reads |
| Payments/audit events | Scoped reads; restricted system append; no customer-controlled financial state |
| Passport shares | Valid unexpired, unrevoked scoped token; explicitly selected public projection |

Test UPDATE ownership checks on both old and new rows. All business writes must verify the selected tenant and object relationship. Membership changes must affect authorization without waiting for stale role claims. Sensitive actions also require fresh authentication/session validation.

## Domain model and invariants

Use UUID identifiers, foreign keys, unique constraints, UTC instants, IANA location timezones, ISO currency codes, integer monetary minor units and explicit state transitions. Preserve local scheduling timezone and daylight-saving behavior. Tenant-owned objects carry organization identifiers; composite relationships prevent cross-tenant joins or assignment.

- Identity: profiles, customers, organizations, memberships, locations and technicians. A person can have multiple memberships and also be a customer.
- Discovery: businesses separate from their managing organization; business locations, services, makes, specialties, source references, aliases and slug history. Unclaimed businesses need no fabricated user account.
- Vehicle: normalized makes/models and extensible attributes; vehicles, ownership intervals, documents and maintenance records. Ownership transfer changes access, not historical record identity.
- Repair: service requests, appointments, jobs, immutable status events, inspections, estimate versions/items/decisions, work orders and invoices.
- Trust: claims, evidence, verification decisions, disputes, verified-job reviews and audit events.
- History: service records with provenance, vehicle passports and revocable share grants.

Business lifecycle, claim state and verification state are separate fields rather than one overloaded enum. A closed or suspended business cannot appear currently verified because of a historical approval. The founder follows normal onboarding; verification number 001 is assigned only following actual approval.

Make transactions atomic: request identifier plus idempotency key, booking capacity check, versioned estimate decision plus immutable audit event. Enforce legal transitions server-side. Prevent double booking using database constraints/locking. Customer approval references an exact estimate version, item set, amount and currency; revisions invalidate earlier consent for changed work. Completed records are corrected through attributed amendments, not silent rewriting.

## API and storage

Version routes under `/api/v1`; expose business capabilities, not SQL or arbitrary table operations. Examples: `GET /mechanics`, `GET /businesses/:id`, `GET /me`, `POST /service-requests`, `POST /businesses/:id/claims`. These are planned contracts only.

Use schema validation, bounded pagination, request IDs, stable error codes, body limits and per-user/IP rate limits. CORS permits exact approved origins; it is not authorization. If cookie sessions are introduced, add CSRF protection and origin checks. Cache only explicitly public projections, never authenticated responses or private signed URLs. Log action, actor, resource ID and outcome without request bodies containing private details.

Start with private Supabase Storage through a `MediaStore` interface; support R2 when media volume justifies it. The Worker authorizes upload/download grants. Quarantine uploads pending size/type/content checks, use short-lived scoped URLs, and forbid arbitrary object paths supplied by clients. No public vehicle documents or verification-evidence buckets.

## Discovery, search and ingestion

Implement a `SearchProvider` backed initially by indexed PostgreSQL full-text and geographic queries, with bounded radius and keyset pagination. Rank explainably using service/make match, distance and factual trust/availability signals. Keep paid placements explicitly labeled. No wildcard scan as the long-term search design.

Store source identifiers, provenance URL, retrieval time, last confirmation, confidence and permitted usage. Ingestion stages: authorized source -> staging -> validation/normalization -> candidate matching -> review -> canonical merge/publish. Strong identifiers and normalized contact/location evidence guide matching; uncertain merges require review. Preserve alias, merge and source history. A discovered record is never implied to be endorsed or a network member.

Support profile corrections, closure reports and stale-data review. Scale search through an outbox-fed external index behind the same provider, with replay and reconciliation, when measured PostgreSQL performance warrants it. Add queues for actual asynchronous workloads; do not adopt KV, Durable Objects or additional services without a concrete need.

## Claims and CN Verified

Claiming: authenticated submission -> connection-to-business evidence -> reviewer decision -> transactional membership/management grant. Claimants cannot overwrite existing ownership, approve themselves or view competitors' evidence. Duplicate/concurrent claims remain auditable and disputed claims pause ownership transfer.

Verification is distinct from claiming. Define evidence requirements, review permissions, expiry, suspension and appeal procedures before badges launch. Retain reviewer identity and decision history. Only authorized human reviewers can change verification. Reviews require a completed eligible job and enforce one review per eligible customer/job.

## WebMCP and remote MCP

The shared registry records name, description, input/output schemas, version, authentication, capability requirements, read/write class, risk, rate limit, human-confirmation policy and audit requirements. Begin with public read capabilities such as search and profile retrieval; do not expose writes before their human/API workflows are tested.

Feature-detect WebMCP inside `packages/webmcp`; registration failures must not prevent normal site operation. The adapter invokes the same API client as the UI. Register tools appropriate to current access, but enforce every request on the server. Experimental browser behavior needs pinned compatibility tests, not an assumption of universal support. Reference: [WebMCP specification](https://webmachinelearning.github.io/webmcp/).

Remote MCP is a Worker transport over the same services, not a second business implementation. Use a supported SDK, negotiate protocol versions and implement discovery, bounded inputs, errors and cancellation. Protect authenticated tools with OAuth: resource metadata, authorization-server discovery, PKCE, explicit scope consent, resource/audience-bound tokens and revocation. Do not assume a normal Supabase login token is sufficient for delegated MCP authorization. Select and integration-test a compatible authorization server before enabling authenticated tools. Reference: [MCP authorization specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/basic/authorization.mdx).

## Agent security and confirmation

Public reads, authenticated reads, low-risk writes, confirmation-required writes, financial actions and agent-prohibited administration have different policies. Server-side enforcement must not rely on an agent-provided `confirmed: true` field.

For sensitive actions, issue a short-lived, single-use intent bound to actor, resource version, canonical payload hash, amount/currency where relevant and expiry. The customer reviews the exact action in an authenticated human flow. Execute atomically with intent consumption and audit logging; reject changes, expiry and replay. Re-authenticate where risk requires it. Agents cannot independently approve repairs, authorize payments, verify businesses, edit findings or erase history.

Record authenticated agent/client identity when verifiable, user identity, tool version, permission decision, resource category and result. Untrusted attribution headers do not prove identity. Apply minimal scopes, tenant checks and quotas equally to UI, API, MCP and WebMCP.

## Commerce and vehicle history

Later commerce uses Stripe with a provider abstraction and Connect-ready organization accounts. Decide merchant responsibilities and settlement model before payment implementation. Keep configurable fee rules; never store card data. Signed webhooks, deduplicated event processing, idempotent commands and reconciliation establish payment state, not browser redirects. No checkout, refund or payout is implemented in Phase 0/1.

Passport records distinguish owner-submitted, CN job-verified and independently verified provenance. Share links are explicit, revocable, expiring and stored as token hashes. Public projections exclude owner identity, contact data, payments and messages by default. Ownership transfer never automatically grants access to a previous owner's private conversations or receipts.

## SEO and branding

Serve meaningful public HTML with canonical URLs and matching JSON-LD from one public projection. Pre-render the initial small catalog on Pages with rebuild/invalidation after approved changes. Set a freshness objective before launch; move rendering of high-churn pages to an API-backed edge renderer when rebuild latency no longer meets it.

Use `/shops/:slug` for businesses and `/mechanics/:slug` for individuals. To avoid the brief's ambiguous `/mechanics/:city` versus `/mechanics/:person` pattern, use `/locations/:citySlug/mechanics` for location pages. Maintain redirects on slug changes. Return real 404/410 responses, not a success-status application shell for missing entities.

Publish robots, a canonical sitemap index and entity sitemaps only for substantive published records. Exclude preview/test/private pages, duplicate entities and arbitrary search combinations. Authentication protects private data; robots rules do not. Treat `llms.txt` as optional explanatory documentation rather than a guaranteed discovery standard. Publish the generated OpenAPI document and only justified standards-based well-known endpoints.

The provided logo establishes silver, black and blue visual direction. Preserve the original asset; derive responsive web assets during design work. Do not turn manufacturer marks or European-specialist wording into fabricated certifications, exclusivity or affiliation. Publish no invented ratings, availability, addresses or founder credentials.

## Delivery gates and scaling

Phase 1 proves deployment builds, authentication and tenant isolation. Subsequent slices add domain entities; real search/SEO; claims; public agent interfaces; garage/requests; CN Pro; inspected and approved repairs; commerce; trust; passport sharing. Each slice must have working server paths and tests before it is described as complete.

Production release requires environment validation, restore exercise, authorization and RLS tests, concurrency tests, browser/mobile/accessibility QA, verified deployment health, structured-data checks, and agent/payment audits for enabled features. Keep dated evidence and known limitations. Monitor latency/errors, zero-result searches, conversion and stale business data without invasive tracking.

Scale through measured indexes and pagination first, then asynchronous outbox processing, external search, media storage expansion and incremental rendering. Maintain interfaces and tenant invariants through each transition. Do not generate national-scale pages before genuine data and operational capacity exist.

## Outstanding decisions

- Confirm actual Cloudflare/Supabase resources and domain control before deployment; do not infer them from the domain string.
- Obtain founding business details and evidence before onboarding or publishing factual profiles.
- Select production email delivery, retention periods, restore objectives and verification operating procedures.
- Validate MCP authorization-server compatibility before enabling delegated private data access.
- Resolve Connect settlement responsibilities before implementing payments.

The Supabase changelog markdown endpoint failed during research; the [official breaking-change index](https://supabase.com/changelog?types=breaking-change) was available as fallback. No installed dependency versions exist to compare. Recheck current SDK and platform changes when dependencies are selected in Phase 1.
