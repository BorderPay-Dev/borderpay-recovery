-- Recover only maintenance-deactivated VAs whose provider state was projected as closed.
-- The worker still checks current customer eligibility and the live VA before reactivation.
begin;
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
      and va.deactivation_reason='subscription_nonpayment'
      and (va.status='deactivated' or (va.status='closed' and lower(coalesce(va.account_details->>'status',''))='deactivated'
        and exists(select 1 from public.subscription_provider_access_actions history
          where history.subscription_id=s.id and history.user_id=s.user_id
          and history.bridge_customer_id=va.bridge_customer_id and history.bridge_virtual_account_id=va.bridge_virtual_account_id
          and history.action='deactivate' and history.reason='subscription_nonpayment' and history.status='completed')))
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
    and va.deactivation_reason='subscription_nonpayment'
      and (va.status='deactivated' or (va.status='closed' and lower(coalesce(va.account_details->>'status',''))='deactivated'
        and exists(select 1 from public.subscription_provider_access_actions history
          where history.subscription_id=s.id and history.user_id=s.user_id
          and history.bridge_customer_id=va.bridge_customer_id and history.bridge_virtual_account_id=va.bridge_virtual_account_id
          and history.action='deactivate' and history.reason='subscription_nonpayment' and history.status='completed')))
    and nullif(trim(coalesce(va.bridge_customer_id,'')),'') is not null
    and nullif(trim(coalesce(va.bridge_virtual_account_id,'')),'') is not null
  order by s.last_billed_at nulls last,va.created_at limit safe_limit
  on conflict(idempotency_key) do nothing;

  return jsonb_build_object('dry_run',false,'eligible_deactivate',deactivate_count,'eligible_reactivate',reactivate_count);
end;
$function$;

commit;
