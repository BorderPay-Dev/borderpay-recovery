-- Bill active business receiving accounts independently of settlement wallet custody.
-- Preserve identity, provider restrictions, team/partner exemptions and period eligibility.
-- No invoices, provider resources, customer balances or payment records are changed here.
begin;
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
      -- Active receiving accounts are billable with custodial or external settlement wallets.
      and exists(
        select 1 from public.bridge_virtual_accounts va
        where coalesce(va.business_user_id,va.user_id)=up.id
          and (
            lower(va.status::text) in ('active','activated')
            or (lower(va.status::text)='deactivated'
              and va.deactivation_reason='subscription_nonpayment'
              and lower(coalesce(va.account_details->>'status',''))='deactivated'
              and exists(select 1 from public.subscriptions authorized
                where authorized.user_id=up.id and authorized.status='active'
                  and authorized.metadata->>'operator_reactivation_fee_authorized'='true'
                  and authorized.metadata->>'operator_reactivation_fee_expires_at' > to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')
              ))
          )
      )
  )
$function$;

CREATE OR REPLACE FUNCTION public.business_maintenance_invoice_eligible(p_invoice_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
 -- The owned receiving account below is the service being billed, regardless of wallet custody.
 and exists(select 1 from bridge_virtual_accounts v where coalesce(v.business_user_id,v.user_id)=p.id
   and v.created_at < (i.billing_period+1)::timestamptz
   and (v.status in ('active','activated') or (v.status='deactivated' and v.deactivation_reason='subscription_nonpayment')))
 );
$function$;
commit;
