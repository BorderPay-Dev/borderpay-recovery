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
