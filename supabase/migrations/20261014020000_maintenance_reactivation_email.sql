begin;
alter table public.subscription_provider_access_actions add column reactivation_email_required boolean not null default true;
alter table public.subscription_provider_access_actions add column reactivation_email_job_id uuid references public.subscription_email_jobs(id);
-- Do not send stale historical notices. The recent recovery is picked up once.
update public.subscription_provider_access_actions set reactivation_email_required=false
where action='reactivate' and status='completed' and completed_at<now()-interval '24 hours';
create or replace function public.queue_maintenance_reactivation_emails(p_user_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare owner record; ids uuid[]; currencies text[]; job uuid; queued integer:=0; notice_key text;
begin
 for owner in select distinct a.user_id,p.email,coalesce(b.company_name,p.full_name,'there') as name
 from subscription_provider_access_actions a join user_profiles p on p.id=a.user_id
 left join business_profiles b on b.user_id=p.id
 where a.action='reactivate' and a.status='completed' and a.reactivation_email_required and a.reactivation_email_job_id is null
 and (p_user_id is null or a.user_id=p_user_id) and p.account_type='business' and p.account_status='active' and p.bridge_account_status='active' and p.account_frozen_at is null
 and nullif(trim(p.email),'') is not null and not public.is_partner_customer(p.id)
 order by a.user_id limit 30 loop
  select array_agg(q.id order by q.id),array_agg(distinct q.currency order by q.currency) into ids,currencies
  from (select a.id,v.currency from subscription_provider_access_actions a
    join subscriptions s on s.id=a.subscription_id and s.user_id=a.user_id
    join bridge_virtual_accounts v on v.bridge_virtual_account_id=a.bridge_virtual_account_id and v.bridge_customer_id=a.bridge_customer_id
    where a.user_id=owner.user_id and a.action='reactivate' and a.status='completed' and a.reason='subscription_payment_confirmed'
    and a.reactivation_email_required and a.reactivation_email_job_id is null
    and s.status='active' and s.account_type='business' and s.restricted_at is null
    and coalesce(v.business_user_id,v.user_id)=a.user_id and v.status in ('active','activated') and v.deactivation_reason is null and v.currency in ('USD','EUR','GBP')
    and exists(select 1 from subscription_external_invoices i where i.subscription_id=s.id and i.status='paid' and i.paid_at is not null)
    and not exists(select 1 from subscription_external_invoices i where i.subscription_id=s.id and i.status in ('payment_link_created','pending_configuration') and i.paid_at is null and now()>=(i.billing_period+8)::timestamptz)
    and not exists(select 1 from subscription_provider_access_actions newer where newer.user_id=a.user_id and newer.bridge_virtual_account_id=a.bridge_virtual_account_id and newer.created_at>a.created_at)
    order by a.id limit 100 for update of a skip locked) q;
  if coalesce(cardinality(ids),0)=0 then continue;end if;
  notice_key:='subscription:reactivated:'||md5(array_to_string(ids,','));
  insert into subscription_email_jobs(user_id,template,recipient,props,idempotency_key)
  values(owner.user_id,'business.subscription_access_reactivated',lower(trim(owner.email)),jsonb_build_object('customer_name',owner.name,'reactivated_currencies',currencies,'access_action_ids',ids),notice_key)
  on conflict(idempotency_key) do nothing returning id into job;
  if job is null then select id into job from subscription_email_jobs where idempotency_key=notice_key;end if;
  update subscription_provider_access_actions set reactivation_email_job_id=job where id=any(ids);
  queued:=queued+1;
 end loop;
 return jsonb_build_object('queued',queued);
end $$;
revoke all on function public.queue_maintenance_reactivation_emails(uuid) from public,anon,authenticated;
grant execute on function public.queue_maintenance_reactivation_emails(uuid) to service_role;
commit;
