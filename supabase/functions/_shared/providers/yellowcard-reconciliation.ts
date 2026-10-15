import { YellowCardFullProductClient, type YellowCardEnvironment } from './yellowcard-full-product.ts';
import { object, nonempty } from './yellowcard-validation.ts';
import { providerAmount, type Balance } from './yellowcard-money.ts';
import { financialState, type TransactionFamily } from './yellowcard-lifecycle.ts';
import { EvidenceCipher, payloadHash } from './yellowcard-evidence.ts';
import type { YCOperation } from './yellowcard-operation-catalog.ts';
export interface BoundResource {id:string;merchant_id:string;environment:YellowCardEnvironment;provider_resource_id:string;resource_kind:'vault'|'sub_wallet'|'virtual_account';status:string}
export function resourceBalances(binding:BoundResource,response:unknown,now=new Date().toISOString()):Balance[] {
  const data=object(response);
  if(data.id!==binding.provider_resource_id)throw new Error('Provider resource response mismatch');
  const base={merchantId:binding.merchant_id,environment:binding.environment,resourceId:binding.id,observedAt:now,active:binding.status==='active'};
  if(binding.resource_kind==='virtual_account')return [];
  if(binding.resource_kind==='sub_wallet') {
    if(typeof data.currency!=='string'||!/^[A-Z]{3}$/.test(data.currency))throw new Error('Missing fiat currency');
    return [{...base,kind:'fiat',asset:data.currency,available:providerAmount(data.availableBalance),held:null,active:data.status==='active'&&base.active}];
  }
  if(!Array.isArray(data.assets))throw new Error('Missing vault balances');
  return data.assets.map(item=>{const a=object(item);return {...base,kind:'crypto',asset:nonempty(a.id,'asset'),available:providerAmount(a.available),held:a.pending===undefined?null:providerAmount(a.pending)};});
}
export function transactionObservation(family:TransactionFamily,data:Record<string,unknown>) {
  const status=nonempty(data.status,'status'), id=nonempty(data.id,'transaction');
  const custody=family==='custody';
  const amount=data.amount===undefined?null:providerAmount(data.amount);
  const currency=custody?nonempty(data.currency,'currency'):family==='send'||family==='receive'?'USD':null;
  // Fees absent in evidence remain unknown. Network fees for crypto need the gas asset separately.
  return {family,provider_transaction_id:id,sequence_id:typeof data.sequenceId==='string'?data.sequenceId:null,status:financialState(family,status),amount,currency,
    settled_amount:data.convertedAmount===undefined?null:providerAmount(data.convertedAmount),settled_currency:data.convertedAmount===undefined?null:nonempty(data.currency,'currency'),
    provider_fee:data.serviceFeeAmountUSD===undefined?null:providerAmount(data.serviceFeeAmountUSD),provider_fee_currency:data.serviceFeeAmountUSD===undefined?null:'USD',
    network_fee:custody?(data.networkFee===undefined?null:providerAmount(data.networkFee)):(data.networkFeeAmountUSD===undefined?null:providerAmount(data.networkFeeAmountUSD)),network_fee_currency:custody?null:data.networkFeeAmountUSD===undefined?null:'USD',
    rate:data.rate===undefined?null:providerAmount(data.rate),transaction_hash:typeof data.transactionHash==='string'?data.transactionHash:null};
}
export interface ReconcileStore {
  owners(environment:YellowCardEnvironment,family:TransactionFamily,data:Record<string,unknown>):Promise<string[]>;
  record(environment:YellowCardEnvironment,merchant:string,observation:ReturnType<typeof transactionObservation>,sealed:unknown,hash:string,observedAt:string):Promise<void>;
  pendingSources(environment:YellowCardEnvironment,merchant:string,providerId:string):Promise<BoundResource[]>;
  settleSource(resource:BoundResource,balances:Balance[],providerId:string,status:string):Promise<void>;
  account(environment:YellowCardEnvironment,id:string,status:string,observedAt:string):Promise<boolean>;
}
const lookup:Record<string,{operation:YCOperation;family:TransactionFamily;param:string}>={
  SEND:{operation:'getSend',family:'send',param:'id'},PAYMENT:{operation:'getSend',family:'send',param:'id'},
  RECEIVE:{operation:'getReceive',family:'receive',param:'id'},COLLECTION:{operation:'getReceive',family:'receive',param:'id'},
  CUSTODY:{operation:'getCustodySend',family:'custody',param:'id'},CRYPTO_SEND:{operation:'getCryptoConversion',family:'crypto_send',param:'id'},
  RFQ:{operation:'getRFQ',family:'rfq',param:'rfqId'}
};
export class YellowCardReconciler {
  constructor(private readonly client:YellowCardFullProductClient,private readonly store:ReconcileStore,private readonly cipher:EvidenceCipher) {}
  async observe(environment:YellowCardEnvironment,family:TransactionFamily,raw:Record<string,unknown>) {
    const owners=await this.store.owners(environment,family,raw);
    if(!owners.length)throw new Error('unknown_merchant_binding');
    const observation=transactionObservation(family,raw),hash=await payloadHash(raw),observedAt=new Date().toISOString();
    for(const merchant of [...new Set(owners)]) {
      const sealed=await this.cipher.seal(new TextEncoder().encode(JSON.stringify(raw)),`yc:observation:${environment}:${merchant}:${hash}`);
      await this.store.record(environment,merchant,observation,sealed,hash,observedAt);
      if(['completed','failed','denied','expired','refunded'].includes(observation.status)) {
        const sources=await this.store.pendingSources(environment,merchant,observation.provider_transaction_id);
        for(const source of sources) {
          const data=await this.client.operation(source.resource_kind==='vault'?'getVault':'getSubWalletById',{params:source.resource_kind==='vault'?{vaultId:source.provider_resource_id}:{id:source.provider_resource_id}});
          await this.store.settleSource(source,resourceBalances(source,data),observation.provider_transaction_id,observation.status);
        }
      }
    }
  }
  async event(environment:YellowCardEnvironment,event:Record<string,unknown>) {
    const family=nonempty(event.event,'event').split('.')[0],id=nonempty(event.id,'id');
    if(family==='VIBAN') {
      const data=object(await this.client.operation('getVirtualAccountById',{params:{id}}));
      if(data.id!==id || !['PENDING','ACTIVE','FROZEN','CLOSED'].includes(String(data.status)))throw new Error('unknown_account_status');
      if(!await this.store.account(environment,id,String(data.status).toLowerCase(),new Date().toISOString()))throw new Error('unknown_account_binding');
      return;
    }
    const route=lookup[family];if(!route)throw new Error('unmapped_event_family');
    const data=object(await this.client.operation(route.operation,{params:{[route.param]:id}}));
    if(data.id!==id)throw new Error('transaction_response_mismatch');
    await this.observe(environment,route.family,data);
  }
}
/** Commit cursors only after EVERY item is persisted. A repeated cursor is an error, not completion. */
export async function reconcilePages(input:{cursor?:string;maxPages?:number;load:(cursor?:string)=>Promise<{items:Record<string,unknown>[];nextCursor?:string|null}>;consume:(item:Record<string,unknown>)=>Promise<void>;checkpoint:(cursor:string|null,complete:boolean)=>Promise<void>}) {
  let cursor=input.cursor;const seen=new Set<string>();let count=0;
  for(let page=0;page<(input.maxPages??20);page++) {
    if(cursor&&seen.has(cursor))throw new Error('Repeated provider cursor');if(cursor)seen.add(cursor);
    const result=await input.load(cursor);
    for(const item of result.items){await input.consume(item);count++;}
    const next=result.nextCursor??null;
    if(next&&seen.has(next))throw new Error('Repeated provider cursor');
    await input.checkpoint(next,!next);if(!next)return {count,complete:true,cursor:null};cursor=next;
  }
  return {count,complete:false,cursor:cursor??null};
}
