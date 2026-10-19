-- Deactivation adds a maintenance restriction; it never releases a provider restriction.
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
 and lower(coalesce(p.account_status,''))='active' and lower(coalesce(p.bridge_account_status,'')) in ('active','deposits_restricted')
 and p.account_frozen_at is null
 and coalesce(s.verified_at,b.bridge_kyb_completed_at,p.kyc_verified_at,p.bridge_kyc_completed_at) < (i.billing_period+1)::timestamptz
 and nullif(s.metadata->>'billing_service_hold','') is null
 -- Approval determines the billing month. A later VA creation/sync must not postpone it.
 -- Existing service, provider restrictions and team/partner exclusions still apply.
 and exists(select 1 from bridge_virtual_accounts v where coalesce(v.business_user_id,v.user_id)=p.id
   and (v.status in ('active','activated') or (v.status='deactivated' and v.deactivation_reason='subscription_nonpayment')))
 );
$function$;

CREATE OR REPLACE FUNCTION public.business_maintenance_action_allowed(p_action_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 select exists(select 1 from subscription_provider_access_actions a join subscriptions s on s.id=a.subscription_id
 join user_profiles p on p.id=a.user_id join bridge_virtual_accounts v on v.bridge_virtual_account_id=a.bridge_virtual_account_id
 where a.id=p_action_id and s.account_type='business' and s.status='active'
 and coalesce(v.business_user_id,v.user_id)=a.user_id and p.account_status='active' and (p.bridge_account_status='active' or (a.action='deactivate' and p.bridge_account_status='deposits_restricted')) and p.account_frozen_at is null
 and not public.is_partner_customer(p.id) and not exists(select 1 from maintenance_billing_exemptions e where e.user_id=p.id)
 and ((a.action='deactivate' and s.restricted_at is not null and exists(
 select 1 from subscription_external_invoices i where i.subscription_id=s.id and i.status='payment_link_created' and i.paid_at is null
 and now()>=(i.billing_period+8)::timestamptz and public.business_maintenance_invoice_eligible(i.id)
 and i.metadata->>'provider_payment_check'='unpaid' and (i.metadata->>'provider_payment_checked_at')::timestamptz>now()-interval '10 minutes'))
 or (a.action='reactivate' and s.restricted_at is null and v.deactivation_reason='subscription_nonpayment'
 and not exists(select 1 from subscription_external_invoices i where i.subscription_id=s.id and i.status in ('payment_link_created','pending_configuration') and i.paid_at is null and now()>=(i.billing_period+8)::timestamptz)
 and exists(select 1 from subscription_external_invoices i where i.subscription_id=s.id and i.status='paid' and i.paid_at is not null)))
 ); $function$;
