# GBP external accounts and fiat payout audit — 2026-10-06

The supplied email did not exactly match an account; no customer identity was changed.
Production logs showed nine USDT-to-EUR/GBP requests rejected on `developer_fee`.
Bridge's published route matrix does not support these pairs. The fee was not removed
or waived: unsupported routes now return actionable validation before provider calls.

GBP account creation forwarded hyphenated sort codes and derived retry keys from only
the last four account digits. The fix normalizes separators, validates six/eight digits,
preserves leading zeros, and hashes the full normalized provider request for retry identity.
A specific merchant's original bank form payload was unavailable; these account issues
were reproduced with synthetic data, not attributed to their exact attempted input.

## Sources
- https://apidocs.bridge.xyz/get-started/introduction/what-we-support/payment-routes
- https://apidocs.bridge.xyz/api-reference/external-accounts/create-a-new-external-account
- https://apidocs.bridge.xyz/api-reference/transfers/create-a-transfer

## Deployment isolation
Baseline external-account v351 and transfer v457 downloaded from production; shared
provider modules differed, so each complete graph is preserved under its own entrypoint.
Only these two functions are changed. No database migration, fee change, UI change,
customer payment, account creation or balance mutation was executed as part of testing.
A temporary service-only diagnostic was removed after its authorization check rejected
requests; no provider dry-run result is claimed.

## Validation
Run `node --experimental-vm-modules tests/gbp-payout-regression.mjs` (Node 22.23+).
Tests exercise actual handlers with synthetic authentication/database/provider transports,
plus the real provider serializer with mocked HTTP. Cover unsupported pairs, valid routes,
SCA denial, frozen/unauthenticated access, formatting, leading zeros and key collisions.
Live financial settlement is not claimed tested. A customer-authorized retry is still
needed to confirm their particular bank account acceptance by the provider.
