import type { NamedAccountContext } from './yellowcard-named-account-policy.ts';
export const USD_SETUP_MESSAGE = 'To enable your USD account, please contact compliance@borderpayvelocity.xyz.';
type Denied = { allowed:false; code:string; message:string; status:number };
type Allowed = { allowed:true; provider:'bridge'|'yellowcard'; currency:'EUR'|'USD'; customerId:string; merchantId:string };
/** Internal routing only. Context must be loaded from authenticated merchant,
 * provider and staff-grant records. Never construct it from a request body.
 * This module does not register a live route or create provider customers. */
export function accountRequestRoute(context:NamedAccountContext, requestedCurrency:unknown):Allowed|Denied {
 const deny=(code:string,message:string,status=403):Denied=>({allowed:false,code,message,status});
 if(context.accountType!=='business'||context.globallyRestricted)
  return deny('account_restricted','Receiving accounts are unavailable while your account is restricted.');
 const currency=typeof requestedCurrency==='string'?requestedCurrency.trim().toUpperCase():'';
 if(currency!=='EUR'&&currency!=='USD')
  return deny('currency_unavailable','This receiving-account currency is not available.',400);
 const provider=currency==='EUR'?'yellowcard':'bridge';
 const rows=context.relationships.filter(r=>r.merchantId===context.merchantId&&r.provider===provider&&r.environment==='production');
 if(rows.length>1)return deny('account_configuration_review','Your account configuration needs review. Please contact compliance@borderpayvelocity.xyz.');
 const relationship=rows[0];
 const customerId=typeof relationship?.customerId==='string'?relationship.customerId.trim():'';
 if(currency==='USD'&&!customerId)return deny('usd_account_setup_required',USD_SETUP_MESSAGE);
 if(currency==='EUR'&&!context.yellowCardProgrammeEnabled)
  return deny('eur_account_unavailable','EUR account requests are not available yet.',503);
 if(!customerId)return deny('verification_required','Please complete your business verification before requesting an account.');
 if(relationship.status!=='active'||!relationship.controlsSatisfied)
  return deny('receiving_account_ineligible','This receiving account is not available for your business. Please contact compliance@borderpayvelocity.xyz.');
 if(currency==='USD'&&!context.bridgeUsdStaffAuthorized)return deny('usd_account_setup_required',USD_SETUP_MESSAGE);
 if(currency==='EUR'&&!context.yellowCardInternalReviewComplete)
  return deny('verification_under_review','Your business verification is under review. We will notify you when your EUR account is available.');
 return {allowed:true,provider,currency,customerId,merchantId:context.merchantId};
}
/** Invoke the selected approved adapter only. Adapters must retain their existing
 * idempotency, eligibility, destination, auth and pending-outcome controls.
 * There is deliberately no fallback and no customer-creation dependency. */
export async function requestNamedAccount<T>(context:NamedAccountContext,currency:unknown,adapters:{
 yellowCardEur:(input:{merchantId:string;customerId:string;currency:'EUR'})=>Promise<T>;
 bridgeUsd:(input:{merchantId:string;customerId:string;currency:'USD'})=>Promise<T>;
}):Promise<{ok:false;error:Denied}|{ok:true;result:T}> {
 const route=accountRequestRoute(context,currency);
 if(!route.allowed)return {ok:false,error:route};
 const result=route.provider==='yellowcard'
  ?await adapters.yellowCardEur({merchantId:route.merchantId,customerId:route.customerId,currency:'EUR'})
  :await adapters.bridgeUsd({merchantId:route.merchantId,customerId:route.customerId,currency:'USD'});
 return {ok:true,result};
}
