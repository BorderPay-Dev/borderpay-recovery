export function confirmedReactivationCurrencies(actions:any[],accounts:any[]):string[]|null {
 if(!actions.length)return null;
 const currencies:string[]=[];
 for(const action of actions){
  const va=accounts.find((v:any)=>v.virtual_account_id===action.bridge_virtual_account_id);
  if(action.action!=="reactivate"||action.status!=="completed"||action.reason!=="subscription_payment_confirmed"||!va||!["active","activated"].includes(String(va.status).toLowerCase())||!["USD","EUR","GBP"].includes(va.currency))return null;
  currencies.push(va.currency);
 }
 return [...new Set(currencies)].sort();
}
export async function resolveReactivationNotice(db:any,provider:any,job:any){
 const ids=job.props?.access_action_ids;
 if(!Array.isArray(ids)||!ids.length||ids.length>100||new Set(ids).size!==ids.length)return null;
 const {data:p,error:pe}=await db.from("user_profiles").select("email,account_type,account_status,bridge_account_status,account_frozen_at").eq("id",job.user_id).single();if(pe)throw pe;
 if(p.account_type!=="business"||p.account_status!=="active"||p.bridge_account_status!=="active"||p.account_frozen_at||!p.email)return null;
 const {data:actions,error:ae}=await db.from("subscription_provider_access_actions").select("id,subscription_id,bridge_customer_id,bridge_virtual_account_id,action,status,reason").in("id",ids).eq("user_id",job.user_id).eq("reactivation_email_job_id",job.id);if(ae)throw ae;
 if(actions?.length!==ids.length)return null;
 const {data:subs,error:se}=await db.from("subscriptions").select("id,status,restricted_at").in("id",[...new Set(actions.map((a:any)=>a.subscription_id))]).eq("user_id",job.user_id);if(se)throw se;
 if(!subs?.length||subs.some((s:any)=>s.status!=="active"||s.restricted_at))return null;
 const {data:local,error:le}=await db.from("bridge_virtual_accounts").select("bridge_virtual_account_id,status,deactivation_reason").in("bridge_virtual_account_id",actions.map((a:any)=>a.bridge_virtual_account_id)).or(`user_id.eq.${job.user_id},business_user_id.eq.${job.user_id}`);if(le)throw le;
 if(local?.length!==actions.length||local.some((v:any)=>!["active","activated"].includes(v.status)||v.deactivation_reason))return null;
 const live=[];
 for(const customer of new Set<string>(actions.map((a:any)=>String(a.bridge_customer_id)))){
  const profile=await provider.getCustomerProfile(customer);if(profile.raw?.status!=="active")return null;
  live.push(...await provider.listVirtualAccounts(customer));
 }
 const currencies=confirmedReactivationCurrencies(actions,live);if(!currencies)return null;
 return {recipient:p.email.toLowerCase().trim(),props:{...job.props,reactivated_currencies:currencies}};
}
