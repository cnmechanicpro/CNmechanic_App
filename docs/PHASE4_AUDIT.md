# Phase 4 audit

Date: 2026-09-23  
Branch: `codex/phase4-job-marketplace`  
Audited base: `54b476e15863e69fe48e9492fbda8cc484b75ad2`

## Existing foundation

The current code already uses the required Pages → Worker → shared schemas/domain/API client → Supabase boundary. The browser holds only a Supabase publishable key, obtains a user access token, and calls canonical Worker routes. The Worker forwards that token to Supabase so row-level security remains authoritative.

Phase 2 provides vehicles, one-current-owner integrity, customer-owned service requests, organization/location/service consistency, a database transition trigger, and RLS isolation. Its request model is deliberately small (`DRAFT`, `SUBMITTED`, `CANCELLED`, `CLOSED`) and currently requires an organization before a customer can create a request.

Phase 3 provides professional lifecycle and verification status, public visibility, mechanic services, vehicle-make capabilities, specialties, service areas, organization/location assignments, public search RPCs, and separate `ProviderEligibilityService` and `ProviderRankingService` concepts. Only verified, active, published providers can appear publicly; `ELIGIBLE_FOR_JOBS` is already distinct from public discovery eligibility. Five WebMCP discovery tools are read-only and use the canonical API client.

The Worker already supplies strict request validation, authentication through Supabase Auth, safe error envelopes, request IDs, CORS allowlists, and rate limiting for public search. Existing authenticated routes cover profiles, vehicles, and creation of the Phase 2 request record. The account UI has authenticated profile and vehicle views but no transactional marketplace workspace.

## Reuse

- Retain Supabase Auth identity and user-token forwarding.
- Retain ownership as the authority for customer vehicle access.
- Retain professional verification/lifecycle fields and capability tables.
- Extend `ProviderEligibilityService`; do not duplicate eligibility in dispatch code.
- Retain `ProviderRankingService` as a post-eligibility operation.
- Retain the Worker as the canonical public application boundary.
- Retain the five public `READ_SAFE` WebMCP tools unchanged.
- Retain public provider DTOs when presenting accepted mechanics to customers.

## Required extensions

1. Extend service requests with optional marketplace geography, timing, urgency, mobile preference, cancellation, matching, assignment, and idempotency fields. The organization/location relationship becomes optional until a mechanic is assigned.
2. Replace the Phase 2 status constraint and trigger with an explicit Phase 4 transition matrix.
3. Add first-class `job_offers`, `service_request_assignments`, and append-only `service_request_events` tables.
4. Add an authoritative database candidate query and privileged, narrowly granted RPCs for controlled offer creation, mechanic response, customer confirmation, cancellation, and expiration.
5. Add unique constraints and row locking so one request cannot acquire two active assignments.
6. Add customer and mechanic API routes and shared contracts. No browser route may call authoritative dispatch or assignment tables directly.
7. Add authenticated customer and mechanic workspaces without fabricated production data.
8. Add provider-neutral event recording for later notification delivery.

## Migration and compatibility

The migration must preserve existing Phase 2 rows. Existing `organization_id` values remain valid, existing statuses map without data loss, and `CLOSED` remains a terminal compatibility state. New tables must explicitly opt into Data API grants because Supabase is moving new public tables to opt-in exposure. Every exposed table requires RLS before grants.

Security-definer functions are justified only for atomic cross-table marketplace transitions. Each must use `set search_path = ''`, derive the caller from `auth.uid()`, validate authorization in the body, revoke default `PUBLIC` execution, and grant only the minimum callable functions to `authenticated`. Internal matching/offer creation remains `service_role` only.

## Security risks

- BOLA/IDOR across customer requests, offers, and mechanic identities.
- Treating `authenticated` as authorization without an ownership predicate.
- Letting customers select another customer’s vehicle.
- Letting mechanics see offers addressed to other mechanics.
- Letting unverified, suspended, unavailable, or incapable mechanics receive or accept offers.
- Exposing private request notes, customer identity, verification notes, claims, or admin fields through public provider DTOs.
- Accidentally granting direct browser writes to authoritative matching/assignment tables.
- Broad `SECURITY DEFINER` execution or an unsafe search path.

## Concurrency risks

- Two mechanics accepting concurrently.
- A customer confirming a stale, expired, withdrawn, or already superseded offer.
- Cancellation racing acceptance or confirmation.
- Duplicate offer creation during matching retries.
- Duplicate active assignments or repeated client requests.

The database must serialize affected requests with `SELECT ... FOR UPDATE`, use unique indexes for one offer per mechanic/request and one active assignment per request, and make client creation idempotent per customer.

## State-machine risks

Clients must not update status directly. Transition functions must validate the current state and derive timestamps. Terminal states cannot reopen. Offer state is distinct from assignment state: `ACCEPTED` records mechanic willingness; customer confirmation creates the single authoritative assignment. `ACTIVE` begins only after assignment.

## Release-control audit

`.github/workflows/ci.yml` only verifies code and does not deploy. The external Cloudflare integrations currently deploy Git changes automatically: Pages builds production from `main`, and the Worker Git integration also reports builds on repository commits. The stalled preview encountered immediately before this audit confirms that deployment scheduling is external to GitHub CI.

Before Phase 4 is merged, an account owner must change Cloudflare release settings so pushes to `main` do not publish production automatically while preview deployments remain enabled. The intended minimal policy is:

1. Keep pull-request/branch preview builds enabled.
2. Disable automatic production deployments from the Pages `main` branch, or change the production branch to a dedicated `production` branch advanced only by release approval.
3. Disable automatic Worker production deploys from `main`; keep build verification or preview deploys, and release with the explicit production Wrangler command after approval.
4. Keep database migrations out of merge CI. Apply production migrations only in a separately approved release run.
5. Record the approved code SHA and independently approve database, Worker, and Pages release steps.

No external deployment setting will be changed by this branch. Exact dashboard actions and the final chosen branch policy must be reviewed before merge.

## Out of scope

Payments, payouts, estimates, invoices, diagnosis, inspection, repair workflow, completion, reviews, reputation, messaging, live GPS/presence, real-time scheduling, push/SMS/email provider integration, artificial ratings, artificial completed-job counts, public transactional WebMCP tools, and Phase 5 work remain out of scope.

## Audit conclusion

The Phase 1–3 architecture is suitable for Phase 4. The smallest safe design adds transactional marketplace tables and atomic RPCs behind the existing Worker while preserving public search, provider eligibility/ranking separation, RLS, and the current client boundary.
