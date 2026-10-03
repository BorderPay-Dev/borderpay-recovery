# Customer authorization implementation

Production customer API authorization is separate from partner API-key authentication. No partner receives customer login credentials, Supabase access tokens or refresh tokens.

## Flow
1. Operator registers exact HTTPS callback URLs for the approved API tenant.
2. Partner backend requests authorization with external_user_id, approved redirect_uri, state, S256 code_challenge and explicit scopes.
3. Customer visits the BorderPay hosted consent screen using existing sign-in and unlock controls. The authenticated business must already belong to that tenant with the same immutable external_user_id.
4. Customer sees partner name, destination origin and requested permissions and explicitly allows or denies access.
5. Redirect contains a single-use, two-minute authorization code and unchanged state. Partner exchanges it using the initiating API key, exact redirect_uri and PKCE verifier.
6. An opaque access token, bound to tenant, key, customer and consented scopes, expires after at most 15 minutes and never later than the underlying session. No refresh token is issued. Repeat hosted authorization to renew.
7. Existing financial access, identity, PIN/SCA and beneficiary checks remain authoritative. Authorization does not imply payment approval.

## Security
All state is service-role only with RLS and explicit grants. Customer session tokens are encrypted using a dedicated Vault secret; only hashes of codes and delegated access tokens are stored. Atomic SQL transitions prevent parallel code reuse. Revocation, key revocation, tenant suspension, expiry and scope reductions fail closed. Exact callback allowlists prohibit open redirects. Requests use POST, no-store responses and browser Origin checks. Consent never accepts an arbitrary user_id from the browser. Browser MFA is required if the account has verified MFA factors. No credentials in audit or webhook payloads.

## Correlation
`customer.linked` is a durable onboarding correlation event, not a KYB approval. It includes the API customer_id and partner external_user_id after both exist. A database outbox observes tenant membership and business identity binding in either order; retries are idempotent. No promise of approval or service activation is made by this event. Existing transfer status events remain unchanged.

## Deployment
Additive migration, isolated Edge endpoint, gateway changes, hosted consent page, regression tests and docs. Only register production callbacks after the partner supplies and BorderPay verifies the exact URL. Existing sandbox resources stay separate. Do not enable live financial calls for test customers or change live balances for acceptance testing.
