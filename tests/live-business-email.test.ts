import { validateLiveBusinessEmail } from '../supabase/functions/_shared/live-business-email.ts';
const email='accounts@borderpayvelocity.xyz';
const valid={success:true,email,domain:'borderpayvelocity.xyz',free:false,disposable:false,accept_all:false,result:'deliverable',role:true};
const key=async()=> 'synthetic-key';
function mock(body:unknown,status=200):typeof fetch {return (async()=>new Response(JSON.stringify(body),{status})) as typeof fetch;}
function assert(x:unknown):asserts x {if(!x)throw new Error('Assertion failed');}
Deno.test('only exact inbox.eu skips external verification; alias still blocked',async()=>{
 let calls=0;const deps={getApiKey:async()=>{calls++;return 'test';},request:mock(valid)};
 assert((await validateLiveBusinessEmail('Owner@inbox.eu',deps)).allowed);
 assert(!(await validateLiveBusinessEmail('owner+alias@inbox.eu',deps)).allowed);
 assert(!(await validateLiveBusinessEmail('owner@sub.inbox.eu',deps)).allowed);
 assert(calls===0);
});
Deno.test('known forbidden domains are rejected without billable API requests',async()=>{
 let calls=0;for(const e of ['probe@uberip.com','x@gmail.com','x@duck.com']) {
 assert(!(await validateLiveBusinessEmail(e,{getApiKey:async()=>{calls++;return 'test';},request:mock(valid)})).allowed);}
 assert(calls===0);
});
Deno.test('confirmed company role mailbox passes through live API',async()=>{
 let calls=0;const result=await validateLiveBusinessEmail(email,{getApiKey:key,request:(async(url,init)=>{
 calls++;const u=new URL(String(url));assert(u.origin==='https://api.kickbox.com');assert(u.searchParams.get('email')===email);assert(u.searchParams.get('apikey')==='synthetic-key');assert(init?.signal);assert(init?.redirect==='error');return new Response(JSON.stringify(valid));}) as typeof fetch});
 assert(result.allowed && calls===1);
});
Deno.test('new free or disposable domains denied by provider classification',async()=>{
 for(const patch of [{free:true},{disposable:true}])assert(!(await validateLiveBusinessEmail(email,{getApiKey:key,request:mock({...valid,...patch})})).allowed);
});
Deno.test('risky, catch-all and undeliverable mailboxes never auto-approved',async()=>{
 for(const patch of [{result:'risky'},{result:'undeliverable'},{accept_all:true}])assert(!(await validateLiveBusinessEmail(email,{getApiKey:key,request:mock({...valid,...patch})})).allowed);
});
Deno.test('missing credentials, transport errors and quota failures are retryable, fail closed',async()=>{
 const cases=[{getApiKey:async()=>null,request:mock(valid)},... [401,429,500].map(status=>({getApiKey:key,request:mock({},status)})),{getApiKey:key,request:(async()=>{throw new Error('synthetic timeout');}) as typeof fetch}];
 for(const deps of cases){const r=await validateLiveBusinessEmail(email,deps);assert(!r.allowed && r.status===503);}
});
Deno.test('unknown, incomplete and wrong-recipient results never approve',async()=>{
 for(const body of [{...valid,result:'unknown'},{...valid,email:'someone@another.com'},{...valid,domain:'another.com'},{...valid,free:undefined},{...valid,success:false},{},null]){
 const r=await validateLiveBusinessEmail(email,{getApiKey:key,request:mock(body)});assert(!r.allowed && r.status===503);}
});
Deno.test('integration validates before consuming invite or creating identity',async()=>{
 const s=await Deno.readTextFile(new URL('../supabase/functions/auth-signup/index.ts',import.meta.url));
 const i=s.indexOf('await validateLiveBusinessEmail(');
 assert(i>s.indexOf('if (!captchaCheck.ok)'));assert(i>s.indexOf('if (!abuse?.allowed)'));
 assert(i<s.indexOf('"consume_api_onboarding_authorization"'));assert(i<s.indexOf('supabaseAdmin.auth.admin.createUser'));
});
