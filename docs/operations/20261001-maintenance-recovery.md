# September 2026 maintenance recovery — production validation

Deployed runtime commit: 0fd60e2073972d449dc066fe0ccff55a486fdb05.
Deployment workflow: https://github.com/BorderPay-Dev/borderpay-recovery/actions/runs/36895968441
Function: subscription-billing-worker, version 141. Temporary deployment secret removed.

PostgreSQL synthetic acceptance, email capacity tests, Deno typecheck, Security Pipeline, Safety Boundary Guard and Predeploy Gate passed before rollout.

Live September recovery: 39 currently eligible accounts, including the internal treasury. One of those is paid; another September payer is currently frozen and excluded from new billing. Both September payments of $29.99 remain unchanged. There are 37 unpaid external merchant accounts and one existing unpaid internal treasury account. Frozen/paused exemptions are unchanged, pending operator policy clarification. These counts are a point-in-time audit, not hardcoded limits.

Six missing invoices were created and four automatic no-VA cancellations restored. All ten have hosted Flutterwave payment links. The scheduled five-minute worker performed recovery; a subsequent references-only run created zero duplicates. October invoice count stayed unchanged at 29. No wallet deduction, payment completion or provider account change was performed.

Four previously suppressed, unsent invoice email jobs were restored using the accompanying narrowly scoped SQL. Ten recovery notices remain pending for available email quota. The current day's allowance was exhausted, so this recovery did not initiate a campaign send.

The existing admin business-subscription card counts active subscriptions across periods; it is not September outstanding debt. Its database-backed count after recovery is 43. September outstanding balances must be taken from September invoice statuses, not this card.
