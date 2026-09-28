# Phase 4 security review

## Identity and authorization

- Customer and mechanic identity always comes from the validated Supabase access token and `auth.uid()`.
- Request creation verifies current vehicle ownership in the database.
- Customers read only their requests. Mechanics read only requests for which they have an addressed offer or assignment.
- Anonymous roles receive no request, offer, assignment, event, or RPC access.
- Offer acceptance confirms the professional profile belongs to the caller and remains job eligible.
- Customer confirmation returns only a curated public mechanic summary.

## Authoritative mutations

Authenticated roles have no direct insert/update/delete grants on offers or assignments and no direct insert/update grant on service requests. Purpose-specific security-definer RPCs use an empty search path, derive the caller, lock rows, recheck authorization, and have default execution revoked. Candidate generation, offer creation, and activation are `service_role` only.

## Privacy

Public APIs and WebMCP expose no Phase 4 transaction. Customer notes, ownership, offers, assignments, claims, verification notes, and events are not anonymous. Event metadata is internal and must not contain secrets or unnecessary PII.

## Concurrency

Row locks serialize response, confirmation, cancellation, and activation. Unique indexes prevent duplicate request/mechanic offers, repeated idempotency keys per customer, and multiple assignments per request. Stale, expired, cancelled, or already assigned operations fail closed.

## Deferred controls

Full mechanic scheduling, live presence, payment controls, notification delivery, retention policy, and admin dispatch UI remain future work.
