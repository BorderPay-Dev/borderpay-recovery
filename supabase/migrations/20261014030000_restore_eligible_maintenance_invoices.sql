-- Restore service-unavailable cancellations only after the existing eligibility
-- checks confirm services are available. Paid/operator-cancelled invoices and
-- team/partner/provider/service-hold exclusions remain unchanged.
begin;
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
  if v_invoice.status='cancelled' and v_invoice.metadata->>'reason' in ('no_active_virtual_account','account_not_billable_or_no_active_virtual_account','services_unavailable_or_account_ineligible') and v_invoice.paid_at is null and v_invoice.payment_link is null then
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
commit;
