// Existing synthetic access and an explicit server-controlled new-business route.
// Existing provider customers never enter the new onboarding route.
const KYB_ORIGIN = 'https://kyb.borderpayvelocity.xyz';
export async function kybPortalHandoff(user: { app_metadata?: Record<string, unknown> }, token: string, transport: typeof fetch = fetch, newBusinessEnabled = false): Promise<Record<string, unknown> | null> {
  if (user.app_metadata?.kyb_synthetic_test !== true && !newBusinessEnabled) return null;
  const unavailable = { success: false, code: 'verification_link_unavailable', error: 'We could not open your verification. Please try again shortly.' };
  try {
    const response = await transport(KYB_ORIGIN + '/api/launch', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: '{}',
    });
    if (!response.ok) return unavailable;
    const link = await response.json();
    const url = new URL(link.url);
    if (url.origin !== KYB_ORIGIN || url.pathname !== '/' || url.search || url.username || url.password || !/^#launch=[A-Za-z0-9_-]+$/.test(url.hash)) return unavailable;
    if (!Number.isFinite(Date.parse(link.expiresAt)) || Date.parse(link.expiresAt) <= Date.now()) return unavailable;
    return { success: true, data: { link_url: url.toString(), expires_at: link.expiresAt, tos_link_url: null, tos_required: false, verification_mode: newBusinessEnabled ? 'borderpay' : 'synthetic' } };
  } catch { return unavailable; }
}

export function newBusinessKybEligible(profile: Record<string, unknown> | null): boolean {
 return !!profile && profile.account_type === 'business' && profile.account_status === 'pending_kyc'
  && !String(profile.bridge_customer_id || '').trim()
  && !['active','approved','paused','frozen','offboarded','closed','suspended','deactivated'].includes(String(profile.bridge_account_status || '').trim().toLowerCase());
}
export async function newBusinessKybEnabled(supa: {from: (table: string) => any}): Promise<boolean> {
 const {data,error}=await supa.from('app_config').select('value').eq('key','kyb_portal_onboarding').maybeSingle();
 return !error && data?.value?.enabled === true && data?.value?.new_business_only === true;
}
