import {assertEquals,assertRejects,assertThrows} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {validateRequest,pkce,secret,digest,verifiedSessionClaims,resolveDelegatedCustomer,CustomerAuthorizationError} from '../supabase/functions/_shared/api-customer-authorization.ts';
const good={redirect_uri:'https://partner.example.com/callback',state:'random-csrf-state-1234',external_user_id:'customer-1',code_challenge:'a'.repeat(43),code_challenge_method:'S256',scopes:['customers:read']};
Deno.test('exact HTTPS callback, PKCE S256, explicit least-privilege scopes',()=>{
 assertEquals(validateRequest(good,['customers:read']).scopes,['customers:read']);
 for(const redirect_uri of ['http://partner.example.com/callback','https://user@partner.example.com/callback','https://partner.example.com/callback#fragment','https://localhost/callback','https://127.0.0.1/callback','https://[::1]/callback'])assertThrows(()=>validateRequest({...good,redirect_uri},['*']));
 for(const scopes of [[],['*'],['webhooks:write'],['payouts:write']])assertThrows(()=>validateRequest({...good,scopes},['customers:read']));
 assertThrows(()=>validateRequest({...good,code_challenge_method:'plain'},['*']));
 assertThrows(()=>validateRequest({...good,state:'short'},['*']));
});
Deno.test('PKCE RFC7636 vector and verifier length',async()=>{
 assertEquals(await pkce('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
 await assertRejects(()=>pkce('short'));
});
Deno.test('random secrets have 256 bits and only hashes persist',async()=>{
 const one=secret('bpcust_'),two=secret('bpcust_');assertEquals(one.length,50);assertEquals(one===two,false);assertEquals((await digest(one)).length,64);
});
Deno.test('verified session requires confirmed email, unexpired token and MFA when enrolled',()=>{
 const user={id:'user-1',email_confirmed_at:'2026-01-01',factors:[] as any[]};
 const token=(c:any)=>`head.${btoa(JSON.stringify(c))}.signature`;
 const c={sub:'user-1',exp:10000,aal:'aal1'};
 assertEquals(verifiedSessionClaims(token(c),user,1000),new Date(10000000).toISOString());
 assertThrows(()=>verifiedSessionClaims(token({...c,sub:'another'}),user,1000));
 assertThrows(()=>verifiedSessionClaims(token({...c,exp:1}),user,1000));
 assertThrows(()=>verifiedSessionClaims(token(c),{...user,email_confirmed_at:null},1000));
 assertThrows(()=>verifiedSessionClaims(token(c),{...user,factors:[{status:'verified'}]},1000));
 assertEquals(verifiedSessionClaims(token({...c,aal:'aal2'}),{...user,factors:[{status:'verified'}]},1000),new Date(10000000).toISOString());
});
Deno.test('delegated resolution binds tenant, key, scope and verified user; never trusts just opaque token',async()=>{
 const token=secret('bpcust_');let parameters:any;
 const db={rpc:async(_name:string,p:any)=>{parameters=p;return {data:{user_id:'u',end_user_id:'e',session:'internal-session'}};},auth:{getUser:async()=>({data:{user:{id:'u'}}})}};
 const session=await resolveDelegatedCustomer(db,'tenant','key',`Bearer ${token}`,'customers:read');
 assertEquals(parameters,{p_tenant:'tenant',p_key:'key',p_token_hash:await digest(token),p_scope:'customers:read'});
 assertEquals(session,{userId:'u',endUserId:'e',authorization:'Bearer internal-session'});
 await assertRejects(()=>resolveDelegatedCustomer({...db,rpc:async()=>({data:null})},'other','key',`Bearer ${token}`,'customers:read'),CustomerAuthorizationError);
 await assertRejects(()=>resolveDelegatedCustomer({...db,auth:{getUser:async()=>({data:{user:{id:'wrong'}}})}},'tenant','key',`Bearer ${token}`,'customers:read'),CustomerAuthorizationError);
});
