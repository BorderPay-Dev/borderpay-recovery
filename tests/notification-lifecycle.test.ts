import { shouldReplaceLifecycle, normalizedPaymentStatus } from '../utils/transactions/lifecycle.ts';
import { composeNotificationRows, transactionToNotification } from '../utils/notifications/activityRows.ts';
function assert(value: unknown, message='assertion failed') { if (!value) throw new Error(message); }
const row=(status:string,time:string,id='payment-1')=>({id:'notice-'+status,type:'transaction',created_at:time,read:false,metadata:{bridge_transfer_id:id,status}});
Deno.test('new processed status replaces older review and failure, regardless of insertion order',()=>{
 for(const old of ['in_review','failed']){
  const before=row(old,'2026-10-10T10:00:00Z'),after=row('processed','2026-10-10T10:01:00Z');
  for(const observations of [[before,after],[after,before]])assert(composeNotificationRows(observations,[])[0].metadata?.status==='processed');
 }
});
Deno.test('later refund remains visible after earlier completion',()=>{
 const rows=composeNotificationRows([row('refunded','2026-10-10T11:00:00Z'),row('completed','2026-10-10T10:00:00Z')],[]);
 assert(rows[0].metadata?.status==='refunded');
});
Deno.test('delayed old provider event cannot replace newer provider state',()=>{
 const a=row('processed','2026-10-10T10:05:00Z'),b=row('in_review','2026-10-10T10:06:00Z');
 Object.assign(a.metadata,{raw:{updated_at:'2026-10-10T10:04:00Z'}});Object.assign(b.metadata,{raw:{updated_at:'2026-10-10T10:00:00Z'}});
 assert(!shouldReplaceLifecycle(a,b));
});
Deno.test('canonical updated transaction replaces historical notification without losing unread identity',()=>{
 const tx=transactionToNotification({id:'db-id',bridge_transfer_id:'payment-1',type:'withdrawal',amount:500,currency:'USD',status:'completed',created_at:'2026-10-01T00:00:00Z',updated_at:'2026-10-10T12:00:00Z'});
 assert(tx);const rows=composeNotificationRows([row('in_review','2026-10-10T10:00:00Z')],[tx!]);
 assert(rows.length===1);assert(rows[0].title==='Payout completed');assert(rows[0].read===false);assert(rows[0].id==='notice-in_review');assert(!rows[0].metadata?.__activity_source);
});
Deno.test('unrelated security notification does not merge into a payment',()=>{
 const security={...row('in_review','2026-10-10T11:00:00Z'),type:'security'};
 assert(composeNotificationRows([security,row('processed','2026-10-10T12:00:00Z')],[]).length===2);
});
Deno.test('current database status overrides stale provider metadata in presentation',()=>{
 const tx=transactionToNotification({id:'x',type:'deposit',amount:2000,currency:'USD',status:'completed',updated_at:'2026-10-10T12:00:00Z',metadata:{status:'in_review'}});
 assert(tx?.title==='Payment received');assert(tx?.metadata?.status==='completed');
});
Deno.test('all supported processed aliases render as completed, unknown does not imply success',()=>{
 for(const s of ['processed','payment_processed','settled','succeeded','approved'])assert(normalizedPaymentStatus(s)==='completed');
 assert(normalizedPaymentStatus('new_unknown_state')==='pending');
});
