# Business card integration — sandbox preparation

Internal engineering documentation. Source audit: 10 October 2026. Draft PR #274, `borderpay-recovery`. No deployment, existing function change, UI change, live customer submission or production migration.

## What is implemented

| Area | Implementation | Verification |
| --- | --- | --- |
| API contracts | 33 operations extracted from official endpoint OpenAPI definitions, with source URLs and SHA-256 provenance | Request contract tests |
| Card transport | Sandbox-only origins, separate CaaS/compliance credentials, exact version headers, bounded timeout, redirects rejected, errors sanitized | Mock transport tests |
| Business issuing | Virtual commercial Visa merchant requests, approved sub-client entity and named adult cardholder, zero initial allocation | Business-only and missing-field tests |
| Card management | Retrieve/list, approved artwork discovery, freeze/unfreeze, balance adjustment, spending controls, termination, hosted reveal request | Contracts implemented; provider execution pending |
| Transactions | Card/programme transaction reads, balance history, master balance and report requests | Contracts; reconciliation model tests |
| Sandbox simulation | Authorization, clearing, reversal, refund, KYB outcome/reset contracts | Provider execution pending; offline-clearing schema ambiguity noted below |
| KYB | Business UKYB entity, pack creation/amendment, company/UBO uploads, submit/readback, notifications | Required fields, ownership, age, domains and evidence tests |
| Webhooks | Separate CaaS RSA-SHA3-256 and Compliance RSA-SHA512 verification; encrypted durable inbox; duplicate/conflict detection | Synthetic signatures and PostgreSQL tests |
| Operations | Tenant/resource authorization, disabled-by-default programme, durable operation keys, safe handling of uncertain outcomes | In-memory PostgreSQL integration tests |
| Reconciliation | Exact decimal arithmetic, separate currency balances, duplicate/conflict detection, opening/closing checks | Synthetic report tests; never posts to production ledger |

Existing `card-*` Edge Functions still use `cards-locked.ts`. No API key is loaded by these new modules automatically. `SandboxTransport` is an internal primitive, not an authenticated customer endpoint. Never expose its programme-wide reads directly to a customer.

## Required configuration, when REAP provides sandbox

- `REAP_SANDBOX_API_KEY`: CaaS sandbox key, server only (Vault).
- `REAP_SANDBOX_COMPLIANCE_API_KEY`: separate compliance sandbox key if Universal KYB is enabled for our programme.
- Confirm the chosen authorization model. First sandbox key fixes the model per REAP account. This command layer supports Standard Authorisation; real-time authorisation is deliberately rejected.
- Confirm the programme’s currencies, markets, card funding model, fees, commercial BIN and merchant/cardholder verification requirements.
- Retrieve the approved BorderPay logo artwork using `GET /card-design/`; set the returned `cardDesign` UUID. Arbitrary `logo_url` is not a card-creation parameter.
- Generate a backend-managed AES-256-GCM evidence key with a key ID; retain it in secret management, separate from database records.
- Wire trusted authentication and verified tenant membership to the internal `Scope`. `Scope` must never come directly from request JSON.

No additional Supabase project or paid service has been created. The SQL is review-only beside the modules, outside `supabase/migrations`; nothing automatically applies it.

## Financial execution rules

Persist an operation UUID and immutable request hash before calling a mutation. The command store authorizes the merchant/card again on retries. An operation executes once. Same key with a different request is rejected. Concurrent or crashed IN_FLIGHT commands require reconciliation. A lost provider response becomes UNKNOWN; repeating the command does not submit it again.

REAP documents a 24-hour idempotency cache for CaaS POST requests. Do not extend that guarantee to additive `PUT /cards/{cardId}/credit` or Compliance API calls. Those calls must not be blindly retried. The operator must inspect provider state before resolving an uncertain operation. Creation binds the returned card ID to the merchant atomically with the success receipt.

Initial card creation uses zero allocation. Subsequent balance adjustment is a decimal string in the card currency. Funding authorizations, fee policy, reservation of BorderPay wallet funds and double-entry posting into the existing ledger are not activated by this draft. Programme master money is not merchant revenue.

`reconcileSettlement` consumes explicit report rows in provider order with verified event identities and opening/closing snapshots. It compares available-balance movements, including holds. Clearing movement totals are NOT total payment volume: a clearing record may merely release a previous authorization hold. No automatic ledger postings or FX conversions are inferred.

## Compliance and evidence rules

REAP makes the final programme decision. `GET /entity/{entityId}/ukyb` exposes both `status` and `cardIssuanceEnabled`; APPROVED without the actual feature grant remains disabled. Replayed/out-of-order webhooks schedule a current API read, not a blind status overwrite.

UKYB has up to 50 declared owners in the published schema. Preserve all ownership records; never silently omit owners. Required business fields include legal form, registration number, registered and operating addresses, line of business, incorporation date, verified employee email domains and complete UBO identity/document/address data. BorderPay’s verified company-domain list must be established separately; do not automatically treat a free-email domain as an employee domain.

Owner replacement is destructive in REAP: PATCH with `uboDeclaration` rebuilds owners and discards existing identity-file associations. Generic amendments cannot perform it. It needs a separately reviewed replacement/re-upload workflow. Documents remain blocked unless the security worker has marked the exact hash clean. Evidence upload uses backend-retrieved scan results, not client-supplied assertions.

For `ubo-kyc`, the API reference requires the BUSINESS entity in the URL plus `individualEntityId` and `uboDocumentType`. Front precedes back; a passport bio page may be a single file. Uploading the same identity-document type replaces the previous set. Maximum two UBO files per request; other company types allow five; lifetime count per requirement/owner is 20 including superseded identity files. This draft also imposes BorderPay’s 10 MB per-file cap, which is not stated as a REAP limit.

RFI status is available, but the `getKyb` reference says the detailed request is in a Zendesk thread, not the response. Do not invent an RFI API. Route PENDING_ADDITIONAL_INFO to compliance staff and retain the actual request before notifying the merchant.

## Webhooks and background processing

CaaS: `reap-signature` is `timestamp=<epoch_ms>;signature=<base64>`, RSA-SHA3-256 over `JSON.stringify({...body,timestamp})`. Reject signatures older than five minutes; future skew is capped at 60 seconds by BorderPay. Preserve object key order. Current and legacy trace header spellings are supported but conflicting values are rejected. Trace headers are not signed, so a signed business key also deduplicates manual replays.

Compliance: RSA-SHA512 over the raw request body; use `data.eventId` for deduplication. The sandbox public key effective 1 October 2026 is recorded. Do not use the September key still present in older examples. No invented timestamp scheme is applied to compliance events.

The handler verifies, encrypts, atomically enqueues, then acknowledges. Persistence failure returns 503. The inbox and audit records are append-only. The work planner routes card/transaction/KYB events to current-state reads; other events are queued for operator review. It never follows a webhook-provided file URL automatically.

Remaining deployment wiring: a bounded/rate-limited HTTPS receiver, database connection, worker scheduling/leases, retry/dead-letter monitoring, current-state snapshot persistence and staff alerts. Test the actual REAP payloads and signatures before registering endpoints. CaaS maintains one latest endpoint per client; registration can replace the previous endpoint. Do not register blindly.

## Documentation conflicts tracked for sandbox acceptance

| Conflict | Implemented choice / pending confirmation |
| --- | --- |
| Quick starts use `subscribeUrl`; endpoint requires `subscriberUrl` | Endpoint schema wins |
| Narrative CaaS URLs omit `.caas` or mention bearer tokens | OpenAPI sandbox server + `x-reap-api-key` |
| Trace header `x-reap-traceid` vs `x-reap-trace-id` | Accept either; reject contradictory values |
| UKYB guide points UBO uploads to individual URL | Endpoint reference explicitly requires business URL + individual field |
| Compliance examples show old public keys | Use October 1 key |
| Guide says decisions cannot be retrieved; UKYB readback has status/grant | Use documented UKYB readback for business cases |
| Simulator clearing uses overlapping `oneOf` alternatives | Do not weaken validation silently; advanced offline-clearing payload awaits REAP clarification |
| Settlement report identifier descriptions conflict | Do not infer a cross-system join until actual sample reports verify it |

## Tests and remaining acceptance

Offline tests cover contracts, request validation, tenant isolation, concurrent reservations, PostgreSQL RLS privileges, immutable audit, unknown outcomes, signature tampering, replay, encryption, document checks and reconciliation. PGlite runs PostgreSQL in memory; it does not prove Supabase deployment/network behavior. Provider replies are mocked.

Run from repository root:

    deno test --config=supabase/functions/_shared/cards/reap/deno.json --lock=supabase/functions/_shared/cards/reap/deno.lock --frozen --allow-read supabase/functions/_shared/cards/reap/

Before activation, complete `ACCEPTANCE.md`. No real sandbox lifecycle, issuer artwork approval, 3DS delivery, hosted reveal, physical fulfilment, Apple/Google wallet provisioning or programme billing behavior has been certified. These last two product families are documented dependencies, not silently enabled features. Do not claim production readiness from offline tests.
