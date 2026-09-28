# Job offer lifecycle

States are `OFFERED`, `VIEWED`, `ACCEPTED`, `DECLINED`, `EXPIRED`, and `WITHDRAWN`.

- Internal dispatch creates a bounded `OFFERED` row for an eligible mechanic.
- Only the addressed mechanic can read and respond to it.
- Acceptance requires a live offer, a matchable request, no assignment, and current provider eligibility.
- `ACCEPTED` means willingness; it is not an assignment.
- The customer may see accepted offers through the curated public mechanic summary.
- Customer confirmation creates the authoritative assignment and withdraws other pending offers.
- Cancellation withdraws pending offers. Expired, declined, and withdrawn offers cannot be accepted.

Offer changes and request changes are serialized by row locks.
