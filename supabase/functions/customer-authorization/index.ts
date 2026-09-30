import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import {CustomerAuthorizationError,digest,secret,verifiedSessionClaims} from '../_shared/api-customer-authorization.ts';
const ORIGINS=new Set(['https://app.borderpayafrica.com','https://app.borderpayvelocity.xyz']);
Deno.serve(async(req)=>{
 const origin=req.headers.get('Origin')||'';
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':ORIGINS.has(origin)?origin:'null','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
 const out=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers});
 if(!ORIGINS.has(origin))return out({error:{code:'origin_forbidden',message:'Open authorization from BorderPay.'}},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return out({error:{code:'method_not_allowed'}},405);
 try{
  const raw=await req.text();if(raw.length>4096)return out({error:{code:'request_too_large'}},413);
  const body=JSON.parse(raw);
  if(!/^bpa_[A-Za-z0-9_-]{43}$/.test(body.request||''))throw new CustomerAuthorizationError('invalid_authorization','This authorization link is invalid or has expired.');
  const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const auth=await db.auth.getUser(token);
  if(auth.error||!auth.data.user)throw new CustomerAuthorizationError('customer_session_required','Sign in to your BorderPay business account.',401);
  const expiry=verifiedSessionClaims(token,auth.data.user);
  const request_hash=await digest(body.request);
  const result=await db.from('api_customer_authorizations').select('tenant_id,api_key_id,external_user_id,redirect_uri,scopes,expires_at,consented_at,denied_at').eq('request_hash',request_hash).maybeSingle();
  const a=result.data;
  if(result.error||!a||Date.parse(a.expires_at)<=Date.now()||a.consented_at||a.denied_at)throw new CustomerAuthorizationError('invalid_authorization','This authorization link is invalid or has expired.');
  const allowed=await db.rpc('api_customer_auth_allowed',{p_tenant:a.tenant_id,p_key:a.api_key_id,p_redirect:a.redirect_uri,p_scopes:a.scopes});
  const member=await db.from('api_tenant_end_users').select('id').eq('tenant_id',a.tenant_id).eq('user_id',auth.data.user.id).eq('external_user_id',a.external_user_id).eq('account_type','business').maybeSingle();
  if(allowed.error||allowed.data!==true||member.error||!member.data)throw new CustomerAuthorizationError('customer_mismatch','Sign in with the business account linked to this partner.',403);
  const limit=await db.rpc('api_gateway_consume_rate_limit',{p_tenant_id:a.tenant_id,p_api_key_id:a.api_key_id,p_limit:120,p_window_seconds:60});
  if(limit.error||!limit.data?.[0]?.allowed)throw new CustomerAuthorizationError('rate_limited','Please wait a moment before trying again.',429);
  if(body.action==='inspect'){
   const tenant=await db.from('api_tenants').select('tenant_name').eq('id',a.tenant_id).single();
   if(tenant.error)throw new CustomerAuthorizationError('authorization_unavailable','Please try again shortly.',503);
   return out({data:{partner_name:tenant.data.tenant_name,redirect_origin:new URL(a.redirect_uri).origin,scopes:a.scopes,expires_at:a.expires_at}});
  }
  if(!['allow','deny'].includes(body.action))throw new CustomerAuthorizationError('invalid_request','Choose allow or decline.');
  const code=secret('bpc_');
  const r=await db.rpc('api_customer_auth_consent',{p_request_hash:request_hash,p_user_id:auth.data.user.id,p_allow:body.action==='allow',p_code_hash:await digest(code),p_session:token,p_session_expires:expiry});
  if(r.error||!r.data)throw new CustomerAuthorizationError('invalid_authorization','This authorization has expired or was already completed.');
  const url=new URL(r.data.redirect_uri);url.searchParams.set('state',r.data.state);
  if(body.action==='allow')url.searchParams.set('code',code);else url.searchParams.set('error','access_denied');
  return out({data:{redirect_url:url.href}});
 }catch(e){
  if(e instanceof CustomerAuthorizationError)return out({error:{code:e.code,message:e.message}},e.status);
  return out({error:{code:'authorization_unavailable',message:'We could not complete authorization. Please try again.'}},503);
 }
});
