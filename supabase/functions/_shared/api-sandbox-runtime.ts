/** Isolated synthetic API integration. No live core functions or user-profile writes. */
import { sha256Hex } from "./public-api-v258/api-webhook-security.ts";
export class SandboxError extends Error {
 constructor(public code:string,message:string,public status=400){super(message);}
}
type Obj=Record<string,any>;
type Result={status:number;body:Obj};
const ORIGIN="https://api.sandbox.bridge.xyz";
const SCOPES:Record<string,string>={
 "POST /v1/sandbox/approve-customer":"customers:write",
 "POST /v1/sandbox/deposits":"wallets:write",
 "POST /v1/sandbox/webhook-events":"webhooks:write",
};
export const SANDBOX_SCOPES=SCOPES;
const ROUTES=new Set([...Object.keys(SCOPES),
 "POST /v1/onboarding-authorizations","GET /v1/customers","POST /v1/customers",
 "GET /v1/wallets","GET /v1/balances","POST /v1/wallets",
 "GET /v1/virtual-accounts","POST /v1/virtual-accounts",
 "GET /v1/external-accounts","POST /v1/external-accounts","DELETE /v1/external-accounts",
 "GET /v1/transfers","POST /v1/transfers","POST /v1/payouts",
]);
export function sandboxRouteEnabled(mode:string,metadata:Obj,route:string):boolean {
 return mode==="sandbox" && metadata.sandbox_api_enabled===true && ROUTES.has(route);
}
function required(v:unknown,name:string):string {
 if(typeof v!=="string"||!v.trim()||v.length>1024)throw new SandboxError("invalid_request",`${name} is required.`);
 return v.trim();
}
function id(v:unknown,name:string):string {
 const s=required(v,name);if(!/^[a-zA-Z0-9_-]{1,128}$/.test(s))throw new SandboxError("invalid_request",`Invalid ${name}.`);return s;
}
function amount(v:unknown):string {
 const s=String(v??"");if(!/^\d{1,9}(\.\d{1,6})?$/.test(s)||Number(s)<=0||Number(s)>100000)throw new SandboxError("invalid_request","Use a positive test amount up to 100000.");return s;
}
function pick(o:Obj,keys:string[]):Obj{return Object.fromEntries(keys.filter(k=>o?.[k]!==undefined).map(k=>[k,o[k]]));}
function ok(data:Obj,status=200):Result{return {status,body:{success:true,data:{...data,mode:"sandbox"}}};}
export async function sandboxRequest(db:any,method:string,path:string,body:unknown,key:string,fetcher=fetch):Promise<any>{
 // The partner cannot choose a URL, provider credential, or redirect target.
 if(!/^\/v0\/[a-zA-Z0-9_/?=&.-]+$/.test(path)||path.includes(".."))throw new SandboxError("invalid_request","Invalid sandbox resource path.");
 const c=await db.rpc("api_sandbox_credential");
 if(c.error||typeof c.data!=="string"||!c.data.startsWith("sk-test"))throw new SandboxError("sandbox_unavailable","Sandbox credentials are unavailable.",503);
 const res=await fetcher(ORIGIN+path,{method,redirect:"error",headers:{"Api-Key":c.data,"Content-Type":"application/json",...(method!=="GET"?{"Idempotency-Key":key}:{})},...(method!=="GET"?{body:JSON.stringify(body??{})}:{}),signal:AbortSignal.timeout(20000)});
 const data=await res.json().catch(()=>null);
 if(!res.ok){
  // Never expose upstream names, raw documents, URLs, or diagnostic internals.
  const code=res.status===429?"rate_limited":res.status>=500?"sandbox_unavailable":"sandbox_request_rejected";
  throw new SandboxError(code,res.status>=500?"The sandbox is temporarily unavailable. Retry with the same Idempotency-Key.":"The sandbox rejected this request. Check required business details, verification status, currency and account fields.",res.status>=400&&res.status<500?res.status:502);
 }
 if(!data||typeof data!=="object")throw new SandboxError("sandbox_unavailable","Sandbox response could not be confirmed.",502);
 return data;
}
export async function handleSandboxApi(db:any,route:string,body:Obj,ctx:{tenantId:string;mode:string;metadata:Obj;idempotencyKey:string},fetcher=fetch):Promise<Result>{
 if(!sandboxRouteEnabled(ctx.mode,ctx.metadata,route))throw new SandboxError("sandbox_disabled","This sandbox operation is not enabled.",403);
 if(body.account_type && body.account_type!=="business" || body.type && body.type!=="business")throw new SandboxError("business_accounts_only","Only business customers are supported.",403);
 const tid=ctx.tenantId;
 const key=await sha256Hex(`sandbox:${tid}:${route}:${ctx.idempotencyKey}`);
 const call=(method:string,path:string,payload:unknown=null,suffix="")=>sandboxRequest(db,method,path,payload,key+suffix,fetcher);
 const rows=async(kind:string,customer?:string)=>{
  let q=db.from("api_sandbox_resources").select("resource_id,customer_id,metadata").eq("tenant_id",tid).eq("kind",kind);
  if(customer)q=q.eq("customer_id",customer);const r=await q.order("created_at",{ascending:false}).limit(100);
  if(r.error)throw new SandboxError("sandbox_unavailable","Sandbox records are unavailable.",503);return r.data||[];
 };
 const owned=async(kind:string,rid:string,customer?:string)=>{
  let q=db.from("api_sandbox_resources").select("resource_id,customer_id,metadata").eq("tenant_id",tid).eq("kind",kind).eq("resource_id",rid);
  if(customer)q=q.eq("customer_id",customer);const r=await q.maybeSingle();
  if(r.error)throw new SandboxError("sandbox_unavailable","Sandbox ownership could not be checked.",503);
  if(!r.data)throw new SandboxError("tenant_resource_forbidden","This sandbox resource does not belong to this customer and tenant.",403);return r.data;
 };
 const save=async(kind:string,rid:string,customer:string|null,metadata:Obj={})=>{
  const r=await db.from("api_sandbox_resources").upsert({tenant_id:tid,kind,resource_id:rid,customer_id:customer,metadata},{onConflict:"tenant_id,kind,resource_id"});
  if(r.error)throw new SandboxError("sandbox_unavailable","Sandbox mapping could not be saved. Retry with the same Idempotency-Key.",503);
 };
 if(route==="POST /v1/onboarding-authorizations"){
  if(body.onboarding_channel && body.onboarding_channel!=="api")throw new SandboxError("invalid_request","This sandbox supports API business onboarding.");
  if(body.requested_account_types && (JSON.stringify(body.requested_account_types)!=='["business"]'))throw new SandboxError("business_accounts_only","Only business customers are supported.",403);
  const external=required(body.external_user_id,"external_user_id");
  const token=`bpsa_${crypto.randomUUID()}_${crypto.randomUUID()}`;
  const expiry=new Date(Date.now()+3600000).toISOString();
  await save("authorization",await sha256Hex(token),null,{external_user_id:external,expires_at:expiry});
  return ok({onboarding_token:token,expires_at:expiry,allowed_account_types:["business"],signup_url:null,next_step:"POST /v1/customers with this onboarding_token and synthetic business details. Hosted signup is not used in sandbox."},201);
 }
 if(route==="POST /v1/customers"){
  if(body.synthetic_data!==true)throw new SandboxError("synthetic_data_required","Set synthetic_data to true and use a fictional business with an example.com, example.org or example.net email.");
  const email=required(body.email,"email");if(!/^[^@\s]+@example\.(com|org|net)$/i.test(email))throw new SandboxError("invalid_request","Use a synthetic email at example.com, example.org or example.net.");
  const auth=await owned("authorization",await sha256Hex(required(body.onboarding_token,"onboarding_token")));
  if(Date.parse(auth.metadata.expires_at)<Date.now())throw new SandboxError("authorization_expired","Create a new sandbox onboarding authorization.",403);
  if(auth.metadata.customer_id){await owned("customer",auth.metadata.customer_id);return ok({customer_id:auth.metadata.customer_id,account_type:"business"});}
  const address=body.registered_address;
  for(const field of ["street_line_1","city","postal_code","country"])required(address?.[field],`registered_address.${field}`);
  if(!/^[A-Z]{3}$/.test(address.country))throw new SandboxError("invalid_request","Use an ISO alpha-3 registered country.");
  const name=required(body.business_legal_name||body.business_name,"business_legal_name");
  const data=await sandboxRequest(db,"POST","/v0/customers",{type:"business",business_legal_name:name,email,business_type:body.business_type||"llc",registered_address:address,physical_address:body.physical_address||address,signed_agreement_id:"00000000-0000-4000-8000-000000000001"},await sha256Hex(`sandbox-customer:${tid}:${auth.resource_id}`),fetcher);
  const cid=id(data.id,"customer_id");await save("customer",cid,cid,{name,country:address.country});
  await save("authorization",auth.resource_id,null,{...auth.metadata,customer_id:cid});
  return ok({customer_id:cid,account_type:"business",verification_status:data.status||data.kyc_status},201);
 }
 if(route==="GET /v1/customers"&&!body.customer_id)return ok({customers:(await rows("customer")).map((r:Obj)=>({customer_id:r.resource_id,account_type:"business",business_legal_name:r.metadata.name}))});
 const cid=id(body.customer_id,"customer_id");const customer=await owned("customer",cid);const base=`/v0/customers/${cid}`;
 if(route==="GET /v1/customers"){
  const d=await call("GET",base);return ok({customer_id:cid,account_type:"business",verification_status:d.status||d.kyc_status});
 }
 if(route==="POST /v1/sandbox/approve-customer"){
  await call("POST",base+"/simulate_kyc_approval",{});return ok({customer_id:cid,simulation_requested:true,next_step:"Read GET /v1/customers until verification_status is active or approved."});
 }
 if(route==="POST /v1/wallets"){
  const chain=String(body.chain||"").toLowerCase();if(!["base","tron"].includes(chain))throw new SandboxError("invalid_request","Choose BASE or TRON.");
  if(body.symbol&&!(["USDC","EURC"].includes(body.symbol)&&chain==="base"||body.symbol==="USDT"&&chain==="tron"))throw new SandboxError("invalid_request","Asset and chain do not match.");
  const d=await call("POST",base+"/wallets",{chain});await save("wallet",id(d.id,"wallet_id"),cid,{chain});return ok({wallet_id:d.id,chain:chain.toUpperCase(),deposit_address:d.address,symbol:body.symbol},201);
 }
 if(["GET /v1/wallets","GET /v1/balances"].includes(route)){
  const wallets=[];for(const w of await rows("wallet",cid)){const d=await call("GET",base+"/wallets/"+id(w.resource_id,"wallet_id"));wallets.push({wallet_id:d.id,chain:d.chain,address:d.address,balances:d.balances||[]});}return ok({wallets});
 }
 if(route==="POST /v1/virtual-accounts"){
  const currency=String(body.currency||"").toLowerCase();if(!["usd","eur","gbp"].includes(currency))throw new SandboxError("invalid_request","Choose USD, EUR or GBP.");
  if(body.destination)throw new SandboxError("invalid_request","BorderPay selects the settlement wallet.");
  const wallets=(await rows("wallet",cid)).filter((w:Obj)=>w.metadata.chain==="base");if(!wallets.length)throw new SandboxError("wallet_required","Create a BASE wallet first.",409);
  const d=await call("POST",base+"/virtual_accounts",{source:{currency},destination:{payment_rail:"base",currency:currency==="eur"?"eurc":"usdc",bridge_wallet_id:wallets[0].resource_id},developer_fee_percent:"0"});
  await save("virtual_account",id(d.id,"virtual_account_id"),cid,{currency,wallet_id:wallets[0].resource_id});return ok({virtual_account_id:d.id,currency:currency.toUpperCase(),status:d.status,source_deposit_instructions:d.source_deposit_instructions},201);
 }
 if(route==="GET /v1/virtual-accounts"){
  const vas=[];for(const v of await rows("virtual_account",cid)){const d=await call("GET",base+"/virtual_accounts/"+v.resource_id);vas.push({virtual_account_id:d.id,currency:v.metadata.currency.toUpperCase(),status:d.status,source_deposit_instructions:d.source_deposit_instructions});}return ok({virtual_accounts:vas});
 }
 if(route==="POST /v1/external-accounts"){
  const a=body.account;if(!a||!["us","iban","gb"].includes(a.account_type))throw new SandboxError("invalid_request","A US, IBAN or GB account is required.");
  if(a.account_owner_type!=="business")throw new SandboxError("business_accounts_only","External beneficiaries must be businesses.",403);
  const payload=pick(a,["account_type","account_owner_type","account_owner_name","first_name","last_name","business_name","bank_name","currency","address","account","iban","gb"]);
  const d=await call("POST",base+"/external_accounts",payload);await save("external_account",id(d.id,"external_account_id"),cid,{});return ok({external_account_id:d.id,status:d.active===false?"inactive":"active",account_type:d.account_type},201);
 }
 if(route==="GET /v1/external-accounts"){
  const accounts=[];for(const a of await rows("external_account",cid)){const d=await call("GET",base+"/external_accounts/"+a.resource_id);accounts.push({external_account_id:d.id,account_type:d.account_type,status:d.active===false?"inactive":"active",account_owner_name:d.account_owner_name});}return ok({external_accounts:accounts});
 }
 if(route==="DELETE /v1/external-accounts"){
  const eid=id(body.external_account_id,"external_account_id");await owned("external_account",eid,cid);await call("DELETE",base+"/external_accounts/"+eid);return ok({external_account_id:eid,deleted:true});
 }
 if(route==="POST /v1/sandbox/deposits"){
  const wid=id(body.wallet_id,"wallet_id");await owned("wallet",wid,cid);const currency=String(body.currency||"").toLowerCase();if(!["usdc","eurc","usdt"].includes(currency))throw new SandboxError("invalid_request","Choose USDC, EURC or USDT.");
  await call("POST",base+`/wallets/${wid}/simulate_deposit`,{amount:amount(body.amount),currency});return ok({wallet_id:wid,simulation_requested:true});
 }
 if(route==="POST /v1/sandbox/webhook-events"){
  const vid=id(body.virtual_account_id,"virtual_account_id");const va=await owned("virtual_account",vid,cid);
  const status=String(body.status||"funds_received");if(!["funds_received","payment_processed","in_review","refunded"].includes(status))throw new SandboxError("invalid_request","Unsupported test event status.");
  const eventType="virtual_account.activity.created";
  const payload={mode:"sandbox",simulated:true,resource:{id:vid,type:"virtual_account"},customer_id:cid,deposit_id:"test_"+key.slice(0,24),status,amount:amount(body.amount),currency:va.metadata.currency.toUpperCase()};
  const e=await db.rpc("api_webhook_enqueue_event",{p_tenant_id:tid,p_tenant_end_user_id:null,p_resource_id:null,p_event_type:eventType,p_idempotency_key:"sandbox:"+key,p_payload:payload,p_occurred_at:new Date().toISOString()});
  if(e.error)throw new SandboxError("sandbox_unavailable","The test webhook could not be queued.",503);return ok({event_id:e.data,event_type:eventType,queued:true,balance_changed:false},202);
 }
 if(["POST /v1/transfers","POST /v1/payouts"].includes(route)){
  const t=body.transfer||body;const s=t.source||{},d=t.destination||{};
  const wid=id(s.wallet_id,"source.wallet_id");await owned("wallet",wid,cid);
  if(s.payment_rail!=="borderpay_wallet")throw new SandboxError("invalid_request","Use borderpay_wallet as the funding rail.");
  const currency=String(s.currency||"").toLowerCase();if(!["usdc","eurc","usdt"].includes(currency))throw new SandboxError("invalid_request","Choose a supported funding asset.");
  const dest:Obj={payment_rail:d.payment_rail,currency:String(d.currency||"").toLowerCase()};
  if(d.payment_rail==="borderpay_wallet"){
   const dw=id(d.wallet_id,"destination.wallet_id");await owned("wallet",dw,cid);dest.payment_rail="bridge_wallet";dest.bridge_wallet_id=dw;
  }else if(["ach","wire","sepa","faster_payments"].includes(d.payment_rail)){
   const eid=id(d.external_account_id,"destination.external_account_id");await owned("external_account",eid,cid);dest.external_account_id=eid;
  }else throw new SandboxError("invalid_request","Use a saved sandbox business bank account or wallet.");
  const data=await call("POST","/v0/transfers",{on_behalf_of:cid,amount:amount(s.amount||t.amount),source:{payment_rail:"bridge_wallet",currency,bridge_wallet_id:wid},destination:dest});
  await save("transfer",id(data.id,"transfer_id"),cid,{});return ok({transfer_id:data.id,state:data.state||data.status},201);
 }
 if(route==="GET /v1/transfers"){
  const ts=body.transfer_id?[await owned("transfer",id(body.transfer_id,"transfer_id"),cid)]:await rows("transfer",cid);
  const transfers=[];for(const t of ts){const d=await call("GET","/v0/transfers/"+t.resource_id);transfers.push({transfer_id:d.id,state:d.state||d.status,amount:d.amount,currency:d.source?.currency});}return ok({transfers});
 }
 throw new SandboxError("sandbox_operation_unavailable","This operation is not supported in sandbox.",409);
}
