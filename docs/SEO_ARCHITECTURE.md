# SEO architecture

Canonical, indexable pages include the home page, professional network page, useful service pages, vehicle-brand expertise pages, and real public provider profiles. Service and brand pages are pre-rendered at build time with unique title, description, canonical URL, and JSON-LD. Provider requests are edge-rendered by Cloudflare Pages Functions from canonical API DTOs, with `Person` or `AutoRepair` structured data and real 404 responses.

Search URLs with query parameters and private account/auth/vehicle routes are `noindex`. They are absent from the sitemap. The sitemap contains only stable, useful static pages; provider URLs can be added only from approved published inventory in a future build/feed. `robots.txt` blocks private routes. Canonicals drop query strings and fragments.

Structured data never invents ratings, reviews, prices, availability, addresses, or inventory. Empty marketplace states remain honest. Core content and navigation work without WebMCP or experimental browser APIs.
