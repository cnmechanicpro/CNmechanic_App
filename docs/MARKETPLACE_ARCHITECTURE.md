# Marketplace architecture

CNMechanic is a two-sided marketplace:

- **Customer:** needs a vehicle fixed and searches by problem/service, vehicle, expertise, and place.
- **Certified mechanic:** builds an authoritative professional profile and becomes discoverable for qualified repair demand.
- **Repair business:** provides shop identity, locations, offered services, and vehicle-make capabilities.

Discovery is the Phase 3 entry point. It does not create bookings, dispatch work, accept jobs, mutate availability, collect payments, or change claims. Existing Phase 2 service requests remain customer-owned requests to a selected organization and use only `DRAFT`, `SUBMITTED`, `CANCELLED`, and `CLOSED`.

Provider eligibility is separate from ranking. `ProviderEligibilityService` decides whether a professional is discoverable or job-eligible from authoritative status. `ProviderRankingService` can order only candidates already declared eligible. Future matching and dispatch must reuse the same eligibility boundary rather than create a parallel provider directory.
