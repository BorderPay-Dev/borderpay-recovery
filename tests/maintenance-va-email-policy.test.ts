import { hasActiveMaintenanceVa, requiresActiveMaintenanceVa } from '../supabase/functions/_shared/maintenance-va-email-policy.ts';
function assert(x:unknown){if(!x)throw new Error('Assertion failed');}
const db=(allowed:boolean,error:unknown=null)=>({rpc:async(name:string,args:any)=>{assert(['maintenance_account_is_billable','maintenance_account_is_billable_for_period'].includes(name));assert(args.p_user_id==='merchant');return {data:allowed,error}}});
Deno.test('authoritative SQL eligibility is enforced for all callers',async()=>{
 assert(await hasActiveMaintenanceVa(db(true),'merchant'));
 assert(!await hasActiveMaintenanceVa(db(false),'merchant'));
 assert(!await hasActiveMaintenanceVa(db(true)));
 assert(await hasActiveMaintenanceVa(db(true),'merchant',undefined,'2026-09-30'));
});
Deno.test('future and malformed billing periods cannot be emailed early',async()=>{
 assert(!await hasActiveMaintenanceVa(db(true),'merchant',undefined,'2099-10-31'));
 assert(!await hasActiveMaintenanceVa(db(true),'merchant',undefined,'invalid'));
});
Deno.test('eligibility lookup fails closed',async()=>{
 let failed=false;try{await hasActiveMaintenanceVa(db(true,new Error('offline')),'merchant')}catch{failed=true}assert(failed);
});
Deno.test('billing templates guarded, payment receipts and verification unaffected',()=>{
 for(const t of ['business.subscription_external_invoice','business.account_maintenance_fee','business.account_verified_subscription']) assert(requiresActiveMaintenanceVa(t));
 for(const t of ['business.subscription_payment_status','business.email_verification','business.password_reset'])assert(!requiresActiveMaintenanceVa(t));
});
