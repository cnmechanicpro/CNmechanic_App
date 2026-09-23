# Business graph

The graph separates identity, operation, and capability:

- `organizations` represent repair businesses and networks;
- `locations` represent storefront, mobile, or service-area operations;
- memberships express a person’s role in one organization;
- professional profiles represent mechanics;
- professional-location assignments validate organization membership;
- organization/professional services and vehicle makes represent declared capabilities;
- specialties capture focused expertise;
- mechanic service areas support city, region, postal, radius, and future geospatial search.

`organization_provenance` records source, method, retrieval/freshness, confidence, and owner confirmation. `business_claims` supports an owner or authorized representative claim without granting membership or verification automatically. Aliases preserve canonical slugs after correction or merge. Duplicate candidates and merge history are private, deny-all review records; there is no public/admin mutation API in Phase 3.
