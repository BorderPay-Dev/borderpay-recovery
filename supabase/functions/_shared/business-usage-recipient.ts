// Account-service notice policy; never grants product or payment access.
export function usageNoticeAudience(profile: any, business: any): "active" | "paused" | null {
  if (!profile || !business || profile.account_type !== "business" || profile.is_demo || profile.is_admin) return null;
  if (["offboarded","closed","deleted","suspended"].includes(profile.account_status)) return null;
  if (["active","paused","frozen"].includes(profile.account_status) && profile.bridge_account_status === "paused") return "paused";
  if (profile.account_status === "paused") return "paused";
  if (profile.account_status === "active" && profile.kyc_status === "verified"
      && ["approved","verified"].includes(business.bridge_kyb_status)
      && ["active","approved","deposits_restricted"].includes(profile.bridge_account_status)) return "active";
  return null;
}
export async function resolveUsageNoticeRecipient(db: any, job: any, now = Date.now()) {
  const [profile, business, exemption, auth] = await Promise.all([
    db.from("user_profiles").select("id,email,account_type,account_status,kyc_status,bridge_account_status,is_demo,is_admin").eq("id",job.user_id).maybeSingle(),
    db.from("business_profiles").select("company_name,bridge_kyb_status").eq("user_id",job.user_id).maybeSingle(),
    db.from("maintenance_billing_exemptions").select("user_id").eq("user_id",job.user_id).maybeSingle(),
    db.auth.admin.getUserById(job.user_id),
  ]);
  for (const result of [profile,business,exemption,auth]) if (result.error) throw new Error("Usage-notice eligibility lookup failed");
  const user = auth.data?.user;
  const recipient = String(job.recipient || "").trim().toLowerCase();
  const audience = usageNoticeAudience(profile.data, business.data);
  if (!audience || exemption.data || !user || user.id !== job.user_id || user.deleted_at || !user.email_confirmed_at
    || (user.banned_until && Date.parse(user.banned_until) > now)
    || !recipient || recipient !== String(profile.data?.email || "").trim().toLowerCase()
    || recipient !== String(user.email || "").trim().toLowerCase()) return null;
  return { company_name: business.data.company_name, usage_notice: true, account_paused: audience === "paused" };
}
