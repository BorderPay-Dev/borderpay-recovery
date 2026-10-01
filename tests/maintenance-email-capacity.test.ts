import {maintenanceEmailCapacity} from "../supabase/functions/_shared/maintenance-email-capacity.ts";
function db(count:number|null,error:unknown=null){return {from:()=>({select:()=>({or:async()=>({count,error})})})};}
Deno.test("maintenance emails fail closed and honor local usage while provider reporting lags",async()=>{
 const fetchOriginal=globalThis.fetch;const key=Deno.env.get("BREVO_API_KEY");const keys=Deno.env.get("BREVO_API_KEYS");
 try{
  Deno.env.delete("BREVO_API_KEY");Deno.env.delete("BREVO_API_KEYS");
  if(await maintenanceEmailCapacity(db(0))!==0)throw Error("missing key must defer");
  Deno.env.set("BREVO_API_KEY","synthetic-key");
  globalThis.fetch=async(input)=>new Response(JSON.stringify(String(input).includes("/account")?{plan:[{type:"free",credits:300}]}:{requests:20}),{status:200});
  if(await maintenanceEmailCapacity(db(323))!==0)throw Error("local quota bypass");
  if(await maintenanceEmailCapacity(db(250))!==30)throw Error("reserve mismatch");
  if(await maintenanceEmailCapacity(db(null,{message:"unavailable"}))!==0)throw Error("database errors must defer");
  globalThis.fetch=async()=>new Response("Unavailable",{status:503});
  if(await maintenanceEmailCapacity(db(0))!==0)throw Error("provider errors must defer");
 }finally{globalThis.fetch=fetchOriginal;if(key===undefined)Deno.env.delete("BREVO_API_KEY");else Deno.env.set("BREVO_API_KEY",key);if(keys===undefined)Deno.env.delete("BREVO_API_KEYS");else Deno.env.set("BREVO_API_KEYS",keys);}
});
