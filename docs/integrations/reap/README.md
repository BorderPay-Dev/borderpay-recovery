# Business cards — REAP sandbox integration

Status: integration foundation, not deployed or end-to-end certified. Audited 2026-10-10.

## Architecture audit

The existing `card-create`, `card-program-status` and related Supabase card functions use `_shared/cards/cards-locked.ts`, returning a locked programme. `components/cards/CardsScreen.tsx` is an exploratory UI; its artwork includes legacy Africa branding and personal-card paths. This change does not wire that UI to issuing. Production card endpoints and existing Bridge/Yellow Card payment flows remain unchanged.

A separate internal sandbox adapter belongs beside the existing card boundary. It must eventually sit behind BorderPay authentication, business tenant membership, eligibility and card ownership checks. The transport itself is not a customer API. List-card results are programme-wide and must never be forwarded directly to a customer.

## Implemented

- Pinned sandbox origin, `x-reap-api-key`, `Accept-Version: v2.0`, bounded timeout, redirect rejection and sanitized errors.
- Read-only design discovery, paginated card listing and card retrieval. No network requests were made with credentials.
- Merchant business-card request preparation: virtual, commercial Visa, zero initial allocation, entity ID and named cardholder required. No consumer or programme-owner fallback.
- Documented business request schema extracted from the public reference. Validation catches schema shape and selected business invariants; it is not identity verification or proof of programme approval.
- Ten offline contract/security tests with synthetic data. No third-party dependencies or network permission needed.

Run from repository root:

    deno test supabase/functions/_shared/cards/reap/sandbox_test.ts

## Confirmed API requirements and branding

Official CaaS docs: https://reap.readme.io/docs/getting-started (the supplied `raedme.io` host is a typo).

Sandbox is `https://sandbox.api.caas.reap.global`. Several narrative snippets use a different host or mention bearer tokens; this implementation follows the OpenAPI server and API-key security definition. Confirm against the issued account during the authenticated smoke test.

REAP supports `cardDesign`, the UUID of approved artwork from `GET /card-design/`. Use BorderPay Velocity's existing black/white logo in the artwork submitted to REAP. A `logo_url` is not a create-card parameter. Do not represent a local mock-up as approved card artwork.

A business sub-client card needs `kyc.entityId`, `entityType: Company`, business details and a named `cardholder`. REAP checks that the sub-client is approved and enabled. BorderPay's own programme approval does not establish merchant approval. Confirm the contracted KYC/KYB integration path; do not automatically substitute Bridge or BorderPay approval.

Standard Authorisation uses REAP's available balance; Real-Time Authorisation requires a response in 1.6 seconds. Recommend Standard for the first integration, subject to programme agreement. REAP documents the first sandbox API key as locking that choice per account. This starter prepares only zero-allocation Standard requests.

## Configuration and next acceptance steps

1. Confirm sandbox account, authorisation model, commercial programme and approved merchant KYB path with REAP.
2. Store `REAP_SANDBOX_API_KEY` in Supabase Vault. Never put it in frontend variables, GitHub source or chat. This starter does not yet read Vault or deploy a function. A separate KYC credential is needed only if the agreed KYC API path requires it.
3. Retrieve programme designs and select the approved BorderPay design UUID. Confirm supported currencies, countries, funding and 3DS requirements.
4. Add authenticated sandbox orchestration with environment-separated tenant/entity/card mappings. Persist operation UUID, canonical request hash and outcome before sending POST requests. Enforce ownership in the server; never trust a client-supplied entity/card ID. Use database RLS and restricted service roles.
5. Add issuing, status changes, hosted card reveal, spending controls and funding after confirming contracts. Prefer REAP-hosted card display; do not store PAN/CVV. Card status unfreeze is `{freeze:false}` and does not necessarily mean ACTIVE.
6. Implement a durable authenticated webhook inbox with replay/deduplication, out-of-order handling and retries. Verify the exact webhook authentication contract first; the general webhook guide alone is insufficient. Never guess an HMAC scheme or deploy an unauthenticated money-event endpoint.
7. Test synthetic merchant approval, creation retry, freeze/unfreeze, 3DS, transaction authorisation, clearing, reversal/refund and reconciliation. Verify tenant isolation, outages and duplicate delivery. Then connect the existing business-card UI in a separately reviewed change.

## Financial and security controls still required

REAP describes a 24-hour POST idempotency cache. BorderPay must retain its own durable operation record, prevent same-key/different-body reuse and reconcile uncertain results before retrying after that window. There is intentionally no issuing method in this first transport: request preparation alone cannot provide durable idempotency.

Record card funding and refunds in an environment-separated double-entry ledger. Track authorisations and clearing separately; do not credit a customer twice from repeated events. Confirm settlement currency, programme fees and reconciliation exports before implementing accounting.

Do not expose programme master balances, other merchants' cards, raw provider errors, secret keys or cardholder identity data. Encrypt restricted evidence, log opaque references only, use scoped staff access and audited decisions. A sandbox key does not make real identity documents test data: use synthetic records.

## Delivery limits

No production changes, database migrations, card issuing, funding, external messages or application builds are included. Remaining external dependencies: sandbox credentials/account model, design approval, merchant KYB path, webhook authentication details and programme terms. These are required before claiming a complete sandbox lifecycle or production readiness.
