import { normalizeTransactionReceipt } from '../transactions/receipt';
import { txDirection } from '../transactions/direction';
import { canonicalTransactionId, lifecycleTime, normalizedPaymentStatus, shouldReplaceLifecycle } from '../transactions/lifecycle';
export interface NotificationRow {
  id:           string;
  user_id?:     string;
  title?:       string | null;
  body?:        string | null;
  message?:     string | null;        // legacy field
  type?:        string | null;        // 'transaction' | 'security' | 'kyc' | ...
  category?:    string | null;
  read?:        boolean;
  read_at?:     string | null;
  created_at:   string;
  metadata?:    Record<string, any>;
}

function transactionTitle(tx: any): string {
  const metadata = tx?.metadata && typeof tx.metadata === 'object' ? tx.metadata : {};
  const direction = txDirection({
    ...tx,
    type: tx?.type || tx?.transaction_type,
    metadata,
  } as any);
  const status = normalizedPaymentStatus(tx?.status || metadata?.status);
  if (direction === 'debit') {
    if (status === 'completed' || status === 'succeeded' || status === 'success') return 'Payout completed';
    if (status === 'failed' || status === 'canceled' || status === 'cancelled') return 'Payout failed';
    if (status === 'in_review') return 'Payout under review';
    if (status === 'returned' || status === 'refunded') return 'Payout returned';
    if (status === 'refund_pending') return 'Payout return in progress';
    return 'Payout pending';
  }
  if (direction === 'credit') {
    if (status === 'completed' || status === 'approved' || status === 'succeeded' || status === 'success') return 'Payment received';
    if (status === 'failed' || status === 'refunded' || status === 'returned') return 'Payment not completed';
    if (status === 'in_review') return 'Payment under review';
    if (status === 'refund_pending') return 'Refund in progress';
    return 'Payment pending';
  }
  const raw = String(tx?.description || tx?.memo || tx?.type || tx?.transaction_type || 'Transaction').trim();
  return raw ? raw.replace(/_/g, ' ') : 'Transaction';
}

export function transactionToNotification(tx: any): NotificationRow | null {
  const id = canonicalTransactionId(tx);
  if (!id) return null;
  const metadata = tx?.metadata && typeof tx.metadata === 'object' ? tx.metadata : {};
  const currency = String(tx?.currency || metadata?.currency || 'USD').toUpperCase();
  const receipt = tx?.receipt || normalizeTransactionReceipt({ amount: tx?.amount, metadata });
  const amount = Number(receipt?.finalAmount ?? tx?.amount ?? metadata?.amount ?? metadata?.net_amount ?? 0);
  const status = normalizedPaymentStatus(tx?.status || metadata?.status);
  const direction = txDirection({
    ...tx,
    type: tx?.type || tx?.transaction_type,
    metadata,
  } as any);
  const createdAt = String(tx?.created_at || tx?.updated_at || new Date().toISOString());
  return {
    id: `tx:${id}`,
    title: transactionTitle(tx),
    body: `${direction === 'credit' ? 'Incoming' : 'Outgoing'} ${formatReceiptMoney(amount, currency)} · ${status === 'completed' ? 'completed' : status}`,
    type: direction === 'credit' ? 'transaction_credit' : 'transaction_debit',
    category: 'transaction',
    read: true,
    created_at: createdAt,
    metadata: {
      ...metadata,
      amount,
      currency,
      direction,
      status,
      __activity_source: 'transactions',
      transaction_id: id,
      status_updated_at: new Date(lifecycleTime(tx)).toISOString(),
    },
  };
}

export function composeNotificationRows(notificationRows: NotificationRow[], activityRows: NotificationRow[]): NotificationRow[] {
  const byId = new Map<string, NotificationRow>();
  const persisted = new Map<string, NotificationRow>();
  const keyFor = (row: NotificationRow): string => {
    const md = row?.metadata || {};
    if (!String(row.type || '').startsWith('transaction') && row.category !== 'transaction') return `notification:${row.id}`;
    return String(
      md.bridge_transfer_id ||
      md.transaction_id ||
      md.deposit_id ||
      md.credit_event_id ||
      md.bridge_event_id ||
      md.event_id ||
      row.id ||
      '',
    );
  };
  const put = (row: NotificationRow) => {
    const key = keyFor(row);
    if (!key) return;
    const previous = byId.get(key);
    if (shouldReplaceLifecycle(previous, row)) byId.set(key, row);
  };
  activityRows.forEach(put);
  notificationRows.forEach((row) => {
    const id = String(row?.id || '').trim();
    if (!id) return;
    const key = keyFor(row);
    const saved = persisted.get(key);
    if (!saved || Date.parse(row.created_at) >= Date.parse(saved.created_at)) persisted.set(key, row);
    put(row);
  });
  return Array.from(byId.entries()).map(([key, row]) => {
    const saved = persisted.get(key);
    if (!saved || row.metadata?.__activity_source !== 'transactions') return row;
    const metadata = { ...row.metadata };
    delete metadata.__activity_source;
    return { ...row, id: saved.id, read: saved.read, read_at: saved.read_at, metadata };
  })
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 100);
}

export function unreadNotificationCount(rows: NotificationRow[]): number {
  return rows.filter((n) => !n.read && n.metadata?.__activity_source !== 'transactions').length;
}

export function formatReceiptMoney(amount: number, currency: string): string {
  const c = String(currency || 'USD').toUpperCase();
  const formatted = Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: ['USDC', 'USDT'].includes(c) ? 6 : 2,
  });
  if (c === 'USD' || c === 'USDC') return `$${formatted}`;
  if (c === 'EUR') return `€${formatted}`;
  if (c === 'GBP') return `£${formatted}`;
  return `${formatted} ${c}`;
}

