BEGIN;
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
      and not exists(select 1 from public.subscriptions held where held.user_id=up.id
        and nullif(held.metadata->>'billing_service_hold','') is not null)
      and (up.account_type::text<>'business' or exists(
        select 1 from public.bridge_wallets w
        where coalesce(w.business_user_id,w.user_id)=up.id and lower(w.status) in ('active','activated')
      ))
      and exists(
        select 1 from public.bridge_virtual_accounts va
        where coalesce(va.business_user_id,va.user_id)=up.id
          and lower(va.status::text) in ('active','activated')
      )
  )
$function$
;

CREATE OR REPLACE FUNCTION public.maintenance_account_is_billable_for_period(p_user_id uuid,p_period date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
 select p_period is not null and public.maintenance_account_is_billable(p_user_id) and exists(
 select 1 from public.user_profiles up
 left join public.business_profiles bp on bp.user_id=up.id
 left join public.subscriptions s on s.user_id=up.id
 where up.id=p_user_id and coalesce(s.verified_at,bp.bridge_kyb_completed_at,up.kyc_verified_at,up.bridge_kyc_completed_at)
 < (p_period+1)::timestamp at time zone 'UTC'
 );
$function$;
REVOKE ALL ON FUNCTION public.maintenance_account_is_billable_for_period(uuid,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.maintenance_account_is_billable_for_period(uuid,date) TO service_role;


CREATE OR REPLACE FUNCTION public.queue_verified_business_maintenance(p_user_id uuid, p_period date DEFAULT subscription_current_month_end(CURRENT_DATE))
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare s public.subscriptions; v_invoice public.subscription_external_invoices; v_country text; v_id uuid;
begin
 if p_period is null or p_period not in (public.subscription_current_month_end(current_date),(date_trunc('month',current_date)-interval '1 day')::date) then raise exception 'Only the current or latest closed billing month can be prepared';end if;
 if not exists(select 1 from user_profiles up left join subscriptions ss on ss.user_id=up.id where up.id=p_user_id and coalesce(ss.verified_at,up.kyc_verified_at,now())::date<=p_period) then return jsonb_build_object('status','skipped','reason','not_verified_in_period');end if;
 if not exists(select 1 from public.user_profiles where id=p_user_id and account_type::text='business')
    or not public.maintenance_account_is_billable_for_period(p_user_id,p_period) then
  return jsonb_build_object('status','skipped','reason','ineligible');
 end if;
 perform pg_advisory_xact_lock(hashtextextended('business-maintenance:'||p_user_id::text,0));
 select upper(trim(country)) into v_country from public.user_profiles where id=p_user_id;
 if v_country is null or v_country !~ '^[A-Z]{2}$' then return jsonb_build_object('status','blocked','reason','country_required');end if;
 select * into s from public.subscriptions where user_id=p_user_id for update;
 if not found then
  s:=public.ensure_internal_subscription(p_user_id,p_period,false);
 elsif s.status='cancelled' and s.metadata->>'billing_paused_reason' in ('no_active_virtual_account','account_not_billable_or_no_active_virtual_account') then
  update public.subscriptions set status='active',next_billing_date=p_period,monthly_fee=public.subscription_fee_for_period('business',p_period),
   metadata=(coalesce(metadata,'{}'::jsonb)-'billing_paused_reason'-'billing_paused_at')||jsonb_build_object('business_approval_billing_restored_at',now()),updated_at=now()
  where id=s.id returning * into s;
 end if;
 if s.status<>'active' then return jsonb_build_object('status','skipped','reason','subscription_inactive');end if;
 select * into v_invoice from public.subscription_external_invoices where subscription_id=s.id and billing_period=p_period;
 if found then
  if v_invoice.status='cancelled' and v_invoice.metadata->>'reason' in ('no_active_virtual_account','account_not_billable_or_no_active_virtual_account') and v_invoice.paid_at is null and v_invoice.payment_link is null then
   update subscription_external_invoices set status='pending_configuration',last_error=null,metadata=(metadata-'reason'-'cancelled_at')||jsonb_build_object('approval_billing_restored_at',now()),updated_at=now() where id=v_invoice.id;
   return jsonb_build_object('status','restored','invoice_id',v_invoice.id);
  end if;
  return jsonb_build_object('status','existing','invoice_status',v_invoice.status,'invoice_id',v_invoice.id);
 end if;
 if exists(
  select 1 from public.billing_transactions where subscription_id=s.id and billing_period=p_period and status='completed'
 ) then return jsonb_build_object('status','covered','reason','period_already_paid');end if;
 v_id:=gen_random_uuid();
 insert into public.subscription_external_invoices(id,subscription_id,user_id,billing_period,provider,scope_country,amount,currency,provider_reference,metadata)
 values(v_id,s.id,p_user_id,p_period,'flutterwave',v_country,public.subscription_fee_for_period('business',p_period),'USD','bp-maintenance-'||v_id::text,
 jsonb_build_object('collection_route','external_invoice','source','automatic_business_approval','payment_is_confirmed_only_by_verified_provider_webhook',true))
 on conflict(subscription_id,billing_period) do nothing returning * into v_invoice;
 if not found then
  select * into v_invoice from public.subscription_external_invoices where subscription_id=s.id and billing_period=p_period;
  return jsonb_build_object('status','existing','invoice_status',v_invoice.status,'invoice_id',v_invoice.id);
 end if;
 insert into public.subscription_admin_logs(user_id,subscription_id,action,details)
 values(p_user_id,s.id,'automatic_business_invoice_queued',jsonb_build_object('invoice_id',v_id,'billing_period',p_period,'no_wallet_debit',true));
 return jsonb_build_object('status','created','invoice_id',v_id,'billing_period',p_period);
end $function$
;

CREATE OR REPLACE FUNCTION public.queue_external_subscription_invoice(p_subscription_id uuid, p_billing_date date DEFAULT CURRENT_DATE, p_scope_country text DEFAULT NULL::text, p_provider text DEFAULT 'flutterwave'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  s public.subscriptions;
  invoice public.subscription_external_invoices;
  country text := upper(trim(coalesce(p_scope_country, '')));
begin
  if p_provider <> 'flutterwave' then
    raise exception 'Unsupported external subscription provider';
  end if;
  if country !~ '^[A-Z]{2}$' then
    raise exception 'Authoritative ISO-2 scope country is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_subscription_id::text, 0));
  select * into s from public.subscriptions where id = p_subscription_id for update;
  if not found then raise exception 'Subscription not found'; end if;
  if public.is_partner_customer(s.user_id) then return jsonb_build_object('status','skipped','reason','partner_managed'); end if;
  if s.status <> 'active' then
    return jsonb_build_object('status','skipped','reason','inactive');
  end if;
  if not public.maintenance_account_is_billable_for_period(s.user_id,s.next_billing_date) then
    return jsonb_build_object('status','skipped','reason','ineligible_services_or_period');
  end if;
  if s.next_billing_date > p_billing_date then
    return jsonb_build_object('status','skipped','reason','not_due');
  end if;

  insert into public.subscription_external_invoices(
    subscription_id,user_id,billing_period,provider,scope_country,amount,currency,
    metadata
  ) values (
    s.id,s.user_id,s.next_billing_date,p_provider,country,s.monthly_fee,'USD',
    jsonb_build_object(
      'collection_route','external_invoice',
      'payment_is_confirmed_only_by_verified_provider_webhook',true
    )
  )
  on conflict(subscription_id,billing_period) do update set
    attempt_count = public.subscription_external_invoices.attempt_count + 1,
    updated_at = now()
  returning * into invoice;

  insert into public.subscription_admin_logs(
    user_id,subscription_id,billing_transaction_id,action,details
  )
  select s.user_id,s.id,null,'external_invoice_queued',
    jsonb_build_object(
      'invoice_id',invoice.id,
      'provider',invoice.provider,
      'scope_country',invoice.scope_country,
      'billing_period',invoice.billing_period,
      'amount',invoice.amount,
      'status',invoice.status
    )
  where invoice.attempt_count = 0;

  return jsonb_build_object(
    'status','queued',
    'route','flutterwave_invoice',
    'invoice_id',invoice.id,
    'invoice_status',invoice.status,
    'billing_period',invoice.billing_period,
    'amount',invoice.amount,
    'currency',invoice.currency,
    'idempotent',invoice.attempt_count > 0
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_active_va_maintenance_subscriptions(p_billing_period date DEFAULT subscription_current_month_end(CURRENT_DATE), p_dry_run boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  r record;
  eligible_count integer := 0;
  activated_count integer := 0;
  paused_count integer := 0;
begin
  if p_billing_period <> public.subscription_current_month_end(p_billing_period) then
    raise exception 'Billing period must be the final day of its calendar month';
  end if;

  -- Pause subscriptions and unpaid invoices when no active VA remains.
  select count(*)::integer into paused_count
  from public.subscriptions s
  where s.status = 'active'
    and not public.maintenance_account_is_billable(s.user_id);

  if not p_dry_run then
    update public.subscription_external_invoices sei
    set status='cancelled', payment_link=null, expires_at=now(),
        last_error='account_not_billable_or_no_active_virtual_account',
        metadata=coalesce(sei.metadata,'{}'::jsonb)||jsonb_build_object('cancelled_at',now(),'reason','account_not_billable_or_no_active_virtual_account'),
        updated_at=now()
    from public.subscriptions s
    where s.id=sei.subscription_id and s.status='active'
      and sei.paid_at is null
      and sei.status in ('pending_configuration','payment_link_created','failed')
      and not public.maintenance_account_is_billable(s.user_id);

    update public.subscriptions s
    set status='cancelled', payment_status='active', grace_started_at=null,
        reminder_sent_at=null, restricted_at=null,
        metadata=coalesce(s.metadata,'{}'::jsonb)||jsonb_build_object('billing_paused_reason','account_not_billable_or_no_active_virtual_account','billing_paused_at',now()),
        updated_at=now()
    where s.status='active'
      and not public.maintenance_account_is_billable(s.user_id);
  end if;

  for r in
    select up.id,lower(up.account_type::text) account_type,up.email,up.full_name,bp.company_name
    from public.user_profiles up
    left join public.business_profiles bp on bp.user_id=up.id
    join auth.users au on au.id=up.id and au.deleted_at is null
    where not public.is_partner_customer(up.id)
      and lower(up.account_type::text) in ('business','individual')
      and lower(coalesce(up.kyc_status::text,''))='verified'
      and (lower(up.account_type::text)='individual'
        or lower(coalesce(bp.bridge_kyb_status::text,'')) in ('approved','verified'))
      and lower(coalesce(up.account_status::text,'active')) not in
        ('paused','frozen','offboarded','rejected','closed','deleted','suspended')
      and lower(coalesce(up.bridge_account_status::text,'active')) not in
        ('paused','frozen','offboarded','rejected','closed','deleted','suspended')
      and public.maintenance_account_is_billable_for_period(up.id,p_billing_period)
      and exists (
        select 1 from public.bridge_virtual_accounts va
        where coalesce(va.business_user_id,va.user_id)=up.id
          and lower(va.status::text) in ('active','activated')
      )
    order by up.id
  loop
    eligible_count := eligible_count + 1;
    if not p_dry_run then
      perform public.ensure_internal_subscription(r.id,p_billing_period,false);
      update public.subscriptions
      set status='active', monthly_fee=case when r.account_type='business' then 29.99 else 5.00 end,
          next_billing_date=p_billing_period,
          metadata=(coalesce(metadata,'{}'::jsonb)-'billing_paused_reason'-'billing_paused_at')||jsonb_build_object('active_va_eligibility_checked_at',now()),
          updated_at=now()
      where user_id=r.id;
      insert into public.subscription_email_jobs(user_id,template,recipient,props,idempotency_key)
      select r.id,r.account_type||'.account_maintenance_fee',lower(trim(r.email)),
        jsonb_build_object(
          'company_name',r.company_name,'full_name',r.full_name,
          'billing_start_date',p_billing_period
        ),
        'subscription:active_va_maintenance:'||p_billing_period::text||':'||r.id::text
      where nullif(trim(coalesce(r.email,'')),'') is not null
      on conflict(idempotency_key) do nothing;
      activated_count := activated_count + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'dry_run',p_dry_run,'billing_period',p_billing_period,
    'eligible',eligible_count,'activated',activated_count,'paused_no_active_va',paused_count
  );
end;
$function$
;
-- Operator-authorized billing corrections, 2026-10-05. No provider or ledger writes.
UPDATE public.subscriptions SET metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
 'billing_service_hold','required_named_accounts_unavailable','billing_service_hold_at',now()),updated_at=now()
WHERE user_id='0eb438db-6f35-4d4d-a4ca-e83df61fa0f6';

CREATE TEMP TABLE billing_cleanup_20261005 ON COMMIT DROP AS
SELECT i.id,i.user_id,i.subscription_id,i.billing_period,i.status as previous_status,i.payment_link,
CASE WHEN NOT public.maintenance_account_is_billable(i.user_id) THEN 'services_unavailable_or_account_ineligible'
 ELSE 'not_verified_in_billing_period' END as reason
FROM public.subscription_external_invoices i JOIN public.subscriptions s ON s.id=i.subscription_id
WHERE s.account_type='business' AND i.paid_at IS NULL
 AND i.status IN ('pending_configuration','payment_link_created','failed')
 AND i.billing_period IN ('2026-09-30','2026-10-31')
 AND NOT public.maintenance_account_is_billable_for_period(i.user_id,i.billing_period);

INSERT INTO public.subscription_admin_logs(user_id,subscription_id,action,details)
SELECT user_id,subscription_id,'billing_eligibility_correction',jsonb_build_object(
'invoice_id',id,'billing_period',billing_period,'previous_status',previous_status,'reason',reason,
'authorization','operator_instruction_2026_10_05','no_wallet_debit',true)
FROM billing_cleanup_20261005;

UPDATE public.subscription_external_invoices i SET status='cancelled',payment_link=NULL,expires_at=now(),
last_error=c.reason,metadata=coalesce(i.metadata,'{}'::jsonb)||jsonb_build_object(
'cancelled_at',now(),'reason',c.reason,'previous_status',c.previous_status,'previous_payment_link',c.payment_link,
'correction_source','operator_instruction_2026_10_05'),updated_at=now()
FROM billing_cleanup_20261005 c WHERE i.id=c.id AND i.paid_at IS NULL AND i.status<>'paid';

UPDATE public.subscriptions s SET status='cancelled',metadata=coalesce(s.metadata,'{}'::jsonb)||jsonb_build_object(
'billing_paused_reason','account_not_billable_or_no_active_virtual_account','billing_paused_at',now(),
'billing_services_required','active_virtual_account_and_custodial_wallet'),updated_at=now()
WHERE s.status='active' AND s.account_type='business'
 AND NOT public.maintenance_account_is_billable(s.user_id)
 AND s.id IN (SELECT subscription_id FROM billing_cleanup_20261005);

UPDATE public.subscription_email_jobs j SET status='failed',last_error='suppressed:billing_eligibility_correction'
WHERE j.status='pending' AND j.sent_at IS NULL
 AND j.template IN ('business.subscription_external_invoice','business.account_maintenance_fee','business.account_verified_subscription')
 AND (NOT public.maintenance_account_is_billable(j.user_id) OR EXISTS(
 SELECT 1 FROM subscription_external_invoices i WHERE i.user_id=j.user_id
 AND i.provider_reference=j.props->>'transaction_reference' AND i.status='cancelled'));

SELECT b.company_name,c.billing_period,c.reason FROM billing_cleanup_20261005 c
JOIN business_profiles b ON b.user_id=c.user_id ORDER BY b.company_name,c.billing_period;

COMMIT;
