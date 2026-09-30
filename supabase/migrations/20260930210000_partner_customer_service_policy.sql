begin;
set local lock_timeout = '5s';
-- Membership is server-owned. Do not infer it from email domains, country,
-- partner operator accounts, or mutable user metadata. A paused partner's
-- customers remain partner customers; never fall back to retail billing.
create or replace function public.is_partner_customer(p_user_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.api_tenant_end_users e where e.user_id=p_user_id)
 or exists(select 1 from public.account_origin_provenance p where p.user_id=p_user_id
   and p.origin_kind='partner' and p.tenant_id is not null);
$$;
revoke all on function public.is_partner_customer(uuid) from public,anon,authenticated;
grant execute on function public.is_partner_customer(uuid) to service_role;

-- Internal directory for support, campaigns and billing. No public/client access.
create or replace view public.partner_customer_directory as
 select e.user_id,e.tenant_id,e.external_user_id,e.onboarding_channel,
 coalesce(o.legal_name,t.tenant_name,'Partner') as partner_name,
 'partner'::text as customer_origin, false as direct_campaign_eligible,
 false as direct_maintenance_billable
 from public.api_tenant_end_users e
 join public.api_tenants t on t.id=e.tenant_id
 left join public.partner_organizations o on o.id::text=t.metadata->>'partner_organization_id'
 union all
 select p.user_id,p.tenant_id,p.external_user_id,p.onboarding_channel,
 coalesce(o.legal_name,t.tenant_name,'Partner'), 'partner',false,false
 from public.account_origin_provenance p
 join public.api_tenants t on t.id=p.tenant_id
 left join public.partner_organizations o on o.id::text=t.metadata->>'partner_organization_id'
 where p.origin_kind='partner' and p.tenant_id is not null
 and not exists(select 1 from public.api_tenant_end_users e where e.user_id=p.user_id);
revoke all on public.partner_customer_directory from public,anon,authenticated;
grant select on public.partner_customer_directory to service_role;

create or replace function public.partner_customer_memberships(p_user_ids uuid[])
returns setof public.partner_customer_directory language sql stable security definer
set search_path=public,pg_temp as $$
 select * from public.partner_customer_directory where user_id=any(p_user_ids);
$$;
revoke all on function public.partner_customer_memberships(uuid[]) from public,anon,authenticated;
grant execute on function public.partner_customer_memberships(uuid[]) to service_role;

-- Recipient lookup also covers callers that omit user_id or pass a different
-- user_id. Both auth and profile email are authoritative, not payload metadata.
create or replace function public.email_recipient_is_partner(p_user_id uuid,p_recipient text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select public.is_partner_customer(p_user_id) or exists(
   select 1 from public.user_profiles p where lower(trim(p.email))=lower(trim(p_recipient))
   and public.is_partner_customer(p.id)
 ) or exists(
   select 1 from auth.users u where lower(trim(u.email))=lower(trim(p_recipient))
   and public.is_partner_customer(u.id)
 );
$$;
revoke all on function public.email_recipient_is_partner(uuid,text) from public,anon,authenticated;
grant execute on function public.email_recipient_is_partner(uuid,text) to service_role;

-- Preserve existing direct-customer behavior: maintenance_account_is_billable
CREATE OR REPLACE FUNCTION public.maintenance_account_is_billable(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select not public.is_partner_customer(p_user_id) and exists(
    select 1
    from public.user_profiles up
    left join public.business_profiles bp on bp.user_id=up.id
    join auth.users au on au.id=up.id and au.deleted_at is null
    where up.id=p_user_id
      and lower(up.account_type::text) in ('business','individual')
      and lower(coalesce(up.kyc_status::text,''))='verified'
      and (lower(up.account_type::text)='individual'
        or lower(coalesce(bp.bridge_kyb_status::text,'')) in ('approved','verified'))
      and lower(coalesce(up.account_status::text,'active')) not in
        ('paused','frozen','offboarded','rejected','closed','deleted','suspended')
      and lower(coalesce(up.bridge_account_status::text,'active')) not in
        ('paused','frozen','offboarded','rejected','closed','deleted','suspended')
      and exists(
        select 1 from public.bridge_virtual_accounts va
        where coalesce(va.business_user_id,va.user_id)=up.id
          and lower(va.status::text) in ('active','activated')
      )
  )
$function$
;

-- Preserve existing direct-customer behavior: subscription_feature_restricted
CREATE OR REPLACE FUNCTION public.subscription_feature_restricted(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select not public.is_partner_customer(p_user_id) and exists(select 1 from public.subscriptions where user_id=p_user_id and status='active' and restricted_at is not null)
$function$
;

-- Preserve existing direct-customer behavior: ensure_internal_subscription
CREATE OR REPLACE FUNCTION public.ensure_internal_subscription(p_user_id uuid, p_first_billing_date date DEFAULT '2026-08-31'::date, p_send_verified_email boolean DEFAULT true)
 RETURNS subscriptions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_profile record; v_business record; v_sub public.subscriptions; v_type text;
  v_fee numeric; v_verified_at timestamptz; v_name text; v_template text;
  v_first_billing_date date;
begin
  if public.is_partner_customer(p_user_id) then return null; end if;
  select id, email, full_name, account_type::text, kyc_status::text,
         coalesce(kyc_verified_at, bridge_kyc_completed_at, updated_at, now()) verified_at
    into v_profile from public.user_profiles where id = p_user_id;
  if not found or lower(coalesce(v_profile.kyc_status,'')) <> 'verified' then
    raise exception 'User is not verified';
  end if;
  v_type := case when v_profile.account_type = 'business' then 'business' else 'individual' end;
  if v_type = 'business' then
    select company_name, bridge_kyb_status,
           coalesce(bridge_kyb_completed_at, updated_at, now()) verified_at
      into v_business from public.business_profiles where user_id = p_user_id;
    if not found or lower(coalesce(v_business.bridge_kyb_status,'')) not in ('approved','verified') then
      raise exception 'Business is not KYB verified';
    end if;
    v_verified_at := v_business.verified_at;
    v_name := coalesce(v_business.company_name, v_profile.full_name);
  else
    v_verified_at := v_profile.verified_at;
    v_name := v_profile.full_name;
  end if;

  v_first_billing_date := greatest(p_first_billing_date, current_date);
  v_fee := public.subscription_fee_for_period(v_type, v_first_billing_date);

  insert into public.subscriptions(user_id, account_type, monthly_fee, next_billing_date, verified_at)
  values(p_user_id, v_type, v_fee, v_first_billing_date, v_verified_at)
  on conflict(user_id) do update set
    account_type=excluded.account_type,
    monthly_fee=public.subscription_fee_for_period(excluded.account_type, subscriptions.next_billing_date),
    verified_at=excluded.verified_at,
    updated_at=now()
  returning * into v_sub;

  perform public.emit_subscription_event(p_user_id, v_sub.id, null, 'subscription.created',
    'subscription.created:' || v_sub.id::text,
    jsonb_build_object('account_type',v_type,'monthly_fee',v_sub.monthly_fee,'currency','USD','next_billing_date',v_sub.next_billing_date));

  if p_send_verified_email and nullif(trim(coalesce(v_profile.email,'')),'') is not null then
    v_template := v_type || '.account_verified_subscription';
    insert into public.subscription_email_jobs(user_id, template, recipient, props, idempotency_key)
    values(p_user_id, v_template, lower(trim(v_profile.email)),
      jsonb_build_object('customer_name',v_name,'account_type',v_type,'monthly_fee',v_sub.monthly_fee,'billing_start_date',v_sub.next_billing_date),
      'subscription:verified:' || p_user_id::text)
    on conflict(idempotency_key) do nothing;
  end if;
  return v_sub;
end $function$
;

-- Preserve existing direct-customer behavior: charge_va_maintenance
CREATE OR REPLACE FUNCTION public.charge_va_maintenance(p_user_id uuid)
 RETURNS TABLE(charged boolean, amount_usd_minor integer, overdue boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_period date := date_trunc('month', now())::date;
  v_active integer := 0;
  v_fee integer := 0;
  v_balance integer := 0;
  v_paid boolean := false;
begin
  if public.is_partner_customer(p_user_id) then return query select false,0,false; return; end if;
  with active_vas as (
    select upper(currency) as ccy
      from public.bridge_virtual_accounts
     where status = 'active'
       and (
         user_id = p_user_id
         or business_user_id = p_user_id
       )
  )
  select
    count(*)::integer,
    coalesce(sum(
      case ccy
        when 'USD' then 200
        when 'EUR' then 200
        when 'GBP' then 200
        when 'MXN' then 150
        when 'BRL' then 180
        when 'COP' then 180
        else 200
      end
    ), 0)::integer
  into v_active, v_fee
  from active_vas;

  if v_fee <= 0 then
    update public.user_profiles
       set maintenance_overdue = false,
           maintenance_overdue_since = null,
           maintenance_last_charged_at = now()
     where id = p_user_id;

    insert into public.va_maintenance_charges
      (user_id, period_month, active_accounts, amount_usd_minor, status)
    values
      (p_user_id, v_period, 0, 0, 'paid')
    on conflict (user_id, period_month) do update
      set active_accounts = excluded.active_accounts,
          amount_usd_minor = excluded.amount_usd_minor,
          status = excluded.status;

    return query select false, 0, false;
    return;
  end if;

  select coalesce(sum(available_balance_minor), 0)::integer
    into v_balance
    from public.bridge_virtual_account_balances
   where upper(currency) = 'USD'
     and user_id = p_user_id;

  if v_balance >= v_fee then
    update public.bridge_virtual_account_balances
       set available_balance_minor = available_balance_minor - v_fee,
           updated_at = now()
     where id = (
       select id
         from public.bridge_virtual_account_balances
        where user_id = p_user_id
          and upper(currency) = 'USD'
        order by available_balance_minor desc, updated_at desc
        limit 1
     );
    v_paid := true;
  end if;

  insert into public.va_maintenance_charges
    (user_id, period_month, active_accounts, amount_usd_minor, status)
  values
    (p_user_id, v_period, v_active, v_fee, case when v_paid then 'paid' else 'unpaid' end)
  on conflict (user_id, period_month) do update
    set active_accounts = excluded.active_accounts,
        amount_usd_minor = excluded.amount_usd_minor,
        status = excluded.status;

  update public.user_profiles
     set maintenance_overdue = not v_paid,
         maintenance_overdue_since = case
           when v_paid then null
           else coalesce(maintenance_overdue_since, now())
         end,
         maintenance_last_charged_at = now()
   where id = p_user_id;

  return query select v_paid, v_fee, (not v_paid);
end
$function$
;

-- Preserve existing direct-customer behavior: charge_wallet_maintenance
CREATE OR REPLACE FUNCTION public.charge_wallet_maintenance(p_user_id uuid, p_currency text DEFAULT 'USD'::text)
 RETURNS TABLE(charged boolean, amount_minor integer, overdue boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_period date := date_trunc('month', now())::date;
  v_currency text := upper(coalesce(p_currency, 'USD'));
  v_wallet_unit_minor integer := 0;
  v_active_wallets integer := 0;
  v_amount_minor integer := 0;
  v_balance_minor bigint := 0;
  v_paid boolean := false;
begin
  if public.is_partner_customer(p_user_id) then return query select false,0,false; return; end if;
  select coalesce((public.resolve_commercial_pricing_rule(
    'maintenance.wallet.monthly',
    null,
    v_currency,
    null,
    now()
  )->>'value_numeric')::numeric, 25)::integer
  into v_wallet_unit_minor;

  select count(*)::integer
    into v_active_wallets
    from public.bridge_wallets bw
   where bw.status = 'active'
     and (
       bw.user_id = p_user_id
       or bw.business_user_id = p_user_id
     );

  v_amount_minor := greatest(v_wallet_unit_minor, 0) * greatest(v_active_wallets, 0);

  if v_amount_minor <= 0 then
    update public.user_profiles
       set wallet_maintenance_overdue = false,
           wallet_maintenance_overdue_since = null,
           wallet_maintenance_last_charged_at = now()
     where id = p_user_id;

    insert into public.wallet_maintenance_charges
      (user_id, period_month, currency, amount_minor, status)
    values
      (p_user_id, v_period, v_currency, 0, 'paid')
    on conflict (user_id, period_month, currency) do update
      set amount_minor = excluded.amount_minor,
          status = excluded.status,
          updated_at = now();

    return query select false, 0, false;
    return;
  end if;

  select coalesce(sum(available_balance_minor), 0)
    into v_balance_minor
    from public.bridge_virtual_account_balances
   where user_id = p_user_id
     and upper(currency) = v_currency;

  if v_balance_minor >= v_amount_minor then
    update public.bridge_virtual_account_balances
       set available_balance_minor = available_balance_minor - v_amount_minor,
           updated_at = now()
     where id = (
       select id
         from public.bridge_virtual_account_balances
        where user_id = p_user_id
          and upper(currency) = v_currency
        order by available_balance_minor desc, updated_at desc
        limit 1
     );
    v_paid := true;
  end if;

  insert into public.wallet_maintenance_charges
    (user_id, period_month, currency, amount_minor, status)
  values
    (p_user_id, v_period, v_currency, v_amount_minor, case when v_paid then 'paid' else 'unpaid' end)
  on conflict (user_id, period_month, currency) do update
    set amount_minor = excluded.amount_minor,
        status = excluded.status,
        updated_at = now();

  update public.user_profiles
     set wallet_maintenance_overdue = not v_paid,
         wallet_maintenance_overdue_since = case
           when v_paid then null
           else coalesce(wallet_maintenance_overdue_since, now())
         end,
         wallet_maintenance_last_charged_at = now()
   where id = p_user_id;

  return query select v_paid, v_amount_minor, (not v_paid);
end
$function$
;


-- Preserve existing direct-customer behavior: charge_internal_subscription
CREATE OR REPLACE FUNCTION public.charge_internal_subscription(p_subscription_id uuid, p_billing_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  s public.subscriptions; tx public.billing_transactions; w record;
  fee_minor bigint; usdc_balance bigint := 0; usdt_balance bigint := 0;
  usdc_take bigint := 0; usdt_take bigint := 0; new_balance bigint; canon uuid;
  result_asset text; idem text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_subscription_id::text, 0));
  select * into s from public.subscriptions where id=p_subscription_id for update;
  if not found then raise exception 'Subscription not found'; end if;
  if public.is_partner_customer(s.user_id) then return jsonb_build_object('status','skipped','reason','partner_managed'); end if;
  if s.status <> 'active' then return jsonb_build_object('status','skipped','reason','inactive'); end if;
  if s.next_billing_date > p_billing_date then return jsonb_build_object('status','skipped','reason','not_due'); end if;

  insert into public.billing_transactions(subscription_id,user_id,billing_period,amount,status)
  values(s.id,s.user_id,s.next_billing_date,s.monthly_fee,'started')
  on conflict(subscription_id,billing_period) do update set
    attempt_count=public.billing_transactions.attempt_count+1
  returning * into tx;
  if tx.status='completed' then return jsonb_build_object('status','completed','idempotent',true,'reference',tx.id); end if;
  perform public.emit_subscription_event(s.user_id,s.id,tx.id,'subscription.billing.started',
    'subscription.billing.started:'||tx.id::text,jsonb_build_object('amount',s.monthly_fee,'period',tx.billing_period));

  fee_minor := round(s.monthly_fee * 1000000)::bigint;
  -- Lock wallet identities. The immutable balance ledger remains the source of truth.
  perform 1 from public.bridge_wallets where (user_id=s.user_id or business_user_id=s.user_id)
    and status='active' and ((upper(currency)='USDC' and lower(chain)='base') or (upper(currency)='USDT' and lower(chain)='tron')) for update;

  select coalesce(sum(case when l.direction='credit' then l.amount_minor else -l.amount_minor end),0)
    into usdc_balance from public.bridge_balance_ledger l join public.bridge_wallets bw on bw.bridge_wallet_id=l.entity_id
   where l.entity_type='wallet' and (bw.user_id=s.user_id or bw.business_user_id=s.user_id)
     and upper(l.currency)='USDC' and upper(bw.currency)='USDC' and lower(bw.chain)='base' and bw.status='active';
  select coalesce(sum(case when l.direction='credit' then l.amount_minor else -l.amount_minor end),0)
    into usdt_balance from public.bridge_balance_ledger l join public.bridge_wallets bw on bw.bridge_wallet_id=l.entity_id
   where l.entity_type='wallet' and (bw.user_id=s.user_id or bw.business_user_id=s.user_id)
     and upper(l.currency)='USDT' and upper(bw.currency)='USDT' and lower(bw.chain)='tron' and bw.status='active';

  if greatest(usdc_balance,0)+greatest(usdt_balance,0) < fee_minor then
    update public.billing_transactions set status='failed',collected_amount=0,failure_code='insufficient_balance',
      asset_breakdown=jsonb_build_object('USDC_available',greatest(usdc_balance,0)/1000000.0,'USDT_available',greatest(usdt_balance,0)/1000000.0)
      where id=tx.id;
    update public.subscriptions set payment_status='failed',failure_count=failure_count+1,
      grace_started_at=coalesce(grace_started_at,now()),updated_at=now() where id=s.id;
    idem := 'subscription:payment_failed:'||tx.id::text;
    insert into public.notifications(user_id,type,title,body,metadata)
    values(s.user_id,'system','Subscription Payment Failed',
      'Your BorderPay subscription payment could not be completed because your wallet balance is insufficient. Please deposit funds to continue using your account services.',
      jsonb_build_object('idempotency_key',idem,'amount',s.monthly_fee,'date',current_date,'transaction_reference',tx.id))
    on conflict(user_id,((metadata->>'idempotency_key'))) where metadata ? 'idempotency_key' do nothing;
    insert into public.subscription_email_jobs(user_id,template,recipient,props,idempotency_key)
    select s.user_id,s.account_type||'.subscription_payment_status',lower(trim(up.email)),
      jsonb_build_object('customer_name',coalesce(bp.company_name,up.full_name),'outcome','failed','amount',s.monthly_fee,'date',current_date,'transaction_reference',tx.id),idem
      from public.user_profiles up left join public.business_profiles bp on bp.user_id=up.id
      where up.id=s.user_id and nullif(trim(coalesce(up.email,'')),'') is not null on conflict(idempotency_key) do nothing;
    perform public.emit_subscription_event(s.user_id,s.id,tx.id,'subscription.payment.failed',
      'subscription.payment.failed:'||tx.id::text,jsonb_build_object('reason','insufficient_balance','amount',s.monthly_fee));
    insert into public.subscription_admin_logs(user_id,subscription_id,billing_transaction_id,action,details)
      values(s.user_id,s.id,tx.id,'payment_failed',jsonb_build_object('reason','insufficient_balance'));
    return jsonb_build_object('status','failed','reason','insufficient_balance','reference',tx.id);
  end if;

  usdc_take := least(greatest(usdc_balance,0),fee_minor);
  usdt_take := fee_minor-usdc_take;
  if usdc_take > 0 then
    select bw.id,bw.bridge_wallet_id into w from public.bridge_wallets bw where (bw.user_id=s.user_id or bw.business_user_id=s.user_id)
      and upper(bw.currency)='USDC' and lower(bw.chain)='base' and bw.status='active' order by bw.created_at limit 1;
    new_balance := usdc_balance-usdc_take;
    insert into public.bridge_balance_ledger(event_id,provider,entity_type,entity_id,user_id,business_user_id,currency,amount_minor,direction,balance_after_minor,metadata)
    values('subscription:'||tx.id::text||':USDC','borderpay_internal','wallet',w.bridge_wallet_id,
      case when s.account_type='individual' then s.user_id end,case when s.account_type='business' then s.user_id end,
      'USDC',usdc_take,'debit',new_balance,jsonb_build_object('billing_transaction_id',tx.id,'internal_only',true)) returning id into canon;
    update public.billing_revenue_wallets set balance_minor=balance_minor+usdc_take,updated_at=now() where asset='USDC' and network='BASE' returning whitelist_wallet_id into w;
    insert into public.ledger_entries(from_wallet_id,to_wallet_id,user_id,asset,amount,transaction_type,reference_id,canonical_ledger_id)
      values((select id from public.bridge_wallets where bridge_wallet_id=(select entity_id from public.bridge_balance_ledger where id=canon)),w.whitelist_wallet_id,s.user_id,'USDC',usdc_take/1000000.0,'subscription_fee',tx.id,canon);
  end if;
  if usdt_take > 0 then
    select bw.id,bw.bridge_wallet_id into w from public.bridge_wallets bw where (bw.user_id=s.user_id or bw.business_user_id=s.user_id)
      and upper(bw.currency)='USDT' and lower(bw.chain)='tron' and bw.status='active' order by bw.created_at limit 1;
    new_balance := usdt_balance-usdt_take;
    insert into public.bridge_balance_ledger(event_id,provider,entity_type,entity_id,user_id,business_user_id,currency,amount_minor,direction,balance_after_minor,metadata)
    values('subscription:'||tx.id::text||':USDT','borderpay_internal','wallet',w.bridge_wallet_id,
      case when s.account_type='individual' then s.user_id end,case when s.account_type='business' then s.user_id end,
      'USDT',usdt_take,'debit',new_balance,jsonb_build_object('billing_transaction_id',tx.id,'internal_only',true)) returning id into canon;
    update public.billing_revenue_wallets set balance_minor=balance_minor+usdt_take,updated_at=now() where asset='USDT' and network='TRON' returning whitelist_wallet_id into w;
    insert into public.ledger_entries(from_wallet_id,to_wallet_id,user_id,asset,amount,transaction_type,reference_id,canonical_ledger_id)
      values((select id from public.bridge_wallets where bridge_wallet_id=(select entity_id from public.bridge_balance_ledger where id=canon)),w.whitelist_wallet_id,s.user_id,'USDT',usdt_take/1000000.0,'subscription_fee',tx.id,canon);
  end if;
  result_asset := case when usdc_take>0 and usdt_take>0 then 'MIXED' when usdc_take>0 then 'USDC' else 'USDT' end;
  update public.billing_transactions set status='completed',asset=result_asset,collected_amount=s.monthly_fee,completed_at=now(),
    asset_breakdown=jsonb_build_object('USDC',usdc_take/1000000.0,'USDT',usdt_take/1000000.0),failure_code=null where id=tx.id;
  update public.subscriptions set payment_status='active',next_billing_date=public.subscription_next_month_end(next_billing_date),
    last_billed_at=now(),failure_count=0,grace_started_at=null,reminder_sent_at=null,restricted_at=null,updated_at=now() where id=s.id;
  idem := 'subscription:payment_completed:'||tx.id::text;
  insert into public.notifications(user_id,type,title,body,metadata)
    values(s.user_id,'system','Subscription Payment Successful',
      'Your BorderPay account maintenance fee of $'||to_char(s.monthly_fee,'FM999999990.00')||' has been successfully deducted.',
      jsonb_build_object('idempotency_key',idem,'amount',s.monthly_fee,'asset',result_asset,'asset_breakdown',jsonb_build_object('USDC',usdc_take/1000000.0,'USDT',usdt_take/1000000.0),'date',current_date,'transaction_reference',tx.id))
    on conflict(user_id,((metadata->>'idempotency_key'))) where metadata ? 'idempotency_key' do nothing;
  insert into public.subscription_email_jobs(user_id,template,recipient,props,idempotency_key)
  select s.user_id,s.account_type||'.subscription_payment_status',lower(trim(up.email)),
    jsonb_build_object('customer_name',coalesce(bp.company_name,up.full_name),'outcome','completed','amount',s.monthly_fee,'asset',result_asset,'asset_breakdown',jsonb_build_object('USDC',usdc_take/1000000.0,'USDT',usdt_take/1000000.0),'date',current_date,'transaction_reference',tx.id),idem
    from public.user_profiles up left join public.business_profiles bp on bp.user_id=up.id
    where up.id=s.user_id and nullif(trim(coalesce(up.email,'')),'') is not null on conflict(idempotency_key) do nothing;
  perform public.emit_subscription_event(s.user_id,s.id,tx.id,'subscription.payment.completed',
    'subscription.payment.completed:'||tx.id::text,jsonb_build_object('amount',s.monthly_fee,'asset',result_asset,'asset_breakdown',jsonb_build_object('USDC',usdc_take/1000000.0,'USDT',usdt_take/1000000.0)));
  insert into public.subscription_admin_logs(user_id,subscription_id,billing_transaction_id,action,details)
    values(s.user_id,s.id,tx.id,'payment_completed',jsonb_build_object('asset',result_asset,'USDC',usdc_take/1000000.0,'USDT',usdt_take/1000000.0));
  return jsonb_build_object('status','completed','reference',tx.id,'asset',result_asset);
end $function$
;

-- Preserve existing direct-customer behavior: queue_external_subscription_invoice
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

-- Preserve existing direct-customer behavior: prepare_bridge_subscription_collection
CREATE OR REPLACE FUNCTION public.prepare_bridge_subscription_collection(p_subscription_id uuid, p_billing_date date, p_provider_balances jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  s public.subscriptions;
  collection public.subscription_bridge_collections;
  usdc record;
  usdt record;
  usdc_destination text;
  usdt_destination text;
  fee_minor bigint;
  usdc_take bigint := 0;
  usdt_take bigint := 0;
  legs jsonb;
begin
  if jsonb_typeof(p_provider_balances) <> 'array' then
    raise exception 'Authoritative Bridge wallet balances are required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_subscription_id::text, 0));
  select * into s from public.subscriptions where id = p_subscription_id for update;
  if not found then raise exception 'Subscription not found'; end if;
  if public.is_partner_customer(s.user_id) then return jsonb_build_object('status','skipped','reason','partner_managed'); end if;
  if s.status <> 'active' then return jsonb_build_object('status','skipped','reason','inactive'); end if;
  if s.next_billing_date > p_billing_date then return jsonb_build_object('status','skipped','reason','not_due'); end if;

  select * into collection from public.subscription_bridge_collections
   where subscription_id = s.id and billing_period = s.next_billing_date;
  if found then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',l.id,'source_bridge_wallet_id',l.source_bridge_wallet_id,
      'bridge_customer_id',l.bridge_customer_id,'destination_address',l.destination_address,
      'asset',l.asset,'network',l.network,'amount_minor',l.amount_minor,
      'provider_transfer_id',l.provider_transfer_id,'status',l.status
    ) order by l.asset),'[]'::jsonb) into legs
    from public.subscription_bridge_collection_legs l where l.collection_id = collection.id;
    return jsonb_build_object('status',collection.status,'collection_id',collection.id,'legs',legs,'idempotent',true);
  end if;

  fee_minor := round(s.monthly_fee * 1000000)::bigint;
  select bw.bridge_wallet_id,bw.bridge_customer_id,
    greatest((provider_balance.value->>'available_minor')::bigint,0)
      - coalesce((select sum(r.amount_minor) from public.subscription_bridge_collection_legs r
        where r.source_bridge_wallet_id=bw.bridge_wallet_id and r.status in ('prepared','submitted')),0) as available_minor
  into usdc
  from public.bridge_wallets bw
  cross join lateral jsonb_array_elements(p_provider_balances) provider_balance(value)
  where (bw.user_id=s.user_id or bw.business_user_id=s.user_id)
    and bw.status='active' and upper(bw.currency)='USDC' and lower(bw.chain)='base'
    and provider_balance.value->>'bridge_wallet_id'=bw.bridge_wallet_id
  order by available_minor desc limit 1;

  select bw.bridge_wallet_id,bw.bridge_customer_id,
    greatest((provider_balance.value->>'available_minor')::bigint,0)
      - coalesce((select sum(r.amount_minor) from public.subscription_bridge_collection_legs r
        where r.source_bridge_wallet_id=bw.bridge_wallet_id and r.status in ('prepared','submitted')),0) as available_minor
  into usdt
  from public.bridge_wallets bw
  cross join lateral jsonb_array_elements(p_provider_balances) provider_balance(value)
  where (bw.user_id=s.user_id or bw.business_user_id=s.user_id)
    and bw.status='active' and upper(bw.currency)='USDT' and lower(bw.chain)='tron'
    and provider_balance.value->>'bridge_wallet_id'=bw.bridge_wallet_id
  order by available_minor desc limit 1;

  if greatest(coalesce(usdc.available_minor,0),0) + greatest(coalesce(usdt.available_minor,0),0) < fee_minor then
    return jsonb_build_object(
      'status','failed','reason','insufficient_balance',
      'USDC_available',greatest(coalesce(usdc.available_minor,0),0)/1000000.0,
      'USDT_available',greatest(coalesce(usdt.available_minor,0),0)/1000000.0
    );
  end if;

  select mw.address into usdc_destination
  from public.billing_revenue_wallets rw
  join public.maintenance_wallet_whitelist mw on mw.id=rw.whitelist_wallet_id
  where rw.status='active' and mw.active and rw.asset='USDC' and rw.network='BASE';
  select mw.address into usdt_destination
  from public.billing_revenue_wallets rw
  join public.maintenance_wallet_whitelist mw on mw.id=rw.whitelist_wallet_id
  where rw.status='active' and mw.active and rw.asset='USDT' and rw.network='TRON';
  if usdc_destination is null or usdt_destination is null then
    raise exception 'Corporate maintenance treasury whitelist is incomplete';
  end if;

  usdc_take := least(greatest(coalesce(usdc.available_minor,0),0),fee_minor);
  usdt_take := fee_minor-usdc_take;
  insert into public.subscription_bridge_collections(subscription_id,user_id,billing_period,amount)
  values(s.id,s.user_id,s.next_billing_date,s.monthly_fee) returning * into collection;

  if usdc_take > 0 then
    insert into public.subscription_bridge_collection_legs(
      collection_id,source_bridge_wallet_id,bridge_customer_id,destination_address,asset,network,amount_minor
    ) values(collection.id,usdc.bridge_wallet_id,usdc.bridge_customer_id,usdc_destination,'USDC','BASE',usdc_take);
  end if;
  if usdt_take > 0 then
    insert into public.subscription_bridge_collection_legs(
      collection_id,source_bridge_wallet_id,bridge_customer_id,destination_address,asset,network,amount_minor
    ) values(collection.id,usdt.bridge_wallet_id,usdt.bridge_customer_id,usdt_destination,'USDT','TRON',usdt_take);
  end if;

  select jsonb_agg(jsonb_build_object(
    'id',l.id,'source_bridge_wallet_id',l.source_bridge_wallet_id,
    'bridge_customer_id',l.bridge_customer_id,'destination_address',l.destination_address,
    'asset',l.asset,'network',l.network,'amount_minor',l.amount_minor,
    'provider_transfer_id',l.provider_transfer_id,'status',l.status
  ) order by l.asset) into legs
  from public.subscription_bridge_collection_legs l where l.collection_id=collection.id;
  return jsonb_build_object('status','prepared','collection_id',collection.id,'legs',legs,'idempotent',false);
end;
$function$
;


-- Preserve existing direct-customer behavior: sync_active_va_maintenance_subscriptions
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

-- Preserve existing direct-customer behavior: maintenance_billing_eligibility_snapshot
CREATE OR REPLACE FUNCTION public.maintenance_billing_eligibility_snapshot()
 RETURNS TABLE(account_type text, verified_accounts bigint, billable_active_va_accounts bigint, excluded_without_active_va bigint, active_virtual_accounts bigint, inactive_virtual_accounts bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with verified as (
    select up.id, lower(up.account_type::text) account_type,up.email,up.full_name,bp.company_name
    from public.user_profiles up
    left join public.business_profiles bp on bp.user_id = up.id
    join auth.users au on au.id = up.id and au.deleted_at is null
    where not public.is_partner_customer(up.id)
      and lower(up.account_type::text) in ('business','individual')
      and lower(coalesce(up.kyc_status::text,'')) = 'verified'
      and (
        lower(up.account_type::text) = 'individual'
        or lower(coalesce(bp.bridge_kyb_status::text,'')) in ('approved','verified')
      )
      and lower(coalesce(up.account_status::text,'active')) not in
        ('paused','frozen','offboarded','rejected','closed','deleted','suspended')
      and lower(coalesce(up.bridge_account_status::text,'active')) not in
        ('paused','frozen','offboarded','rejected','closed','deleted','suspended')
  ), va as (
    select coalesce(business_user_id,user_id) user_id,
      count(*) filter (where lower(status::text) in ('active','activated')) active_count,
      count(*) filter (where lower(status::text) not in ('active','activated')) inactive_count
    from public.bridge_virtual_accounts
    group by coalesce(business_user_id,user_id)
  )
  select v.account_type,
    count(*)::bigint,
    count(*) filter (where coalesce(va.active_count,0) > 0)::bigint,
    count(*) filter (where coalesce(va.active_count,0) = 0)::bigint,
    coalesce(sum(va.active_count),0)::bigint,
    coalesce(sum(va.inactive_count),0)::bigint
  from verified v left join va on va.user_id = v.id
  group by v.account_type order by v.account_type
$function$
;

-- Preserve existing direct-customer behavior: apply_subscription_grace_controls
CREATE OR REPLACE FUNCTION public.apply_subscription_grace_controls()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  r record;
  reminded integer := 0;
  final_warnings integer := 0;
  idem text;
begin
  for r in
    select
      s.*,
      up.email,
      up.full_name,
      bp.company_name,
      invoice.id as invoice_id,
      invoice.billing_period,
      invoice.amount as invoice_amount,
      invoice.currency as invoice_currency,
      invoice.payment_link,
      invoice.provider_reference,
      greatest(s.grace_started_at, invoice.billing_period::timestamptz) as effective_grace_started_at
    from public.subscriptions s
    join public.user_profiles up on up.id=s.user_id
    left join public.business_profiles bp on bp.user_id=s.user_id
    join lateral (
      select sei.*
      from public.subscription_external_invoices sei
      where sei.subscription_id=s.id
        and sei.provider='flutterwave'
        and sei.status='payment_link_created'
        and sei.paid_at is null
        and sei.billing_period <= current_date
        and nullif(trim(coalesce(sei.payment_link,'')),'') is not null
      order by sei.billing_period desc,sei.created_at desc
      limit 1
    ) invoice on true
    where not public.is_partner_customer(s.user_id) and s.status='active'
      and s.payment_status in ('failed','pending')
      and s.grace_started_at is not null
      and s.restricted_at is null
      and up.account_frozen_at is null
      and lower(coalesce(up.account_status,'')) not in ('frozen','paused','suspended','rejected','offboarded','deactivated','closed')
      and lower(coalesce(up.bridge_account_status,'')) not in ('frozen','paused','suspended','rejected','offboarded','deactivated','closed')
  loop
    if r.reminder_sent_at is null and r.effective_grace_started_at <= now()-interval '3 days' then
      idem := 'subscription:day3_reminder:'||r.invoice_id::text;
      insert into public.notifications(user_id,type,title,body,metadata)
      values(
        r.user_id,
        'system',
        case when r.account_type='individual'
          then 'Individual account maintenance payment required'
          else 'Business account maintenance payment due'
        end,
        case when r.account_type='individual'
          then 'Your maintenance invoice dated ' || to_char(r.billing_period, 'FMMonth FMDD, YYYY') || ' remains unpaid. Payment deadline: ' || to_char(r.effective_grace_started_at + interval '7 days', 'FMMonth FMDD, YYYY') || '. Contact Support if you have already paid.'
          else 'Your Business maintenance invoice remains unpaid. Pay it to keep receiving accounts, wallets, and sensitive financial screens available.'
        end,
        jsonb_build_object('idempotency_key',idem,'amount',r.invoice_amount,'invoice_id',r.invoice_id)
      )
      on conflict(user_id,((metadata->>'idempotency_key'))) where metadata ? 'idempotency_key' do nothing;

      insert into public.subscription_email_jobs(user_id,template,recipient,props,idempotency_key)
      values(
        r.user_id,
        r.account_type||'.subscription_external_invoice',
        lower(trim(r.email)),
        jsonb_build_object(
          'customer_name',coalesce(r.company_name,r.full_name),
          'notice','reminder',
          'deadline',to_char(r.effective_grace_started_at + interval '7 days', 'YYYY-MM-DD'),
          'amount',r.invoice_amount,
          'currency',r.invoice_currency,
          'billing_period',r.billing_period,
          'payment_link',r.payment_link,
          'transaction_reference',r.provider_reference
        ),
        idem
      )
      on conflict(idempotency_key) do nothing;

      update public.subscriptions
      set reminder_sent_at=now(),updated_at=now()
      where id=r.id and reminder_sent_at is null;
      reminded := reminded+1;
    end if;

    if r.effective_grace_started_at <= now()-interval '7 days'
       or (
         r.account_type='individual'
         and r.billing_period='2026-08-31'::date
         and current_date >= '2026-09-08'::date
       )
    then
      idem := 'subscription:day7_final_warning:'||r.invoice_id::text;
      insert into public.subscription_email_jobs(user_id,template,recipient,props,idempotency_key)
      values(
        r.user_id,
        r.account_type||'.subscription_external_invoice',
        lower(trim(r.email)),
        jsonb_build_object(
          'customer_name',coalesce(r.company_name,r.full_name),
          'notice','final_warning',
          'deadline',to_char(r.effective_grace_started_at + interval '7 days', 'YYYY-MM-DD'),
          'amount',r.invoice_amount,
          'currency',r.invoice_currency,
          'billing_period',r.billing_period,
          'payment_link',r.payment_link,
          'transaction_reference',r.provider_reference
        ),
        idem
      )
      on conflict(idempotency_key) do nothing;
      final_warnings := final_warnings+1;
    end if;
  end loop;

  return jsonb_build_object('reminded',reminded,'final_warnings_queued',final_warnings,'restricted',0);
end;
$function$
;

-- Preserve existing direct-customer behavior: finalize_subscription_restrictions
CREATE OR REPLACE FUNCTION public.finalize_subscription_restrictions()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  r record;
  restricted integer := 0;
  individual_offboarded integer := 0;
  idem text;
begin
  for r in
    select s.id,s.user_id,s.account_type,s.monthly_fee,sei.id as invoice_id,sei.billing_period,j.sent_at
    from public.subscriptions s
    join public.subscription_external_invoices sei
      on sei.subscription_id=s.id
     and sei.provider='flutterwave'
     and sei.status='payment_link_created'
     and sei.paid_at is null
     and sei.billing_period <= current_date
    join public.subscription_email_jobs j
      on j.user_id=s.user_id
     and j.idempotency_key='subscription:day7_final_warning:'||sei.id::text
     and j.status='sent'
     and j.sent_at is not null
    where not public.is_partner_customer(s.user_id) and s.status='active'
      and s.payment_status in ('failed','pending')
      and (
        greatest(s.grace_started_at, sei.billing_period::timestamptz) <= now()-interval '7 days'
        or (s.account_type='individual' and sei.billing_period='2026-08-31'::date and current_date >= '2026-09-08'::date)
      )
      and s.restricted_at is null
    order by s.grace_started_at
    for update of s skip locked
  loop
    update public.subscriptions
    set restricted_at=now(),
        metadata=case when r.account_type='individual'
          then coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
            'individual_product_access','permanently_closed',
            'individual_product_closed_at',now(),
            'closure_reason','august_maintenance_nonpayment'
          )
          else coalesce(metadata,'{}'::jsonb)
        end,
        updated_at=now()
    where id=r.id and restricted_at is null and payment_status in ('failed','pending');
    if not found then continue; end if;

    if r.account_type='individual' then
      update public.user_profiles
      set account_status='offboarded',
          account_frozen_at=coalesce(account_frozen_at,now()),
          account_frozen_reason='Individual product closed after unpaid August 2026 maintenance invoice',
          updated_at=now()
      where id=r.user_id and account_type='individual';
      individual_offboarded := individual_offboarded+1;
    end if;

    idem := 'subscription:restricted:'||r.invoice_id::text;
    insert into public.notifications(user_id,type,title,body,metadata)
    values(
      r.user_id,
      'system',
      case when r.account_type='individual' then 'Individual account access closed' else 'Business account access restricted' end,
      case when r.account_type='individual'
        then 'Your BorderPay Individual product access has been permanently closed and your virtual accounts are being deactivated. Contact Support for assistance with any remaining balance.'
        else 'Receiving accounts, wallets, and sensitive financial screens are temporarily unavailable until the overdue maintenance invoice is paid.'
      end,
      jsonb_build_object('idempotency_key',idem,'amount',r.monthly_fee,'invoice_id',r.invoice_id,'account_type',r.account_type)
    )
    on conflict(user_id,((metadata->>'idempotency_key'))) where metadata ? 'idempotency_key' do nothing;

    if not exists (
      select 1 from public.subscription_admin_logs
      where subscription_id=r.id and action='account_access_restricted' and details->>'invoice_id'=r.invoice_id::text
    ) then
      insert into public.subscription_admin_logs(user_id,subscription_id,action,details)
      values(
        r.user_id,
        r.id,
        'account_access_restricted',
        jsonb_build_object(
          'grace_days',7,
          'billing_period',r.billing_period,
          'invoice_id',r.invoice_id,
          'account_type',r.account_type,
          'restriction_kind',case when r.account_type='individual' then 'permanent_product_closure' else 'temporary_until_paid' end,
          'final_warning_sent_at',r.sent_at
        )
      );
    end if;
    restricted := restricted+1;
  end loop;

  return jsonb_build_object('restricted',restricted,'individual_offboarded',individual_offboarded);
end;
$function$
;

-- Preserve existing direct-customer behavior: reconcile_subscription_access_actions
CREATE OR REPLACE FUNCTION public.reconcile_subscription_access_actions(p_dry_run boolean DEFAULT true, p_limit integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  deactivate_count integer := 0;
  reactivate_count integer := 0;
  safe_limit integer := greatest(1,least(coalesce(p_limit,100),500));
begin
  update public.subscription_provider_access_actions
  set status='failed',last_error='stale_processing_claim_recovered',next_attempt_at=now(),updated_at=now()
  where status='processing' and last_attempt_at < now()-interval '15 minutes';

  select count(*)::integer into deactivate_count from (
    select 1 from public.subscriptions s
    join public.bridge_virtual_accounts va on va.user_id=s.user_id or va.business_user_id=s.user_id
    where not public.is_partner_customer(s.user_id) and s.status='active' and s.restricted_at is not null and va.status='active'
      and nullif(trim(coalesce(va.bridge_customer_id,'')),'') is not null
      and nullif(trim(coalesce(va.bridge_virtual_account_id,'')),'') is not null
    limit safe_limit
  ) q;

  select count(*)::integer into reactivate_count from (
    select 1 from public.subscriptions s
    join public.bridge_virtual_accounts va on va.user_id=s.user_id or va.business_user_id=s.user_id
    where not public.is_partner_customer(s.user_id) and s.status='active' and s.account_type='business' and s.payment_status='active' and s.restricted_at is null
      and va.status='deactivated' and va.deactivation_reason='subscription_nonpayment'
      and nullif(trim(coalesce(va.bridge_customer_id,'')),'') is not null
      and nullif(trim(coalesce(va.bridge_virtual_account_id,'')),'') is not null
    limit safe_limit
  ) q;

  if p_dry_run then
    return jsonb_build_object('dry_run',true,'would_queue_deactivate',deactivate_count,'would_queue_reactivate',reactivate_count);
  end if;

  insert into public.subscription_provider_access_actions(
    subscription_id,user_id,bridge_virtual_account_id,bridge_customer_id,action,reason,idempotency_key
  )
  select s.id,s.user_id,va.bridge_virtual_account_id,va.bridge_customer_id,'deactivate',
    case when s.account_type='individual' then 'individual_product_closed' else 'subscription_nonpayment' end,
    'subscription:deactivate:'||s.id::text||':'||extract(epoch from s.restricted_at)::bigint::text||':'||va.bridge_virtual_account_id
  from public.subscriptions s
  join public.bridge_virtual_accounts va on va.user_id=s.user_id or va.business_user_id=s.user_id
  where not public.is_partner_customer(s.user_id) and s.status='active' and s.restricted_at is not null and va.status='active'
    and nullif(trim(coalesce(va.bridge_customer_id,'')),'') is not null
    and nullif(trim(coalesce(va.bridge_virtual_account_id,'')),'') is not null
  order by s.restricted_at,va.created_at limit safe_limit
  on conflict(idempotency_key) do nothing;

  insert into public.subscription_provider_access_actions(
    subscription_id,user_id,bridge_virtual_account_id,bridge_customer_id,action,reason,idempotency_key
  )
  select s.id,s.user_id,va.bridge_virtual_account_id,va.bridge_customer_id,'reactivate','subscription_payment_confirmed',
    'subscription:reactivate:'||s.id::text||':'||coalesce(extract(epoch from s.last_billed_at)::bigint::text,'never')||':'||va.bridge_virtual_account_id
  from public.subscriptions s
  join public.bridge_virtual_accounts va on va.user_id=s.user_id or va.business_user_id=s.user_id
  where not public.is_partner_customer(s.user_id) and s.status='active' and s.account_type='business' and s.payment_status='active' and s.restricted_at is null
    and va.status='deactivated' and va.deactivation_reason='subscription_nonpayment'
    and nullif(trim(coalesce(va.bridge_customer_id,'')),'') is not null
    and nullif(trim(coalesce(va.bridge_virtual_account_id,'')),'') is not null
  order by s.last_billed_at nulls last,va.created_at limit safe_limit
  on conflict(idempotency_key) do nothing;

  return jsonb_build_object('dry_run',false,'eligible_deactivate',deactivate_count,'eligible_reactivate',reactivate_count);
end;
$function$
;

-- Preserve existing direct-customer behavior: guard_subscription_restricted_va_status
CREATE OR REPLACE FUNCTION public.guard_subscription_restricted_va_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_owner_id uuid;
begin
  v_owner_id := coalesce(new.business_user_id, new.user_id, old.business_user_id, old.user_id);

  if not public.is_partner_customer(v_owner_id) and old.deactivation_reason = 'subscription_nonpayment'
     and lower(coalesce(new.status, '')) in ('active', 'activated')
     and exists (
       select 1
       from public.subscriptions s
       where s.user_id = v_owner_id
         and s.restricted_at is not null
         and coalesce(s.payment_status, 'pending') <> 'active'
     ) then
    new.status := 'deactivated';
    new.deactivated_at := coalesce(old.deactivated_at, new.deactivated_at, now());
    new.deactivation_reason := 'subscription_nonpayment';
  end if;

  return new;
end;
$function$
;

-- Preserve existing direct-customer behavior: enforce_maintenance_grace
CREATE OR REPLACE FUNCTION public.enforce_maintenance_grace(p_grace_days integer DEFAULT 30)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_count integer := 0;
begin
  if p_grace_days < 1 then
    p_grace_days := 30;
  end if;

  update public.user_profiles up
     set maintenance_grace_expired = not public.is_partner_customer(up.id) and (
           (
             up.maintenance_overdue = true
             and up.maintenance_overdue_since is not null
             and up.maintenance_overdue_since <= (now() - make_interval(days => p_grace_days))
           )
           or
           (
             up.wallet_maintenance_overdue = true
             and up.wallet_maintenance_overdue_since is not null
             and up.wallet_maintenance_overdue_since <= (now() - make_interval(days => p_grace_days))
           )
         ),
         maintenance_grace_checked_at = now()
   where
     up.maintenance_overdue = true
     or up.wallet_maintenance_overdue = true
     or up.maintenance_grace_expired = true;

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$function$
;

-- Preserve existing direct-customer behavior: apply_subscription_period_fee
CREATE OR REPLACE FUNCTION public.apply_subscription_period_fee()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if public.is_partner_customer(new.user_id) and (tg_op='INSERT' or (new.status='active' and old.status<>'active')) then raise exception 'Partner customer maintenance is managed through partner commercial terms' using errcode='P0001'; end if;
  new.monthly_fee := public.subscription_fee_for_period(new.account_type, new.next_billing_date);
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_approved_business_maintenance_subscriptions(p_billing_period date DEFAULT subscription_current_month_end(CURRENT_DATE), p_dry_run boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  r record;
  eligible_count integer := 0;
  created_count integer := 0;
  pulled_forward_count integer := 0;
  skipped_count integer := 0;
  existed boolean;
  prior_date date;
begin
  if p_billing_period <> public.subscription_current_month_end(p_billing_period) then
    raise exception 'Billing period must be the final day of its calendar month';
  end if;

  for r in
    select up.id
    from public.user_profiles up
    join public.business_profiles bp on bp.user_id = up.id
    join auth.users au on au.id = up.id and au.deleted_at is null
    where not public.is_partner_customer(up.id) and lower(coalesce(up.account_type::text, '')) = 'business'
      and lower(coalesce(up.kyc_status::text, '')) = 'verified'
      and lower(coalesce(bp.bridge_kyb_status::text, '')) in ('approved', 'verified')
      and lower(coalesce(up.account_status::text, 'active')) not in (
        'paused', 'frozen', 'offboarded', 'rejected', 'closed', 'deleted', 'suspended'
      )
      and lower(coalesce(up.bridge_account_status::text, 'active')) not in (
        'paused', 'frozen', 'offboarded', 'rejected', 'closed', 'deleted', 'suspended'
      )
    order by up.id
  loop
    eligible_count := eligible_count + 1;
    select true, next_billing_date
      into existed, prior_date
      from public.subscriptions
      where user_id = r.id;

    if p_dry_run then
      if not coalesce(existed, false) then
        created_count := created_count + 1;
      elsif prior_date > p_billing_period then
        pulled_forward_count := pulled_forward_count + 1;
      else
        skipped_count := skipped_count + 1;
      end if;
      existed := false;
      prior_date := null;
      continue;
    end if;

    perform public.ensure_internal_subscription(r.id, p_billing_period, false);

    if not coalesce(existed, false) then
      created_count := created_count + 1;
    else
      update public.subscriptions
      set next_billing_date = p_billing_period,
          updated_at = now()
      where user_id = r.id
        and account_type = 'business'
        and status = 'active'
        and last_billed_at is null
        and next_billing_date > p_billing_period;
      if found then
        pulled_forward_count := pulled_forward_count + 1;
      else
        skipped_count := skipped_count + 1;
      end if;
    end if;

    existed := false;
    prior_date := null;
  end loop;

  return jsonb_build_object(
    'dry_run', p_dry_run,
    'billing_period', p_billing_period,
    'eligible', eligible_count,
    'created', created_count,
    'pulled_forward', pulled_forward_count,
    'unchanged', skipped_count
  );
end;
$function$
;
commit;
