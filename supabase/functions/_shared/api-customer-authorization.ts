/** Partner-scoped delegated customer sessions. Never return a platform JWT to a partner. */
export const AUTH_ROUTES: Record<string,string> = {
 'POST /v1/customer-authorizations':'onboarding:write',
 'POST /v1/customer-authorizations/exchange':'onboarding:write',
 'POST /v1/customer-authorizations/revoke':'onboarding:write',
};
export const DELEGABLE_SCOPES = new Set([
 'customers:read','customers:write','onboarding:write','wallets:read','wallets:write',
 'virtual_accounts:read','virtual_accounts:write','external_accounts:read','external_accounts:write',
 'transfers:read','transfers:write','payouts:write',
]);
export class CustomerAuthorizationError extends Error {
 constructor(public code:string,message:string,public status=400){super(message);}
}
export const digest = async (text:string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const b64 = (bytes:Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
export const secret = (prefix:string) => prefix+b64(crypto.getRandomValues(new Uint8Array(32)));
export async function pkce(verifier:string){
 if(!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier))throw new CustomerAuthorizationError('invalid_grant','The authorization could not be exchanged.');
 return b64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
}
export function validateRequest(body:any,keyScopes:string[]){
 const {redirect_uri,state,external_user_id,code_challenge,code_challenge_method,scopes}=body;
 let u:URL;try{u=new URL(redirect_uri);}catch{throw new CustomerAuthorizationError('invalid_request','A registered HTTPS redirect_uri is required.');}
 if(u.protocol!=='https:'||u.username||u.password||u.hash||u.href!==redirect_uri||u.hostname==='localhost'||u.hostname.endsWith('.localhost')||/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname)||u.hostname.includes(':'))throw new CustomerAuthorizationError('invalid_request','Use an exact registered public HTTPS callback URL.');
 if(typeof state!=='string'||state.length<16||state.length>512||/[\x00-\x20\x7f]/.test(state))throw new CustomerAuthorizationError('invalid_request','Supply a random state of 16–512 characters.');
 if(typeof external_user_id!=='string'||!external_user_id.trim()||external_user_id.length>200)throw new CustomerAuthorizationError('invalid_request','external_user_id is required.');
 if(code_challenge_method!=='S256'||typeof code_challenge!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(code_challenge))throw new CustomerAuthorizationError('invalid_request','PKCE S256 is required.');
 if(!Array.isArray(scopes)||!scopes.length||scopes.length>DELEGABLE_SCOPES.size||scopes.some(s=>!DELEGABLE_SCOPES.has(s)||(!keyScopes.includes('*')&&!keyScopes.includes(s))))throw new CustomerAuthorizationError('invalid_scope','Request only explicit customer permissions available to your API key.');
 return {redirect_uri,state,external_user_id,challenge:code_challenge,scopes:[...new Set(scopes)]};
}
export async function handleCustomerAuthorization(db:any,route:string,body:any,ctx:{tenantId:string;apiKeyId:string;scopes:string[];defaultMode:string}){
 if(ctx.defaultMode!=='production')throw new CustomerAuthorizationError('environment_not_supported','Hosted customer authorization is for production. Sandbox uses synthetic customers.',403);
 if(route==='POST /v1/customer-authorizations'){
  const v=validateRequest(body,ctx.scopes);
  const ok=await db.rpc('api_customer_auth_allowed',{p_tenant:ctx.tenantId,p_key:ctx.apiKeyId,p_redirect:v.redirect_uri,p_scopes:v.scopes});
  if(ok.error||ok.data!==true)throw new CustomerAuthorizationError('redirect_not_registered','This callback or partner is not enabled for customer authorization.',403);
  const request=secret('bpa_');const expires_at=new Date(Date.now()+30*60_000).toISOString();
  const r=await db.from('api_customer_authorizations').insert({...v,tenant_id:ctx.tenantId,api_key_id:ctx.apiKeyId,request_hash:await digest(request),expires_at}).select('id').single();
  if(r.error)throw new CustomerAuthorizationError('authorization_unavailable','Could not start authorization. Please retry.',503);
  const audit=await db.from('api_customer_authorization_audit').insert({authorization_id:r.data.id,event:'created'});
  if(audit.error){await db.from('api_customer_authorizations').update({expires_at:new Date().toISOString()}).eq('id',r.data.id);throw new CustomerAuthorizationError('authorization_unavailable','Could not start authorization. Please retry.',503);}
  return {status:201,body:{success:true,data:{authorization_url:`https://app.borderpayafrica.com/partner/authorize#request=${request}`,expires_at}}};
 }
 if(route==='POST /v1/customer-authorizations/exchange'){
  if(!/^bpc_[A-Za-z0-9_-]{43}$/.test(body.code||''))throw new CustomerAuthorizationError('invalid_grant','The authorization could not be exchanged.');
  const challenge=await pkce(body.code_verifier||'');const token=secret('bpcust_');
  const r=await db.rpc('api_customer_auth_exchange',{p_tenant:ctx.tenantId,p_key:ctx.apiKeyId,p_code_hash:await digest(body.code),p_redirect:String(body.redirect_uri||''),p_challenge:challenge,p_token_hash:await digest(token)});
  if(r.error||!r.data)throw new CustomerAuthorizationError('invalid_grant','The code is invalid, expired, already used or belongs to another client.');
  return {status:200,body:{success:true,data:{access_token:token,token_type:'Bearer',expires_in:Math.max(0,Math.floor((Date.parse(r.data.expires_at)-Date.now())/1000)),expires_at:r.data.expires_at,scope:r.data.scopes.join(' '),external_user_id:r.data.external_user_id}}};
 }
 if(route==='POST /v1/customer-authorizations/revoke'){
  if(typeof body.token!=='string'||body.token.length>256)throw new CustomerAuthorizationError('invalid_request','A token is required.');
  const r=await db.rpc('api_customer_auth_revoke',{p_tenant:ctx.tenantId,p_key:ctx.apiKeyId,p_token_hash:await digest(body.token)});
  if(r.error)throw new CustomerAuthorizationError('authorization_unavailable','Could not revoke authorization. Please retry.',503);
  return {status:200,body:{success:true}};
 }
 throw new CustomerAuthorizationError('not_found','Unknown authorization operation.',404);
}
export async function resolveDelegatedCustomer(db:any,tenantId:string,keyId:string,header:string,scope:string){
 const token=header.replace(/^Bearer\s+/i,'');
 if(!/^bpcust_[A-Za-z0-9_-]{43}$/.test(token))throw new CustomerAuthorizationError('customer_session_invalid','The customer authorization is invalid or expired.',401);
 const r=await db.rpc('api_customer_auth_resolve',{p_tenant:tenantId,p_key:keyId,p_token_hash:await digest(token),p_scope:scope});
 if(r.error||!r.data?.session)throw new CustomerAuthorizationError('customer_session_invalid','The customer authorization is invalid, expired, revoked or lacks permission.',401);
 // Revalidate the original user with Auth on every request. Core payment checks still run.
 const verified=await db.auth.getUser(r.data.session);
 if(verified.error||verified.data?.user?.id!==r.data.user_id)throw new CustomerAuthorizationError('customer_session_invalid','Sign in again to renew customer authorization.',401);
 return {userId:r.data.user_id,endUserId:r.data.end_user_id,authorization:`Bearer ${r.data.session}`};
}

/** The JWT must already have passed Auth.getUser. Parsing here is never signature verification. */
export function verifiedSessionClaims(token:string,user:any,now=Date.now()){
 let claims:any;try{claims=JSON.parse(atob(token.split('.')[1].replaceAll('-','+').replaceAll('_','/')));}catch{throw new CustomerAuthorizationError('customer_session_invalid','Sign in again.',401);}
 if(claims.sub!==user.id||!Number.isFinite(claims.exp)||claims.exp*1000<=now+30_000||!user.email_confirmed_at)throw new CustomerAuthorizationError('customer_session_invalid','Confirm your email and sign in again.',401);
 if(user.factors?.some((f:any)=>f.status==='verified')&&claims.aal!=='aal2')throw new CustomerAuthorizationError('mfa_required','Complete two-factor authentication before authorizing access.',403);
 return new Date(claims.exp*1000).toISOString();
}
