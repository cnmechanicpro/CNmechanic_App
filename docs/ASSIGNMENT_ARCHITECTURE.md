# Assignment architecture

`service_request_assignments` is the authoritative relationship between a request and a mechanic. It references the accepted offer that produced it.

Customer confirmation locks both the offer and request, rechecks ownership, request state, offer state/expiry, current provider eligibility, and the absence of an existing live assignment. A unique request constraint and a live-assignment partial unique index provide database-level protection against concurrent confirmation.

Assignment states are `ASSIGNED`, `ACTIVE`, `CANCELLED`, and `CLOSED`. Activation is an internal operation in Phase 4. The browser has no direct write grants. Customers can read their request’s assignment; mechanics can read only their own assignments; administrators retain controlled access.
