## 1.0.2 — Business-only partner onboarding
- Business accounts only for API and white-label onboarding; legacy personal-account flags cannot enable signup.
- Public payment requests use `borderpay_wallet` and `wallet_id`.
- Sandbox customer operations require explicit test-environment enablement.

# BorderPay API Changelog

## v1.0.1 - 2026-07-06

- Synced OpenAPI to gateway-enforced v1 routes.
- Standardized error-code surface:
  - `idempotency_key_required`
  - `idempotency_replay_mismatch`
  - `provider_unavailable`
  - `provider_error`
- Added partner artifacts:
  - Postman collection
  - curl cookbook
  - TypeScript SDK starter + webhook verifier helper
- Added CI contract gate for API pack consistency.

## v1.0.0 - 2026-07-06

- Initial frozen v1 contract established.
- Idempotency policy baseline documented.
