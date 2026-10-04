// UI compatibility fields only. Database financial holds and provider IDs stay authoritative.
export function migrationProfileProjection(value: unknown): Record<string, unknown> {
 const m=value as Record<string,unknown>|null;
 if(m?.eligible!==true||!['paused','rejected'].includes(String(m.providerStatus))||!['not_started','incomplete','under_review','rejected'].includes(String(m.status)))return {};
 return {
  account_status:'pending_kyc',account_frozen_at:null,account_frozen_reason:null,
  bridge_account_status:m.status,
  // Provider history is operator-only; released clients receive KYB presentation fields.
  bridge_provider_account_status:null,bridge_provider_kyb_status:null,
  bridge_kyc_status:null,bridge_account_paused_at:null,
  bridge_kyb_status:m.status,verification_status:m.status,verification_source:'borderpay',
  kyc_status:m.status==='under_review'?'under_review':'unverified',
  account_access_restricted:true,financial_actions_enabled:false,
  financial_account_status:'unavailable',
  account_view_mode:'kyb_migration',
 };
}
