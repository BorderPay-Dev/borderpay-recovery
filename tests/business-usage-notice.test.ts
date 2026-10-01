import { TEMPLATES } from "../supabase/functions/_shared/email-templates/index.ts";
import { resolveUsageNoticeRecipient, usageNoticeAudience, USAGE_NOTICE_REVIEW_USER } from "../supabase/functions/_shared/business-usage-recipient.ts";
function assert(v: unknown, m: string) { if(!v) throw Error(m); }
const profile = {id:'user',email:'business@example.test',account_type:'business',account_status:'active',kyc_status:'verified',bridge_account_status:'active',is_demo:false,is_admin:false};
const business = {company_name:'Example <script>bad()</script>',bridge_kyb_status:'approved'};
const auth = {id:'user',email:profile.email,email_confirmed_at:'2026-01-01'};
function db(p:any=profile,b:any=business,a:any=auth,exemption:any=null,error:any=null) {
 return {from:(table:string)=>({select:()=>({eq:()=>({maybeSingle:()=>Promise.resolve({data:table==='user_profiles'?p:table==='business_profiles'?b:exemption,error})})})}),auth:{admin:{getUserById:()=>Promise.resolve({data:{user:a},error})}}};
}
const job = {user_id:'user',recipient:profile.email};
Deno.test('usage notices distinguish paused review and active guidance without making approval claims',()=>{
 for(const paused of [true,false]) {
  const x=TEMPLATES['business.business_activity_update']({company_name:business.company_name,usage_notice:true,account_paused:paused});
  assert(!x.html.includes('<script>'),'unsafe name');
  for(const text of ['US$15,000 monthly but receiving more than US$20,000 in one week','Source of funds means','EEA-only trade','strictly below US$4,000','GBP payments are strictly business-to-business']) assert(x.text.includes(text),'missing '+text);
  assert(!x.text.includes('business onboarding standard'),'reimposed onboarding criteria');
  assert(x.text.includes('Your account is currently paused')===paused,'wrong account state');
  if(paused) assert(x.text.includes('does not approve your case or permit payments'),'missing restriction');
 }
});
Deno.test('recipient recheck refreshes status and company at dispatch',async()=>{
 assert((await resolveUsageNoticeRecipient(db(),job))?.account_paused===false,'active missing');
 const paused={...profile,account_status:'frozen',bridge_account_status:'paused'};
 assert((await resolveUsageNoticeRecipient(db(paused),job))?.account_paused===true,'pause transition not respected');
 assert(usageNoticeAudience({...paused,account_status:'offboarded'},business)===null,'offboarded included');
 for(const changed of [{...profile,account_type:'individual'},{...profile,is_demo:true},{...profile,is_admin:true},{...profile,email:'changed@example.test'},{...profile,account_status:'pending_kyc'}]) assert(await resolveUsageNoticeRecipient(db(changed),job)===null,'ineligible profile included');
 assert(await resolveUsageNoticeRecipient(db(profile,business,{...auth,banned_until:'2099-01-01'}),job)===null,'banned included');
 assert(await resolveUsageNoticeRecipient(db(profile,business,{...auth,email_confirmed_at:null}),job)===null,'unconfirmed included');
 assert(await resolveUsageNoticeRecipient(db(profile,business,auth,{user_id:'user'}),job)===null,'team included');
 let threw=false;try{await resolveUsageNoticeRecipient(db(profile,business,auth,null,{message:'failed'}),job);}catch{threw=true;}assert(threw,'lookup failed open');
});

Deno.test('founder copy is scoped to this campaign and preserves all ordinary exemptions', async()=>{
 const id=USAGE_NOTICE_REVIEW_USER, email='founder@borderpayafrica.com';
 const p={...profile,id,email,is_admin:true},a={...auth,id,email};
 const j={user_id:id,recipient:email,props:{review_copy:true},idempotency_key:`account_usage:20261001:v2:${id}`};
 assert(await resolveUsageNoticeRecipient(db(p,business,a,{user_id:id}),j)!==null,'authorized founder copy excluded');
 assert(await resolveUsageNoticeRecipient(db(p,business,a,{user_id:id}),{...j,idempotency_key:'unrelated'})===null,'review exemption leaked');
 assert(await resolveUsageNoticeRecipient(db(p,business,a,{user_id:id}),{...j,props:{}})===null,'regular campaign includes founder');
});
