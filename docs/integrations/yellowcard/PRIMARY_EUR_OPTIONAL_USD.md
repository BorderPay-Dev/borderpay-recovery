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

New business intake belongs to BorderPay KYB and the YC programme. Bridge registration is a separate, audited staff action when USD is requested; no automatic Bridge creation or KYB charge. An existing reviewed Bridge USD relationship can be retained through an explicit migration grant, without repeating onboarding. Bridge active does not mean YC approved, and vice versa. Bridge paused/rejected means its USD unavailable and its wallet hidden from the customer's active products, while an independently approved YC EUR product may operate. Preserve all Bridge balances, resource IDs, holds, recalls and recovery cases internally. Hiding a wallet does not extinguish a customer liability. Global legal/fraud restrictions continue to apply across providers.

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

Once the named-account programme is enabled, select the provider on the server from the requested currency: EUR to Yellow Card, USD to Bridge. A merchant request cannot override that choice. Keep the existing receiving-account interface; no automatic customer creation, provider fallback or GBP enablement.

If no production Bridge customer ID is bound to the authenticated merchant, stop before calling Bridge and return code `usd_account_setup_required` with this customer-facing message:

> To enable your USD account, please contact compliance@borderpayvelocity.xyz.

A Bridge ID alone is not eligibility. Staff USD authorization, current Bridge approval/controls and existing account/wallet-destination eligibility checks must still pass. EUR uses its own YC programme, merchant approval and internal-review gates; a Bridge pause does not disable independently approved EUR.

`yellowcard-account-request.ts` implements the internal currency selector and adapter dispatch with provider-neutral errors. The enabled app gateway must supply authenticated database context and existing idempotent provider adapters. The module is not a live endpoint; the existing gateway/ledger integration and provider-contract acceptance remain required. Tests confirm missing-ID requests call neither provider, wrong-merchant/sandbox bindings are rejected, pending results are preserved and provider failures cannot fall back.
