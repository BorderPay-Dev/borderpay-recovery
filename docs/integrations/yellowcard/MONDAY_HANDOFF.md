# Yellow Card enablement handoff

> Superseded scope, 5 October 2026: YC confirmed one BorderPay-owned third-party collection account, not merchant-specific named accounts. Read [SHARED_ACCOUNT_MIGRATION.md](SHARED_ACCOUNT_MIGRATION.md) for the current plan. The dedicated-merchant account/fiat-wallet items below remain uncontracted future capabilities and must not be enabled for this proposal. The original list is retained as audit history.

Prepared 3 October 2026 for the 5 October discussion. Internal engineering document; no customer data.

## Confirm with YC

| Topic | Specific confirmation/evidence required |
| --- | --- |
| Underlying merchants | BorderPay may provision dedicated named accounts and custody vaults for its business merchants; eligibility, permitted account-holder name and holding policies per currency. |
| Holdable fiat | Enabled USD/EUR/GBP/NGN/KES/etc. custom wallet currency list. Distinguish spendable balances from payout-only corridors. |
| Merchant VA payout | Correct endpoint for `/business/payments` versus `/business/send`; a successful merchant-bound `walletId` example for each rail and its source debit currency. |
| Fiat to crypto | Exact source selector for a merchant's custom fiat wallet. Current `fiatWallet` currency-only schema must not imply using BorderPay's shared treasury. |
| Crypto to bank | Supported direct endpoint or confirmed multi-leg path, including ownership of intermediate funds, atomicity, fees and refund handling. |
| Deposits | One complete automatic VA deposit response/event showing stable merchant VA/sub-wallet linkage, fee fields and final ledger credit. |
| Institutional KYC | Business and representative fields, DOB format, country-specific identifiers and full KYB/UBO/document API or approved secure delivery process. |
| Travel rule | Corporate originator/controller mapping for the firstname/lastname callback, required external beneficiary data and supported networks. |
| RFI | Private case API and webhooks if available; evidence upload/response, acknowledgement, deadlines, restricted resource scope and escalation process. |
| RFQ / OTC | Merchant wallet selectors, minimum/maximum, pair list, fees, availability hours, quote expiry, settlement and rejection lifecycle. |
| Return/recall | USD/EUR/GBP returns and failed payout refunds; distinguish this from the published Nigerian P2P refund feature. |
| Operations | Production relay path allowlist, signing details for PATCH if needed, notification retry behavior, rate limits, idempotency guarantees and API request IDs. |

## Required secrets and configuration — do not paste values into GitHub

Use the existing Supabase Vault and current production credentials. The new resolver accepts `YC_PRODUCTION_API_KEY`, `YC_PRODUCTION_SECRET_KEY`, `YC_EGRESS_RELAY_URL`, `YC_EGRESS_RELAY_TOKEN`, `YC_FULL_EVIDENCE_KEY_V1`, optional `YC_FULL_EVIDENCE_KEY_V2` and `YC_WEBHOOK_PREVIOUS_SECRET`. The evidence keys are independently generated 32-byte AES keys, base64 encoded. Keep older key versions until retained evidence has been re-encrypted or expired according to policy.

`yc_runtime_settings` is disabled by default. Record verified currencies and crypto tokens, allowed operations, written contract confirmations and the approval reference. Enabling runtime reads, permitting writes and approving each merchant's cutover are separate controls. Do not enable all operations just because a key is valid.

Webhook registration, callback upsert, migration, ledger wiring and scheduling require separate review. Callback registration can replace a partner-wide endpoint. None is performed by CI.

## Release evidence required

- Existing app's exact PIN/biometric/SCA authorization and preview contracts connected to the new engine.
- Correct merchant-level named VA, fiat wallet and crypto vault ownership; reject cross-merchant/partner/environment access.
- Fiat deposit linked to the correct merchant, fee recorded once, available balance matched to provider.
- Custody deposit and send, each bank payout rail, permitted conversions, RFQ expiry/acceptance and all failure paths.
- Balance and ledger/receipt reconciliation after duplicate, delayed, out-of-order and missing notifications.
- Seeded full-history reconciliation, alerting, authorization expiry, timeout recovery and operational access controls.
- Small approved migration pilot; Bridge funds and recovery cases preserved separately.

The draft is not deployed. The new SQL is tested only in ephemeral CI. Provider acceptance remains a release dependency.
