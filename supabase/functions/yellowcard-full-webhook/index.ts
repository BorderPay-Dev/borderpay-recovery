import { runtime, configuredEnvironment } from '../_shared/providers/yellowcard-runtime.ts';
import { webhookHandler } from './handler.ts';
const env=(name:string)=>Deno.env.get(name);
Deno.serve(async(req:Request)=>{
  try {const environment=configuredEnvironment(env),r=await runtime(environment,env);return await webhookHandler({environment,keys:r.webhookKeys,cipher:r.cipher,inbox:r.store})(req);}
  catch{return new Response(JSON.stringify({error:'Webhook service unavailable'}),{status:503,headers:{'Content-Type':'application/json'}});}
});
