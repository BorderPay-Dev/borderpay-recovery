// Delivery eligibility only: does not change invoices, balances or account access.
export function requiresActiveMaintenanceVa(template: string): boolean {
  return template === "business.subscription_external_invoice";
}
export async function hasActiveMaintenanceVa(db: any, userId?: string, recipient?: string): Promise<boolean> {
  let id = userId;
  if (!id && recipient) {
    const email = recipient.trim().replace(/[\\%_]/g, "\\$&");
    const { data, error } = await db.from("users").select("id").ilike("email", email).maybeSingle();
    if (error) throw new Error("Maintenance recipient lookup unavailable");
    id = data?.id;
  }
  if (!id) return false;
  const { data, error } = await db.from("bridge_virtual_accounts").select("id")
    .eq("user_id", id).eq("status", "active").limit(1);
  if (error || !Array.isArray(data)) throw new Error("Maintenance virtual account lookup unavailable");
  return data.length > 0;
}
