# Phase 4 target architecture

Phase 4 preserves the established boundary:

`React customer/mechanic workspace → Cloudflare Worker → shared schemas/domain/API client → Supabase PostgreSQL`

Customers create requests only for vehicles authorized by current ownership. The Worker accepts no caller-supplied customer identity; the database RPC derives `auth.uid()`. Controlled dispatch calls the existing provider capability data, filters eligibility, ranks the eligible set, and creates a maximum of ten offers. A mechanic response records willingness. Customer confirmation atomically creates one assignment.

The browser may read only its RLS-scoped requests, offers, and assignments. It cannot insert or update offer/assignment rows. Internal matching functions are available only to `service_role`. Public discovery and its five read-only WebMCP tools remain separate and unchanged.

Provider-neutral request events form the notification boundary. Email, SMS, push, estimates, payments, completion, and reputation are deferred.
