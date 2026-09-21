# Remote MCP

Remote MCP is not implemented or exposed in Phase 1. The reserved future endpoint is `https://api.cnmechanic.com/mcp`, and the Worker currently returns a standard `404` there.

When introduced, the transport must adapt the existing domain services rather than duplicate Worker or WebMCP business logic. Public tools can be read-only only. Authenticated tools require an MCP-compatible OAuth authorization server with resource metadata, PKCE, scoped consent, audience/resource-bound tokens, revocation and server-side tenant checks. A Supabase browser session is not by itself a delegated MCP authorization design.

Financial approvals, payments, verification decisions, inspection changes and administration remain prohibited from autonomous agent execution. The future registry must retain tool version, actor/client attribution, authorization decision, confirmation policy and audit requirements.
