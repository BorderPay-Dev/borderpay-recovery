import {partnerMemberships,recipientIsPartner,suppressDirectPartnerEmail} from "../supabase/functions/_shared/partner-customer-policy.ts";
function assert(v:unknown,m="assertion failed"):asserts v {if(!v)throw new Error(m);}
Deno.test("partner customers skip retail campaigns, welcome, invoices and status emails",()=>{
 for(const name of ["business.founder_welcome","business.account_maintenance_fee","business.subscription_external_invoice","business.invoice_contract_hub","business.kyb_approved","unknown.future_campaign"]){assert(suppressDirectPartnerEmail(true,name));assert(!suppressDirectPartnerEmail(false,name));}
});
Deno.test("essential account access messages remain available",()=>{
 for(const name of ["business.email_verification","individual.password_reset","business.pin_reset_link"])assert(!suppressDirectPartnerEmail(true,name));
});
Deno.test("recipient lookup covers missing ID and fails closed",async()=>{
 let args:any;const db={rpc:(_n:string,a:any)=>{args=a;return Promise.resolve({data:true,error:null});}};
 assert(await recipientIsPartner(db,undefined,"customer@example.com"));assert(args.p_user_id===null);assert(args.p_recipient==="customer@example.com");
 for(const response of [{data:false,error:{message:"offline"}},{data:null,error:null}]){let failed=false;try{await recipientIsPartner({rpc:()=>Promise.resolve(response)},undefined,"customer@example.com");}catch{failed=true;}assert(failed);}
});
Deno.test("membership lookup deduplicates and batches without pagination loss",async()=>{
 const ids=Array.from({length:450},(_,i)=>String(i));let calls=0;
 const rows=await partnerMemberships({rpc:(_n,a)=>{calls++;const chunk=a.p_user_ids as string[];assert(chunk.length<=200);return Promise.resolve({data:chunk.map(user_id=>({user_id,tenant_id:"tenant"})),error:null});}},[...ids,...ids]);assert(calls===3);assert(rows.size===450);
});
Deno.test("membership errors cannot produce a direct-customer fallback",async()=>{
 let failed=false;try{await partnerMemberships({rpc:()=>Promise.resolve({data:[],error:{message:"offline"}})},["user"]);}catch{failed=true;}assert(failed);
});
