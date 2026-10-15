import type { MerchantContext, PaymentIntent, StoredOperation } from './yellowcard-payment-engine.ts';
import { YellowCardPaymentEngine } from './yellowcard-payment-engine.ts';
import { object } from './yellowcard-validation.ts';
import { YellowCardFullProductClient } from './yellowcard-full-product.ts';
export interface ProvisioningStore {
  existing(context:MerchantContext,kind:'vault'|'sub_wallet',currency?:string):Promise<{id:string;provider_resource_id:string}|null>;
  bind(context:MerchantContext,resource:{kind:'vault'|'sub_wallet'|'virtual_account';providerId:string;currency?:string;parentId?:string;status:string}):Promise<string>;
  operation(context:MerchantContext,sequenceId:string):Promise<StoredOperation|null>;
}
/** Provisioning has its own durable operation. Lost create responses are never automatically retried. */
export class YellowCardProvisioner {
  constructor(private readonly engine:YellowCardPaymentEngine,private readonly client:YellowCardFullProductClient,private readonly store:ProvisioningStore) {}
  async provision(context:MerchantContext,input:{kind:'vault'|'sub_wallet';currency?:string;createVirtualAccount?:boolean;sequenceId:string},proof:unknown) {
    const expectedSequence=input.kind==='vault'?`vault-${context.merchantId}`:`fiat-${input.currency}-${context.merchantId}`;
    if(input.sequenceId!==expectedSequence)throw new Error('Invalid provisioning key');
    const existing=await this.store.existing(context,input.kind,input.currency);if(existing)return {state:'existing',resourceId:existing.id};
    const intent:PaymentIntent={operation:input.kind==='vault'?'createVault':'createSubWallet',sequenceId:input.sequenceId,sourceResourceId:null,sourceAsset:null,reserveAmount:'0',
      body:input.kind==='vault'?{name:`BorderPay ${context.merchantId}`}:{name:`BorderPay ${context.merchantId}`,sequenceId:input.sequenceId,currency:input.currency,createVirtualAccount:input.createVirtualAccount===true}};
    const old=await this.store.operation(context,input.sequenceId);
    let providerId=old?.provider_id;
    if(!providerId) {
      if(old && old.state!=='reserved')return {state:'reconciliation_required',resourceId:null};
      const op=old??await this.engine.prepare(context,intent,proof),result=await this.engine.execute(context,op);providerId=result.providerId;
      if(!providerId)return {state:result.state,resourceId:null};
    }
    const response=object(await this.client.operation(input.kind==='vault'?'getVault':'getSubWalletById',{params:input.kind==='vault'?{vaultId:providerId}:{id:providerId}}));
    if(response.id!==providerId)throw new Error('Created resource response mismatch');
    if(input.kind==='sub_wallet' && (response.sequenceId!==input.sequenceId || response.currency!==input.currency))throw new Error('Created wallet ownership evidence mismatch');
    const id=await this.store.bind(context,{kind:input.kind,providerId,currency:input.currency,status:input.kind==='vault'?'active':String(response.status)});
    // A bank account can still be pending. Never infer an ACTIVE VA from a successful wallet create.
    if(response.virtualAccount) {
      const va=object(response.virtualAccount);
      if(va.subwalletId!==providerId||va.currency!==input.currency)throw new Error('Virtual account parent mismatch');
      await this.store.bind(context,{kind:'virtual_account',providerId:String(va.id),parentId:id,currency:input.currency,status:String(va.status).toLowerCase()});
    }
    return {state:'bound',resourceId:id};
  }
}
