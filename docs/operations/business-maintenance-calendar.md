# Business maintenance collection

Each invoice covers its calendar month, is due on that month's last day, and has seven full grace days. September 2026 is due September 30, grace ends October 7, and enforcement starts October 8 UTC. October is due October 31, with enforcement November 8. Future invoices cannot extend older debt.

The bounded calendar cycle runs every ten minutes and is controlled by `business_calendar_maintenance_enabled`. Before restricting access it checks tenant membership, team exemptions, verified business identity, business approval before period end and an eligible receiving account, separate account restrictions, the invoice's current status, and Flutterwave verification. Unknown/pending payment results never authorize deactivation. Required invoice generation must succeed first.

Provider actions recheck the outstanding debt and live customer status. Only maintenance-deactivated accounts are eligible for automatic reactivation; paying maintenance does not clear compliance holds. The Flutterwave webhook retains its signature, transaction verification, currency, amount and reference checks, then nudges access reconciliation. Scheduled processing retries failed provider calls.

A deactivation email is queued only after the provider confirms deactivation. It lists the actual currencies, includes the existing Invoice Hub PDF design, the verified merchant entity/address and current master USD receiving instructions. Bank transfers require support reconciliation; Flutterwave is automatic. Do not mark an invoice paid based on a receipt alone. Never use the Flutterwave completion RPC to fabricate a bank-transfer provider transaction.

The master bank instructions are fetched server-side, require one active USD account, and must belong to BorderPay Africa, Inc. Missing or ambiguous bank/buyer data blocks invoice generation. No master bank details or merchant data are committed to the repository. The invoice excludes registration numbers and regulatory identifiers.

Operational checks: review `subscription_external_invoices`, `subscription_provider_access_actions`, `subscription_email_jobs`, and `email_log`. An accepted email is not evidence of bank reactivation. Verify the provider status separately. Preserve exemptions and provider restriction reasons.

Validation: deterministic calendar/email safety tests, SQL payment-trigger tests inside a rolled-back transaction, existing Invoice Hub PDF regression tests, and rendered PDF inspection. The SQL regression script uses September/October 2026 fixtures and must only be run within a transaction that ends in ROLLBACK.

PDF rendering runs in the internal `maintenance-invoice-renderer` function, one invoice per request, to remain within the existing Edge CPU limit. The billing worker calls it before restriction and before attaching a PDF. Named-account beneficiary addresses are accepted only when the beneficiary name matches the verified company name (case, punctuation and accent normalization); bank branch addresses are never substituted.

Billing month is determined by business approval, not signup or VA creation/sync time. A September-approved business with its receiving account created in October remains eligible for the September invoice. October-approved businesses are not eligible for September. This does not remove provider-compliance holds, team/partner exclusions or payment-verification checks.
