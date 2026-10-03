# Yellow Card full-product backend — 3 October 2026

Status: implementation started; isolated foundation, not production-ready or activated.

## Evidence and existing architecture

Audit used read-only production schema/secret-name inspection and current official documentation. No keys, customer records or balances are stored here. Existing African collections/payouts, JIT workers and Bridge paths remain untouched. Current frontend contracts remain the integration boundary; no provider-specific screens are planned.

Production has YC production credential names and JIT/egress relay configuration. No YC sandbox credentials were found in the inspected Vault or Edge secret-name inventory. Production keys must never be used as sandbox fallback. A sandbox key ID/secret and IP allowlist are needed before network acceptance testing. Store new sandbox credentials in Supabase Vault through the existing secret resolver when that integration is implemented; this library accepts explicit server-side configuration only.

The public documentation now includes custody vaults, fiat sub-wallets, virtual accounts, sends, reconciliation and travel-rule callbacks. The API introduction includes USDT, USDC, PYUSD and EURC. Actual asset/network availability and merchant entitlements must be discovered at runtime. Do not treat an old "coming soon" label as an availability verdict; do not treat a marketing statement as API acceptance either.

`contracts-2026-10-03.json` records request/response contracts and their official URLs. The guides use `/custody/...`, while the OpenAPI operations use `/business/...`. This foundation uses the latter. Sandbox requests must verify the paths before activation.

Sub-wallet `availableBalance` is spendable fiat in that wallet's currency. Virtual account instructions point to a sub-wallet; they are not a second balance. Never double-count VAs and their sub-wallets. Crypto vault values likewise require asset-specific balances. USD totals need dated, sourced rates, decimal arithmetic and a stale/unavailable indicator; no EUR/EURC-to-USD 1:1 assumption. Existing pricing stays unchanged until commercial terms and quote reconciliation are approved.

## Delivered in this change

- Separate HMAC client with explicit sandbox/production hosts, redirect rejection, timeout, redacted errors and no automatic retry. Production writes are unconditionally disabled in this version.
- Read contracts for vaults, crypto config, bank onboarding, fiat sub-wallets, virtual accounts, travel-rule config and reconciliation. Sandbox-only vault, sub-wallet/VA and address creation methods.
- Signature verification over original webhook bytes, environment-bound event fingerprints and merchant/environment/resource binding checks. These are primitives, not a deployed webhook receiver or persistence layer.
- Synthetic tests for signing, tampering, cross-merchant access, environment isolation, unsupported status, reused webhook IDs, ambiguous creates, stale currency enums and query signing.

## Required next implementation

1. **Persistence:** resource bindings for direct merchants and partner end users, unique per provider/environment/resource. Existing `api_tenant_provider_resources` is partner-scoped and has no explicit environment column; do not silently reuse it for direct merchant ownership. Add a reviewed migration with service-only writes, RLS, unique ownership, immutable linkage audit, idempotency records and transaction reconciliation cursors. No migration is applied by this change.
2. **Credential resolver and relay:** use environment-specific Vault names, an approved egress host and no credential-bearing redirects. Keep the existing African rail worker separate until parity is tested.
3. **Callbacks:** allowlisted key IDs, durable authenticated inbox, processing leases, quarantine for unknown mappings and periodic reconciliation. A webhook's `userId` may identify the partner, not the merchant. Never route by that value alone. VA examples reuse `id` across events and contain contradictory event/status fields; fetch authoritative account state before updating it.
4. **Reconciliation:** current custody docs explicitly warn failed webhook delivery may have no retry/dead-letter queue. Poll authoritative transactions with overlap, pagination, persisted cursors, deduplication, accounting idempotency and alerts. Never credit funds from a raw event twice. Preserve currency, provider fee, network fee, ledger links and reversals.
5. **Provisioning:** one vault per legal entity; keep requested, pending, active, frozen and closed states distinct. Confirm third-party merchant-named accounts rather than allocating BorderPay's first-party account to a customer. Enforce business-only onboarding and tenant membership. EUR/GBP field schemas, sort code/IBAN, third-party eligibility and country coverage need enabled-account responses from YC.
6. **Payments:** preserve existing send preview and authorization, use authoritative source balances/quote expiry, persist sequenceId before creation and reconcile unknown outcomes before retry. Support fiat-to-bank, fiat-to-wallet, wallet-to-bank, wallet-to-wallet and African rails only where entitlement and sandbox settlement are demonstrated. No financial write methods are exposed by this foundation.
7. **Travel rule:** the documented callback expects `{firstname,lastname,country}` even though vault docs support a legal entity. Obtain YC's corporate-originator/controller mapping, permitted evidence and retention requirements; do not fabricate individual names from a company name. Registration replaces a partner-wide callback, so audit existing callback configuration before changing it.
8. **Fees, KYB and operations:** verify contracted costs, metadata/document requirements, RFI states, beneficiary approval, hold/return/refund handling and freeze controls. Provider holds must not trigger automatic rerouting to evade restrictions. A migration needs partner approval and customer-specific eligibility.

## Acceptance and cutover

Before calling this production-ready, run synthetic sandbox KYB/entitlement checks; one merchant per vault; USD/EUR/GBP named account creation; deposit and spendable balance; all required send routes; pending/failed/returned states; fee/FX reconciliation; duplicate/out-of-order/missed webhooks; unknown outcome retries; cross-tenant denials; reconciliation after downtime; and frontend contract tests using the unchanged app. Produce an evidence report and confirmed commercial pricing.

After BorderPay compliance approval and explicit cutover authorization: deploy behind disabled per-product/per-merchant flags, validate read-only shadow results, pilot authorized merchants, reconcile balances and statements, then migrate in batches. Preserve Bridge routing for existing resources until each migration is reconciled. Never bulk replace provider IDs or move funds on deployment.

Reference entry point: https://docs.yellowcard.engineering/llms.txt

## Production read-only diagnostic

`yellowcard-full-readiness` is a service-credential-only endpoint that uses the existing YC production credentials for six fixed GET requests. It returns endpoint availability/status only, never account numbers, balances, identities or keys. It does not activate any product or create any sandbox environment. A successful read is not evidence of write entitlement or a complete migration test. Current Bridge onboarding is confirmed disabled and new-business intake is enabled in BorderPay; existing rejected/paused KYB invitations retain their own authorization and financial restrictions.

## Confirmed coexistence and retirement policy

- Stop new Bridge onboarding; collect new applications in BorderPay KYB. Existing active Bridge merchants retain service during preparation.
- Rejected/provider-paused business invitations permit new evidence submission without altering the old Bridge status. Fraud/global restrictions remain distinct from a provider pause.
- After YC global-product approval and per-merchant compliance/cutover approval, select YC for new activity. Retain both relationships: e.g. Bridge `paused`, YC `active` or `under_review`. Never reuse one shared status column for both providers.
- The new pure migration policy tests these boundaries; it is not yet wired to production profile reads, admin UI or webhook processing.
- Persist Bridge residual balances in original currencies in a separate operator recovery case with customer ID, eligible recovery date, authorization, source/destination references, fees, transactions, unresolved recalls and reconciliation evidence. Hold expiry alone must not execute a transfer.
- Old Bridge money is not spendable YC balance. Operators recover eligible funds and reconcile the destination credit before closing the case. Do not retry an ambiguous transfer automatically.
- Admin must display both provider IDs/statuses, current banking provider and recovery cases. User-facing banking uses approved YC accounts (IBAN/ACH/SWIFT/Faster Payments only where enabled) while Bridge records remain internal.
- A non-fraud provider pause should select a migration/re-verification notification when that path is available, not claim approval or unrestricted old funds. Do not bulk send or change fraud-specific notices as a side effect of deploying the adapter.
- Delete/revoke Bridge credentials only after no remaining active Bridge relationships, complete residual inventory, zero remaining amounts, no unresolved returns/recalls, archived records and explicit operator approval.

## Live source audit correction

The deployed `yellowcard-capabilities` v158 bundle contains a production client with mandatory egress relay support, unlike the older sandbox-default client on the repository baseline. No existing YC function is deployed from that older source by this work. The initial direct production probes returned 401, which cannot establish credential validity because they bypassed the existing relay. The new client supports the live relay envelope and preserves signed upstream paths; the readiness endpoint uses the existing relay environment configuration. Expanded product path permissions on that relay require validation separately from YC entitlement.
