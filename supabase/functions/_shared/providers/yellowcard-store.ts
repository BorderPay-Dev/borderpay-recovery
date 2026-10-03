import type { Balance } from './yellowcard-money.ts';
import type { BoundResource, ReconcileStore, transactionObservation } from './yellowcard-reconciliation.ts';
import type { TransactionFamily } from './yellowcard-lifecycle.ts';
import type { PaymentStore, MerchantContext, PaymentIntent, StoredOperation } from './yellowcard-payment-engine.ts';
import type { SealedEvidence } from './yellowcard-evidence.ts';
import type { WebhookInbox } from '../../yellowcard-full-webhook/handler.ts';
import type { YellowCardEnvironment } from './yellowcard-full-product.ts';
/** Only construct on the server. No keys, account details or provider errors are logged. */
export class YellowCardStore implements PaymentStore,WebhookInbox,ReconcileStore {
  constructor(private readonly url:string,private readonly serviceKey:string,private readonly fetcher:typeof fetch=fetch) {
    const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash||!serviceKey)throw new Error('Database configuration unavailable');
  }
  async request(path:string,method='GET',body?:unknown,prefer?:string):Promise<unknown> {
    if(!/^(yc_[a-z_]+|rpc\/yc_[a-z_]+)(\?|$)/.test(path))throw new Error('Invalid storage path');
    const response=await this.fetcher(new URL('/rest/v1/'+path,this.url),{method,headers:{apikey:this.serviceKey,Authorization:`Bearer ${this.serviceKey}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(2000),redirect:'error'});
    if(!response.ok){await response.body?.cancel();throw new Error('YC storage operation failed');}
    const text=await response.text(); return text ? JSON.parse(text) : null;
  }
  private scope(context:MerchantContext) {return `merchant_id=eq.${encodeURIComponent(context.merchantId)}&environment=eq.${context.environment}`;}
  async resource(context:MerchantContext,id:string) {
    const rows=await this.request(`yc_resources?${this.scope(context)}&id=eq.${encodeURIComponent(id)}&select=provider_resource_id,resource_kind,status`) as {provider_resource_id:string;resource_kind:string;status:string}[];
    return rows.length===1?rows[0]:null;
  }
  async ownsTransaction(context:MerchantContext,id:string,creationOperation:string) {
    const rows=await this.request(`yc_operations?${this.scope(context)}&provider_id=eq.${encodeURIComponent(id)}&operation=eq.${encodeURIComponent(creationOperation)}&select=id`) as unknown[];
    return rows.length===1;
  }
  async reserve(c:MerchantContext,i:PaymentIntent,hash:string,sealed:SealedEvidence,a:{reference:string;expiresAt:string}) {
    return await this.request('rpc/yc_reserve_operation','POST',{p_merchant:c.merchantId,p_environment:c.environment,p_operation:i.operation,p_sequence:i.sequenceId,p_hash:hash,p_source:i.sourceResourceId,p_asset:i.sourceAsset,p_amount:i.reserveAmount,p_authorization:a.reference,p_expires:a.expiresAt,p_sealed:sealed}) as StoredOperation;
  }
  async claim(c:MerchantContext,id:string,hash:string) {
    return await this.request('rpc/yc_claim_operation','POST',{p_id:id,p_merchant:c.merchantId,p_environment:c.environment,p_hash:hash}) as StoredOperation|null;
  }
  async finish(id:string,lease:string,state:'submitted'|'outcome_unknown'|'rejected'|'review_required',providerId:string|null,code:string|null) {
    return await this.request('rpc/yc_finish_operation','POST',{p_id:id,p_lease:lease,p_state:state,p_provider_id:providerId,p_code:code}) as boolean;
  }
  async enqueue(i:{environment:YellowCardEnvironment;fingerprint:string;eventType:string;sealed:SealedEvidence}) {
    await this.request('yc_webhook_inbox?on_conflict=fingerprint','POST',{environment:i.environment,fingerprint:i.fingerprint,event_type:i.eventType,sealed_payload:i.sealed},'resolution=ignore-duplicates,return=minimal');
  }
  async claimPoll(environment:YellowCardEnvironment,resource:string) {
    return await this.request('rpc/yc_claim_poll','POST',{p_environment:environment,p_resource:resource}) as {token:string;cursor:string|null;from:string;to:string}|null;
  }
  async checkpointPoll(environment:YellowCardEnvironment,resource:string,token:string,cursor:string|null,complete:boolean) {
    const ok=await this.request('rpc/yc_checkpoint_poll','POST',{p_environment:environment,p_resource:resource,p_token:token,p_cursor:cursor,p_complete:complete});if(!ok)throw new Error('Reconciliation lease lost');
  }
  async existing(c:MerchantContext,kind:'vault'|'sub_wallet',currency?:string) {
    const rows=await this.request(`yc_resources?${this.scope(c)}&resource_kind=eq.${kind}${currency?'&currency=eq.'+encodeURIComponent(currency):''}&select=id,provider_resource_id`) as {id:string;provider_resource_id:string}[];
    if(rows.length>1)throw new Error('Ambiguous merchant resource');return rows[0]??null;
  }
  async operation(c:MerchantContext,sequenceId:string) {
    const rows=await this.request(`yc_operations?${this.scope(c)}&sequence_id=eq.${encodeURIComponent(sequenceId)}&select=*`) as StoredOperation[];
    return rows.length===1?rows[0]:null;
  }
  async bind(c:MerchantContext,resource:{kind:'vault'|'sub_wallet'|'virtual_account';providerId:string;currency?:string;parentId?:string;status:string}) {
    const existing=await this.request(`yc_resources?${this.scope(c)}&resource_kind=eq.${resource.kind}&provider_resource_id=eq.${encodeURIComponent(resource.providerId)}&select=id`) as {id:string}[];
    if(existing.length===1)return existing[0].id;
    const rows=await this.request('yc_resources','POST',{merchant_id:c.merchantId,environment:c.environment,resource_kind:resource.kind,provider_resource_id:resource.providerId,currency:resource.currency??null,parent_resource_id:resource.parentId??null,status:resource.status,observed_at:new Date().toISOString()},'return=representation') as {id:string}[];
    if(rows.length!==1)throw new Error('Resource binding failed');return rows[0].id;
  }
  async owners(environment:YellowCardEnvironment,family:TransactionFamily,data:Record<string,unknown>):Promise<string[]> {
    if(family==='custody') {
      const ids=[data.sourceVaultId,data.destinationVaultId].filter((x):x is string=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(x));
      if(!ids.length)return [];
      const result:string[]=[];
      for(const id of new Set(ids)) {
        const rows=await this.request(`yc_resources?environment=eq.${environment}&resource_kind=eq.vault&provider_resource_id=eq.${encodeURIComponent(id)}&select=merchant_id`) as {merchant_id:string}[];
        result.push(...rows.map(x=>x.merchant_id));
      }
      return [...new Set(result)];
    }
    const creation:Partial<Record<TransactionFamily,string>>={send:'submitSend',receive:'submitReceive',crypto_send:'initiateCryptoConversion',rfq:'createRFQ',conversion:'autoConvert'};
    if(!creation[family])return [];
    const id=typeof data.id==='string'?data.id:'';
    const rows=await this.request(`yc_operations?environment=eq.${environment}&provider_id=eq.${encodeURIComponent(id)}&select=merchant_id,operation`) as {merchant_id:string;operation:string}[];
    const allowed=family==='send'?['submitSend','submitVirtualAccountSend']:[creation[family]];
    // Never attribute unsolicited fiat deposits from metadata, business name or partner userId.
    // Add confirmed per-merchant VA transaction linkage before enabling this receipt path.
    return [...new Set(rows.filter(x=>allowed.includes(x.operation)).map(x=>x.merchant_id))];
  }
  async record(environment:YellowCardEnvironment,merchant:string,observation:ReturnType<typeof transactionObservation>,sealed:unknown,hash:string,observedAt:string) {
    await this.request('rpc/yc_record_observation','POST',{p_environment:environment,p_merchant:merchant,p_observation:observation,p_sealed:sealed,p_hash:hash,p_observed_at:observedAt});
  }
  async pendingSources(environment:YellowCardEnvironment,merchant:string,providerId:string) {
    const ops=await this.request(`yc_operations?environment=eq.${environment}&merchant_id=eq.${encodeURIComponent(merchant)}&provider_id=eq.${encodeURIComponent(providerId)}&reservation_released=eq.false&select=source_resource_id`) as {source_resource_id:string|null}[];
    const resources:BoundResource[]=[];
    for(const id of new Set(ops.map(x=>x.source_resource_id).filter(Boolean))) {
      const rows=await this.request(`yc_resources?environment=eq.${environment}&merchant_id=eq.${encodeURIComponent(merchant)}&id=eq.${id}&select=*`) as BoundResource[];
      resources.push(...rows);
    }
    return resources;
  }
  async settleSource(resource:BoundResource,balances:Balance[],providerId:string,status:string) {
    for(const balance of balances) await this.request('yc_balances?on_conflict=resource_id,asset','POST',{resource_id:resource.id,merchant_id:resource.merchant_id,environment:resource.environment,asset:balance.asset,available:balance.available,held:balance.held,observed_at:balance.observedAt,provider_reference:resource.provider_resource_id},'resolution=merge-duplicates,return=minimal');
    await this.request('rpc/yc_settle_operation','POST',{p_environment:resource.environment,p_merchant:resource.merchant_id,p_provider_id:providerId,p_resource:resource.id,p_status:status});
  }
  async account(environment:YellowCardEnvironment,id:string,status:string,observedAt:string) {
    const rows=await this.request(`yc_resources?environment=eq.${environment}&resource_kind=eq.virtual_account&provider_resource_id=eq.${encodeURIComponent(id)}`,'PATCH',{status,observed_at:observedAt},'return=representation') as unknown[];
    return rows.length===1;
  }
  async authorizeUser(userId:string,merchantId:string,environment:YellowCardEnvironment,transact=false) {
    if(userId===merchantId) {
      const merchants=await this.request(`yc_merchants?merchant_id=eq.${encodeURIComponent(merchantId)}&environment=eq.${environment}&select=merchant_id`) as unknown[];
      return merchants.length===1;
    }
    const rows=await this.request(`yc_memberships?merchant_id=eq.${encodeURIComponent(merchantId)}&environment=eq.${environment}&user_id=eq.${encodeURIComponent(userId)}&select=permission`) as {permission:string}[];
    return rows.length===1 && (!transact||['transact','admin'].includes(rows[0].permission));
  }
}
