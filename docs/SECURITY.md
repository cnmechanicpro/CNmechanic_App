# Security baseline

The Worker accepts only exact configured origins and returns no wildcard authenticated CORS header. It rejects invalid origins, unsupported methods, unsupported preflight headers, malformed route parameters and unrecognized query strings. JSON mutations require `application/json`, stream their bodies with a 4 KiB limit, and validate strict Zod schemas before domain calls.

Public errors use a stable code, safe message and request ID. Internal exception details are not sent to clients. Responses add `nosniff`, no-store, referrer, CSP and HSTS headers. Pages adds CSP, frame, permission and content-type headers. No request body, URL query values, credentials, tokens, payment data or PII is logged.

Supabase Auth validation happens independently in the Worker via `auth.getUser(token)`. The Worker derives the user ID only from that validated response, rejects anonymous identity, and propagates the same bearer token to Supabase queries. Client-supplied user/owner/role fields are rejected by strict schemas or ignored. Frontend guards improve navigation only; they never authorize data.

Only Supabase publishable/legacy anonymous keys can pass the environment validator. Service keys and JWTs bearing a `service_role` claim are rejected. Environment examples contain placeholders. `.gitignore` excludes local environment files, Wrangler state, build output and Supabase temporary data.

This phase establishes seams for WAF, rate limiting, Turnstile, signed media upload and webhook verification; none is active yet. The 4 KiB limit applies only to the present profile mutation and must be intentionally revisited for future media APIs.
