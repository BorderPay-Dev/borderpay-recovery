# BorderPay business API sandbox

Base URL: `https://sandbox.api.borderpayafrica.com/v1`.
Use `Authorization: Bearer <your sandbox API key>`, `X-BorderPay-Mode: sandbox`, and `Content-Type: application/json`. Every POST and DELETE below requires a unique `Idempotency-Key` of 8–64 printable ASCII characters. Reuse the same key and body when retrying an uncertain response. Sandbox access must be enabled for your tenant.

## What is different from production?

Only fictional businesses are permitted. Test resources are isolated from real customers, bank accounts, funds and accounting. Sandbox calls authenticate the partner key and check that every customer, wallet and destination belongs to that tenant. They do not require a real customer's login session. Production customer calls additionally require `X-BorderPay-Customer-Authorization: Bearer <customer access token>` and the customer's immutable tenant membership, verification, account-access and payment-authorization controls.

Sandbox onboarding is API-based. It does not open the live signup application or a hosted verification link. Test approval is not a compliance decision. Do not send real identity documents, personal information or money to sandbox instructions. Sandbox validation does not prove production availability, settlement, pricing or compliance approval.

## Test sequence

1. `POST /onboarding-authorizations` (`onboarding:write`):
   `{"external_user_id":"synthetic-company-001","onboarding_channel":"api","requested_account_types":["business"]}`
   Save `data.onboarding_token`. It expires in one hour. `signup_url` is null in sandbox.
2. `POST /customers` (`customers:write`):
```json
{
  "onboarding_token": "<token from step 1>",
  "synthetic_data": true,
  "account_type": "business",
  "business_legal_name": "Sandbox Integration LLC",
  "business_type": "llc",
  "email": "sandbox-business@example.com",
  "registered_address": {
    "street_line_1": "123 Sandbox Street",
    "city": "San Francisco",
    "subdivision": "CA",
    "postal_code": "94105",
    "country": "USA"
  }
}
```
Only `example.com`, `example.org` and `example.net` email domains are accepted for synthetic records. Save `data.customer_id` and include it in subsequent customer operations.

3. `POST /sandbox/approve-customer` (`customers:write`): `{"customer_id":"<id>"}`. Read `GET /customers?customer_id=<id>` until active/approved.
4. `POST /wallets` (`wallets:write`): `{"customer_id":"<id>","symbol":"USDC","chain":"BASE"}`. Save `data.wallet_id`. BASE supports USDC/EURC and TRON supports USDT, subject to sandbox capability.
5. `POST /virtual-accounts` (`virtual_accounts:write`): `{"customer_id":"<id>","currency":"USD"}`. BorderPay selects a BASE settlement wallet. USD, EUR and GBP are accepted request currencies; availability depends on the customer's sandbox entitlements. A successful USD test does not establish EUR/GBP availability.
6. `POST /sandbox/deposits` (`wallets:write`): `{"customer_id":"<id>","wallet_id":"<wallet>","amount":"100.00","currency":"USDC"}`. This simulates wallet funding, not a real fiat deposit. Read `GET /balances?customer_id=<id>` to confirm the result.
7. Add a synthetic business bank destination using `POST /external-accounts` (`external_accounts:write`):
```json
{
  "customer_id": "<id>",
  "account": {
    "account_type": "us",
    "account_owner_type": "business",
    "business_name": "Sandbox Integration LLC",
    "account_owner_name": "Sandbox Integration LLC",
    "bank_name": "Sandbox Bank",
    "currency": "usd",
    "account": {"routing_number":"021000021","account_number":"123456789","checking_or_savings":"checking"},
    "address": {"street_line_1":"123 Sandbox Street","city":"San Francisco","subdivision":"CA","postal_code":"94105","country":"USA"}
  }
}
```
These are synthetic test details. US, IBAN and GB account types use their corresponding account fields. `GET /external-accounts?customer_id=<id>` returns destinations. `DELETE /external-accounts` accepts customer_id and external_account_id. Registration is not a guarantee of payout eligibility; inspect returned status and errors. Production beneficiary changes may require `POST /beneficiary-authorizations` before creating or deleting a destination, according to customer authorization requirements. Partners cannot self-approve a restricted destination.

8. `POST /payouts` or `/transfers` (`payouts:write` or `transfers:write`):
```json
{
  "customer_id": "<id>",
  "source": {"payment_rail":"borderpay_wallet","wallet_id":"<wallet>","currency":"USDC","amount":"1.00"},
  "destination": {"payment_rail":"ach","currency":"USD","external_account_id":"<saved destination>"}
}
```
Sandbox transfers support saved business bank destinations or same-customer wallets. Arbitrary external blockchain-address payouts are not enabled by this sandbox adapter. An accepted response with state `in_review` is not a completed payout. Read `GET /transfers?customer_id=<id>&transfer_id=<id>` for status. There are no real financial settlements.

## Webhook verification

The delivered header is `X-BorderPay-Signature: v1=<lowercase hex HMAC-SHA256>`.
`X-BorderPay-Timestamp` is a Unix timestamp in seconds, freshly generated on each delivery attempt.
Sign the UTF-8 bytes of `<timestamp>.<raw request body>` using the **entire signing secret as returned**, including its prefix. Do not base64-decode the secret, parse/reserialize the body, or include HTTP headers in the signed content.

Use a constant-time comparison and reject timestamps more than **300 seconds** in the past or future. Deduplicate processing by the JSON `id` / `X-BorderPay-Event-Id`, not by signature or timestamp. Retries may have different timestamps and signatures. The SDK now accepts the actual `v1=` prefix; the older `sha256=` verifier input remains backward compatible.

## Deposit events and test delivery

VA lifecycle notifications use `virtual_account.activity.created` (and activity updates may use `virtual_account.activity.updated`). Receipt is not settlement: `funds_received` indicates receipt, while `payment_processed` indicates completed processing.

Upstream payment webhooks are not automatically generated in the sandbox. Trigger an explicitly simulated notification with `POST /sandbox/webhook-events` (`webhooks:write`):
`{"customer_id":"<id>","virtual_account_id":"<VA>","amount":"100.00","status":"funds_received"}`.
This queues a signed notification to your registered tenant webhook. It does **not** change a wallet balance. Supported test statuses: funds_received, payment_processed, in_review, refunded. Never credit a real balance from a simulated event.

Example test envelope (synthetic IDs):
```json
{
  "id": "00000000-0000-4000-8000-000000000010",
  "type": "virtual_account.activity.created",
  "occurred_at": "2026-09-30T10:00:00Z",
  "data": {
    "mode": "sandbox",
    "simulated": true,
    "resource": {"id":"00000000-0000-4000-8000-000000000020","type":"virtual_account"},
    "customer_id": "00000000-0000-4000-8000-000000000030",
    "deposit_id": "test_example_deposit",
    "status": "funds_received",
    "amount": "100.00",
    "currency": "USD"
  }
}
```
This is the sandbox test envelope. Production event-field coverage must be validated separately before go-live; do not assume every optional test field is populated by production events.

## Current validation, September 30, 2026

Synthetic customer creation, test approval, BASE wallet creation, simulated USDC funding, USD virtual account creation, US business external-account creation and ACH payout submission were exercised against the sandbox. Payout submission returned `in_review`, not completed.
EUR virtual-account creation returned a name/address validation error. GBP virtual-account creation passed after explicitly requesting its sandbox entitlement for a synthetic GB business. EUR must not be represented as tested or ready until successful retesting. Production onboarding and payment authorization remain separate go-live checks.

## Before production

See [production customer authorization and event semantics](PRODUCTION_AUTH_AND_EVENTS.md). A secure customer-token handoff and automatic external-reference correlation still need implementation. Do not assume payouts always end with transfer.completed or transfer.failed.
