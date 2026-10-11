/** Compare lifecycle observations by evidence time, never by severity. */
export function lifecycleTime(row: any): number {
  const md = row?.metadata || {};
  for (const value of [md.status_updated_at, md.event_created_at, md.raw?.updated_at, row?.updated_at, md.raw?.created_at, row?.created_at]) {
    if (!value) continue;
    const parsed = Date.parse(String(value));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}
export function shouldReplaceLifecycle(previous: any, next: any): boolean {
  if (!previous) return true;
  const delta = lifecycleTime(next) - lifecycleTime(previous);
  if (delta) return delta > 0;
  // On equal timestamps prefer the canonical transaction projection.
  return next?.metadata?.__activity_source === 'transactions' ||
    (previous?.metadata?.__activity_source !== 'transactions' && Date.parse(next?.created_at || '') >= Date.parse(previous?.created_at || ''));
}
export function canonicalTransactionId(tx: any): string {
  const md = tx?.metadata || {};
  return String(md.bridge_transfer_id || tx?.bridge_transfer_id || md.raw?.payment_route?.transfer_id || md.transaction_id || md.deposit_id || md.credit_event_id || md.bridge_event_id || md.event_id || md.raw?.id || tx?.id || tx?.transfer_id || '').trim();
}
export function normalizedPaymentStatus(status: unknown): string {
  const raw = String(status || '').toLowerCase();
  if (['completed','approved','processed','payment_processed','settled','succeeded','success'].includes(raw)) return 'completed';
  if (['in_review','under_review','review','pending_review','manual_review'].includes(raw)) return 'in_review';
  if (['failed','error','canceled','cancelled'].includes(raw)) return 'failed';
  if (['returned','refunded'].includes(raw)) return raw;
  if (['refund_in_flight','refund_pending','return_in_flight'].includes(raw)) return 'refund_pending';
  return 'pending';
}
