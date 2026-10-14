import { BORDERPAY_BRAND, escapeHtml, fmtMoney, htmlLayout, textLayout, type RenderedEmail } from './layout.ts';
import { receiptNumber, type TransactionEmailReceipt } from '../transaction-email-receipt.ts';

export function chargeLabel(amount: unknown, currency: string | undefined, percentage?: unknown): string | undefined {
  const n = receiptNumber(amount), percent = receiptNumber(percentage);
  const rate = percent !== undefined ? `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(percent)}%` : undefined;
  const money = n !== undefined && currency ? fmtMoney(n, currency) : undefined;
  return money ? `${money}${rate ? ` (${rate})` : ''}` : rate;
}

/** Shared HTML/text rows keep all client formats consistent. */
export function renderTransactionReceipt(receipt: TransactionEmailReceipt) {
  const rows: Array<[string, string]> = [];
  const add = (label: string, value: unknown) => {
    if (typeof value === 'string' && value.trim()) rows.push([label, value]);
  };
  const money = (label: string, amount: unknown, currency?: string) => {
    const n = receiptNumber(amount);
    if (n !== undefined && currency) add(label, fmtMoney(n, currency));
  };
  add('Transaction ID', receipt.transaction_id);
  if (receipt.activity_id !== receipt.transaction_id) add('Activity ID', receipt.activity_id);
  add('Deposit ID', receipt.deposit_id);
  add('Sender', receipt.sender_name);
  add('Recipient', receipt.recipient_name);
  add('Payment reference', receipt.payment_reference);
  money('Source amount', receipt.source_amount, receipt.source_currency);
  add('BorderPay charge fee', chargeLabel(receipt.charge_amount, receipt.charge_currency, receipt.charge_percent));
  money('Exchange fee', receipt.exchange_fee_amount, receipt.exchange_fee_currency);
  money('Network fee', receipt.gas_fee_amount, receipt.gas_fee_currency);
  money('Amount after source charges', receipt.subtotal_amount, receipt.subtotal_currency);
  if (receipt.exchange_rate && receipt.source_currency && receipt.destination_currency) {
    add('Exchange rate', `1 ${receipt.source_currency} = ${receipt.exchange_rate} ${receipt.destination_currency}`);
  }
  money('Destination amount', receipt.destination_amount, receipt.destination_currency);
  add('Source payment rail', receipt.source_rail);
  add('Destination payment rail', receipt.destination_rail);
  add('Payment scheme', receipt.payment_scheme);
  add('Sender bank', receipt.sender_bank);
  add('Sender account / IBAN', receipt.sender_account);
  add('Sender bank BIC', receipt.sender_bic);
  add('Source wallet address', receipt.source_address);
  add('Destination wallet address', receipt.destination_address);
  add('Deposit tracking number', receipt.source_tracking_number);
  add('Destination tracking number', receipt.destination_tracking_number);
  add('Bank trace number', receipt.trace_number);
  add('IMAD', receipt.imad);
  add('OMAD', receipt.omad);
  add('SWIFT UETR', receipt.uetr);
  add('Source blockchain transaction hash', receipt.source_tx_hash);
  add('Destination blockchain transaction hash', receipt.destination_tx_hash);
  return {
    html: rows.map(([label, value]) => `<tr><td style="padding:8px 0;color:${BORDERPAY_BRAND.textMuted};font-size:13px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:8px 0 8px 12px;color:${BORDERPAY_BRAND.text};font-size:13px;text-align:right;overflow-wrap:anywhere;word-break:break-all;">${escapeHtml(value)}</td></tr>`).join(''),
    text: rows.map(([label, value]) => `${label}: ${value}`).join('\n'),
  };
}

interface StatusReceiptProps {
  email_receipt?: TransactionEmailReceipt;
  amount: number;
  currency: string;
  reference: string;
  description?: string | null;
  occurred_at?: string | null;
  status: string;
  refund_return_reason?: string | null;
  refund_returned_at?: string | null;
  refund_rail?: string | null;
  refund_beneficiary_name?: string | null;
  refund_reference_id?: string | null;
}

export function renderStatusReceipt(p: StatusReceiptProps, account: string, copy: { heading: string; tone: 'default' | 'warning' | 'danger' }): RenderedEmail {
  const r = p.email_receipt!;
  const details = renderTransactionReceipt(r);
  const currency = r.source_currency ?? p.currency;
  const amount = r.source_amount ?? p.amount;
  const subject = `${account}: ${copy.heading.toLowerCase()} (${fmtMoney(amount, currency)})`;
  const intro: Record<string, string> = {
    approved: 'Your transaction has been approved. Payment and tracking details are below.',
    in_review: 'This transaction is under review. These details do not confirm settlement. We will notify you when its status changes.',
    canceled: 'This transaction was canceled. Its payment and tracking details are below.',
    refunded: 'This payment has been returned. The available return details are below.',
    refund_in_flight: 'A return is in progress for this payment. We will notify you when it is complete.',
  };
  const rows: Array<[string, string | null | undefined]> = [
    ['Account', account], ['Status', copy.heading], ['Reference', p.reference], ['Description', p.description],
    ['When', p.occurred_at ? new Date(p.occurred_at).toUTCString() : undefined],
  ];
  if (p.status === 'refunded' || p.status === 'refund_in_flight') rows.push(
    ['Return reason', p.refund_return_reason], ['Returned at', p.refund_returned_at],
    ['Refund rail', p.refund_rail], ['Refund beneficiary', p.refund_beneficiary_name], ['Refund reference ID', p.refund_reference_id],
  );
  const present = rows.filter((row): row is [string, string] => typeof row[1] === 'string' && Boolean(row[1]));
  const header = present.map(([label, value]) => `<tr><td style="padding:8px 0;color:${BORDERPAY_BRAND.textMuted};font-size:13px;">${escapeHtml(label)}</td><td style="padding:8px 0 8px 12px;color:${BORDERPAY_BRAND.text};font-size:13px;text-align:right;word-break:break-all;">${escapeHtml(value)}</td></tr>`).join('');
  const ctaUrl = `${BORDERPAY_BRAND.appUrl}/transactions`;
  return {
    subject,
    html: htmlLayout({ preview: subject, heading: copy.heading, introText: intro[p.status] ?? intro.in_review,
      body: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDERPAY_BRAND.border};border-radius:12px;padding:16px;">${header}${details.html}</table>`,
      ctaText: 'Open BorderPay Velocity', ctaUrl, brandTone: copy.tone }),
    text: textLayout({ heading: copy.heading, body: `${intro[p.status] ?? intro.in_review}\n\n${present.map(([label, value]) => `${label}: ${value}`).join('\n')}\n${details.text}`, ctaText: 'Open BorderPay Velocity', ctaUrl }),
  };
}
