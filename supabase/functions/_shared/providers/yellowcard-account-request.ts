import type { NamedAccountContext } from './yellowcard-named-account-policy.ts';
import type { BridgeCustomerSetupResult } from './yellowcard-bridge-customer-setup.ts';
export const USD_SETUP_MESSAGE = 'To enable your USD account, please contact compliance@borderpayvelocity.xyz.';
type Denied = { allowed:false; code:string; message:string; status:number; requiresCustomerCreation?:true };
type Allowed = { allowed:true; provider:'bridge'|'yellowcard'; currency:'EUR'|'USD'; customerId:string; merchantId:string };
/** Internal routing. Context comes from authenticated records, not the request body.
 * Customer setup is triggered only by a USD request; account activation remains separate. */
export function accountRequestRoute(context:NamedAccountContext,requestedCurrency:unknown):Allowed|Denied {
 const deny=(code:string,message:string,status=403):Denied=>({allowed:false,code,message,status});
 if(context.accountType!=='business'||context.globallyRestricted)
  return deny('account_restricted','Receiving accounts are unavailable while your account is restricted.');
 const currency=typeof requestedCurrency==='string'?requestedCurrency.trim().toUpperCase():'';
 if(currency!=='EUR'&&currency!=='USD')return deny('currency_unavailable','This receiving-account currency is not available.',400);
 const provider=currency==='EUR'?'yellowcard':'bridge';
 const rows=context.relationships.filter(r=>r.merchantId===context.merchantId&&r.provider===provider&&r.environment==='production');
 if(rows.length>1)return deny('account_configuration_review','Your account configuration needs review. Please contact compliance@borderpayvelocity.xyz.');
 const relationship=rows[0],customerId=typeof relationship?.customerId==='string'?relationship.customerId.trim():'';
 // A historical rejection/pause cannot be bypassed by clearing the customer ID.
 if(relationship&&['paused','rejected','closed'].includes(relationship.status))
  return deny('receiving_account_ineligible','This receiving account is not available for your business. Please contact compliance@borderpayvelocity.xyz.');
 if(currency==='USD'&&!customerId)return {...deny('usd_account_setup_required',USD_SETUP_MESSAGE),requiresCustomerCreation:true};
 if(currency==='EUR'&&!context.yellowCardProgrammeEnabled)return deny('eur_account_unavailable','EUR account requests are not available yet.',503);
 if(!customerId)return deny('verification_required','Please complete your business verification before requesting an account.');
 if(currency==='USD'&&!context.bridgeUsdStaffAuthorized)return deny('usd_account_setup_required',USD_SETUP_MESSAGE);
 if(relationship.status!=='active'||!relationship.controlsSatisfied)return deny('receiving_account_ineligible','This receiving account is not available for your business. Please contact compliance@borderpayvelocity.xyz.');
 if(currency==='EUR'&&!context.yellowCardInternalReviewComplete)return deny('verification_under_review','Your business verification is under review. We will notify you when your EUR account is available.');
 return {allowed:true,provider,currency,customerId,merchantId:context.merchantId};
}
export async function requestNamedAccount<T>(context:NamedAccountContext,currency:unknown,adapters:{
 ensureBridgeBusinessCustomer:(merchantId:string)=>Promise<BridgeCustomerSetupResult>;
 yellowCardEur:(input:{merchantId:string;customerId:string;currency:'EUR'})=>Promise<T>;
 bridgeUsd:(input:{merchantId:string;customerId:string;currency:'USD'})=>Promise<T>;
}):Promise<{ok:false;error:Denied}|{ok:true;result:T}> {
 const route=accountRequestRoute(context,currency);
 if(!route.allowed){
  if(route.requiresCustomerCreation){
   try{
    const setup=await adapters.ensureBridgeBusinessCustomer(context.merchantId);
    if(setup.state==='linked'&&setup.merchantId===context.merchantId&&setup.environment==='production'&&setup.mappingPersisted===true&&setup.customerId.trim()){
     // Never continue to VA creation in this request, even if the returned customer is active.
     return {ok:false,error:{allowed:false,code:'usd_account_setup_required',message:USD_SETUP_MESSAGE,status:403}};
    }
    if(setup.state==='blocked')return {ok:false,error:{allowed:false,code:'usd_setup_requires_review',message:'Your USD setup needs review. Please contact compliance@borderpayvelocity.xyz.',status:403}};
   }catch{/* Do not expose raw provider errors or claim a saved customer on failure. */}
   return {ok:false,error:{allowed:false,code:'usd_customer_setup_pending',message:'We could not confirm your USD setup yet. Please contact compliance@borderpayvelocity.xyz.',status:503}};
  }
  return {ok:false,error:route};
 }
 const result=route.provider==='yellowcard'
  ?await adapters.yellowCardEur({merchantId:route.merchantId,customerId:route.customerId,currency:'EUR'})
  :await adapters.bridgeUsd({merchantId:route.merchantId,customerId:route.customerId,currency:'USD'});
 return {ok:true,result};
}
