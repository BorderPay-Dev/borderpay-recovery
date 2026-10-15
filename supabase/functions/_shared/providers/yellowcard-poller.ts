import { YellowCardFullProductClient, type YellowCardEnvironment } from './yellowcard-full-product.ts';
import { YellowCardReconciler, reconcilePages } from './yellowcard-reconciliation.ts';
import { object } from './yellowcard-validation.ts';
export interface PollLease {token:string;cursor:string|null;from:string;to:string}
export interface PollStore {
  claim(environment:YellowCardEnvironment,resource:string):Promise<PollLease|null>;
  checkpoint(environment:YellowCardEnvironment,resource:string,token:string,cursor:string|null,complete:boolean):Promise<void>;
}
/** Run on a scheduler even if webhooks appear healthy: custody delivery has no guaranteed retry.
 * Initial from/to are persisted by the operator's initial inventory job; never silently skip history.
 */
export async function pollCustody(input:{environment:YellowCardEnvironment;vaultId:string;client:YellowCardFullProductClient;store:PollStore;reconciler:YellowCardReconciler}) {
  const lease=await input.store.claim(input.environment,input.vaultId);if(!lease)return {count:0,complete:false,cursor:null};
  return await reconcilePages({cursor:lease.cursor??undefined,maxPages:5,
    load:async(cursor)=>{
      const data=object(await input.client.operation('listTransactions',{query:{vaultId:input.vaultId,startDate:lease.from,endDate:lease.to,pageSize:'100',...(cursor?{cursor}:{})}}));
      if(!Array.isArray(data.transactions))throw new Error('Missing reconciliation transactions');
      const page=data.pagination?object(data.pagination):{};
      return {items:data.transactions.map(object),nextCursor:typeof page.nextCursor==='string'?page.nextCursor:null};
    },consume:(tx)=>input.reconciler.observe(input.environment,'custody',tx),
    checkpoint:(cursor,complete)=>input.store.checkpoint(input.environment,input.vaultId,lease.token,cursor,complete)});
}
