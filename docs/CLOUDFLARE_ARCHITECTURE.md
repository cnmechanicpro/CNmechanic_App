# Cloudflare architecture

The Pages application in `apps/web` builds static files from React/Vite. The Worker in `apps/worker` is a separately deployable API. Pages never contains privileged business rules.

`apps/worker/wrangler.jsonc` declares isolated local, preview and production environments. The Worker uses a recent compatibility date, Node compatibility and Cloudflare observability. It has no database binding and contains no secret. `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are required secrets/variables for preview and production, added with Cloudflare’s secret mechanism before deployment. The service role is never a Worker or browser configuration value.

The intended route is `api.cnmechanic.com`; Pages serves `www.cnmechanic.com`. DNS, custom domains, apex redirect and deployment credentials are not configured by this phase. Before a production deployment, explicitly configure the Pages custom domain, Worker custom domain, `cnmechanic.com` to `www.cnmechanic.com` redirect, preview origins, Cloudflare WAF/rate limits and secrets.

The Worker separates configuration, routing, authentication, authorization, repositories, validation, responses, structured logging and OpenAPI generation. Every response carries a request ID. Logs include only route template, method, status, duration, request ID and environment.

Worker `GET /api/v1/health` is liveness/configuration only; it does not expose database readiness. `GET /api/v1/version` identifies the API foundation. Authenticated profile and organization routes exist solely to prove the identity and authorization path.
