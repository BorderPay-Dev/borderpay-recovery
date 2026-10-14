-- Isolated synthetic CI database. Never execute in production.
create table user_profiles(id uuid primary key,account_type text,country text,kyc_verified_at timestamptz,billable boolean);
create table subscriptions(id uuid primary key,user_id uuid,status text,verified_at timestamptz,next_billing_date date,monthly_fee numeric,metadata jsonb,updated_at timestamptz);
create table subscription_external_invoices(id uuid primary key,subscription_id uuid,user_id uuid,billing_period date,provider text,scope_country text,amount numeric,currency text,provider_reference text,status text default 'pending_configuration',paid_at timestamptz,payment_link text,last_error text,metadata jsonb,updated_at timestamptz,unique(subscription_id,billing_period));
create table billing_transactions(subscription_id uuid,billing_period date,status text);
create table subscription_admin_logs(user_id uuid,subscription_id uuid,action text,details jsonb);
create function subscription_current_month_end(date) returns date language sql as $$select (date_trunc('month',$1)+interval '1 month - 1 day')::date$$;
create function subscription_fee_for_period(text,date) returns numeric language sql as $$select 29.99::numeric$$;
-- The production eligibility function enforces identity, service and exemptions.
-- Fixture flag lets us prove restoration never bypasses that gate.
create function maintenance_account_is_billable_for_period(uuid,date) returns boolean language sql as $$select billable from user_profiles where id=$1$$;
create function ensure_internal_subscription(uuid,date,boolean) returns subscriptions language plpgsql as $$begin raise exception 'Unexpected subscription creation';end$$;
insert into user_profiles select ('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'business','GB',now()-interval '60 days',n<>2 from generate_series(1,5)n;
insert into subscriptions select ('20000000-0000-4000-8000-'||right(id::text,12))::uuid,id,'cancelled',now()-interval '60 days',subscription_current_month_end(current_date),29.99,'{"billing_paused_reason":"account_not_billable_or_no_active_virtual_account"}'::jsonb,now() from user_profiles;
insert into subscription_external_invoices
select ('30000000-0000-4000-8000-'||right(s.id::text,12))::uuid,s.id,s.user_id,subscription_current_month_end(current_date),'flutterwave','GB',29.99,'USD','synthetic-'||s.id,
case when right(s.id::text,1)='4' then 'paid' else 'cancelled' end,
case when right(s.id::text,1)='4' then now() else null end,null,null,
jsonb_build_object('reason',case when right(s.id::text,1)='3' then 'operator_cancelled' else 'services_unavailable_or_account_ineligible' end),now()
from subscriptions s;
-- A separately cancelled subscription is never reopened by the invoice fix.
update subscriptions set metadata='{"billing_paused_reason":"operator_cancelled"}' where right(id::text,1)='5';
