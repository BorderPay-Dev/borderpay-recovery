// This account-service notice does not change verification or money-movement permissions.
export function migrationNoticeEligible(profile: Record<string, unknown>): boolean {
  return profile.account_type === "business" && profile.is_admin !== true && profile.is_demo !== true;
}
export function migrationPriority(business?: Record<string, unknown>): boolean {
  const metadata = business?.metadata as Record<string, unknown> | undefined;
  const migration = metadata?.provider_migration as Record<string, unknown> | undefined;
  return migration?.priority === 1 && migration?.source_provider === "bridge"
    && migration?.reason === "provider_paused" && migration?.status === "waiting_partner_approval";
}
