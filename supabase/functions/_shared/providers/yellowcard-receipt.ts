import { type TransactionFamily, financialState } from './yellowcard-lifecycle.ts';
import { providerAmount } from './yellowcard-money.ts';
/** Safe data model for the existing BorderPay receipt/statement renderer; never a provider-issued PDF. */
export function receiptModel(input:{merchantId:string;expectedMerchantId:string;family:TransactionFamily;record:Record<string,unknown>}) {
  if(input.merchantId!==input.expectedMerchantId)throw new Error('Receipt access denied');
  const r=input.record;if(typeof r.id!=='string'||typeof r.status!=='string')throw new Error('Incomplete transaction evidence');
  const custody=input.family==='custody';
  return {brand:'BorderPay Velocity',legalEntity:'BorderPay Africa, Inc.',reference:r.sequenceId??r.id,status:financialState(input.family,r.status),
    transactionDate:typeof r.createdAt==='string'?r.createdAt:null,
    amount:r.amount===undefined?null:providerAmount(r.amount),currency:custody?r.currency:['send','receive'].includes(input.family)?'USD':null,
    paymentAmount:r.convertedAmount===undefined?null:providerAmount(r.convertedAmount),paymentCurrency:r.convertedAmount===undefined?null:r.currency,
    chargeFee:r.partnerFeeAmountUSD===undefined?null:providerAmount(r.partnerFeeAmountUSD),chargeFeeCurrency:r.partnerFeeAmountUSD===undefined?null:'USD',
    bankReference:typeof r.reference==='string'?r.reference:null,transactionHash:typeof r.transactionHash==='string'?r.transactionHash:null,
    notice:financialState(input.family,r.status)==='completed'?'Payment completed.':'This record does not confirm completed payment.'};
}
