# YC shared-account migration decision — 5 October 2026

Status: internal implementation plan on draft PR 266. No deployment, merchant activation, provider write, fund movement or campaign send is authorized by this document. It supersedes the merchant-named-account assumptions in the 3 October handoff for the current YC proposal.

## Confirmed discussion versus outstanding agreement

YC described one account in BorderPay Africa, Inc.'s name that can accept third-party payments for approved business merchants. BorderPay performs merchant allocations, using unique payment references. YC is preparing a distribution/revenue-sharing proposal; the standard Treasury order form does not define that arrangement. The shared account is not a named bank account for each merchant.

Still required: formal permitted-use and compliance-reliance terms; merchant evidence/notification requirements; supported currencies/rails; incoming-payment API and webhook contract; settlement/finality/recall semantics; fiat holding policy; pricing and revenue-share deductions; account-wide versus transaction-specific restrictions; production entitlement and release acceptance. Do not infer that Treasury portal training establishes automatic API reconciliation. The current MSA's fiat-holding limits must be reconciled with the sales explanation before offering stored fiat balances.

## Repository audit

The existing draft has a provider migration policy, resource-binding controls, a full-product client/worker and an undeployed SQL foundation. Prior documented probes returned 403 through the production relay; this is historical evidence, not a fresh entitlement check.

`supabase/functions/_shared/providers/yellowcard-migration-policy.ts` separates provider status from residual Bridge recovery, which should be retained. Its per-merchant `customerId`, single selected provider and merchant-owned resource assumptions are insufficient for the confirmed pooled-account model. Shared YC account ownership must remain BorderPay's; each merchant has an internal allocation ledger, not a fabricated YC customer/account ID. Existing customer-specific provisioning paths must remain disabled unless separately contracted.

The existing admin Bridge recovery reservation was documented as relying on global account freeze. Recovery must be based on the actual restricted Bridge relationship, independent of a merchant's new KYB or YC eligibility, while retaining operator MFA, destination verification, idempotency and recovery journals.

## Routing and pause workflow

- An eligible active merchant may retain their current active named Bridge account. Do not create new Bridge KYB applications or charge fresh KYB merely to preserve an existing relationship. Whether to resume any new Bridge onboarding is a separate decision.
- An authenticated Bridge pause webhook persists the provider restriction and opens or updates one migration-review case. Duplicate/out-of-order events cannot create duplicate invitations, accounts, charges or ledger credits.
- A pause is not YC approval. Record and assess the pause reason, fraud/sanctions flags, outstanding RFIs, recalls and legal restrictions. A replacement route must not bypass applicable restrictions.
- Reuse lawfully accessible KYB/UBO evidence, preserving source, timestamps, document validity, screening history and unresolved issues. Do not label missing documents or unreviewed address evidence as approved. Rejected or incomplete applications may resume through BorderPay KYB without erasing prior decisions.
- When the YC programme is live and all applicable eligibility/approval controls pass, assign the merchant an internal collection reference against the authorized BorderPay shared account. Provider approval means whatever the final reliance arrangement actually requires; do not invent a separate YC KYB process or silently assume delegated approval.
- Retain each provider's status and each resource's ownership. Existing Bridge restrictions stay effective even where a merchant can use YC. Global merchant restrictions override all providers.
- Payments already sent to old Bridge instructions cannot be redirected by an internal routing change. Display the beneficiary and reference required for each selected collection route.

## Ledger and reconciliation

Use distinct provider cash/control accounts and merchant liabilities. Merchant allocation is a liability entry, not BorderPay revenue or a second asset. Hold unmatched/ambiguous receipts in suspense; do not allocate by fuzzy sender name or an untrusted user claim.

Authenticate webhook signatures over the correct raw body. Deduplicate by provider event and transaction identifiers. Retain currency, amount, gross/net fee treatment, reference, payer data, provider status and settlement evidence. Correctly process duplicates, missing events, delayed notifications, reversals and partial refunds. Reference matches alone do not establish irrevocable settlement or spendability.

Payout authorization must enforce the merchant's available internal balance and restrictions, reserve funds atomically, bind the external beneficiary, and maintain an idempotent provider operation/journal. A pooled provider balance must never authorize one merchant to spend another merchant's allocation. Reconcile merchant liabilities, suspense, holds, fees and provider balances daily and through intraday event processing.

Keep legacy Bridge funds in a separate recovery inventory. Never credit them as YC-available funds before actual authorized recovery, settlement and reconciliation. The previously discussed 60-day process requires case-specific provider/legal eligibility and operator controls; elapsed time alone is not a transfer instruction.

## Customer communication after agreement and acceptance

Prepare separate messages for active merchants keeping named accounts, eligible shared-account users, paused merchants awaiting review/recovery, and rejected/incomplete applicants. Send only after service availability and each audience's eligibility are established, with idempotent campaign delivery and applicable contact preferences.

Explain the shared-account beneficiary accurately: BorderPay Africa, Inc., with the assigned payment reference. The merchant remains the seller on its invoice; any collection-agent wording must follow the agreed arrangement. Never present the shared IBAN as a bank account in the merchant's own name. Keep the user's public-facing brand BorderPay Velocity and statutory entity wording intact.

Describe actual service options and restrictions. Do not claim that all Bridge merchants are unsupported, that switching prevents RFIs/freezes, or that paused balances are immediately withdrawable. For an approved merchant, switching future collection instructions is separate from recovering older funds.

## Economics and acceptance gates

Compare contribution per activated, revenue-producing merchant: earned fees less partner collection/payout/FX costs, minimum shortfalls, KYB amortization, screening, support/review, refunds/recalls and unrecoverable loss. Count idle/rejected KYB costs and lost revenue from pauses. Record missing costs as unknown, not zero. At 3% incoming pricing, $10 is recovered by approximately $333.33 of eligible USD collections before any other cost; the fee alone does not prove a provider is uneconomic.

The standard order form's wallet/account minima are not automatically applicable: Products 3 and 5 are unchecked. Obtain a written partner fee schedule, allocation of any shared-account minimum, ramp period and precise revenue-share base before projecting margin. Do not count internal transfers or repeated wallet movements as new customer revenue.

Acceptance before release: live entitlement confirmation; approved synthetic/test lifecycle; ledger invariants; cross-tenant isolation; duplicate/out-of-order webhook tests; missing-reference suspense; reversals after payouts; concurrent spending protection; pause-reason gating; unrelated-merchant restriction isolation; recovery without double credit; auditable reconciliation and exception reporting. Use YC sandbox when supplied; any production test involving actual funds requires explicit authorization. Merchant communication follows successful acceptance and operational approval.
