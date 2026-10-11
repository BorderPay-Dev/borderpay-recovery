import { maintenanceDates, maintenanceNotice, verifiedUnpaid } from '../_shared/maintenance-calendar.ts';
import { maintenancePdf } from '../_shared/maintenance-invoice-pdf.ts';
import { bridgeProvider } from '../_shared/providers/bridge.ts';

export async function runBusinessMaintenanceCycle(db:any, base:string, token:string) {
  const {data:enabled,error:configError}=await db.rpc('app_config_get',{p_key:'business_calendar_maintenance_enabled'});
  if(configError || String(enabled)!=='true')return {enabled:false};
  const {data:rows,error}=await db.from('subscription_external_invoices').select('*,subscriptions!inner(account_type)')
    .eq('subscriptions.account_type','business').eq('status','payment_link_created').is('paid_at',null)
    .lte('billing_period',new Date().toISOString().slice(0,10)).order('metadata->>cycle_checked_at',{ascending:true,nullsFirst:true}).limit(4);
  if(error)throw error;
  const results=[];
  for(const i of rows||[]) {
    const {data:eligible,error:e}=await db.rpc('business_maintenance_invoice_eligible',{p_invoice_id:i.id});if(e)throw e;
    // Also move ineligible records to the end of the cycle; do not silently block the rest of the queue.
    let metadata={...i.metadata,cycle_checked_at:new Date().toISOString()};
    if(!eligible){await db.from('subscription_external_invoices').update({metadata}).eq('id',i.id);results.push({invoice_id:i.id,status:'ineligible'});continue;}
    try {
      const dates=maintenanceDates(i.billing_period);
      const response=await fetch(base+'/functions/v1/flutterwave-subscription-collection',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({mode:'reconcile',provider_reference:i.provider_reference}),signal:AbortSignal.timeout(20000)});
      const body=await response.json();const check=body?.data?.results?.find((r:any)=>r.invoice_id===i.id);
      if(!response.ok || !body.success || !body.data?.configured || !check)throw Error('payment_verification_unavailable');
      if(check.status==='paid'){results.push({invoice_id:i.id,status:'paid'});continue;}
      const unpaid=verifiedUnpaid(check);
      metadata={...metadata,provider_payment_checked_at:new Date().toISOString(),provider_payment_check:unpaid?'unpaid':'unresolved'};
      const {error:saveError}=await db.from('subscription_external_invoices').update({metadata}).eq('id',i.id).is('paid_at',null).eq('status','payment_link_created');if(saveError)throw saveError;
      if(!unpaid){results.push({invoice_id:i.id,status:'payment_pending_or_unresolved'});continue;}
      if(Date.now()>=dates.deactivateAt) {
        // Do not restrict a merchant if the required invoice cannot be produced.
        await maintenancePdf(db,i);
        const {data:restricted,error:restrictError}=await db.rpc('restrict_business_maintenance_invoice',{p_invoice_id:i.id});if(restrictError)throw restrictError;
        results.push({invoice_id:i.id,status:restricted?'restriction_ready':'not_restricted'});
      } else {
        await queueInvoiceNotice(db,i,maintenanceNotice(i.billing_period)!);
        results.push({invoice_id:i.id,status:'within_grace'});
      }
    } catch(error) {
      // Unknown payment state never authorizes a new restriction.
      await db.from('subscription_external_invoices').update({metadata:{...metadata,provider_payment_check:'unresolved',cycle_error:String(error).slice(0,150)}}).eq('id',i.id).is('paid_at',null);
      results.push({invoice_id:i.id,status:'verification_error'});
    }
  }
  return {enabled:true,selected:rows?.length||0,results};
}

export async function queueInvoiceNotice(db:any,i:any,notice:string,currencies:string[]=[]) {
  const {data:p,error}=await db.from('user_profiles').select('email,full_name').eq('id',i.user_id).single();if(error)throw error;
  const {data:b}=await db.from('business_profiles').select('company_name').eq('user_id',i.user_id).maybeSingle();
  const {error:e}=await db.from('subscription_email_jobs').upsert({user_id:i.user_id,template:'business.subscription_external_invoice',recipient:p.email.toLowerCase().trim(),props:{notice,customer_name:b?.company_name||p.full_name,billing_period:i.billing_period,amount:i.amount,currency:i.currency,payment_link:i.payment_link,transaction_reference:i.provider_reference,deadline:maintenanceDates(i.billing_period).deadline,deactivated_currencies:currencies},idempotency_key:`subscription:calendar:${notice}:${i.id}`},{onConflict:'idempotency_key',ignoreDuplicates:true});if(e)throw e;
}

export async function queueConfirmedMaintenanceNotices(db:any) {
  const {data:enabled,error:ce}=await db.rpc('app_config_get',{p_key:'business_calendar_maintenance_enabled'});
  if(ce || String(enabled)!=='true')return {queued:0,enabled:false};
  const {data:rows,error}=await db.from('subscription_external_invoices').select('*').eq('status','payment_link_created').is('paid_at',null).lte('billing_period',new Date().toISOString().slice(0,10)).limit(200);if(error)throw error;
  let queued=0;
  for(const i of rows||[]) {
    const {data:eligible,error:e}=await db.rpc('business_maintenance_invoice_eligible',{p_invoice_id:i.id});if(e)throw e;if(!eligible)continue;
    const {data:vas,error:ve}=await db.from('bridge_virtual_accounts').select('bridge_virtual_account_id,bridge_customer_id,currency,status,deactivation_reason').or(`user_id.eq.${i.user_id},business_user_id.eq.${i.user_id}`);if(ve)throw ve;
    const held=(vas||[]).filter((v:any)=>v.status==='deactivated'&&v.deactivation_reason==='subscription_nonpayment');if(!held.length)continue;
    const {data:sent}=await db.from('subscription_email_jobs').select('id').eq('idempotency_key',`subscription:calendar:deactivated:${i.id}`).maybeSingle();if(sent)continue;
    const live=await bridgeProvider.listVirtualAccounts(held[0].bridge_customer_id);
    const currencies=held.filter((v:any)=>live.some(a=>a.virtual_account_id===v.bridge_virtual_account_id && ['deactivated','inactive','closed'].includes(String(a.status).toLowerCase()))).map((v:any)=>v.currency);
    if(currencies.length!==held.length)continue;
    await queueInvoiceNotice(db,i,'deactivated',[...new Set<string>(currencies)]);queued++;
  }
  return {queued};
}
