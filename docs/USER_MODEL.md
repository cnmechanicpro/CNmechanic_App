# User and actor model

A person has one private `profiles` identity keyed by Supabase Auth. Roles are contextual and may overlap:

- a customer owns vehicles and service requests;
- a mechanic/technician has a `professional_profiles` record and may belong to zero or more organizations;
- a shop manager or owner has organization membership scoped to that organization;
- a platform operator has a private, explicit platform-role assignment.

A mechanic can be independent, shop-associated, or hybrid. `professional_location_assignments` link a public mechanic identifier to locations while retaining the private auth profile link for authorization. Public DTOs never expose `profile_id`, email, membership rows, claim evidence, customer data, or platform roles.
