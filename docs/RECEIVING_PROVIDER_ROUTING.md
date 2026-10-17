# Receiving provider routing preparation

Status: draft integration components; not wired into production.

New business receiving requests use USD -> Rain, EUR -> Yellow Card. GBP
receiving is unavailable. This policy does not disable GBP payouts.
No provider failure may fall back to Bridge. Legacy Bridge balances, webhook
processing, refunds and operator recovery remain separate until reconciled.

## Audit

The mobile app calls `bridge-virtual-account` directly. Keep this URL as a
compatibility facade when connecting the new dispatcher; no new mobile build
is needed for request dispatch. Capabilities responses must exclude GBP.
The current outer guard uses both local and Bridge account status. The new
path must use local fraud/account restrictions and the selected provider's
eligibility, rather than treating Bridge status as Rain or Yellow Card status.

Live source inspected: `bridge-virtual-account` v392 and `yellowcard-receive`
v95. The latter creates collection transactions, not named EUR receiving
accounts; it must not be used as a substitute for a named-account adapter.
No Rain function was deployed and no Rain-named Vault secret was present at
audit time. No production state was changed during this preparation.

## Components

- `receiving-routing.ts`: currency dispatch, account/security/maintenance
  gates, independent provider eligibility, capability response shape.
- `rain-receiving.ts`: corporate USD ACH payment route to USDC Base, explicit
  customer fee, pinned API origin, fixed operation UUID and no automatic
  retry or fallback on uncertain outcomes.
- `receiving-routing.test.ts`: synthetic tests; no credentials or network.

These are dependency-injected building blocks, not a deployed edge function.
The Rain HTTP result deliberately remains unknown until the persistence and
response validation layer below is implemented. Do not expose it directly.

## Work required before cutover

1. Obtain Rain API access, sender-fee enablement and approved compliance model.
   Read credentials server-side from Vault; isolate environments explicitly.
2. Implement provider company mappings and confirm merchant ownership from
   authenticated backend records. Never accept provider IDs, eligibility or
   destination ownership from the browser. Never substitute the master wallet.
3. Obtain the Yellow Card named EUR account API contract and credentials;
   implement its adapter separately from collection and payout endpoints.
4. Persist idempotent operations before provider calls. Serialize provisioning
   per merchant/currency; preserve exact request and key after timeouts. Reconcile
   before any retry outside the documented idempotency window.
5. Validate Rain response company, source currency, destination and route ID.
   Normalize `depositAddresses`, beneficiary name, rails and active/pending state
   into the existing app account shape. Never manufacture missing bank details.
6. Implement authenticated signed webhook inboxes, durable processing,
   replay protection, out-of-order reconciliation, customer notifications and
   ledger accounting. Keep provider fee cost separate from customer fee revenue.
7. Wire the compatibility facade through the existing invoice instruction,
   access, subscription and security gates. Audit list/sync functions and API
   gateway separately so no alternate creation path bypasses currency routing.
8. Test the full lifecycle with authorized provider test access: approval,
   provision, duplicate request, deposit, review, settlement, refund, fees,
   cross-tenant denial and legacy Bridge visibility. Review existing GBP account
   treatment before changing their visibility or closing anything.
9. Enable the verified adapters only after operational and commercial readiness;
   do not deploy this draft as a substitute for completed integration.

## Official references reviewed

- https://docs.rain.xyz/docs/onramps
- https://docs.rain.xyz/reference/paymentroutes/create-a-payment-route
- https://docs.rain.xyz/docs/virtual-accounts
- https://docs.rain.xyz/docs/sender-fees
- https://docs.rain.xyz/docs/payments-compliance
- https://docs.rain.xyz/docs/who-verifies-what
- https://docs.rain.xyz/docs/set-up-webhooks
- https://docs.rain.xyz/docs/webhook-delivery
- https://docs.rain.xyz/reference/idempotency

Rain's onramp converts fiat to stablecoins; it does not establish a held USD
fiat balance. Provider approval, account naming and destination-wallet support
must be confirmed for the contracted program. Documentation access is not API
access. Commercial pricing and documentation passcodes are not stored here.
