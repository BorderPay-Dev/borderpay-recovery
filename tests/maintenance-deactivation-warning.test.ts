import {renderExternalInvoice} from '../supabase/functions/_shared/email-templates/subscription/maintenance.ts';
import {prepareInvoiceEmail} from '../supabase/functions/_shared/subscription-email-policy.ts';
const assert=(v:unknown)=>{if(!v)throw Error('Assertion failed');};
const today=new Date().toISOString().slice(0,10);
const props={customer_name:'Synthetic Business',amount:29.99,currency:'USD',billing_period:'2026-09-30',transaction_reference:'synthetic-invoice',payment_link:'https://checkout.flutterwave.com/v3/hosted/pay/synthetic',notice:'balance_reminder',deactivation_date:today};
const job={user_id:'synthetic',props};
const invoice={user_id:'synthetic',provider_reference:'synthetic-invoice',status:'payment_link_created',payment_link:props.payment_link,billing_period:props.billing_period,amount:29.99,currency:'USD',paid_at:null};
const subscription={user_id:'synthetic',status:'active',grace_started_at:null};
Deno.test('dated September warning uses correct fee, period, deadline and individual payment link',()=>{
 const plan=prepareInvoiceEmail(job,invoice,subscription);if(plan.action!=='send')throw Error('Warning unexpectedly suppressed');
 const email=renderExternalInvoice(plan.props!);assert(email.subject.includes('September 2026'));assert(email.text.includes('29.99 USD'));assert(email.text.includes('deactivated today'));assert(email.html.includes(props.payment_link));assert(email.text.includes('not deducted'));assert(email.text.includes('If you have already paid'));
});
Deno.test('a confirmed payment suppresses the warning',()=>assert(prepareInvoiceEmail(job,{...invoice,status:'paid',paid_at:new Date().toISOString()},subscription).action==='suppress'));
Deno.test('stale warning cannot be delivered on a later day',()=>{
 assert(prepareInvoiceEmail({...job,props:{...props,deactivation_date:'2020-01-01'}},invoice,subscription).action==='suppress');
 let failed=false;try{renderExternalInvoice({...props,deactivation_date:'2020-01-01'});}catch{failed=true;}assert(failed);
});
Deno.test('future billing period cannot be threatened with deactivation today',()=>{
 assert(prepareInvoiceEmail(job,{...invoice,billing_period:'2099-10-31'},subscription).action==='suppress');
 let failed=false;try{renderExternalInvoice({...props,billing_period:'2099-10-31'});}catch{failed=true;}assert(failed);
});
Deno.test('ordinary reminder retains existing non-warning copy',()=>{
 const {deactivation_date,...normal}=props;const email=renderExternalInvoice(normal);assert(!email.text.includes('deactivated today'));assert(email.subject.includes('Maintenance payment reminder'));
});
