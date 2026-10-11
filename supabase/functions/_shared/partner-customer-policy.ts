type Database = { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{data: any; error: any}> };
export const ESSENTIAL_PARTNER_EMAILS = new Set([
  "business.email_verification", "individual.email_verification",
  "individual.password_reset", "business.password_reset",
  "business.pin_reset_link", "individual.pin_reset_link",
]);
export function suppressDirectPartnerEmail(isPartner: boolean, template: string): boolean {
  return isPartner && !ESSENTIAL_PARTNER_EMAILS.has(template);
}
export async function recipientIsPartner(db: Database, userId: string | undefined, recipient: string): Promise<boolean> {
  const {data,error} = await db.rpc("email_recipient_is_partner", {p_user_id:userId || null,p_recipient:recipient});
  if(error || typeof data !== "boolean") throw new Error("Customer membership lookup unavailable");
  return data;
}
export async function partnerMemberships(db: Database, ids: string[]): Promise<Map<string, any>> {
  const result = new Map<string, any>();
  const unique = [...new Set(ids.filter(Boolean))];
  for(let start=0;start<unique.length;start+=200){
    const {data,error}=await db.rpc("partner_customer_memberships",{p_user_ids:unique.slice(start,start+200)});
    if(error || !Array.isArray(data)) throw new Error("Customer membership lookup unavailable");
    for(const row of data) result.set(String(row.user_id),row);
  }
  return result;
}
