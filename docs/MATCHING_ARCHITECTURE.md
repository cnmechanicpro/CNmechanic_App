# Matching architecture

Matching follows one direction:

`ServiceRequest → ProviderEligibility → CandidateGeneration → ProviderRanking → JobOfferCreation`

Eligibility requires an active, published, verified professional whose lifecycle is `ELIGIBLE_FOR_JOBS`, an active service capability, vehicle-make capability, compatible mobile/shop mode, and matching service area when the request provides geography. Ranking operates only on that eligible set. Current legitimate ranking signals are capability relevance, mobile-mode fit, distance when available, and deterministic ID tie-breaking.

The database candidate function returns no more than ten mechanics. Offer creation accepts batches of 1–10, rechecks eligibility inside the transaction, locks the request, and enforces one offer per request/mechanic. The architecture supports later sequential batches, timeout expansion, capacity, and scheduling without changing the eligibility boundary.

No rating, reputation, availability, or completed-job signal is invented. Live availability remains deferred.

The future operational vocabulary is `OFFLINE`, `AVAILABLE`, `BUSY`, and `NOT_ACCEPTING_JOBS`. Phase 4 does not persist or evaluate those states because it has no authoritative scheduling or presence source yet. Adding a decorative availability field now would falsely imply that dispatch enforces it.
