import { evaluateBusinessEmail } from './business-email-policy.ts';
type Row = Record<string, unknown>;
export type OnboardingDenial = { status: number; code: string; error: string };
const restricted = new Set(['frozen','paused','rejected','disabled','suspended','closed','offboarded']);
const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();
export function businessOnboardingDenial(user: { email?: string; email_confirmed_at?: string | null; user_metadata?: unknown }, profile: Row | null, business: Row | null): OnboardingDenial | null {
  if (!profile || profile.account_type !== 'business') return {status:403,code:'business_onboarding_only',error:'BorderPay onboarding is available to business accounts only.'};
  if (profile.account_frozen_at || [profile.account_status,profile.bridge_account_status,business?.bridge_kyb_status].some(s=>restricted.has(norm(s)))) return {status:403,code:'account_restricted',error:'This account is restricted. Please contact support.'};
  if (!user.email_confirmed_at) return {status:403,code:'email_not_verified',error:'Please verify your email first.'};
  if (!norm(user.email) || norm(user.email)!==norm(profile.email)) return {status:409,code:'account_email_mismatch',error:'Your account details need review. Please contact support.'};
  if (!business || !String(business.company_name ?? '').trim()) return {status:400,code:'business_profile_required',error:'Please complete your company details before continuing verification.'};
  if (profile.bridge_customer_id && business.bridge_customer_id && profile.bridge_customer_id!==business.bridge_customer_id) return {status:409,code:'account_identity_mismatch',error:'Your account details need review. Please contact support.'};
  // Existing merchant identities retain their verification/resume path. The
  // stricter signup email policy applies before creating a NEW provider identity.
  if (!profile.bridge_customer_id && !business.bridge_customer_id && !evaluateBusinessEmail(profile.email).allowed) return {status:403,code:'business_email_required',error:'Use your company email address or inbox.eu. Disposable addresses and email aliases are not accepted.'};
  return null;
}
