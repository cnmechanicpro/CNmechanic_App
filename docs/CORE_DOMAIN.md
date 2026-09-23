# CNMechanic core domain

Phase 2 establishes the canonical relationships used by the platform: a profile can join many organizations; an organization has locations; professionals can be associated with selected locations; vehicles have stable identities and separate ownership history; organizations and locations declare services; and a customer can create a service request connecting a current vehicle, service, organization, and optional location.

Organizations support `REPAIR_SHOP`, `MOBILE_MECHANIC`, `DEALERSHIP`, `SPECIALTY_SHOP`, `SERVICE_NETWORK`, and `OTHER`. Lifecycle values include future discovery, claim, verification, suspension, closure, and removal states. This phase does not implement any workflow that acts on those states.

Locations support storefront, mobile, and service-area operations. Storefronts require a usable address; mobile and service-area locations do not. Location assignments are private employment relationships and require an active organization membership.

Vehicle data references normalized makes and models. VINs are stored only on `vehicles`, never returned from the public API schemas or rendered by the web app. RLS permits a current owner, an organization member with an actual service request for that vehicle, or a CN administrator to read the record. Ownership history is separate from the vehicle and current owners cannot read a prior owner's ownership record. A partial unique index permits only one current owner per vehicle.

Services and categories are controlled reference data. `organization_services` declares an organization capability; `location_services` narrows that capability to a particular location. A service request requires current vehicle ownership and an active service. A selected organization/location must have a matching active capability. Phase 4 adds explicit matching, offer, response, confirmation, and assignment state while continuing to exclude appointments, diagnosis, estimates, pricing, payment, repair completion, and reviews.

`location_services` is enforced in both directions by database triggers: an active organization capability must exist before a location can enable that service, and disabling or deleting that organization capability is rejected while an active location capability depends on it. This avoids destructive cascades and prevents an invalid committed state. `CUSTOMER` is a product role; it is intentionally separate from the `platformRoleSchema`, which contains only CN operational and administrative roles. Organization profile fields remain stored in the core schema but are deliberately deferred from the current membership-focused API until business-profile/search work in a later phase.

The Phase 2 API exposes public read-only catalog endpoints and authenticated endpoints for a caller's vehicles, safe ownership history, authorized organization locations/services, and service-request creation. WebMCP remains limited to its Phase 1 platform-info tool and exposes no domain mutation.

Service requests transition from `DRAFT` to `SUBMITTED` or `CANCELLED`; from `SUBMITTED` to `CLOSED` or `CANCELLED`. `CANCELLED` and `CLOSED` are terminal. Submission timestamps remain as history after closure or cancellation.
