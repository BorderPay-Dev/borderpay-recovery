import {assertEquals,assertRejects} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {handleSandboxApi,sandboxRequest,sandboxRouteEnabled,SandboxError} from "../supabase/functions/_shared/api-sandbox-runtime.ts";
const context={tenantId:"tenant-a",mode:"sandbox",metadata:{sandbox_api_enabled:true},idempotencyKey:"test-key-1234"};
Deno.test("sandbox opt-in is exact, scoped and never production",()=>{
 for(const mode of ["production","Sandbox",""])assertEquals(sandboxRouteEnabled(mode,{sandbox_api_enabled:true},"POST /v1/transfers"),false);
 for(const flag of [false,undefined,"true"])assertEquals(sandboxRouteEnabled("sandbox",{sandbox_api_enabled:flag},"POST /v1/customers"),false);
 assertEquals(sandboxRouteEnabled("sandbox",{sandbox_api_enabled:true},"POST /v1/customers"),true);
 assertEquals(sandboxRouteEnabled("sandbox",{sandbox_api_enabled:true},"POST /v1/verification-links"),false);
});
Deno.test("production context fails before DB or network",async()=>{
 await assertRejects(()=>handleSandboxApi({},"POST /v1/transfers",{}, {...context,mode:"production"}),SandboxError);
});
Deno.test("credentials must be sandbox-only and cannot be supplied by caller",async()=>{
 let called=false;
 await assertRejects(()=>sandboxRequest({rpc:()=>({data:"sk-live-secret"})},"GET","/v0/customers",null,"id",async()=>{called=true;return new Response('{}')}),SandboxError);
 assertEquals(called,false);
});
Deno.test("sandbox URL is constant and redirects are refused",async()=>{
 let called=false;
 await sandboxRequest({rpc:(n:string)=>{assertEquals(n,"api_sandbox_credential");return {data:"sk-test-fixture"}}},"POST","/v0/customers",{type:"business"},"id",async(url,options)=>{
  called=true;assertEquals(url,"https://api.sandbox.bridge.xyz/v0/customers");assertEquals(options?.redirect,"error");assertEquals((options?.headers as any)["Api-Key"],"sk-test-fixture");return new Response('{"id":"test"}');
 });assertEquals(called,true);
 for(const p of ["https://api.bridge.xyz/v0/customers","/v0/customers/../transfers","/v0/customers#fragment"]){await assertRejects(()=>sandboxRequest({},"GET",p,null,"id"),SandboxError);}
});
Deno.test("personal customers and real email input fail before provider calls",async()=>{
 await assertRejects(()=>handleSandboxApi({},"POST /v1/customers",{account_type:"individual"},context),SandboxError);
 await assertRejects(()=>handleSandboxApi({},"POST /v1/customers",{synthetic_data:true,email:"merchant@real-domain.com"},context),SandboxError);
});
Deno.test("customer ownership is checked with tenant scope before network",async()=>{
 const filters:any[]=[];const q:any={select:()=>q,eq:(k:string,v:string)=>{filters.push([k,v]);return q},maybeSingle:()=>({data:null})};
 let net=false;
 await assertRejects(()=>handleSandboxApi({from:(t:string)=>{assertEquals(t,"api_sandbox_resources");return q}},"POST /v1/transfers",{customer_id:"someone-elses-customer"},context,async()=>{net=true;return new Response('{}')}),SandboxError);
 assertEquals(net,false);assertEquals(filters,[["tenant_id","tenant-a"],["kind","customer"],["resource_id","someone-elses-customer"]]);
});
Deno.test("wallet ownership is checked independently within customer",async()=>{
 const filters:any[]=[];const q:any={select:()=>q,eq:(k:string,v:string)=>{filters.push([k,v]);return q},maybeSingle:()=>({data:filters.some(x=>x[0]==="kind"&&x[1]==="wallet")?null:{metadata:{}}})};
 let net=false;
 await assertRejects(()=>handleSandboxApi({from:()=>q},"POST /v1/sandbox/deposits",{customer_id:"customer-a",wallet_id:"wallet-b",amount:"1",currency:"USDC"},context,async()=>{net=true;return new Response('{}')}),SandboxError);
 assertEquals(net,false);assertEquals(filters.some(x=>x[0]==="customer_id"&&x[1]==="customer-a"),true);
});
Deno.test("upstream failures do not leak provider diagnostics",async()=>{
 try{await sandboxRequest({rpc:()=>({data:"sk-test-fixture"})},"POST","/v0/customers",{},"id",async()=>new Response(JSON.stringify({message:"Bridge customer private info"}),{status:400}));throw Error("expected failure")}catch(e){assertEquals(e instanceof SandboxError,true);assertEquals(String(e).includes("private info"),false);}
});
Deno.test("sandbox business creation has unique stable agreement, all requested corridors and isolated mappings",async()=>{
 const authId="1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
 const saved:any[]=[];const bodies:any[]=[];const keys:any[]=[];
 const db:any={rpc:()=>({data:"sk-test-fixture"}),from:(table:string)=>{
  assertEquals(table,"api_sandbox_resources");const q:any={select:()=>q,eq:()=>q,maybeSingle:()=>({data:{resource_id:authId,metadata:{expires_at:"2099-01-01T00:00:00Z"}}}),upsert:(row:any)=>{saved.push(row);return {error:null}}};return q;
 }};
 const fetcher=async(_url:any,options:any)=>{bodies.push(JSON.parse(options.body));keys.push(options.headers["Idempotency-Key"]);return new Response('{"id":"test-customer","status":"awaiting_ubo"}',{status:201});};
 const input={synthetic_data:true,onboarding_token:"test-token",email:"company@example.com",business_legal_name:"Synthetic LLC",registered_address:{street_line_1:"123 Example St",city:"London",postal_code:"SW1A 1AA",country:"GBR"}};
 await handleSandboxApi(db,"POST /v1/customers",input,context,fetcher);
 await handleSandboxApi(db,"POST /v1/customers",input,{...context,idempotencyKey:"another-key"},fetcher);
 assertEquals(bodies[0].signed_agreement_id,"12345678-90ab-4def-8234-567890abcdef");
 assertEquals(bodies[0].signed_agreement_id,bodies[1].signed_agreement_id);
 assertEquals(keys[0],keys[1]);
 assertEquals(bodies[0].endorsements,["base","sepa","faster_payments"]);
 assertEquals(saved.every(r=>r.tenant_id==="tenant-a"),true);
 assertEquals(saved.some(r=>r.kind==="customer"&&r.resource_id==="test-customer"),true);
});
Deno.test("empty successful external-account deletion is accepted",async()=>{
 assertEquals(await sandboxRequest({rpc:()=>({data:"sk-test-fixture"})},"DELETE","/v0/customers/test/external_accounts/test",null,"id",async()=>new Response(null,{status:204})),{});
});

Deno.test("DELETE keeps idempotency at BorderPay and omits unsupported upstream header",async()=>{
 let seen=false;
 await sandboxRequest({rpc:()=>({data:"sk-test-fixture"})},"DELETE","/v0/customers/test/external_accounts/test",{},"partner-retry-key",async(_url,options)=>{
  seen=true;assertEquals(options?.method,"DELETE");assertEquals(new Headers(options?.headers).has("Idempotency-Key"),false);return new Response('{"id":"test","active":false}');
 });assertEquals(seen,true);
});
