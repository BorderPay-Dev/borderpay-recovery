export type TransactionFamily='send'|'receive'|'crypto_send'|'custody'|'rfq'|'conversion';
export type FinancialState='pending'|'awaiting_approval'|'processing'|'completed'|'failed'|'denied'|'expired'|'refund_pending'|'refunded'|'review_required'|'unknown';
export function financialState(family:TransactionFamily, status:string):FinancialState {
  if(family==='custody') return ({created:'pending',processing:'processing',complete:'completed',failed:'failed'} as Record<string,FinancialState>)[status] ?? 'unknown';
  if(family==='rfq') return ({RFQ_CREATED:'pending',RFQ_PENDING_REVIEW:'pending',RFQ_QUOTE_SENT:'awaiting_approval',RFQ_ACCEPTED:'processing',TRANSACTION_PROCESSING_YC:'processing',TRANSACTION_COMPLETED:'completed',TRANSACTION_FAILED:'failed',TRANSACTION_CANCELLED:'denied',RFQ_REJECTED_BY_TRADER:'denied',RFQ_REJECTED_BY_CUSTOMER:'denied',RFQ_EXPIRED_NO_RESPONSE:'expired',RFQ_EXPIRED_CUSTOMER_TIMEOUT:'expired'} as Record<string,FinancialState>)[status]??'unknown';
  return ({created:'pending',pending_approval:'awaiting_approval',pending_payment:'pending',pending_liquidity:'processing',pending_provider:'processing',processing:'processing',pending:'pending',complete:'completed',completed:'completed',payment_processed:'completed',failed:'failed',denied:'denied',expired:'expired',cancelled:'denied',canceled:'denied',refund_requested:'refund_pending',refund_processing:'refund_pending',refund_failed:'review_required',refunded:'refunded',returned:'refunded'} as Record<string,FinancialState>)[status]??'unknown';
}
export function needsFinancialReview(code:string|null):boolean { return ['FRAUD_CHECK','NAME_MISMATCH','OTHER_ERROR'].includes(code??''); }
export function errorAction(code:string|null,status:number|null) {
  if(code==='FRAUD_CHECK') return 'compliance_review';
  if(code==='POSSIBLE_DUPLICATE' || code==='GATEWAY_TIMEOUT' || code==='PROVIDER_ERROR' || status===null || status===408 || (status??0)>=500) return 'reconcile_before_retry';
  if(status===401||status===403) return 'operator_configuration';
  if(code==='INSUFFICIENT_BALANCE') return 'check_balance_and_liquidity';
  if(code==='PaymentInvalidState'||code==='PaymentNotFound'||code==='CollectionNotFoundError') return 'lookup_transaction';
  if(code==='REFUSED') return 'payer_declined';
  if(code==='EXPIRED'||code==='PaymentExpired') return 'new_quote_required';
  if(['PaymentValidationError','InvalidRequestBody','InvalidPhoneNumberFormat','VALIDATION_FAILED','INVALID_RECIPIENT','INVALID_NETWORK','INVALID_CURRENCY','ResolveAccountError','NAME_MISMATCH'].includes(code??'')) return 'correct_details';
  return 'operator_review';
}
/** Delayed webhooks do not get to regress authoritative settlement. GET results only. */
export function acceptObservation(previous:{status:FinancialState;observedAt:string}|null,next:{status:FinancialState;observedAt:string}) {
  if(!Number.isFinite(Date.parse(next.observedAt))) return false;
  if(!previous) return true;
  if(Date.parse(next.observedAt)<Date.parse(previous.observedAt)) return false;
  if(previous.status==='refunded' && next.status!=='refunded') return false;
  if(previous.status==='completed' && !['completed','refund_pending','refunded','review_required'].includes(next.status)) return false;
  return true;
}
export function assertRfqAcceptable(rfq:{status:string;quoteExpiresAt?:string},now=Date.now()) {
  if(rfq.status!=='RFQ_QUOTE_SENT' || !rfq.quoteExpiresAt || !Number.isFinite(Date.parse(rfq.quoteExpiresAt)) || Date.parse(rfq.quoteExpiresAt)<=now+5000) throw new Error('Quote expired or not ready; refresh before accepting');
}
