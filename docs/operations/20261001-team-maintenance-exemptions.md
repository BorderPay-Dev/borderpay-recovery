# Internal team maintenance exclusions — applied October 1, 2026

Applied migration from commit 961e61f906d4cd7e77c008d17f5f078b299709f4 after PostgreSQL acceptance, Predeploy Gate, Security Pipeline and Safety Boundary Guard passed. The initial user_profiles foreign-key proposal rolled back; the applied version references the authoritative auth.users primary key.

Two authorized team accounts are now exempt by immutable user ID. Treasury master and production testing accounts remain active, with no billing restriction. Two unpaid treasury invoices (September and October, $29.99 each) were cancelled. The testing account's historical $5 paid invoice remains recorded; no refund or wallet movement was performed.

September commercial receivables: 37 unpaid merchants, $1,109.63 total. Both existing September merchant payments remain paid ($59.98). One ready invoice notice is queued per unpaid merchant: ten existing jobs reused, 27 new idempotent jobs queued. No pending maintenance notice remains for either exempt account. The accompanying SQL records the authorized reminder request and excludes paid, banned, partner-managed, frozen and team accounts through the current policy and explicit filters.

No new messages were sent during this action: observed daily email usage was above the configured 300-message ceiling, leaving zero safe capacity. The existing five-minute worker will send pending notices when allowance becomes available, subject to its 30-message batch limit and transactional reserve. No mobile build or Vercel deployment is required.
