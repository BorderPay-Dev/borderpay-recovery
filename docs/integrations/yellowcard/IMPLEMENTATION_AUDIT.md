# Yellow Card implementation audit — 3 October 2026

**Release status: draft backend implementation; no deployment or database migration authorized.**

This is the second audit, after the full public-document inventory. It distinguishes implemented code, synthetic validation, and acceptance that requires YC's enabled account. No production credentials or customer information are included.

## Repository and deployment boundary

The existing YC work is in `BorderPay-Dev/borderpay-recovery`, draft PR #266, branch `feat/yellowcard-full-product-foundation`. No separate YC repository was found in the organization. The branch's Vercel Git deployment is disabled in `vercel.json`; new CI uses only an ephemeral PostgreSQL database and synthetic fixtures. Production workflow is not invoked. Existing Bridge and African-rail functions are not overwritten.

## Implemented in the draft

| Component | Implementation and boundary |
| --- | --- |
| Public contracts | 64 selected operations from the official references plus the guide-specific VA send contract, with source links, payload validation and explicit confirmation gates. Retail widget, sandbox simulation, deferred Latin-American VA issuance and unconfirmed PATCH signing are excluded. |
| Transport | Explicit environment, HMAC, configured egress relay, fixed paths, safe error codes, redirects rejected, no automatic financial retries. Production mutations require per-operation release grants and an approval reference. |
| Business identity | Separate registered business and representative metadata. Institutional payments cannot default to retail. GBP destination validation includes sort code; the VA send shape stays distinct from ordinary sends. |
| Merchant isolation | Service-only tables, RLS, immutable provider-resource ownership, tenant membership, one vault per merchant, parent VA/wallet ownership checks. No attribution by legal-name matching, partner `userId` or arbitrary webhook metadata. |
| Provisioning | Stable per-merchant/currency operation keys, vault and sub-wallet provisioning, durable pending operations, provider lookups before binding and no automatic retry after a lost create response. |
| Monetary values | Decimal arithmetic, original fiat/crypto assets, available and pending values, sourced USD valuation and explicit unknown/stale totals. VAs are not counted again on top of their linked fiat wallets. |
| Payment engine | Mandatory existing-payment-authorization adapter, exact request hash, encrypted prepared payload, source binding and reservation, atomic claim, unknown-outcome handling. HTTP acceptance never means settlement. |
| Webhooks | Raw HMAC verification, key-ID allowlist, bounded payload, encrypted durable inbox before acknowledgement, fingerprint deduplication, leases, retries/quarantine and operator-visible error codes without identity logs. |
| Reconciliation | Authoritative transaction lookups, custody polling with persisted windows/cursors, duplicate-safe observations/outbox, final-state guards and balance refresh before releasing an operation reservation. Unknown fiat-deposit linkage is quarantined rather than credited to a guessed merchant. |
| Travel rule | Signed exact-vault identity callback with encrypted evidence, audit and approved corporate mapping. Never substitute BorderPay's identity. Unknown owners return a failure. |
| Receipts | BorderPay receipt data model with original/payment currencies, fee amounts, status and references. Missing costs remain unknown. This does not claim to be a YC-issued PDF. |
| RFI | Internal case/evidence/acknowledgement records. No fabricated YC case API; `sent` requires a confirmed delivery acknowledgement. |
| Migration | Existing tested provider-independent policy retains separate Bridge and YC states and operator-only legacy fund recovery. No cutover is activated by this draft. |

## Remaining implementation and contract dependencies — must not be hidden

1. **Existing app authorization and ledger wiring:** the new payment engine requires the existing server-verified PIN/biometric/SCA adapter and exact preview binding. It is deliberately not exposed as an unchecked public payment endpoint. The new reconciliation outbox must be connected to the existing ledger's posting/reversal contract and verified against statement/fee records before the new customer routes are enabled. New account DTOs also require compatibility tests against the existing app gateway. These are integration tasks, not solved by enabling an API key.
2. **VA-funded send contract:** public guide `/business/payments` versus reference `/business/send`, including `source`, `walletId`, sender date format and merchant identity. Supported rails are implemented for validation but write access stays gated until confirmed.
3. **Fiat-to-crypto merchant source:** the public schema exposes `fiatWallet` as a currency code, not an unambiguous merchant sub-wallet ID. Do not debit the shared partner balance and pretend it came directly from a merchant. YC must confirm the merchant funding contract or a reconciled treasury funding leg.
4. **Crypto-to-bank payment composition:** the public custody `USD_BALANCE` destination credits the partner balance. A merchant withdrawal to a bank needs an explicit, authorized and reconciled multi-leg plan; it is not safe to enable a direct fallback to treasury. Existing African rails remain separate during this work.
5. **Fiat deposit attribution:** automatic VA deposits need an authoritative transaction-to-merchant-VA identifier. The standard receive response's `bankInfo`, `fiatWallet`, `customerUID` and metadata are not sufficient evidence by themselves unless YC confirms their ownership semantics. Enable deposit accounting only after captured examples prove the mapping.
6. **Continuation actions:** explicit accept/deny/RFQ actions need the original operation's reservation and a new authorization bound to the returned quote. The operation catalog is prepared; the merchant saga linking quote acceptance and downstream payout requires acceptance testing before exposure.
7. **RFQ:** confirm institution-level source/destination wallet support, minimums, maximums, liquidity, fees, validity window and accepted-state lifecycle. No new customer FX screen is introduced.
8. **KYB and RFI:** full business/UBO document submission, compliance final-decision feeds and RFI reply/upload contracts are not published in the reviewed reference. Standard send records expose `documentRequired`, `documentSource` and `generatedDocumentId`; these are signals, not a complete RFI API. Obtain the private interface or approved operational process.
9. **Business travel rule:** public callback returns individual given/family names. YC must approve the corporate owner/representative mapping. Memo/tag/UTXO vault limitations in the guide remain enforced for the selected capture path.
10. **Entitlements and commercial costs:** confirm merchant-named USD/EUR/GBP plus holdable African fiat currencies, networks, external bank/crypto destinations, holding policies, return/recall coverage, fees and revenue share. Public schema enums are incomplete; do not substitute corridor support for holding permission.
11. **Operational acceptance:** approved credential/relay path access; webhook and callback registration; full initial resource inventory; reconciliation schedule and alerts; performance and failure testing; migration dry run; support/recovery runbook. No real customer data or transaction is needed for current CI.

## Test evidence

`Yellow Card Full Backend Acceptance` runs type checks, synthetic application tests and the draft migration against PostgreSQL 16. SQL assertions cover raw-table/function restrictions, RLS, source ownership, idempotency, concurrent claim exclusion, reservation retention after unknown outcomes, immutable audit/linkages and duplicate/conflicting financial observations. GitHub Actions supplies the authoritative run result for the committed revision.

The current suite has 43 application tests. Application tests cover signing, cross-environment isolation, quote expiry, currency precision, missing rates, pending refunds, authenticated webhook storage, tampering, unknown identity owners, duplicate concurrent submit, lost response recovery and no shared-treasury fallback. These are test fixtures, not evidence that YC has accepted a live transaction.

## Monday activation sequence

1. Review YC's enabled routes and resolve the above private-contract questions; record the written answers in the operation confirmations.
2. Finish app authorization/ledger wiring and the unresolved funding/continuation plans, then run regression tests on the unchanged app contract.
3. Review this draft and approve deployment separately. Apply new schema and deploy new functions with all product flags disabled.
4. Configure secrets in the existing Supabase Vault. Register callbacks only after checking existing partner-wide settings.
5. Run authorized provider acceptance: onboarding/provisioning, inbound credit, available balance, each send direction, fee/FX reconciliation, refunds, holds, callbacks, replay/outage recovery and correct merchant attribution.
6. Enable a small approved merchant cohort only after ledger and statement reconciliation. Keep Bridge relationships and residual balances intact and operator-controlled.

**Do not call this full production readiness solely because the new tests pass or YC enables all products.**
