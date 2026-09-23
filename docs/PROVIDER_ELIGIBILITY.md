# Provider eligibility

Public mechanic eligibility requires all of:

- professional record state `ACTIVE`,
- publication state `PUBLISHED`,
- authoritative verification `VERIFIED`,
- lifecycle `ACTIVE` or `ELIGIBLE_FOR_JOBS`.

Future job eligibility requires lifecycle `ELIGIBLE_FOR_JOBS` in addition to public eligibility. Shops must be published and must not be inactive, archived, suspended, closed, or removed. Discovered/unclaimed businesses may be public when their provenance supports publication, but only `CN_VERIFIED` shops receive the verified marker.

These predicates exist in RLS helpers and shared domain code. Search RPCs are `SECURITY INVOKER`, so they do not bypass grants or RLS.
