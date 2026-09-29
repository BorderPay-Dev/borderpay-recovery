# BorderPay API v1 Curl Cookbook

Business accounts only, for API and white-label onboarding. Owners and directors are verified within business KYB; they do not open personal accounts.

## 0) Environment
```bash
export GATEWAY_URL="https://sandbox.api.borderpayafrica.com"
export API_KEY="<BorderPay_partner_test_key>"
export MODE="sandbox"
export CUSTOMER_ACCESS_TOKEN="<authenticated_business_customer_session>"
```
BorderPay must enable your tenant's sandbox customer operations before onboarding or payment tests. A successful health check is not payment-sandbox approval. Use synthetic data only. Never use production credentials as a fallback.

## 1) Gateway health
```bash
curl -s "$GATEWAY_URL" \
  -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "x-borderpay-route: /v1/health" \
  -H "x-borderpay-mode: $MODE" \
  -d '{
  "method": "GET"
}'
```

## Business signup authorization
```bash
curl -s "$GATEWAY_URL" \
  -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "x-borderpay-route: /v1/onboarding-authorizations" \
  -H "x-borderpay-mode: $MODE" \
  -H "Idempotency-Key: business-signup-001" \
  -d '{
  "external_user_id": "synthetic-business-001",
  "onboarding_channel": "api",
  "requested_account_types": [
    "business"
  ]
}'
```

Complete hosted business signup with that authorization, then authenticate the business user. Their session must belong to your partner tenant. Complete business KYB, including the relevant directors, owners and control persons. Financial services remain subject to approval.

## 2) Create customer
```bash
curl -s "$GATEWAY_URL" \
  -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "x-borderpay-route: /v1/customers" \
  -H "x-borderpay-mode: $MODE" \
  -H "X-BorderPay-Customer-Authorization: Bearer $CUSTOMER_ACCESS_TOKEN" \
  -H "Idempotency-Key: customer-verify-001" \
  -d '{
  "account_type": "business"
}'
```

This resumes the authenticated business verification; it does not accept arbitrary identity data or create an unrelated account.

## 3) Create wallet
```bash
curl -s "$GATEWAY_URL" \
  -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "x-borderpay-route: /v1/wallets" \
  -H "x-borderpay-mode: $MODE" \
  -H "X-BorderPay-Customer-Authorization: Bearer $CUSTOMER_ACCESS_TOKEN" \
  -H "Idempotency-Key: wallet-001" \
  -d '{
  "symbol": "USDC",
  "chain": "BASE"
}'
```

## 4) Create virtual account
```bash
curl -s "$GATEWAY_URL" \
  -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "x-borderpay-route: /v1/virtual-accounts" \
  -H "x-borderpay-mode: $MODE" \
  -H "X-BorderPay-Customer-Authorization: Bearer $CUSTOMER_ACCESS_TOKEN" \
  -H "Idempotency-Key: virtual-account-001" \
  -d '{
  "currency": "USD"
}'
```

Do not supply a settlement destination: BorderPay selects it using the approved business region and account policy.

## 5) Create transfer
```bash
curl -s "$GATEWAY_URL" \
  -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "x-borderpay-route: /v1/transfers" \
  -H "x-borderpay-mode: $MODE" \
  -H "X-BorderPay-Customer-Authorization: Bearer $CUSTOMER_ACCESS_TOKEN" \
  -H "Idempotency-Key: payment-001" \
  -d '{
  "source": {
    "payment_rail": "borderpay_wallet",
    "currency": "USDC",
    "amount": "10.00",
    "wallet_id": "<business_wallet_id>"
  },
  "destination": {
    "payment_rail": "base",
    "currency": "USDC",
    "external_wallet_id": "<saved_external_wallet_id>",
    "address": "<saved_wallet_address>"
  },
  "transaction_pin": "<business_customer_transaction_pin>"
}'
```

## 6) Create payout
```bash
curl -s "$GATEWAY_URL" \
  -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "x-borderpay-route: /v1/payouts" \
  -H "x-borderpay-mode: $MODE" \
  -H "X-BorderPay-Customer-Authorization: Bearer $CUSTOMER_ACCESS_TOKEN" \
  -H "Idempotency-Key: payout-001" \
  -d '{
  "source": {
    "payment_rail": "borderpay_wallet",
    "currency": "USDC",
    "amount": "10.00",
    "wallet_id": "<business_wallet_id>"
  },
  "destination": {
    "payment_rail": "ach",
    "currency": "USD",
    "external_account_id": "<saved_external_account_id>"
  },
  "transaction_pin": "<business_customer_transaction_pin>"
}'
```

The examples show non-EEA transaction PIN authorization. For EEA business payouts, first authorize the exact payment through `/v1/payment-authorizations` with PIN and TOTP; use the returned `sca_authorization_id` and the same payment Idempotency-Key. See the [integration guide](../PARTNER_INTEGRATION.md). Never invent a biometric or SCA confirmation.

## 7) Register webhook endpoint
```bash
curl -s "$GATEWAY_URL" \
  -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "x-borderpay-route: /v1/webhooks" \
  -H "x-borderpay-mode: $MODE" \
  -H "Idempotency-Key: webhook-001" \
  -d '{
  "endpoint_url": "https://example.com/borderpay/webhooks"
}'
```

## 8) Tenant access
Request partner product approval from BorderPay. Tenant administration is not a public customer API.

## 9) API credentials
Issue scoped credentials from your approved partner workspace. Keep keys on your server and configure your permitted egress IPs.

## 10) Idempotency replay check
```bash
curl -s "$GATEWAY_URL" \
  -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "x-borderpay-route: /v1/webhooks" \
  -H "x-borderpay-mode: $MODE" \
  -H "Idempotency-Key: webhook-replay-001" \
  -d '{
  "endpoint_url": "https://example.com/borderpay/webhooks"
}'
```

Repeat the exact request with the same key to test a replay; use synthetic sandbox resources. For payments, never generate a new key merely because a response timed out.

## 11) Idempotency mismatch check
Changing the payload while reusing a completed operation key must be rejected. Do not test mismatch behavior with real funds.
