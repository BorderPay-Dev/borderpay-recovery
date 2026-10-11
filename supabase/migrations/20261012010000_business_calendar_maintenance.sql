-- Business invoices follow calendar months. Future invoices cannot extend older debt.
create or replace function public.business_maintenance_invoice_eligible(p_invoice_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists (
 select 1 from subscription_external_invoices i
 join subscriptions s on s.id=i.subscription_id and s.user_id=i.user_id
 join user_profiles p on p.id=i.user_id join auth.users a on a.id=p.id
 join business_profiles b on b.user_id=p.id
 where i.id=p_invoice_id and i.provider='flutterwave' and s.account_type='business' and p.account_type='business'
 and s.status='active' and not coalesce(p.is_admin,false) and not coalesce(p.is_demo,false)
 and a.deleted_at is null and a.email_confirmed_at is not null and lower(a.email)=lower(p.email)
 and not public.is_partner_customer(p.id)
 and not exists(select 1 from maintenance_billing_exemptions e where e.user_id=p.id)
 and p.kyc_status::text='verified' and b.bridge_kyb_status in ('approved','verified')
 and lower(coalesce(p.account_status,''))='active' and lower(coalesce(p.bridge_account_status,''))='active'
 and p.account_frozen_at is null
 and coalesce(s.verified_at,b.bridge_kyb_completed_at,p.kyc_verified_at,p.bridge_kyc_completed_at) < (i.billing_period+1)::timestamptz
 and nullif(s.metadata->>'billing_service_hold','') is null
 and exists(select 1 from bridge_wallets w where coalesce(w.business_user_id,w.user_id)=p.id and w.status in ('active','activated'))
 and exists(select 1 from bridge_virtual_accounts v where coalesce(v.business_user_id,v.user_id)=p.id
   and v.created_at < (i.billing_period+1)::timestamptz
   and (v.status in ('active','activated') or (v.status='deactivated' and v.deactivation_reason='subscription_nonpayment')))
 );
$$;

create or replace function public.refresh_business_maintenance_state(p_subscription_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare earliest date; overdue boolean;
begin
 perform 1 from subscriptions where id=p_subscription_id and account_type='business' for update;
 if not found then return; end if;
 select min(billing_period),coalesce(bool_or(current_timestamp >= (billing_period+8)::timestamptz),false)
 into earliest,overdue from subscription_external_invoices
 where subscription_id=p_subscription_id and status in ('pending_configuration','payment_link_created') and paid_at is null
 and billing_period <= current_date;
 update subscriptions set payment_status=case when earliest is null then 'active' else 'pending' end,
 grace_started_at=case when earliest is null then null else (earliest+1)::timestamptz end,
 restricted_at=case when overdue then restricted_at else null end,updated_at=now()
 where id=p_subscription_id;
end; $$;

create or replace function public.restrict_business_maintenance_invoice(p_invoice_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare i subscription_external_invoices;
begin
 select * into i from subscription_external_invoices where id=p_invoice_id for update;
 if not found or not public.business_maintenance_invoice_eligible(i.id) or i.status<>'payment_link_created' or i.paid_at is not null
 or now() < (i.billing_period+8)::timestamptz
 or coalesce(i.metadata->>'provider_payment_check','') <> 'unpaid'
 or coalesce((i.metadata->>'provider_payment_checked_at')::timestamptz,'epoch') < now()-interval '10 minutes'
 then return false; end if;
 update subscriptions set restricted_at=coalesce(restricted_at,now()),payment_status='pending',grace_started_at=(i.billing_period+1)::timestamptz,updated_at=now()
 where id=i.subscription_id and status='active';
 insert into subscription_admin_logs(user_id,subscription_id,action,details)
 select i.user_id,i.subscription_id,'calendar_maintenance_restricted',jsonb_build_object('invoice_id',i.id,'billing_period',i.billing_period,'provider_payment_checked_at',i.metadata->>'provider_payment_checked_at')
 where not exists(select 1 from subscription_admin_logs where subscription_id=i.subscription_id and action='calendar_maintenance_restricted' and details->>'invoice_id'=i.id::text);
 return true;
end; $$;

create or replace function public.business_maintenance_action_allowed(p_action_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from subscription_provider_access_actions a join subscriptions s on s.id=a.subscription_id
 join user_profiles p on p.id=a.user_id join bridge_virtual_accounts v on v.bridge_virtual_account_id=a.bridge_virtual_account_id
 where a.id=p_action_id and s.account_type='business' and s.status='active'
 and coalesce(v.business_user_id,v.user_id)=a.user_id and p.account_status='active' and p.bridge_account_status='active' and p.account_frozen_at is null
 and not public.is_partner_customer(p.id) and not exists(select 1 from maintenance_billing_exemptions e where e.user_id=p.id)
 and ((a.action='deactivate' and s.restricted_at is not null and exists(
 select 1 from subscription_external_invoices i where i.subscription_id=s.id and i.status='payment_link_created' and i.paid_at is null
 and now()>=(i.billing_period+8)::timestamptz and public.business_maintenance_invoice_eligible(i.id)
 and i.metadata->>'provider_payment_check'='unpaid' and (i.metadata->>'provider_payment_checked_at')::timestamptz>now()-interval '10 minutes'))
 or (a.action='reactivate' and s.restricted_at is null and v.deactivation_reason='subscription_nonpayment'
 and not exists(select 1 from subscription_external_invoices i where i.subscription_id=s.id and i.status in ('payment_link_created','pending_configuration') and i.paid_at is null and now()>=(i.billing_period+8)::timestamptz)
 and exists(select 1 from subscription_external_invoices i where i.subscription_id=s.id and i.status='paid' and i.paid_at is not null)))
 ); $$;

CREATE OR REPLACE FUNCTION public.mark_external_subscription_invoice_link(p_invoice_id uuid, p_provider_reference text, p_payment_link text, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  invoice public.subscription_external_invoices;
  s public.subscriptions;
  idem text;
begin
  select * into invoice from public.subscription_external_invoices
   where id = p_invoice_id for update;
  if not found then raise exception 'External invoice not found'; end if;
  if invoice.status = 'paid' then
    return jsonb_build_object('status','paid','idempotent',true);
  end if;
  if nullif(trim(coalesce(p_provider_reference,'')),'') is null
     or nullif(trim(coalesce(p_payment_link,'')),'') is null then
    raise exception 'Provider reference and payment link are required';
  end if;

  update public.subscription_external_invoices set
    status = 'payment_link_created',
    provider_reference = p_provider_reference,
    payment_link = p_payment_link,
    expires_at = p_expires_at,
    attempt_count = attempt_count + 1,
    last_error = null,
    updated_at = now()
  where id = invoice.id
  returning * into invoice;

  select * into s from public.subscriptions where id = invoice.subscription_id for update;
  update public.subscriptions set
    payment_status = 'pending',
    grace_started_at = case when account_type='business' then grace_started_at else greatest(coalesce(grace_started_at, now()), invoice.billing_period::timestamptz) end,
    updated_at = now()
  where id = s.id;

  if s.account_type='business' then perform public.refresh_business_maintenance_state(s.id); end if;

  idem := 'subscription:external_invoice:' || invoice.id::text;
  insert into public.subscription_email_jobs(user_id,template,recipient,props,idempotency_key)
  select invoice.user_id,s.account_type || '.subscription_external_invoice',lower(trim(up.email)),
    jsonb_build_object(
      'customer_name',coalesce(bp.company_name,up.full_name),
      'amount',invoice.amount,
      'currency',invoice.currency,
      'billing_period',invoice.billing_period,
      'payment_link',invoice.payment_link,
      'transaction_reference',invoice.provider_reference
    ),idem
  from public.user_profiles up
  left join public.business_profiles bp on bp.user_id = up.id
  where up.id = invoice.user_id
    and nullif(trim(coalesce(up.email,'')),'') is not null
  on conflict(idempotency_key) do nothing;

  return jsonb_build_object(
    'status','payment_link_created',
    'invoice_id',invoice.id,
    'provider_reference',invoice.provider_reference
  );
end;
$function$;

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
    where s.account_type='individual' and not public.is_partner_customer(s.user_id) and s.status='active'
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
$function$;

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
    where s.account_type='individual' and not public.is_partner_customer(s.user_id) and s.status='active'
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
$function$;

CREATE OR REPLACE FUNCTION public.sync_paid_external_invoice_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if new.provider = 'flutterwave'
     and new.status = 'paid'
     and new.paid_at is not null
     and (tg_op = 'INSERT' or old.status is distinct from new.status or old.paid_at is distinct from new.paid_at)
  then
    update public.subscriptions
    set payment_status = 'active',
        next_billing_date = greatest(
          next_billing_date,
          public.subscription_next_month_end(new.billing_period)
        ),
        last_billed_at = greatest(coalesce(last_billed_at, new.paid_at), new.paid_at),
        failure_count = 0,
        grace_started_at = null,
        reminder_sent_at = null,
        restricted_at = case when account_type='business' then restricted_at else null end,
        updated_at = now()
    where id = new.subscription_id;
    perform public.refresh_business_maintenance_state(new.subscription_id);
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.complete_external_subscription_invoice(p_provider_reference text, p_provider_transaction_id text, p_amount numeric, p_currency text, p_event_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  invoice public.subscription_external_invoices;
  s public.subscriptions;
  tx public.billing_transactions;
  idem text;
begin
  select * into invoice from public.subscription_external_invoices
   where provider_reference = p_provider_reference for update;
  if not found then raise exception 'External invoice not found'; end if;
  if invoice.status = 'paid' then
    return jsonb_build_object('status','paid','idempotent',true,'invoice_id',invoice.id);
  end if;
  if upper(trim(coalesce(p_currency,''))) <> invoice.currency
     or round(coalesce(p_amount,0),2) <> invoice.amount then
    raise exception 'Verified provider payment does not match invoice';
  end if;
  if nullif(trim(coalesce(p_provider_transaction_id,'')),'') is null
     or nullif(trim(coalesce(p_event_id,'')),'') is null then
    raise exception 'Verified provider transaction and event identifiers are required';
  end if;

  select * into s from public.subscriptions where id = invoice.subscription_id for update;
  insert into public.billing_transactions(
    subscription_id,user_id,billing_period,amount,collected_amount,status,
    asset_breakdown,completed_at
  ) values (
    s.id,s.user_id,invoice.billing_period,invoice.amount,invoice.amount,'completed',
    jsonb_build_object(
      'provider','flutterwave',
      'currency',invoice.currency,
      'provider_reference',invoice.provider_reference,
      'provider_transaction_id',p_provider_transaction_id,
      'provider_event_id',p_event_id
    ),now()
  )
  on conflict(subscription_id,billing_period) do update set
    collected_amount = excluded.collected_amount,
    status = 'completed',
    failure_code = null,
    asset_breakdown = excluded.asset_breakdown,
    completed_at = coalesce(public.billing_transactions.completed_at, now())
  returning * into tx;

  update public.subscription_external_invoices set
    status = 'paid',
    provider_transaction_id = p_provider_transaction_id,
    paid_at = now(),
    last_error = null,
    metadata = metadata || jsonb_build_object('verified_provider_event_id',p_event_id),
    updated_at = now()
  where id = invoice.id;

  update public.subscriptions set
    payment_status = 'active',
    next_billing_date = public.subscription_next_month_end(invoice.billing_period),
    last_billed_at = now(),
    failure_count = 0,
    grace_started_at = null,
    reminder_sent_at = null,
    restricted_at = case when account_type='business' then restricted_at else null end,
    updated_at = now()
  where id = s.id and next_billing_date <= invoice.billing_period;

  if s.account_type='business' then perform public.refresh_business_maintenance_state(s.id); end if;

  idem := 'subscription:payment_completed:' || tx.id::text;
  insert into public.notifications(user_id,type,title,body,metadata)
  values(
    s.user_id,'system','Subscription Payment Successful',
    'Your BorderPay account maintenance fee of $' || to_char(invoice.amount,'FM999999990.00') || ' has been successfully paid.',
    jsonb_build_object(
      'idempotency_key',idem,
      'amount',invoice.amount,
      'asset','USD',
      'provider','flutterwave',
      'date',current_date,
      'transaction_reference',tx.id
    )
  )
  on conflict(user_id,((metadata->>'idempotency_key')))
    where metadata ? 'idempotency_key' do nothing;

  insert into public.subscription_email_jobs(user_id,template,recipient,props,idempotency_key)
  select s.user_id,s.account_type || '.subscription_payment_status',lower(trim(up.email)),
    jsonb_build_object(
      'customer_name',coalesce(bp.company_name,up.full_name),
      'outcome','completed',
      'amount',invoice.amount,
      'asset','USD via Flutterwave',
      'date',current_date,
      'transaction_reference',tx.id
    ),idem
  from public.user_profiles up
  left join public.business_profiles bp on bp.user_id = up.id
  where up.id = s.user_id
    and nullif(trim(coalesce(up.email,'')),'') is not null
  on conflict(idempotency_key) do nothing;

  perform public.emit_subscription_event(
    s.user_id,s.id,tx.id,'subscription.payment.completed',
    'subscription.payment.completed:' || tx.id::text,
    jsonb_build_object(
      'amount',invoice.amount,
      'asset','USD',
      'provider','flutterwave',
      'provider_transaction_id',p_provider_transaction_id
    )
  );
  insert into public.subscription_admin_logs(
    user_id,subscription_id,billing_transaction_id,action,details
  ) values (
    s.user_id,s.id,tx.id,'external_invoice_paid',
    jsonb_build_object(
      'invoice_id',invoice.id,
      'provider','flutterwave',
      'provider_transaction_id',p_provider_transaction_id,
      'provider_event_id',p_event_id
    )
  );

  return jsonb_build_object('status','paid','invoice_id',invoice.id,'billing_transaction_id',tx.id);
end;
$function$;

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
    where not public.is_partner_customer(s.user_id) and s.status='active' and s.account_type='business' and s.restricted_at is null and not exists(select 1 from subscription_external_invoices due where due.subscription_id=s.id and due.status in ('pending_configuration','payment_link_created') and due.paid_at is null and now()>=(due.billing_period+8)::timestamptz)
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
  where not public.is_partner_customer(s.user_id) and s.status='active' and s.account_type='business' and s.restricted_at is null and not exists(select 1 from subscription_external_invoices due where due.subscription_id=s.id and due.status in ('pending_configuration','payment_link_created') and due.paid_at is null and now()>=(due.billing_period+8)::timestamptz)
    and va.status='deactivated' and va.deactivation_reason='subscription_nonpayment'
    and nullif(trim(coalesce(va.bridge_customer_id,'')),'') is not null
    and nullif(trim(coalesce(va.bridge_virtual_account_id,'')),'') is not null
  order by s.last_billed_at nulls last,va.created_at limit safe_limit
  on conflict(idempotency_key) do nothing;

  return jsonb_build_object('dry_run',false,'eligible_deactivate',deactivate_count,'eligible_reactivate',reactivate_count);
end;
$function$;

create or replace function public.business_maintenance_email_eligible(p_user_id uuid,p_period date)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from subscription_external_invoices i where i.user_id=p_user_id and i.billing_period=p_period
 and i.status='payment_link_created' and i.paid_at is null and i.billing_period<=current_date
 and public.business_maintenance_invoice_eligible(i.id)); $$;

revoke all on function public.business_maintenance_invoice_eligible(uuid) from public,anon,authenticated;
grant execute on function public.business_maintenance_invoice_eligible(uuid) to service_role;

revoke all on function public.refresh_business_maintenance_state(uuid) from public,anon,authenticated;
grant execute on function public.refresh_business_maintenance_state(uuid) to service_role;

revoke all on function public.restrict_business_maintenance_invoice(uuid) from public,anon,authenticated;
grant execute on function public.restrict_business_maintenance_invoice(uuid) to service_role;

revoke all on function public.business_maintenance_action_allowed(uuid) from public,anon,authenticated;
grant execute on function public.business_maintenance_action_allowed(uuid) to service_role;

revoke all on function public.business_maintenance_email_eligible(uuid,date) from public,anon,authenticated;
grant execute on function public.business_maintenance_email_eligible(uuid,date) to service_role;

-- Bounded recurring batches cover the full cohort, with provider verification before enforcement.
select cron.schedule('business-maintenance-calendar-cycle','2-59/10 * * * *', $cron$
 select net.http_post(
 url := 'https://orwrcpwsffjlvzuraxjc.supabase.co/functions/v1/subscription-billing-worker',
 headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || public.app_config_get('worker_auth_token')),
 body := '{"mode":"maintenance_cycle"}'::jsonb, timeout_milliseconds := 120000);
$cron$);
