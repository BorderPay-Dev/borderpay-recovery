import { kybPortalHandoff, newBusinessKybEligible } from '../../supabase/functions/_shared/kyb-portal-handoff.ts';
function assert(value: unknown, message = 'assertion failed'): asserts value { if (!value) throw Error(message); }
const approved = { app_metadata: { kyb_synthetic_test: true } };
Deno.test('nonpilot users never call the KYB portal; user_metadata cannot opt in', async () => {
  let called = false; const fake = (() => { called = true; throw Error(); }) as typeof fetch;
  assert(await kybPortalHandoff({}, 'synthetic', fake) === null);
  assert(await kybPortalHandoff({ user_metadata: { kyb_synthetic_test: true } } as unknown as typeof approved, 'synthetic', fake) === null);
  assert(!called);
});
Deno.test('pilot forwards the authenticated token without accepting a client-selected identity', async () => {
 const fake = ((url: string, init: RequestInit) => { assert(url === 'https://kyb.borderpayvelocity.xyz/api/launch'); assert(new Headers(init.headers).get('Authorization') === 'Bearer synthetic'); assert(init.body === '{}'); assert(init.redirect === 'error');return Promise.resolve(Response.json({url:'https://kyb.borderpayvelocity.xyz/#launch=opaque',expiresAt:new Date(Date.now()+300000).toISOString()})); }) as typeof fetch;
 const result = await kybPortalHandoff(approved,'synthetic',fake);assert(result?.success === true);
});
Deno.test('errors and untrusted links do not fall back to creating a provider customer', async () => {
 for (const url of ['https://attacker.example/#launch=x','https://kyb.borderpayvelocity.xyz/?userId=other#launch=x','https://kyb.borderpayvelocity.xyz/staff#launch=x']) {
  const result=await kybPortalHandoff(approved,'synthetic',(()=>Promise.resolve(Response.json({url,expiresAt:new Date(Date.now()+300000).toISOString()}))) as typeof fetch);assert(result?.success===false);
 }
 const result=await kybPortalHandoff(approved,'synthetic',(()=>Promise.resolve(new Response('',{status:503}))) as typeof fetch);assert(result?.success===false);
});

Deno.test('new-business route excludes existing provider customers and restricted/individual accounts',()=>{
 const profile={account_type:'business',account_status:'pending_kyc',bridge_customer_id:null,bridge_account_status:null};
 assert(newBusinessKybEligible(profile));
 for(const patch of [{account_type:'individual'},{account_status:'active'},{account_status:'frozen'},{bridge_customer_id:'existing-provider-customer'},{bridge_account_status:'paused'},{bridge_account_status:'approved'}])assert(!newBusinessKybEligible({...profile,...patch}));
});
Deno.test('explicit new-business route returns the same mobile response contract without Bridge terms',async()=>{
 const fake=(()=>Promise.resolve(Response.json({url:'https://kyb.borderpayvelocity.xyz/#launch=opaque',expiresAt:new Date(Date.now()+300000).toISOString()}))) as typeof fetch;
 const r=await kybPortalHandoff({},'synthetic',fake,true);assert(r?.success===true);const d=r?.data as Record<string,unknown>;assert(d.tos_required===false&&d.tos_link_url===null&&d.verification_mode==='borderpay');
});
