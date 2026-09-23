# Search architecture

## Public API

- `GET /api/v1/search/mechanics`
- `GET /api/v1/search/shops`
- `GET /api/v1/search/services`
- `GET /api/v1/mechanics/{slug}`
- `GET /api/v1/shops/{slug}`

Mechanic filters: query, city, region, postal code, latitude/longitude/radius, service, vehicle make, specialty, mobile capability, and verified-only publication. Shop filters: query, city, region, postal code, service, vehicle make, and verification. Service filters: text and category.

Inputs are strict, unknown keys fail, text is bounded, radius is at most 500 miles, limit is 1–50, and offset is at most 10,000. PostgreSQL generated `tsvector` columns and partial GIN indexes provide text search. Location filters use ordinary indexed fields. Radius search uses bounded Haversine computation; PostGIS is deferred until geographic inventory and query volume justify an extension migration.

Responses contain curated public DTOs plus `{limit, offset, total, hasMore}`. Ranking is stable: verified first, then name and ID in SQL; domain ranking is isolated for future relevance and distance changes. Zero-result responses are empty arrays, never fabricated providers.
