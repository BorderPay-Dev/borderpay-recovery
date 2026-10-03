import { nonempty, YCValidationError } from './yellowcard-validation.ts';
import { jsonAmount } from './yellowcard-money.ts';
export interface BusinessIdentity {
  accountType:'business'; merchantId:string; legalName:string; registrationNumber:string; incorporationCountry:string;
  representative: {name:string; country:string; phone:string; address:string; dob:string; email:string; idNumber:string; idType:string};
}
export function institutionalParty(b:BusinessIdentity) {
  if(b.accountType!=='business') throw new YCValidationError('account_type','business_required');
  const p=b.representative;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(p.dob) || !Number.isFinite(Date.parse(p.dob)) || new Date(p.dob).toISOString().slice(0,10)!==p.dob) throw new YCValidationError('representative.dob');
  return {name:nonempty(p.name,'representative.name'),country:nonempty(p.country,'representative.country'),phone:nonempty(p.phone,'representative.phone'),address:nonempty(p.address,'representative.address'),dob:p.dob,email:nonempty(p.email,'representative.email'),idNumber:nonempty(p.idNumber,'representative.idNumber'),idType:nonempty(p.idType,'representative.idType'),businessName:nonempty(b.legalName,'businessName'),businessId:nonempty(b.registrationNumber,'businessId')};
}
export function businessPayment(b:BusinessIdentity,input:{direction:'send'|'receive';sequenceId:string;channelId:string;localAmount:string;currency:string;country:string;reason:string;counterparty:Record<string,unknown>}) {
  const amount=jsonAmount(input.localAmount); if(amount<=0) throw new YCValidationError('amount');
  return {sequenceId:nonempty(input.sequenceId,'sequenceId'),channelId:nonempty(input.channelId,'channelId'),localAmount:amount,currency:input.currency,country:input.country,reason:nonempty(input.reason,'reason'),customerUID:b.merchantId,customerType:'institution',forceAccept:false,
    ...(input.direction==='send' ? {sender:institutionalParty(b),destination:input.counterparty} : {recipient:institutionalParty(b),source:input.counterparty})};
}
export function virtualAccountPayment(b:BusinessIdentity,input:{walletId:string;sequenceId:string;channelId:string;amountUsd:string;currency:string;reason:string;destinationKind?:'business'|'individual';destination:Record<string,unknown>}) {
  if(input.currency==='GBP'&&input.destinationKind!=='business')throw new YCValidationError('destination','gbp_business_recipient_required');
  const d=input.destination;const rail=String(d.outboundTransactionType);
  const rails:Record<string,string[]>={USD:['ACH','WIRE','SWIFT'],EUR:['SEPA','SWIFT'],GBP:['FASTER_PAYMENTS','SWIFT']};
  if(!rails[input.currency]?.includes(rail)) throw new YCValidationError('payment_rail');
  for(const f of ['accountNumber','accountName','networkId','bankAccountType','bankName','bankAddress','bankCity','bankPostalCode','bankCountry','city','postalCode','state','country','address','memo']) nonempty(d[f],`destination.${f}`);
  if(d.accountType!=='bank' || !['checking','savings'].includes(String(d.bankAccountType))) throw new YCValidationError('destination.accountType');
  if(String(d.memo).length<6 || String(d.memo).length>17) throw new YCValidationError('destination.memo');
  if(['ACH','WIRE','SWIFT'].includes(rail)) nonempty(d.routingNumber,'destination.routingNumber');
  if(['SEPA','SWIFT'].includes(rail)) nonempty(d.swiftCode,'destination.swiftCode');
  if(rail==='FASTER_PAYMENTS' && !/^\d{6}$/.test(String(d.sortCode).replace(/-/g,''))) throw new YCValidationError('destination.sortCode');
  const amount=jsonAmount(input.amountUsd); if(amount<=0) throw new YCValidationError('amount');
  return {source:{accountType:'bank'},walletId:nonempty(input.walletId,'walletId'),sequenceId:nonempty(input.sequenceId,'sequenceId'),channelId:nonempty(input.channelId,'channelId'),amount,reason:nonempty(input.reason,'reason'),sender:institutionalParty(b),destination:d,forceAccept:false};
}
export function custodyPayment(input:{merchantId:string;vaultId:string;sequenceId:string;token:string;amount:string;destination:{type:'EXTERNAL'|'INTERNAL'|'USD_BALANCE';address?:string;vaultId?:string;destinationTag?:string};countryCode:string;travelRuleData?:Record<string,unknown>;enabledTokens:readonly string[]}) {
  if(!input.enabledTokens.includes(input.token) || !/^(USDC|USDT|EURC)_/.test(input.token)) throw new YCValidationError('token','asset_not_enabled');
  if(input.destination.type==='USD_BALANCE') throw new YCValidationError('destination','partner_treasury_route_requires_separate_workflow');
  if(input.destination.type==='EXTERNAL') {
    nonempty(input.destination.address,'destination.address');
    if(!/^[A-Z]{2}$/.test(input.countryCode) || !input.travelRuleData || !Object.keys(input.travelRuleData).length) throw new YCValidationError('travelRuleData','required');
    if(/_(XLM|XRP|TON|BTC)$/.test(input.token)) throw new YCValidationError('token','custody_identity_callback_network_not_supported');
  } else nonempty(input.destination.vaultId,'destination.vaultId');
  const amount=jsonAmount(input.amount);if(amount<=0) throw new YCValidationError('amount');
  return {vaultId:nonempty(input.vaultId,'vaultId'),endUserId:nonempty(input.merchantId,'merchantId'),sequenceId:nonempty(input.sequenceId,'sequenceId'),token:input.token,amount,destination:input.destination,countryCode:input.countryCode,...(input.travelRuleData ? {travelRuleData:input.travelRuleData}:{})};
}
