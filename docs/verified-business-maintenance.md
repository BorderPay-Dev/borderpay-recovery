# Verified business maintenance

Verified direct businesses do not require an active VA to receive a maintenance invoice. Demo, administrative, partner-managed, paused/frozen and unverified accounts retain their exclusions. Manual subscription cancellations are not reversed. Only automated no-VA cancellations are restored.

An approval trigger queues a reference for the approval month. The existing five-minute worker prepares missing invoices for the latest closed month and creates Flutterwave hosted payment links. On October 1 this backfills September, not October. Each calendar month has one invoice per subscription. The trigger and worker never record payment, debit a wallet or change provider account status. Already-paid invoices are preserved, independently of mutable subscription next-billing dates.

The operator mode `references` only prepares invoices and hosted links. Do not use `drain` for this backfill: it also processes other billing/access actions. Email jobs stay pending when the observed daily allowance is exhausted or cannot be established. Preparation and email delivery are separate.

Synthetic PostgreSQL acceptance covers approved businesses without VAs, newly approved businesses, previous-month eligibility, duplicate runs, paid invoices, prior-period payments, cancelled no-VA invoice restoration, manual cancellations, demo/partner/frozen exclusions, service-role authorization and absence of payment records. Separate mocked tests cover delayed provider email usage and failures. Production rollout must compare the live worker baseline and migration function definition before deployment; never deploy stale main or modify wallet/transaction records.
