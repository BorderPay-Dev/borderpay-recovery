import { supabase } from '../supabase/client';

/** RLS remains authoritative; filters and channel lifetime are scoped to this session user. */
export function subscribeUserActivity(userId: string, onChange: () => void): () => void {
  if (!userId) return () => {};
  let stopped = false;
  let pending: ReturnType<typeof setTimeout> | undefined;
  const changed = () => {
    if (stopped || pending) return;
    pending = setTimeout(() => { pending = undefined; if (!stopped) onChange(); }, 250);
  };
  const channel = supabase.channel(`notification-activity:${userId}:${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, changed)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` }, changed)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bridge_balance_ledger', filter: `user_id=eq.${userId}` }, changed)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bridge_balance_ledger', filter: `business_user_id=eq.${userId}` }, changed)
    .subscribe((status) => { if (status === 'SUBSCRIBED') changed(); });
  return () => { stopped = true; clearTimeout(pending); void supabase.removeChannel(channel); };
}
