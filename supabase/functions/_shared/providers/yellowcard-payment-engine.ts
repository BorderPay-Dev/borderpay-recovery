import { YellowCardFullProductClient, YellowCardRequestError, type YellowCardEnvironment } from './yellowcard-full-product.ts';
import { YC_OPERATIONS, type YCOperation } from './yellowcard-operation-catalog.ts';
import { EvidenceCipher, payloadHash, type SealedEvidence } from './yellowcard-evidence.ts';
import { assertRfqAcceptable } from './yellowcard-lifecycle.ts';
import { object } from './yellowcard-validation.ts';
import { units } from './yellowcard-money.ts';
export interface MerchantContext { merchantId:string; environment:YellowCardEnvironment; actorId:string }
export interface PaymentIntent {
  operation:YCOperation; sequenceId:string; body?:Record<string,unknown>; params?:Record<string,string>;
  sourceResourceId:string|null; sourceAsset:string|null; reserveAmount:string; destinationResourceId?:string; vaultBindingId?:string;
}
export interface StoredOperation {
  id:string; merchant_id:string; environment:YellowCardEnvironment; operation:YCOperation; sequence_id:string; request_hash:string;
  state:string; lease_token:string|null; sealed_request:SealedEvidence; provider_id:string|null;
}
export interface PaymentStore {
  reserve(context:MerchantContext,intent:PaymentIntent,hash:string,sealed:SealedEvidence,authorization:{reference:string;expiresAt:string}):Promise<StoredOperation>;
  claim(context:MerchantContext,id:string,hash:string):Promise<StoredOperation|null>;
  finish(id:string,lease:string,state:'submitted'|'outcome_unknown'|'rejected'|'review_required',providerId:string|null,code:string|null):Promise<boolean>;
  resource(context:MerchantContext,id:string):Promise<{provider_resource_id:string;resource_kind:string;status:string}|null>;
  ownsTransaction(context:MerchantContext,id:string,creationOperation:string):Promise<boolean>;
}
export interface PaymentAuthorization {
  /** Must consume existing server-verified PIN/biometric/SCA proof for this exact hash and actor.
   * Mandatory dependency; no boolean from the request can stand in for this verifier. */
  verifyAndConsume(context:MerchantContext,hash:string,proof:unknown):Promise<{reference:string;expiresAt:string}>;
}
const targetCreators:Partial<Record<YCOperation,YCOperation>>={acceptSend:'submitSend',denySend:'submitSend',acceptReceive:'submitReceive',denyReceive:'submitReceive',cancelReceive:'submitReceive',refundReceive:'submitReceive',acceptRFQ:'createRFQ',rejectRFQ:'createRFQ'};
export class YellowCardPaymentEngine {
  constructor(private readonly client:YellowCardFullProductClient,private readonly store:PaymentStore,private readonly cipher:EvidenceCipher,private readonly authorization:PaymentAuthorization) {}
  private async validateOwnership(context:MerchantContext,intent:PaymentIntent) {
    const c=YC_OPERATIONS[intent.operation];if(!c || c.effect==='read' || c.effect==='admin')throw new Error('Not a merchant operation');
    if(!/^[A-Za-z0-9_-]{3,64}$/.test(intent.sequenceId))throw new Error('Invalid sequence ID');
    const body=intent.body??{};
    if(intent.operation==='createVault' && intent.sequenceId!==`vault-${context.merchantId}`)throw new Error('Use the stable merchant vault provisioning key');
    if(intent.operation==='createSubWallet' && intent.sequenceId!==`fiat-${body.currency}-${context.merchantId}`)throw new Error('Use the stable merchant currency provisioning key');
    if(body.sequenceId!==undefined&&body.sequenceId!==intent.sequenceId)throw new Error('Sequence mismatch');
    if(body.idempotencyKey!==undefined&&body.idempotencyKey!==intent.sequenceId)throw new Error('Idempotency key mismatch');
    if(['submitSend','submitReceive'].includes(intent.operation) && (body.customerType!=='institution'||body.customerUID!==context.merchantId))throw new Error('Business identity required');
    if(body.endUserId!==undefined&&body.endUserId!==context.merchantId)throw new Error('Owner mismatch');
    const target=targetCreators[intent.operation];
    if(target) {
      const id=intent.params?.id??intent.params?.rfqId;
      if(!id || !await this.store.ownsTransaction(context,id,target))throw new Error('Transaction ownership denied');
      if(intent.operation==='acceptRFQ') {
        const rfq=object(await this.client.operation('getRFQ',{params:{rfqId:id}}));
        assertRfqAcceptable({status:String(rfq.status),quoteExpiresAt:typeof rfq.quoteExpiresAt==='string'?rfq.quoteExpiresAt:undefined});
      }
    }
    if(c.effect==='payment' && !intent.sourceResourceId)throw new Error('Merchant funding source required');
    if(intent.sourceResourceId) {
      const resource=await this.store.resource(context,intent.sourceResourceId);
      if(!resource||resource.status!=='active')throw new Error('Source unavailable');
      if(units(intent.reserveAmount)<=0n||!intent.sourceAsset)throw new Error('Invalid source debit');
      const requiredSource:Partial<Record<YCOperation,string>>={submitVirtualAccountSend:'walletId',createSend:'vaultId',createRFQ:'sourceWalletId',autoConvert:'sourceWalletId'};
      const f=requiredSource[intent.operation];
      if(f&&body[f]!==resource.provider_resource_id)throw new Error('Provider funding source mismatch');
      if(intent.operation==='createSend' && (resource.resource_kind!=='vault'||body.token!==intent.sourceAsset))throw new Error('Custody source and token must match the reservation');
      if(intent.operation==='submitVirtualAccountSend' && resource.resource_kind!=='sub_wallet')throw new Error('Fiat source required');
      // Public standard sends and fiat-to-crypto routes expose only shared partner balance selectors.
      // A merchant debit must not silently fall back to that balance. Integrate a confirmed funding
      // leg with its own reconciliation before releasing these routes.
      if(['submitSend','submitReceive','initiateCryptoConversion','initiateFiatConversion','processFiatConversion'].includes(intent.operation))throw new Error('Merchant funding contract requires confirmation');
    }
    if(['createRFQ','autoConvert'].includes(intent.operation)) {
      const destination=intent.destinationResourceId ? await this.store.resource(context,intent.destinationResourceId) : null;
      if(!destination||destination.status!=='active'||body.destinationWalletId!==destination.provider_resource_id)throw new Error('Destination wallet ownership mismatch');
    }
    if(intent.operation==='createSend') {
      const d=object(body.destination);
      if(d.type==='USD_BALANCE')throw new Error('Shared treasury destination not allowed');
      if(d.type==='INTERNAL') {
        const destination=intent.destinationResourceId ? await this.store.resource(context,intent.destinationResourceId) : null;
        if(!destination||destination.resource_kind!=='vault'||destination.status!=='active'||d.vaultId!==destination.provider_resource_id)throw new Error('Destination vault ownership mismatch');
      } else if(d.type!=='EXTERNAL'||typeof d.address!=='string'||!d.address||!body.travelRuleData||!body.countryCode)throw new Error('External wallet evidence missing');
      if(typeof body.amount!=='number'||units(String(body.amount))>units(intent.reserveAmount))throw new Error('Debit exceeds authorized reservation');
    }
    if(intent.operation==='generateAddress') {
      if(!intent.vaultBindingId)throw new Error('Vault binding required');
      const source=await this.store.resource(context,intent.vaultBindingId);
      if(source?.resource_kind!=='vault'||body.vaultId!==source.provider_resource_id)throw new Error('Vault ownership mismatch');
    }
  }
  async prepare(context:MerchantContext,intent:PaymentIntent,proof:unknown) {
    this.client.validateOperation(intent.operation,{body:intent.body,params:intent.params});
    await this.validateOwnership(context,intent);
    const hash=await payloadHash({context,intent});
    const verified=await this.authorization.verifyAndConsume(context,hash,proof);
    if(!verified.reference || Date.parse(verified.expiresAt)<=Date.now() || Date.parse(verified.expiresAt)>Date.now()+300000)throw new Error('Authorization expired');
    const sealed=await this.cipher.seal(new TextEncoder().encode(JSON.stringify(intent)),`yc:operation:${context.environment}:${context.merchantId}:${intent.sequenceId}`);
    return await this.store.reserve(context,intent,hash,sealed,verified);
  }
  async execute(context:MerchantContext,op:StoredOperation) {
    if(op.merchant_id!==context.merchantId||op.environment!==context.environment)throw new Error('Operation ownership denied');
    const raw=await this.cipher.open(op.sealed_request,`yc:operation:${context.environment}:${context.merchantId}:${op.sequence_id}`);
    const intent=JSON.parse(new TextDecoder().decode(raw)) as PaymentIntent;
    if(await payloadHash({context,intent})!==op.request_hash)throw new Error('Operation evidence mismatch');
    this.client.validateOperation(intent.operation,{body:intent.body,params:intent.params});
    await this.validateOwnership(context,intent);
    const lease=await this.store.claim(context,op.id,op.request_hash);
    if(!lease?.lease_token)return {id:op.id,state:'reconcile_existing',providerId:op.provider_id};
    let response:unknown;
    try { response=await this.client.operation(intent.operation,{body:intent.body,params:intent.params}); }
    catch(e) {
      const known=e instanceof YellowCardRequestError;
      const unknown=known ? e.outcomeUnknown : true; // Includes configuration failure; conservative reservation retention.
      const state=unknown?'outcome_unknown':'rejected';
      await this.store.finish(op.id,lease.lease_token,state,null,known?e.providerCode:null);
      return {id:op.id,state,providerId:null};
    }
    const data=object(response), providerId=typeof data.id==='string'?data.id:null;
    // A successful HTTP status is not settlement. Reconciliation owns final financial states.
    const state=providerId?'submitted':'outcome_unknown';
    if(!await this.store.finish(op.id,lease.lease_token,state,providerId,null))throw new Error('Provider responded; persistence failed; reconcile before retry');
    return {id:op.id,state,providerId};
  }
}
