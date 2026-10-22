// Presentation only. Authoritative profile and provider holds are never changed.
// Released clients select their existing balance-only workspace from these fields.
export function pausedBusinessReviewProjection(allowed: boolean): Record<string, unknown> {
 if (!allowed) return {};
 return {
  account_status: 'pending_kyc', account_frozen_at: null, account_frozen_reason: null,
  bridge_account_status: 'paused', bridge_provider_account_status: 'paused',
  kyc_status: 'under_review', bridge_kyb_status: 'under_review',
  verification_status: 'under_review', verification_source: 'borderpay',
  account_access_restricted: true, financial_actions_enabled: false,
  financial_account_status: 'frozen', account_view_mode: 'review_only',
 };
}
