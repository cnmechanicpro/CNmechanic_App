# WebMCP foundation

`packages/webmcp` isolates WebMCP from application code. It contains typed tool metadata, input/output schemas, a registry and a registration adapter. It supports the future risk taxonomy: `READ_SAFE`, `WRITE_LOW_RISK`, `WRITE_CONFIRMATION_REQUIRED`, `FINANCIAL_CONFIRMATION_REQUIRED` and `ADMIN_PROHIBITED_FOR_AGENTS`.

Phase 1 enables only `get_platform_info`, a public read-only tool that calls the same typed API client and `/api/v1/version` domain behavior used by the web application. It returns real application/version status and no user or marketplace data.

The adapter feature-detects `document.modelContext`, registers through a lifecycle `AbortSignal`, passes execution cancellation to the API client, and returns `unsupported` or `failed` without affecting the human UI. Tests cover registry validation, invocation, generated JSON Schema, unsupported browsers, throwing browser accessors, rejected registration and cancellation.

No sensitive, authenticated, write or browser-agent confirmation flow exists. Before adding a future browser tool, define the user-visible path, shared domain use case, authorization, output trust, audit policy and human confirmation requirement.
