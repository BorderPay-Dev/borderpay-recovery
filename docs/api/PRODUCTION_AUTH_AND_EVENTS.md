# Production customer authorization and event contract

Updated September 30, 2026. Production activation requires an approved partner, enabled production access and a registered exact HTTPS callback URL. Sandbox success alone is not go-live approval.

## Customer access token

The partner API key authenticates your backend. The separate `X-BorderPay-Customer-Authorization: Bearer <access_token>` authorizes one business customer. Never collect the customer's BorderPay password or ask them to copy a browser token.

1. Register your exact HTTPS callback URL with BorderPay. Wildcards are not supported.
2. Generate a cryptographically random `state` and PKCE verifier (43–128 characters); calculate the base64url SHA-256 challenge without padding. Keep verifier and state on your server, bound to the initiating customer session.
3. Call `POST /v1/customer-authorizations` using your production API key:

```json
{
  "external_user_id": "your-customer-reference",
  "redirect_uri": "https://partner.example.com/borderpay/callback",
  "state": "unique-random-state-at-least-16-characters",
  "code_challenge_method": "S256",
  "code_challenge": "base64url-sha256-of-your-pkce-verifier",
  "scopes": ["customers:read", "wallets:read", "transfers:read"]
}
```

4. Redirect the customer to `data.authorization_url`. The customer signs in to BorderPay, completes applicable authentication and explicitly approves the named partner's permissions. Their business must already belong to your tenant with the same `external_user_id`; this flow cannot claim an unrelated business.
5. Your registered callback receives `code` and `state`, or `error=access_denied` and `state`. Validate state against the initiating customer session before exchanging the code.
6. From your backend, call `POST /v1/customer-authorizations/exchange` with the **same API key** and JSON `{ "code":"...", "code_verifier":"...", "redirect_uri":"https://partner.example.com/borderpay/callback" }`.
7. Read `data.access_token`, `token_type`, `expires_in`, `expires_at`, `scope` and `external_user_id`. Pass the token in `X-BorderPay-Customer-Authorization` alongside your partner API key for customer calls.

Authorization links expire after 30 minutes. Codes are single-use and expire after two minutes, or earlier if the authorization/session expires. Access tokens last at most 15 minutes and never outlive the customer's signed-in session. Tokens are bound to the initiating tenant, API key, customer and consented scopes. They do not bypass account restrictions or payment PIN/SCA requirements.

No refresh token is issued. Repeat hosted authorization when access expires. Revoke access with `POST /v1/customer-authorizations/revoke` and JSON `{ "token":"..." }`. Revocation returns success without disclosing whether a token belonging to another client exists. Revoking a key, suspending a tenant or removing permissions also blocks access.

Authorization creation/exchange/revocation use `onboarding:write`. Request only customer scopes your key already has; `*` and webhook administration are not delegable. Exchange is intentionally single-use: if a successful exchange response is lost, begin a new authorization. Do not put codes or tokens into application logs, analytics or webhooks.

These endpoints are production-only. Sandbox continues to use its isolated synthetic customers without live customer sessions.

## New customer ID and partner reference

Subscribe to **`customer.linked`** (or all events). Once hosted onboarding has both a tenant membership and an assigned customer ID, BorderPay queues a signed event:

```json
{
  "id": "event-uuid",
  "type": "customer.linked",
  "occurred_at": "2026-09-30T12:00:00Z",
  "data": {
    "customer_id": "customer-uuid",
    "external_user_id": "your-customer-reference",
    "account_type": "business",
    "status": "linked"
  }
}
```

Persist the association idempotently. This event means the customer is linked to your tenant; **it is not KYB approval, completed verification, or permission to activate financial services**. Signup alone may not yet have an assigned customer ID. Events wait until both IDs are present and consistent. The outbox normally runs every minute and retries delivery through the webhook queue. Monitor delivery failures and reconcile current status before enabling products.

Existing lifecycle events remain available after resource registration. Their payload uses `data.resource.id` and `data.status`; they are not substitutes for the correlation event. No login or delegated tokens are included in any webhook.

## External-account deletion

Send `DELETE /v1/external-accounts` with the JSON body `{ "customer_id":"...", "external_account_id":"..." }` and a BorderPay `Idempotency-Key`.

The sandbox adapter previously forwarded that header to an upstream DELETE endpoint which rejects it, causing `422 sandbox_request_rejected`. The adapter now retains idempotency at BorderPay and omits the unsupported upstream header. There is no need to remove the JSON body or stop using the BorderPay idempotency key. Other account-specific restrictions can still reject deletion; a rejected response never means the account was deleted.

## Payout and transfer lifecycle

A payout has a transfer ID. Creation acknowledgement, including `payout.created` or `transfer.created`, is not settlement. The current event forwarding preserves lifecycle event names such as `transfer.updated` and `transfer.updated.status_transitioned`; it does **not** guarantee a final `transfer.completed` or `transfer.failed` notification.

Inspect `data.resource.id` and `data.status`, reconcile against transfer reads and retain subsequent return/refund events. Do not infer financial completion from the webhook name alone. The sandbox read endpoint returns the upstream state. Existing production transfer reads can return normalized ledger states (for example `completed` or `failed`); webhook states may use the more detailed values below. This naming difference must be included in production acceptance.

| State | Meaning / handling |
| --- | --- |
| `awaiting_funds`, `in_review`, `funds_received`, `payment_submitted` | Pending; do not mark the payout complete. |
| `payment_processed` | Successful processing/delivery outcome. Continue monitoring later rail returns or refunds. |
| `returned` | Payment returned; refund/recovery is underway. This is **not** confirmation that the customer's balance has been restored. |
| `refund_in_flight` | Refund pending. |
| `refunded` | Refund completed; reconcile the refund destination and balance separately. |
| `canceled` | Transfer canceled before processing, where cancellation is supported. |
| `undeliverable`, `error`, `missing_return_policy`, `refund_failed` | Exception needing investigation/recovery. Do not treat these as a completed refund. |

`payment_processed`, `refunded` and `canceled` represent distinct outcomes, not interchangeable success/failure flags. Exception states can require further action and should not cause a fabricated refund or automatic balance credit.

Use signed webhooks, deduplicate by event ID and make balance reconciliation idempotent. Handle duplicate and out-of-order updates, and retain the original transfer and any return/refund references. Sandbox payouts that remain `in_review` do not prove a terminal payout lifecycle.
