\set ON_ERROR_STOP on
-- Synthetic fixtures only; deliberately no external credentials or providers.
insert into public.api_tenants(id,tenant_name,metadata,is_active) values
 ('10000000-0000-4000-8000-000000000001','Synthetic Partner','{}',false);
insert into auth.users(id,email) values
 ('20000000-0000-4000-8000-000000000001','partner@example.com'),
 ('20000000-0000-4000-8000-000000000002','direct@example.com'),
 ('20000000-0000-4000-8000-000000000003','legacy@example.com');
insert into public.user_profiles(id,email,account_type,kyc_status,account_status,bridge_account_status)
 select id,email,'business','verified','active','active' from auth.users;
insert into public.business_profiles(user_id,bridge_kyb_status) select id,'approved' from auth.users;
insert into public.bridge_virtual_accounts(user_id,status) select id,'active' from auth.users;
insert into public.api_tenant_end_users(id,user_id,tenant_id,external_user_id,onboarding_channel) values
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','partner-ref','api');
insert into public.account_origin_provenance(user_id,tenant_id,origin_kind,onboarding_channel,external_user_id) values
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','partner','white_label','legacy-ref');
insert into public.subscriptions(id,user_id,status,restricted_at,next_billing_date,account_type,payment_status) values
 ('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','active',now(),current_date,'business','failed');
do $$
declare p uuid:='20000000-0000-4000-8000-000000000001'; d uuid:='20000000-0000-4000-8000-000000000002'; s uuid:='40000000-0000-4000-8000-000000000001'; result jsonb; row record;
begin
 assert public.is_partner_customer(p), 'inactive tenant still owns customer';
 assert not public.is_partner_customer(d), 'direct customer incorrectly tagged';
 assert not public.is_partner_customer(null);
 assert public.is_partner_customer('20000000-0000-4000-8000-000000000003'), 'legacy provenance must protect customer';
 assert (select count(*)=2 from public.partner_customer_memberships(array[p,'20000000-0000-4000-8000-000000000003']::uuid[]));
 assert public.email_recipient_is_partner(null,' PARTNER@EXAMPLE.COM '), 'email-only sender bypass';
 assert public.email_recipient_is_partner(d,'partner@example.com'), 'wrong user_id bypass';
 assert not public.email_recipient_is_partner(d,'direct@example.com');
 assert not public.maintenance_account_is_billable(p);
 assert public.maintenance_account_is_billable(d), 'direct billing changed';
 assert not public.subscription_feature_restricted(p), 'partner retail restriction';
 assert public.ensure_internal_subscription(p) is null;
 select * into row from public.charge_va_maintenance(p); assert not row.charged and row.amount_usd_minor=0 and not row.overdue;
 select * into row from public.charge_wallet_maintenance(p); assert not row.charged and row.amount_minor=0 and not row.overdue;
 assert public.charge_internal_subscription(s,current_date)->>'reason'='partner_managed';
 assert public.queue_external_subscription_invoice(s,current_date,'NG','flutterwave')->>'reason'='partner_managed';
 assert public.prepare_bridge_subscription_collection(s,current_date,'[]')->>'reason'='partner_managed';
 assert not has_function_privilege('anon','public.is_partner_customer(uuid)','execute');
 assert not has_function_privilege('authenticated','public.partner_customer_memberships(uuid[])','execute');
 assert not has_table_privilege('authenticated','public.partner_customer_directory','select');
 assert has_function_privilege('service_role','public.partner_customer_memberships(uuid[])','execute');
 assert (select count(*)=1 from public.subscriptions), 'test added a subscription';
end $$;
select 'Partner membership, billing, email lookup and access checks passed' as result;
