/** Customer receipt contract. Provider adapters must explicitly map into this
 * allowlist; raw webhook objects must never be passed to email templates. */
export interface TransactionEmailReceipt {
  transaction_id?: string;
  activity_id?: string;
  deposit_id?: string;
  sender_name?: string;
  recipient_name?: string;
  payment_reference?: string;
  source_rail?: string;
  destination_rail?: string;
  payment_scheme?: string;
  sender_bank?: string;
  sender_account?: string;
  sender_bic?: string;
  source_address?: string;
  destination_address?: string;
  source_tracking_number?: string;
  destination_tracking_number?: string;
  trace_number?: string;
  imad?: string;
  omad?: string;
  uetr?: string;
  source_tx_hash?: string;
  destination_tx_hash?: string;
  source_amount?: number;
  source_currency?: string;
  destination_amount?: number;
  destination_currency?: string;
  charge_amount?: number;
  charge_currency?: string;
  charge_percent?: number;
  exchange_fee_amount?: number;
  exchange_fee_currency?: string;
  gas_fee_amount?: number;
  gas_fee_currency?: string;
  subtotal_amount?: number;
  subtotal_currency?: string;
  exchange_rate?: number;
}

type ObjectValue = Record<string, unknown>;
const object = (v: unknown): ObjectValue => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as ObjectValue : {};
const text = (...values: unknown[]): string | undefined => {
  for (const v of values) if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 512);
};
const currency = (...values: unknown[]): string | undefined => text(...values)?.toUpperCase();
export const receiptNumber = (...values: unknown[]): number | undefined => {
  for (const v of values) {
    if ((typeof v !== 'number' && typeof v !== 'string') || String(v).trim() === '') continue;
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) return n;
  }
};
const rail = (...values: unknown[]): string | undefined => {
  const value = text(...values);
  return value === 'bridge_wallet' ? 'Wallet' : value?.replaceAll('_', ' ').toUpperCase();
};

/** Amounts in a VA settlement event are destination amounts. Transfer receipts
 * can explicitly denominate each fee in a different currency. No FX guessing. */
export function bridgeTransactionEmailReceipt(
  payload: unknown,
  context: { kind: 'virtual_account' | 'transfer' | 'wallet'; sourceCurrency?: string; receipt?: Record<string, unknown> },
): TransactionEmailReceipt {
  const p = object(payload), r = object(p.receipt), s = object(p.source), d = object(p.destination);
  const known = context.receipt ?? {};
  const outgoingVa = context.kind === 'virtual_account' && ['payment_submitted', 'payment_processed', 'processed', 'succeeded', 'success'].includes(String(p.status ?? p.type ?? '').toLowerCase());
  const sourceCurrency = currency(r.initial_amount_currency, s.currency, context.sourceCurrency, !outgoingVa ? p.currency : undefined);
  const destinationCurrency = currency(r.final_amount_currency, d.currency, known.destination_currency);
  const fee = object(r.developer_fee), topFee = object(p.developer_fee_amount ?? p.developer_fee);
  const chargeAmount = receiptNumber(fee.amount, r.developer_fee, r.developer_fee_amount, topFee.amount, p.developer_fee_amount, p.developer_fee);
  const chargeCurrency = currency(fee.currency, r.developer_fee_currency, topFee.currency, sourceCurrency);
  const sourceAmount = receiptNumber(r.initial_amount, context.kind === 'virtual_account' ? known.source_amount : undefined, !outgoingVa ? p.amount : undefined);
  const percent = receiptNumber(r.developer_fee_percent, p.developer_fee_percent);
  const exchange = object(r.exchange_fee), gas = object(r.gas_fee);
  return {
    transaction_id: text(p.transfer_id, p.transaction_id, p.id),
    activity_id: context.kind === 'virtual_account' ? text(p.id) : undefined,
    deposit_id: text(p.deposit_id),
    sender_name: text(s.sender_name, s.originator_name, p.sender_name, known.sender_name),
    recipient_name: text(s.recipient_name, d.recipient_name, d.beneficiary_name, p.recipient_name),
    payment_reference: text(s.reference, p.client_reference_id, d.reference, p.reference, known.payment_reference_text),
    source_rail: rail(s.payment_rail, p.source_payment_rail, known.source_rail),
    destination_rail: rail(d.payment_rail, p.destination_payment_rail, known.destination_rail),
    payment_scheme: text(s.payment_scheme),
    sender_bank: text(s.bank_name, known.source_bank_name),
    sender_account: text(s.iban, s.account_number, s.iban_last_4, s.last_4),
    sender_bic: text(s.bic),
    source_address: text(s.from_address, r.source_address),
    destination_address: text(d.to_address, d.address, p.destination_address, known.destination_address),
    source_tracking_number: text(s.tracking_number, p.tracking_number, known.tracking_number),
    destination_tracking_number: text(d.tracking_number),
    trace_number: text(s.trace_number, d.trace_number, p.trace_number),
    imad: text(s.imad, d.imad),
    omad: text(s.omad, d.omad),
    uetr: text(s.uetr, d.uetr, p.uetr),
    source_tx_hash: text(r.source_tx_hash, p.source_tx_hash, s.tx_hash),
    destination_tx_hash: text(r.destination_tx_hash, p.destination_tx_hash, d.tx_hash),
    source_amount: sourceAmount,
    source_currency: sourceCurrency,
    destination_amount: receiptNumber(r.final_amount, d.amount, known.destination_amount),
    destination_currency: destinationCurrency,
    charge_amount: chargeAmount,
    charge_currency: chargeCurrency,
    // Derived only from two amounts expressed in exactly the same currency.
    charge_percent: percent ?? (chargeAmount !== undefined && sourceAmount && chargeCurrency === sourceCurrency ? chargeAmount / sourceAmount * 100 : undefined),
    exchange_fee_amount: receiptNumber(exchange.amount, r.exchange_fee, p.exchange_fee_amount),
    exchange_fee_currency: currency(exchange.currency, r.exchange_fee_currency, sourceCurrency),
    gas_fee_amount: receiptNumber(gas.amount, r.gas_fee, p.gas_fee),
    // Do not assume gas is denominated in the source fiat currency.
    gas_fee_currency: currency(gas.currency, r.gas_fee_currency),
    subtotal_amount: receiptNumber(r.pre_conversion_subtotal_amount, r.subtotal_amount, p.subtotal_amount),
    subtotal_currency: currency(r.pre_conversion_subtotal_amount_currency, r.subtotal_amount_currency, sourceCurrency),
    exchange_rate: receiptNumber(r.exchange_rate, p.exchange_rate),
  };
}
