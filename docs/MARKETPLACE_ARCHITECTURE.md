# Marketplace architecture

CNMechanic is a two-sided marketplace:

- **Customer:** needs a vehicle fixed and searches by problem/service, vehicle, expertise, and place.
- **Certified mechanic:** builds an authoritative professional profile and becomes discoverable for qualified repair demand.
- **Repair business:** provides shop identity, locations, offered services, and vehicle-make capabilities.

Discovery remains the public Phase 3 entry point and does not mutate marketplace state. Phase 4 adds authenticated, customer-owned service requests, controlled eligibility and ranking, bounded job offers, mechanic response, customer confirmation, and exactly one authoritative assignment. The five public WebMCP discovery tools remain read-only and expose none of these transactional actions.

Provider eligibility is separate from ranking. `ProviderEligibilityService` decides whether a professional is discoverable or job-eligible from authoritative status. Candidate generation filters service, vehicle-make, geography, and mobile/shop compatibility before `ProviderRankingService` orders the eligible set. Internal dispatch rechecks eligibility in PostgreSQL before it creates a bounded offer batch.
