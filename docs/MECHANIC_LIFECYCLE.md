# Mechanic lifecycle

The authoritative lifecycle is:

`PROFILE_INCOMPLETE -> VERIFICATION_REQUIRED -> VERIFICATION_SUBMITTED -> VERIFICATION_PENDING -> VERIFIED -> ACTIVE -> ELIGIBLE_FOR_JOBS`

Exception states are `REJECTED`, `SUSPENDED`, `REVERIFICATION_REQUIRED`, and `INACTIVE`.

Verification status is tracked independently as `UNVERIFIED`, `APPLICATION_SUBMITTED`, `UNDER_REVIEW`, `MORE_INFORMATION_REQUIRED`, `VERIFIED`, `SUSPENDED`, or `REMOVED`. A published profile must have a slug and public name, be verified with `verified_at`, and have lifecycle `ACTIVE` or `ELIGIBLE_FOR_JOBS`. Self-service grants exclude lifecycle, verification, visibility, and timestamps, so a mechanic cannot verify or publish themselves.

`ACTIVE` means eligible for public discovery. `ELIGIBLE_FOR_JOBS` adds future matching eligibility. Phase 3 does not implement availability or job acceptance.
