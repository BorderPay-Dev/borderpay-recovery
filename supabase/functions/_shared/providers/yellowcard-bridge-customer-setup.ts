export type BridgeCustomerSetupResult =
 | {state:'linked';merchantId:string;environment:'production';customerId:string;mappingPersisted:true}
 | {state:'pending'|'blocked'};
type BusinessSnapshot={merchantId:string;email:string;companyName:string;registrationNumber?:string;countryCode:string;phone?:string};
type Reservation =
 | {state:'claimed';id:string;merchantId:string;environment:'production';snapshot:BusinessSnapshot}
 | BridgeCustomerSetupResult;
export interface BridgeCustomerSetupStore {
 /** Durable atomic claim: re-read auth/business records, confirmed email, country,
  * existing IDs in both profile tables and restrictions. Existing IDs are reused.
  * Never claim a paused/rejected/blocked or incomplete/ineligible profile.
  * Store the exact payload snapshot. A repeat/lost response returns pending,
  * not a fresh claim. The USD request is the authorization to create the record. */
 reserve(merchantId:string):Promise<Reservation>;
 /** Save the verified provider ID and both profile mappings atomically under
  * the reservation; reject ownership conflicts. Do not change KYB approval,
  * global status, YC relationship, USD eligibility, accounts or balances. */
 link(reservationId:string,merchantId:string,customerId:string):Promise<BridgeCustomerSetupResult>;
 /** Durable reconciliation marker; must never make a lost response retryable. */
 reconcile(reservationId:string,merchantId:string,knownCustomerId?:string):Promise<void>;
}
type BusinessCreateInput={account_type:'business';email:string;company_name:string;registration_number?:string;country_code:string;phone_e164?:string;borderpay_user_id:string};
/** Adapter uses existing bridgeProvider.createCustomer, whose idempotency key is
 * borderpay:customer:<borderpay_user_id>. No replacement key or email-only relink.
 * Durable store/gateway wiring must be completed before production enablement. */
export async function ensureBridgeCustomerForUsd(merchantId:string,store:BridgeCustomerSetupStore,provider:{createCustomer(input:BusinessCreateInput):Promise<{provider_id:string}>}):Promise<BridgeCustomerSetupResult>{
 if(!merchantId.trim())return {state:'blocked'};
 const reservation=await store.reserve(merchantId);
 if(reservation.state!=='claimed')return reservation;
 if(reservation.merchantId!==merchantId||reservation.environment!=='production'||reservation.snapshot.merchantId!==merchantId)return {state:'blocked'};
 const b=reservation.snapshot;
 if(!b.email?.trim()||!b.companyName?.trim()||!b.countryCode?.trim()){
  await store.reconcile(reservation.id,merchantId);return {state:'blocked'};
 }
 let knownCustomerId:string|undefined;
 try{
  const created=await provider.createCustomer({account_type:'business',email:b.email,company_name:b.companyName,registration_number:b.registrationNumber,country_code:b.countryCode,phone_e164:b.phone,borderpay_user_id:merchantId});
  if(typeof created.provider_id!=='string'||!created.provider_id.trim())throw Error('invalid_customer_response');
  knownCustomerId=created.provider_id;
  const linked=await store.link(reservation.id,merchantId,created.provider_id);
  if(linked.state==='linked'&&linked.merchantId===merchantId&&linked.environment==='production'&&linked.customerId===created.provider_id&&linked.mappingPersisted)return linked;
 }catch{/* Keep the durable claim for reconciliation; no automatic second creation. */}
 await store.reconcile(reservation.id,merchantId,knownCustomerId);return {state:'pending'};
}
