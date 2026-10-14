import { bridgeTransactionEmailReceipt } from '../supabase/functions/_shared/transaction-email-receipt.ts';
import { render as businessStatus } from '../supabase/functions/_shared/email-templates/business/transaction-status.ts';
import { render as individualStatus } from '../supabase/functions/_shared/email-templates/individual/transaction-status.ts';
import { render as businessActivity } from '../supabase/functions/_shared/email-templates/business/transaction-notification.ts';
import { render as individualActivity } from '../supabase/functions/_shared/email-templates/individual/transaction-notification.ts';
import { renderTransactionReceipt } from '../supabase/functions/_shared/email-templates/transaction-receipt.ts';

const equal = (a: unknown, b: unknown) => { if (a !== b) throw new Error(`Expected ${b}, received ${a}`); };
const contains = (text: string, ...values: string[]) => { for (const value of values) if (!text.includes(value)) throw new Error(`Missing ${value}`); };
const va = {
  id: 'activity-synthetic', deposit_id: 'deposit-synthetic', type: 'payment_processed', amount: '111.573', currency: 'usdc',
  source: { sender_name: 'Example Buyer Ltd', recipient_name: 'Example Merchant Ltd', reference: 'INV-SYNTHETIC',
    payment_rail: 'sepa', payment_scheme: 'sepa_credit', iban: 'DE-SYNTHETIC', bic: 'SYNTHETIC', tracking_number: 'TRACK-SYNTHETIC', uetr: 'UETR-SYNTHETIC' },
  receipt: { initial_amount: '100', developer_fee: '2.98', subtotal_amount: '97.02', exchange_fee: '0', final_amount: '111.573', exchange_rate: '1.15', destination_tx_hash: '0xSYNTHETIC' },
  destination_payment_rail: 'base', api_key: 'MUST-NOT-APPEAR', internal_risk_metadata: 'MUST-NOT-APPEAR',
};
const receipt = () => bridgeTransactionEmailReceipt(va, { kind: 'virtual_account', sourceCurrency: 'EUR', receipt: { destination_currency: 'USDC' } });

Deno.test('all four email templates include actual sender, references, tracking and fee amount + percentage', () => {
  for (const render of [businessStatus, individualStatus, businessActivity, individualActivity]) {
    const result = render({ company_name: 'Example Merchant Ltd', status: 'approved', direction: 'credit', amount: 97.02, currency: 'EUR', reference: 'deposit-synthetic', email_receipt: receipt(), occurred_at: '2026-10-14T10:00:00Z' });
    for (const content of [result.html, result.text]) {
      contains(content, 'Example Buyer Ltd', 'Transaction ID', 'activity-synthetic', 'deposit-synthetic', 'INV-SYNTHETIC', 'TRACK-SYNTHETIC', 'UETR-SYNTHETIC', '0xSYNTHETIC', 'BorderPay charge fee', '2.98 EUR (2.98%)', '100.00 EUR', '97.02 EUR', 'USDC');
      if (content.includes('MUST-NOT-APPEAR') || content.includes('111.57 EUR')) throw new Error('Privacy/currency regression');
    }
  }
});
Deno.test('unknown fees remain unknown, explicit zero is retained, rate-only receipts are supported', () => {
  const missing = bridgeTransactionEmailReceipt({ type: 'funds_received', amount: '100', currency: 'eur' }, { kind: 'virtual_account' });
  equal(missing.charge_amount, undefined); equal(missing.charge_percent, undefined);
  equal(renderTransactionReceipt(missing).text.includes('charge fee'), false);
  const zero = bridgeTransactionEmailReceipt({ ...va, developer_fee_amount: '99', receipt: { ...va.receipt, developer_fee: '0' } }, { kind: 'virtual_account', sourceCurrency: 'EUR' });
  equal(zero.charge_amount, 0); contains(renderTransactionReceipt(zero).text, '0.00 EUR (0%)');
  const rate = bridgeTransactionEmailReceipt({ developer_fee_percent: '2.98' }, { kind: 'transfer' });
  contains(renderTransactionReceipt(rate).text, 'BorderPay charge fee: 2.98%');
});
Deno.test('transfer receipt respects explicit fee currencies, no percentage calculated across currencies', () => {
  const transfer = bridgeTransactionEmailReceipt({ id: 'transfer-synthetic', amount: '100', currency: 'usdc', source: { currency: 'usdc', payment_rail: 'bridge_wallet' }, destination: { currency: 'eur', payment_rail: 'sepa', tracking_number: 'BANK-TRACK' }, receipt: { initial_amount: '100', initial_amount_currency: 'usdc', developer_fee: '1', developer_fee_currency: 'usd', exchange_fee: '.5', exchange_fee_currency: 'eur', gas_fee: '.1', gas_fee_currency: 'usdc', final_amount: '85', final_amount_currency: 'eur', subtotal_amount: '86', subtotal_amount_currency: 'eur', pre_conversion_subtotal_amount: '99', pre_conversion_subtotal_amount_currency: 'usdc' } }, { kind: 'transfer' });
  equal(transfer.charge_percent, undefined);
  const output = renderTransactionReceipt(transfer).text;
  contains(output, '1.00 USD', '0.50 EUR', '0.10 USDC', '85.00 EUR', '99.00 USDC', 'BANK-TRACK', 'Wallet');
  if (output.includes('bridge_wallet') || output.includes('1%')) throw new Error('Leaked internal rail or invented fee percentage');
});
Deno.test('review and refund emails never claim funds were sent or settled', () => {
  for (const render of [businessStatus, individualStatus]) for (const status of ['in_review', 'refunded', 'refund_in_flight', 'canceled'] as const) {
    const output = render({ status, amount: 100, currency: 'EUR', reference: 'synthetic', email_receipt: receipt(), refund_return_reason: 'Returned payment', refund_reference_id: 'RETURN-SYNTHETIC' });
    for (const content of [output.html, output.text]) {
      if (content.includes('was sent') || content.includes('was converted') || content.includes('No service charge was applied')) throw new Error('Incorrect settlement narrative');
      if (status === 'refunded' || status === 'refund_in_flight') contains(content, 'RETURN-SYNTHETIC', 'Returned payment');
    }
  }
});
Deno.test('hostile sender and tracking fields are escaped, unrelated webhook metadata never renders', () => {
  const r = bridgeTransactionEmailReceipt({ ...va, source: { sender_name: '<script>bad()</script>', tracking_number: '<img src=x onerror=bad()>' } }, { kind: 'virtual_account', sourceCurrency: 'EUR' });
  const html = renderTransactionReceipt(r).html;
  contains(html, '&lt;script&gt;', '&lt;img');
  if (html.includes('<script>') || html.includes('<img src=x')) throw new Error('Unescaped provider text');
});
Deno.test('outgoing VA without source receipt does not label destination amount as fiat', () => {
  const r = bridgeTransactionEmailReceipt({ type: 'payment_processed', amount: '111', currency: 'usdc', gas_fee: '.1' }, { kind: 'virtual_account', sourceCurrency: 'EUR', receipt: { destination_amount: 111, destination_currency: 'USDC' } });
  equal(r.source_amount, undefined); equal(r.destination_amount, 111); equal(r.gas_fee_currency, undefined);
  equal(renderTransactionReceipt(r).text.includes('111.00 EUR'), false);
});
