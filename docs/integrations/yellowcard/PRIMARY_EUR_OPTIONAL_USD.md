# Primary EUR infrastructure and optional USD — 12 October 2026

Status: current product specification and isolated policy implementation in draft PR 266. Not deployed; no customer metadata submitted, services activated or funds moved by this change. This supersedes the shared-account proposal and the single-selected-provider assumption for the planned named-account programme.

## Product ownership

| Product | Infrastructure | Merchant behaviour |
| --- | --- | --- |
| Named EUR third-party receiving account | Yellow Card, primary | Receive, hold available EUR fiat; pay supported bank rails (including SEPA) or convert as part of an authorized payout to an external stablecoin address. |
| Named USD receiving account | Bridge, optional staff-authorized product | Incoming USD settles to the bound USDC wallet on Base. The USD receiving account is not a second spendable USD balance. |
| USDC/Base custodial wallet | Bridge | Customer-facing wallet only when the merchant has eligible active Bridge USD and its verified destination wallet. |
| YC USD, GBP and crypto custody | Disabled in current scope | Do not provision, market or incur these product commitments. Existing production products are not deleted by this draft. |

The founder reports merchant-named EUR third-party accounts under the latest YC discussions. Bind and verify the beneficiary and account ownership from the enabled programme before displaying instructions; do not relabel a BorderPay-owned shared account as merchant-named. EUR holding, transaction attribution and fiat-to-external-wallet source semantics remain partner acceptance dependencies.

New business intake belongs to BorderPay KYB and the YC programme. Only an authenticated USD request may automatically register a missing Bridge business customer. Signup and EUR requests must not create Bridge customers. Persist the customer ID before displaying the compliance-contact message; staff authorization and provider approval remain mandatory for USD activation. Registration may incur provider charges and must be auditable. An existing reviewed Bridge USD relationship can be retained through an explicit migration grant, without repeating onboarding. Bridge active does not mean YC approved, and vice versa. Bridge paused/rejected means its USD unavailable and its wallet hidden from the customer's active products, while an independently approved YC EUR product may operate. Preserve all Bridge balances, resource IDs, holds, recalls and recovery cases internally. Hiding a wallet does not extinguish a customer liability. Global legal/fraud restrictions continue to apply across providers.

Use product-level access, not a single provider switch. `yellowcard-named-account-policy.ts` defines the draft binding and spend-source rules; the old migration helper remains for legacy regression and must not become the new combined-product authorization path. This policy still requires integration into the existing authenticated account gateway and payment authorization/ledger adapters. It does not itself activate the runtime.

## Bridge evidence reuse and migration

Prepare the business cohort for YC, including previously active, paused, rejected and incomplete Bridge profiles. Preserve BorderPay user/merchant IDs and distinct provider IDs. Do not recreate customers by email matching alone. No individual-account migration or implicit approval.

Build an encrypted internal dossier containing legal name, DBA, incorporation and operating addresses, registry and tax identifiers, activities/industry, website, markets, declared volume and source-of-funds information; the full owner/director/controller graph and supported identity/tax/address evidence; documents, provenance, timestamps, validity, extracted fields and unresolved evidence requests. Retrieve only documents actually accessible under authorized provider APIs. Missing data stays missing and goes to correction review; never synthesize documents or facts.

Map that dossier to YC's actual approved business/associated-person/document submission contract. Bridge `paused`/`rejected` labels must not populate YC status or public merchant labels. Preserve original statuses and reasons in the internal audit record. Provide material unresolved fraud, sanctions, recalls or other compliance facts through the applicable YC due-diligence fields/process; do not strip them from required disclosure. Confirmed-fraud or globally restricted merchants are excluded from automatic account provisioning. YC determines its own status and can request additional evidence.

Preparation and submission must be distinct: prepared, missing_evidence, compliance_review, ready_for_submission, submitted, additional_information_required, approved, rejected. Record document versions, submission hashes, acknowledgements, provider IDs and retries. Use an idempotency key tied to merchant/programme/version and resume uncertain outcomes by lookup rather than duplicate creation. Never put customer dossiers, document URLs or negotiated terms in this public repository.

## Costs and acceptance

Keep confidential negotiated minima in the private finance model. Confirm whether each minimum is credited against qualifying YC usage fees/revenue share or is an additional fixed charge, and define qualifying activity. BorderPay revenue is not automatically the provider's qualifying fee base. No new customer pricing is changed by this decision.

Before release: obtain the named-EUR onboarding/document contract and entitlements; connect product access to app gateways without changing provider branding; test inbound finality and exact merchant attribution, EUR holds/available balances, SEPA payouts, external stablecoin payouts, quote/fee deduction, returns, duplicate webhooks, under-review transitions and residual Bridge recovery without double credit. The public reviewed API has no confirmed full corporate KYB/RFI submission contract, so metadata transmission remains blocked pending that interface or approved operational process.

## Receiving-account requests — 13 October 2026

Once enabled, route EUR to Yellow Card and USD to Bridge from authenticated server context, without cross-provider fallback or GBP enablement.

When a USD request has no Bridge customer ID, create or reuse the business customer and persist its ID before returning:

> To enable your USD account, please contact compliance@borderpayvelocity.xyz.

Stop there: do not create the VA or wallet, mark KYB approved, accept terms on behalf of the merchant, change YC status or move funds. A later request with an ID must still pass staff USD authorization and Bridge approval/controls. Historical Bridge rejection/pause and global restrictions cannot be bypassed by clearing an ID.

The setup coordinator calls the existing business-customer adapter with its stable BorderPay-user idempotency key. Its durable store contract requires an atomic reservation, ownership validation, exact payload snapshot and atomic profile mapping. Concurrent requests reuse the reservation; uncertain outcomes remain pending for reconciliation. A known provider ID is retained for reconciliation if local mapping fails. No email-only relinking or new retry key is allowed. Failed saves return a neutral setup-pending error, not a successful setup message.

Implementation status: isolated dispatcher and coordinator with synthetic regression coverage. The production durable store implementation and authenticated gateway/adapter bindings remain outstanding. This draft is not a deployed endpoint. Mock-store concurrency tests verify coordinator behavior, not production database atomicity. Existing ledger integration and YC partner-contract acceptance are also required before enablement.
