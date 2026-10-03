# Yellow Card full-product backend

Status: draft implementation and synthetic acceptance testing; **not deployed or approved for merchant cutover**.

See [Implementation audit](IMPLEMENTATION_AUDIT.md) for implemented components, unresolved integration work and the Monday acceptance sequence. [Public API review](PUBLIC_API_REVIEW.md) covers all 135 indexed public pages and 69 reference operations; source schemas and retrieval hashes are retained alongside it.

The code includes the selected operation catalog, guarded HMAC adapter, B2B payload builders, merchant/resource isolation schema, provisioning coordinator, authorized payment engine, encrypted durable webhook inbox, exact-vault identity callback, reconciliation and custody polling, receipt models and USD valuation. Feature flags default to disabled. The existing app and Bridge production routes are unchanged.

Production diagnostics previously used the existing egress relay and returned 403 for the six expanded-product reads. That result does not distinguish relay restrictions from YC entitlements. No provider network calls are part of the new acceptance suite.

Important release dependencies:

- Connect and test the existing payment-authorization, ledger and app-response adapters.
- Confirm merchant-specific VA sends, fiat/crypto funding paths, quote continuation and automatic fiat deposit attribution.
- Obtain business KYB/RFI submission and corporate travel-rule contracts from YC.
- Verify currencies, holding permissions, account naming, fees, refunds and all required payment lifecycles on the enabled account.
- Register callbacks, seed the full reconciliation inventory, schedule workers and prove recovery from missed notifications.

Vercel Git deployment is disabled for `feat/yellowcard-full-product-foundation`. The new GitHub workflow tests the migration only in an ephemeral PostgreSQL database. No production deployment workflow is invoked.

## Migration invariants

New business intake stays in BorderPay KYB. Existing active Bridge merchants continue using their current resources until an approved cutover. YC and Bridge relationships retain separate identifiers and statuses. Bridge residual balances are not spendable YC funds. Recovery requires operator authorization, applicable hold/recall checks and reconciliation; elapsed time alone never initiates a transfer.

Bridge retirement requires a complete residual inventory, zero remaining recoverable balances, no unresolved transfers/recalls, archived evidence and explicit operator approval. No code in this draft deletes Bridge credentials or changes existing customer status.
