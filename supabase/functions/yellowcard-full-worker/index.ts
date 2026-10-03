import { pollCustody } from '../_shared/providers/yellowcard-poller.ts';
import { runtime, configuredEnvironment } from '../_shared/providers/yellowcard-runtime.ts';
import { YellowCardReconciler } from '../_shared/providers/yellowcard-reconciliation.ts';
import { processEvents, type ClaimedEvent } from './handler.ts';
const env=(name:string)=>Deno.env.get(name);
Deno.serve(async(req:Request)=>{
  const key=env('SUPABASE_SERVICE_ROLE_KEY');
  if(req.method!=='POST'||!key||req.headers.get('Authorization')!==`Bearer ${key}`)return new Response('Unauthorized',{status:401});
  try {
    const environment=configuredEnvironment(env),r=await runtime(environment,env);
    const result=await processEvents({environment,cipher:r.cipher,reconciler:new YellowCardReconciler(r.client,r.store,r.cipher),
      claim:async()=>await r.store.request('rpc/yc_claim_events','POST',{p_environment:environment,p_limit:10}) as ClaimedEvent[],
      finish:async(id,lease,state,code)=>await r.store.request('rpc/yc_finish_event','POST',{p_id:id,p_lease:lease,p_state:state,p_code:code}) as boolean});
    const resources=await r.store.request(`yc_reconciliation_cursors?environment=eq.${environment}&stream=eq.custody&order=updated_at.asc&limit=5&select=resource_key`) as {resource_key:string}[];
    let polled=0;
    for(const resource of resources) {
      const poll=await pollCustody({environment,vaultId:resource.resource_key,client:r.client,reconciler:new YellowCardReconciler(r.client,r.store,r.cipher),store:{claim:(e,id)=>r.store.claimPoll(e,id),checkpoint:(e,id,t,c,done)=>r.store.checkpointPoll(e,id,t,c,done)}});polled+=poll.count;
    }
    return Response.json({...result,polled});
  }catch{return Response.json({error:'Reconciliation unavailable'},{status:503});}
});
