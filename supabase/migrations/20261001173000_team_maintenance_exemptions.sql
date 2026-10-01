begin;
set local lock_timeout='5s';
create table if not exists public.maintenance_billing_exemptions(
 user_id uuid primary key references auth.users(id) on delete cascade,reason text not null,created_at timestamptz not null default now()
);
alter table public.maintenance_billing_exemptions enable row level security;
revoke all on public.maintenance_billing_exemptions from public,anon,authenticated;
grant all on public.maintenance_billing_exemptions to service_role;
CREATE OR REPLACE FUNCTION public.maintenance_account_is_billable(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select not public.is_partner_customer(p_user_id) and not exists(select 1 from public.maintenance_billing_exemptions where user_id=p_user_id) and exists(
    select 1
    from public.user_profiles up
    left join public.business_profiles bp on bp.user_id=up.id
    join auth.users au on au.id=up.id and au.deleted_at is null
    where up.id=p_user_id
      and coalesce(up.is_demo,false)=false and coalesce(up.is_admin,false)=false
      and lower(up.account_type::text) in ('business','individual')
      and lower(coalesce(up.kyc_status::text,''))='verified'
      and (lower(up.account_type::text)='individual'
        or lower(coalesce(bp.bridge_kyb_status::text,'')) in ('approved','verified'))
      and lower(coalesce(up.account_status::text,'active')) not in
        ('paused','frozen','offboarded','rejected','closed','deleted','suspended')
      and lower(coalesce(up.bridge_account_status::text,'active')) not in
        ('paused','frozen','offboarded','rejected','closed','deleted','suspended')
      and (up.account_type::text='business' or exists(
        select 1 from public.bridge_virtual_accounts va
        where coalesce(va.business_user_id,va.user_id)=up.id
          and lower(va.status::text) in ('active','activated')
      ))
  )
$function$;
create or replace function public.enforce_team_maintenance_exemption()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from maintenance_billing_exemptions where user_id=new.user_id) then return new;end if;
 if tg_table_name='subscriptions' then
  new.status:='cancelled';new.payment_status:='active';new.restricted_at:=null;new.grace_started_at:=null;
  new.metadata:=coalesce(new.metadata,'{}'::jsonb)||jsonb_build_object('billing_exempt',true,'billing_paused_reason','team_account_exempt');
 elsif tg_table_name='subscription_external_invoices' then
  if new.status<>'paid' and new.paid_at is null then new.status:='cancelled';new.last_error:='team_account_exempt';end if;
 elsif tg_table_name='subscription_email_jobs' then
  if new.status<>'sent' and new.sent_at is null and (new.template like '%subscription%' or new.template like '%maintenance%') then
   new.status:='failed';new.last_error:='suppressed:team_account_exempt';
  end if;
 end if;
 return new;
end $$;
revoke all on function public.enforce_team_maintenance_exemption() from public,anon,authenticated;
create trigger trg_team_maintenance_exemption before insert or update on public.subscriptions for each row execute function public.enforce_team_maintenance_exemption();
create trigger trg_team_maintenance_exemption before insert or update on public.subscription_external_invoices for each row execute function public.enforce_team_maintenance_exemption();
create trigger trg_team_maintenance_exemption before insert or update on public.subscription_email_jobs for each row execute function public.enforce_team_maintenance_exemption();
insert into maintenance_billing_exemptions(user_id,reason)
select id,case when lower(email)='founder@borderpayafrica.com' then 'BorderPay treasury master account' else 'BorderPay production testing team account' end
from user_profiles where lower(email) in ('founder@borderpayafrica.com','adhiamboadhiambo22@gmail.com')
on conflict(user_id) do nothing;
update subscriptions set status='cancelled',updated_at=now() where user_id in(select user_id from maintenance_billing_exemptions);
update subscription_external_invoices set status='cancelled',updated_at=now(),metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('cancellation_reason','team_account_exempt')
where user_id in(select user_id from maintenance_billing_exemptions) and status<>'paid' and paid_at is null;
update subscription_email_jobs set status='failed',last_error='suppressed:team_account_exempt'
where user_id in(select user_id from maintenance_billing_exemptions) and status<>'sent' and sent_at is null and (template like '%subscription%' or template like '%maintenance%');
insert into subscription_admin_logs(user_id,subscription_id,action,details)
select s.user_id,s.id,'maintenance_team_exemption',jsonb_build_object('reason',e.reason,'preserve_paid_invoices',true,'no_wallet_debit',true)
from subscriptions s join maintenance_billing_exemptions e on e.user_id=s.user_id;
commit;
