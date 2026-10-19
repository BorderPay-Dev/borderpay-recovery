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
 -- Approval determines the billing month. A later VA creation/sync must not postpone it.
 -- Existing service, provider restrictions and team/partner exclusions still apply.
 and exists(select 1 from bridge_virtual_accounts v where coalesce(v.business_user_id,v.user_id)=p.id
   and (v.status in ('active','activated') or (v.status='deactivated' and v.deactivation_reason='subscription_nonpayment')))
 );
$function$;
