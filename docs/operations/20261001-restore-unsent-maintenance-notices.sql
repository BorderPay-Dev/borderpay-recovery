begin;
set local lock_timeout='5s';
with restored as (
 update subscription_email_jobs j
 set status='pending',next_attempt_at=now(),last_error=null,
 props=coalesce(j.props,'{}'::jsonb)||jsonb_build_object('payment_link',i.payment_link,'amount',i.amount,'currency',i.currency,'billing_period',i.billing_period)
 from subscription_external_invoices i, subscriptions s
 where i.id is not null and s.id=i.subscription_id and s.status='active'
 and i.provider_reference=j.props->>'transaction_reference'
 and i.billing_period='2026-09-30' and i.metadata ? 'approval_billing_restored_at'
 and i.status='payment_link_created' and i.paid_at is null and i.payment_link like 'https://%'
 and j.status='failed' and j.sent_at is null
 and j.last_error='suppressed:invoice_not_payable_or_subscription_inactive'
 and maintenance_account_is_billable(i.user_id)
 returning j.user_id,j.id,i.subscription_id
),logged as (
 insert into subscription_admin_logs(user_id,subscription_id,action,details)
 select user_id,subscription_id,'maintenance_notice_restored',jsonb_build_object('job_id',id,'billing_period','2026-09-30','source','verified_business_maintenance_fix','delivery_deferred_to_quota',true) from restored returning id
)
select count(*) restored_notices from logged;
commit;
