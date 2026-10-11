import {assertEquals,assertThrows} from 'jsr:@std/assert@1';
import {maintenanceDates,maintenanceNotice,verifiedUnpaid} from '../supabase/functions/_shared/maintenance-calendar.ts';
import {prepareInvoiceEmail} from '../supabase/functions/_shared/subscription-email-policy.ts';
import {renderExternalInvoice} from '../supabase/functions/_shared/email-templates/subscription/maintenance.ts';
const invoice={id:'i',user_id:'u',provider_reference:'r',status:'payment_link_created',paid_at:null,payment_link:'https://checkout.flutterwave.com/v3/hosted/pay/test',billing_period:'2026-09-30',amount:29.99,currency:'USD'};
const sub={user_id:'u',account_type:'business',status:'active',grace_started_at:'2026-10-31T00:00:00Z'};
Deno.test('September and October have independent full seven-day grace windows',()=>{
 assertEquals(new Date(maintenanceDates('2026-09-30').deactivateAt).toISOString(),'2026-10-08T00:00:00.000Z');
 assertEquals(new Date(maintenanceDates('2026-10-31').deactivateAt).toISOString(),'2026-11-08T00:00:00.000Z');
 assertEquals(maintenanceDates('2026-09-30').deadline,'2026-10-07');
 assertThrows(()=>maintenanceDates('2026-09-29'));
});
Deno.test('future shared subscription grace cannot postpone September warning',()=>{
 const r=prepareInvoiceEmail({user_id:'u',props:{transaction_reference:'r',notice:'final_warning'}},invoice,sub,new Date('2026-10-07T12:00:00Z'));
 assertEquals(r.action,'send');if(r.action==='send')assertEquals(r.props.deadline,'2026-10-07');
});
Deno.test('future invoice email defers and pending provider transfer never authorizes restriction',()=>{
 assertEquals(maintenanceNotice('2026-10-31',Date.parse('2026-10-12')),null);
 for(const state of ['pending','processing','paid','successful',undefined])assertEquals(verifiedUnpaid({status:state}),false);
 assertEquals(verifiedUnpaid({status:'unresolved',error:'flutterwave_request_failed:503:timeout'}),false);
 assertEquals(verifiedUnpaid({status:'unresolved',error:'flutterwave_request_failed:400:No transaction was found for this id'}),true);
});
Deno.test('paid, wrong-owner and expired invoices cannot be emailed',()=>{
 const job={user_id:'u',props:{transaction_reference:'r',notice:'deactivated',deactivated_currencies:['EUR']}};
 for(const i of [{...invoice,status:'paid'}, {...invoice,user_id:'other'},{...invoice,expires_at:'2026-10-01'}])assertEquals(prepareInvoiceEmail(job,i,sub,new Date('2026-10-12')).action,'suppress');
});
Deno.test('deactivation email lists only confirmed currencies and preserves compliance review',()=>{
 const r=renderExternalInvoice({...invoice,transaction_reference:'r',notice:'deactivated',customer_name:'Example Business',deactivated_currencies:['EUR'],invoice_number:'BP-M-202609-TEST'});
 assertEquals(r.text.includes('Your EUR global receiving account is deactivated'),true);
 assertEquals(r.text.includes('Your USD'),false);
 assertEquals(r.text.includes('Separate compliance or provider restrictions are not removed'),true);
 assertThrows(()=>renderExternalInvoice({...invoice,transaction_reference:'r',notice:'deactivated',deactivated_currencies:[]}));
});
