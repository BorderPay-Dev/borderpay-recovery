begin;
set local lock_timeout='5s';
with eligible as (
 select i.*,u.email,b.company_name
 from subscription_external_invoices i
 join user_profiles u on u.id=i.user_id
 join business_profiles b on b.user_id=u.id
 join auth.users au on au.id=u.id and au.deleted_at is null and lower(au.email)=lower(u.email)
 where i.billing_period='2026-09-30' and i.status='payment_link_created' and i.paid_at is null
 and i.payment_link like 'https://%' and u.account_type='business'
 and not coalesce(au.banned_until>now(),false)
 and maintenance_account_is_billable(u.id)
 and not exists(select 1 from maintenance_billing_exemptions where user_id=u.id)
), queued as (
 insert into subscription_email_jobs(user_id,template,recipient,props,idempotency_key,status,next_attempt_at)
 select e.user_id,'business.subscription_external_invoice',lower(e.email),
 jsonb_build_object('customer_name',e.company_name,'amount',e.amount,'currency',e.currency,'billing_period',e.billing_period,'payment_link',e.payment_link,'transaction_reference',e.provider_reference,'notice','invoice'),
 'maintenance:september:20261001:operator:'||e.id::text,'pending',now()
 from eligible e where not exists(
  select 1 from subscription_email_jobs j where j.user_id=e.user_id and j.props->>'transaction_reference'=e.provider_reference
  and j.status='pending' and coalesce(j.props->>'notice','invoice')='invoice'
 )
 on conflict(idempotency_key) do nothing
 returning id,user_id
), logged as (
 insert into subscription_admin_logs(user_id,subscription_id,action,details)
 select q.user_id,e.subscription_id,'maintenance_notice_requested',jsonb_build_object('job_id',q.id,'billing_period','2026-09-30','request','20261001_exclude_team','quota_required',true)
 from queued q join eligible e on e.user_id=q.user_id returning id
)
select (select count(*) from eligible) eligible_merchants,(select count(*) from queued) newly_queued,(select count(*) from logged) audit_records;
commit;
