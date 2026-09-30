# Production customer authorization and event contract

Status: September 30, 2026. Sandbox success does not complete production acceptance.

## Customer access token

`X-BorderPay-Customer-Authorization: Bearer <customer access token>` currently requires the authenticated business customer's BorderPay session. It is **not** the partner API key, onboarding_token, a user ID or an operator session. The customer must belong to the same tenant as the partner key.

The hosted BorderPay application obtains this session when the customer signs in, after the applicable authentication checks. However, the current partner v1 release does **not** implement a secure authorization-code callback/exchange that transfers delegated customer authorization to the partner server after hosted onboarding. A browser session at BorderPay is not automatically available to the partner's site.

**This is a production integration blocker.** Do not ask customers to copy browser tokens, collect their BorderPay password, expose partner keys in the browser or use an administrator session. The secure delegated handoff, approved callback URL, consent, token expiry/refresh/revocation and tenant binding must be implemented and accepted before go-live. No production token-exchange URL is published because one is not currently available.

## New customer ID and partner reference

Hosted signup stores `external_user_id` in the tenant membership and records internal signup audit events. The internal `signup_completed` audit record is **not** an outbound partner webhook.

The current partner event projector only emits customer lifecycle notifications once the customer resource has been registered to the tenant. These use `customer.created`, `customer.updated` or `customer.updated.status_transitioned`, with `data.resource.id` for the customer resource ID and `data.status` when present. It does not currently include `external_user_id` and does not guarantee an automatic onboarding-completion notification.

A guaranteed onboarding-completion event containing both the customer ID and the partner's external reference remains required before production integration is complete. Do not build a correlation workflow around an event that is not yet implemented.

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
