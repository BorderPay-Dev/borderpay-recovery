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
$function$
;
