-- Synthetic isolated CI database only.
create role anon;create role authenticated;create role service_role;
create table user_profiles(id uuid primary key,email text,full_name text,account_type text,account_status text,bridge_account_status text,account_frozen_at timestamptz);
create table business_profiles(user_id uuid,company_name text);
create table subscriptions(id uuid primary key,user_id uuid,status text,account_type text,restricted_at timestamptz);
create table bridge_virtual_accounts(user_id uuid,business_user_id uuid,bridge_customer_id text,bridge_virtual_account_id text,currency text,status text,deactivation_reason text);
create table subscription_external_invoices(subscription_id uuid,status text,paid_at timestamptz,billing_period date);
create table subscription_email_jobs(id uuid primary key default gen_random_uuid(),user_id uuid,template text,recipient text,props jsonb,idempotency_key text unique,status text default 'pending');
create table subscription_provider_access_actions(id uuid primary key default gen_random_uuid(),user_id uuid,subscription_id uuid,bridge_customer_id text,bridge_virtual_account_id text,action text,reason text,status text,created_at timestamptz default now(),completed_at timestamptz);
create function is_partner_customer(uuid) returns boolean language sql as $$select false$$;
insert into user_profiles values ('10000000-0000-4000-8000-000000000001','synthetic@example.invalid','Synthetic','business','active','active',null);
insert into business_profiles select id,'Synthetic Business' from user_profiles;
insert into subscriptions select '20000000-0000-4000-8000-000000000001',id,'active','business',null from user_profiles;
insert into subscription_external_invoices select id,'paid',now(),current_date-40 from subscriptions;
insert into bridge_virtual_accounts select user_id,null,'synthetic-customer','va-'||currency,currency,'active',null from subscriptions cross join unnest(array['EUR','USD','GBP']) currency;
insert into subscription_provider_access_actions(user_id,subscription_id,bridge_customer_id,bridge_virtual_account_id,action,reason,status,completed_at)
select s.user_id,s.id,v.bridge_customer_id,v.bridge_virtual_account_id,'reactivate','subscription_payment_confirmed',case when v.currency='GBP' then 'failed' else 'completed' end,now() from subscriptions s join bridge_virtual_accounts v on v.user_id=s.user_id;
