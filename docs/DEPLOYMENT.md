# Deployment

Phase 1 has not deployed any Pages project, Worker, Supabase project, DNS record or secret.

Before a manual preview deployment, create independent preview Supabase and Cloudflare resources; set a preview Pages origin; provide `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` through Cloudflare secrets; configure matching frontend public values; apply migrations; and run the Docker-backed Supabase test. Preview must never use production data or accept production browser origins.

Before production, confirm domain ownership and configure `www.cnmechanic.com` for Pages, `api.cnmechanic.com` for the Worker, and a path/query-preserving apex redirect. Set only `https://www.cnmechanic.com` as the API’s production CORS origin. Add the production Supabase URL and publishable key as secrets, apply and verify migrations, run smoke checks for health/version/auth/RLS, configure alerts/log retention/backup restore procedures, then deploy through a reviewed release.

CI does not deploy. It runs lint, TypeScript, application tests, the static Pages build, generated Worker binding checks, Worker dry run, and a Docker-backed `supabase db reset` plus pgTAP suite. Roll back a Worker through Cloudflare deployment/version controls and Pages through a prior Pages deployment only after checking the failed release’s database compatibility. Never roll back a database migration destructively without an explicit recovery plan.
