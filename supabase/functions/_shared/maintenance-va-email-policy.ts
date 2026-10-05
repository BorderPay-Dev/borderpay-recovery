// Billing eligibility is authoritative in SQL, including business-owner VA links,
// active custody, team/partner exemptions and declared billing-period eligibility.
export function requiresActiveMaintenanceVa(template: string): boolean {
  return ["business.subscription_external_invoice", "business.account_maintenance_fee", "business.account_verified_subscription"].includes(template);
}
export async function hasActiveMaintenanceVa(db: any, userId?: string, recipient?: string, period?: string): Promise<boolean> {
  let id = userId;
  if (!id && recipient) {
    const email = recipient.trim().replace(/[\\%_]/g, "\\$&");
    const { data, error } = await db.from("users").select("id").ilike("email", email).maybeSingle();
    if (error) throw new Error("Maintenance recipient lookup unavailable");
    id = data?.id;
  }
  if (!id) return false;
  if (period && !/^\d{4}-\d{2}-\d{2}$/.test(period)) return false;
  // Invoices for October must not be sent as September charges, or before due.
  if (period && Date.parse(period + "T00:00:00Z") > Date.now()) return false;
  const { data, error } = period
    ? await db.rpc("maintenance_account_is_billable_for_period", { p_user_id: id, p_period: period })
    : await db.rpc("maintenance_account_is_billable", { p_user_id: id });
  if (error || typeof data !== "boolean") throw new Error("Maintenance eligibility lookup unavailable");
  return data;
}
