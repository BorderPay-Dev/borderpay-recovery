import { businessOnboardingDenial } from '../supabase/functions/_shared/business-onboarding-guard.ts';
import { retiredIndividualOnboarding } from '../supabase/functions/_shared/retired-individual-onboarding.ts';
import { BridgeProvider } from '../supabase/functions/_shared/providers/bridge.ts';
const user={email:'owner@borderpayvelocity.xyz',email_confirmed_at:'2026-10-01'};
const profile={account_type:'business',email:user.email,account_status:'pending_kyc'};
const business={company_name:'Synthetic Business'};
function assert(x:unknown):asserts x {if(!x)throw new Error('Assertion failed');}
Deno.test('individual and missing database identities cannot onboard even with business metadata',()=>{
 for(const type of ['individual','Business',null,undefined]) assert(businessOnboardingDenial({...user,user_metadata:{account_type:'business'}},{...profile,account_type:type},business)?.code==='business_onboarding_only');
 assert(businessOnboardingDenial(user,null,business));
});
Deno.test('company record, confirmed email and Auth/profile match required',()=>{
 assert(businessOnboardingDenial(user,profile,null));
 assert(businessOnboardingDenial(user,profile,{company_name:' '}));
 assert(businessOnboardingDenial({...user,email_confirmed_at:null},profile,business));
 assert(businessOnboardingDenial(user,{...profile,email:'someone@other.company'},business)?.code==='account_email_mismatch');
});
Deno.test('all restriction sources block onboarding before existing-ID return',()=>{
 for(const status of ['frozen','paused','rejected','disabled','suspended','closed','offboarded']) {
 for(const field of ['account_status','bridge_account_status']) assert(businessOnboardingDenial(user,{...profile,[field]:status,bridge_customer_id:'old-id'},business)?.code==='account_restricted');
 assert(businessOnboardingDenial(user,profile,{...business,bridge_kyb_status:status}));
 }
 assert(businessOnboardingDenial(user,{...profile,account_frozen_at:'2026-10-01'},business));
});
Deno.test('identity mismatches cannot create or reuse a provider identity',()=>{
 assert(businessOnboardingDenial(user,{...profile,bridge_customer_id:'one'},{...business,bridge_customer_id:'two'})?.code==='account_identity_mismatch');
});
Deno.test('new provider identities must pass business email policy; historical merchants can resume',()=>{
 const banned={...user,email:'probe@uberip.com'};
 assert(businessOnboardingDenial(banned,{...profile,email:banned.email},business)?.code==='business_email_required');
 assert(!businessOnboardingDenial(user,profile,business));
 const old={...user,email:'established@gmail.com'};
 assert(!businessOnboardingDenial(old,{...profile,email:old.email,bridge_customer_id:'existing-id'},business));
});
Deno.test('legacy endpoint returns 403 even when caller spoofs all fields',async()=>{
 const r=retiredIndividualOnboarding(new Request('https://local.invalid',{method:'POST',headers:{Authorization:'Bearer fake'},body:JSON.stringify({account_type:'business',tenant_id:'fake',email:'owner@inbox.eu'})}));
 assert(r.status===403);assert((await r.json()).code==='individual_onboarding_disabled');
 assert(retiredIndividualOnboarding(new Request('https://local.invalid',{method:'OPTIONS'})).status===200);
});
Deno.test('provider adapter rejects consumer creation and hosted links before network',async()=>{
 const before=globalThis.fetch;let calls=0;
 globalThis.fetch=(()=>{calls++;throw new Error('Network must not be used');}) as typeof fetch;
 try {
 const provider=new BridgeProvider();
 for(const fn of [()=>provider.createCustomer({account_type:'individual'} as never),()=>provider.createKycLink({account_type:'individual'} as never)]) {
 let denied=false;try{await fn();}catch(e){denied=(e as {bridge_code?:string}).bridge_code==='business_onboarding_only';}assert(denied);
 }
 assert(calls===0);
 }finally{globalThis.fetch=before;}
});
Deno.test('route guards precede onboarding handoff and provider calls',async()=>{
 const customer=await Deno.readTextFile(new URL('../supabase/functions/bridge-customer/index.ts',import.meta.url));
 const kyb=await Deno.readTextFile(new URL('../supabase/functions/bridge-kyb-link/index.ts',import.meta.url));
 assert(customer.indexOf('if (denial)')<customer.indexOf('bridgeProvider.createCustomer'));
 assert(kyb.indexOf('if (denial)')<kyb.indexOf('await kybPortalHandoff('));
 const legacy=await Deno.readTextFile(new URL('../supabase/functions/bridge-kyc-link/index.ts',import.meta.url));
 assert(!legacy.includes('fetch('));assert(!legacy.includes('user_metadata'));
});
