-- Entirely synthetic businesses; no production credentials or customer data.
insert into auth.users(id) select ('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid from generate_series(1,9) i;
insert into user_profiles(id,account_type,kyc_status,account_status,is_demo,is_partner,country)
select id,case when right(id::text,1)='5' then 'individual' else 'business' end,'verified',
case when right(id::text,1)='2' then 'frozen' else 'active' end,
right(id::text,1)='3',right(id::text,1)='4',case when right(id::text,1)='6' then null else 'FR' end from auth.users;
insert into business_profiles(user_id,bridge_kyb_status,company_name) select id,'approved','Synthetic Business' from user_profiles where account_type='business';
do $$declare n integer;begin
 select count(*) into n from subscription_external_invoices;
 if n<>4 then raise exception 'Expected 4 eligible synthetic business invoices, got %',n;end if;
 if exists(select 1 from subscription_external_invoices where amount<>29.99 or provider_reference not like 'bp-maintenance-%') then raise exception 'Wrong fee or missing reference';end if;
 if exists(select 1 from subscription_external_invoices where right(user_id::text,1) in ('2','3','4','5','6')) then raise exception 'Excluded account invoiced';end if;
 perform prepare_verified_business_maintenance(false,subscription_current_month_end(current_date));perform prepare_verified_business_maintenance(false,subscription_current_month_end(current_date));
 if (select count(*) from subscription_external_invoices)<>4 then raise exception 'Repeat run created duplicates';end if;
 if exists(select 1 from billing_transactions) then raise exception 'Invoice generation recorded a payment';end if;
 if has_function_privilege('authenticated','public.queue_verified_business_maintenance(uuid,date)','EXECUTE') then raise exception 'Customer may run operator billing';end if;
end$$;
-- Existing payment is preserved, including a prepaid next billing date.
update subscription_external_invoices set status='paid' where right(user_id::text,1)='1';
update subscriptions set next_billing_date=subscription_current_month_end((current_date+interval '1 month')::date),last_billed_at=now() where right(user_id::text,1)='1';
select prepare_verified_business_maintenance(false,subscription_current_month_end(current_date));
do $$begin if not exists(select 1 from subscription_external_invoices where right(user_id::text,1)='1' and status='paid') then raise exception 'Paid invoice changed';end if;end$$;
-- A previously cancelled no-VA subscription resumes under approval-based policy.
delete from subscription_external_invoices where right(user_id::text,1)='7';
update subscriptions set status='cancelled',metadata='{"billing_paused_reason":"no_active_virtual_account"}' where right(user_id::text,1)='7';
select prepare_verified_business_maintenance(false,subscription_current_month_end(current_date));
do $$begin if not exists(select 1 from subscription_external_invoices where right(user_id::text,1)='7') then raise exception 'No-VA approval did not create invoice';end if;end$$;
-- Manual cancellation is not silently reversed.
delete from subscription_external_invoices where right(user_id::text,1)='8';
update subscriptions set status='cancelled',metadata='{"billing_paused_reason":"operator_cancelled"}' where right(user_id::text,1)='8';
select prepare_verified_business_maintenance(false,subscription_current_month_end(current_date));
do $$begin if exists(select 1 from subscription_external_invoices where right(user_id::text,1)='8') then raise exception 'Manual cancellation overridden';end if;end$$;
-- A paid previous month does not cover this month.
update subscription_external_invoices set status='paid',billing_period=subscription_current_month_end((current_date-interval '1 month')::date) where right(user_id::text,1)='9';
update subscriptions set last_billed_at=now(),next_billing_date=subscription_current_month_end(current_date) where right(user_id::text,1)='9';
select prepare_verified_business_maintenance(false,subscription_current_month_end(current_date));
do $$begin if (select count(*) from subscription_external_invoices where right(user_id::text,1)='9')<>2 then raise exception 'New month missing';end if;end$$;
-- Approval of a newly complete business produces a reference on the trigger.
insert into auth.users values('00000000-0000-4000-8000-000000000010',null);
insert into user_profiles(id,account_type,kyc_status) values('00000000-0000-4000-8000-000000000010','business','not_started');
insert into business_profiles values('00000000-0000-4000-8000-000000000010','incomplete','Synthetic New Business');
update business_profiles set bridge_kyb_status='approved' where user_id='00000000-0000-4000-8000-000000000010';
update user_profiles set kyc_status='verified' where id='00000000-0000-4000-8000-000000000010';
do $$begin if not exists(select 1 from subscription_external_invoices where user_id='00000000-0000-4000-8000-000000000010') then raise exception 'Approval trigger missed invoice';end if;end$$;
select 'PASS: approval, monthly renewal, repeat runs, existing payments, exclusions and no wallet deductions' as result;

-- Monthly backfill excludes this month's approvals and preserves September-type payments.
do $$begin
 if (prepare_verified_business_maintenance(true)->>'eligible')::int<>0 then raise exception 'New approvals included in last month';end if;
end$$;
update subscriptions set verified_at=date_trunc('month',current_date)-interval '1 day' where right(user_id::text,1) in ('1','7');
select prepare_verified_business_maintenance(false);
update subscription_external_invoices set status='paid',paid_at=now() where right(user_id::text,1)='1' and billing_period=(date_trunc('month',current_date)-interval '1 day')::date;
update subscription_external_invoices set status='cancelled',metadata='{"reason":"no_active_virtual_account"}' where right(user_id::text,1)='7' and billing_period=(date_trunc('month',current_date)-interval '1 day')::date;
select prepare_verified_business_maintenance(false);select prepare_verified_business_maintenance(false);
do $$begin
 if not exists(select 1 from subscription_external_invoices where right(user_id::text,1)='7' and billing_period=(date_trunc('month',current_date)-interval '1 day')::date and status='pending_configuration') then raise exception 'Cancelled no-VA reference not restored';end if;
 if not exists(select 1 from subscription_external_invoices where right(user_id::text,1)='1' and billing_period=(date_trunc('month',current_date)-interval '1 day')::date and status='paid') then raise exception 'Previous month payment changed';end if;
end$$;
