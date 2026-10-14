-- Synthetic database only; never run against production.
create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,deleted_at timestamptz);
create table user_profiles(id uuid primary key,account_type text,email text,is_demo boolean default false,is_admin boolean default false,kyc_status text,account_status text,bridge_account_status text,account_frozen_at timestamptz);
create table business_profiles(user_id uuid primary key,bridge_kyb_status text,bridge_kyb_completed_at timestamptz);
create table subscriptions(id uuid primary key,user_id uuid,account_type text,status text,verified_at timestamptz,metadata jsonb);
create table maintenance_billing_exemptions(user_id uuid primary key);
create table test_partner_customers(user_id uuid primary key);
create function is_partner_customer(uuid) returns boolean language sql stable as $$select exists(select 1 from test_partner_customers where user_id=$1)$$;
create table bridge_wallets(user_id uuid,business_user_id uuid,status text);
create table bridge_virtual_accounts(user_id uuid,business_user_id uuid,status text,deactivation_reason text,account_details jsonb,created_at timestamptz);
create table subscription_external_invoices(id uuid primary key,subscription_id uuid,user_id uuid,provider text,billing_period date);
-- Same IDs in distinct synthetic tables simplify assertions.
insert into user_profiles select ('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'business','synthetic-'||n||'@example.test',false,false,'verified','active','active',null from generate_series(1,18)n;
insert into auth.users select id,email,now(),null from user_profiles;
insert into business_profiles select id,'approved','2026-09-01Z'::timestamptz from user_profiles;
insert into subscriptions select id,id,'business','active','2026-09-01Z'::timestamptz,'{}' from user_profiles;
insert into bridge_virtual_accounts select null,id,'active',null,'{"destination":{"payment_rail":"base","currency":"usdc","address":"synthetic-external-address"}}','2026-09-01Z'::timestamptz from user_profiles;
insert into subscription_external_invoices select id,id,id,'flutterwave','2026-09-30' from user_profiles;
-- 1: active external-wallet VA; 2: active custodial-wallet VA.
insert into bridge_wallets select null,id,'active' from user_profiles where right(id::text,2)='02';
-- 3: wallet alone cannot qualify without a receiving account.
delete from bridge_virtual_accounts where right(business_user_id::text,2)='03';
insert into bridge_wallets select null,id,'active' from user_profiles where right(id::text,2)='03';
-- 4/5: team and partner exclusions.
insert into maintenance_billing_exemptions select id from user_profiles where right(id::text,2)='04';
insert into test_partner_customers select id from user_profiles where right(id::text,2)='05';
-- 6/7/8/9/10/11: provider hold, account hold, service hold, incomplete KYB, deleted auth, demo.
update user_profiles set bridge_account_status='paused' where right(id::text,2)='06';
update user_profiles set account_status='frozen' where right(id::text,2)='07';
update subscriptions set metadata='{"billing_service_hold":"manual_review"}' where right(id::text,2)='08';
update business_profiles set bridge_kyb_status='incomplete' where right(user_id::text,2)='09';
update auth.users set deleted_at=now() where right(id::text,2)='10';
update user_profiles set is_demo=true where right(id::text,2)='11';
-- 12: unrelated deactivation cannot qualify for billing or restoration.
update bridge_virtual_accounts set status='deactivated',deactivation_reason='provider_review' where right(business_user_id::text,2)='12';
-- 13: maintenance-only deactivation keeps existing invoice eligible for payment recovery.
update bridge_virtual_accounts set status='deactivated',deactivation_reason='subscription_nonpayment' where right(business_user_id::text,2)='13';
-- 14: October VA must not authorize a September restriction.
update bridge_virtual_accounts set created_at='2026-10-01Z' where right(business_user_id::text,2)='14';
-- 15: a different merchant's active VA does not qualify the invoice owner.
update bridge_virtual_accounts set business_user_id='20000000-0000-4000-8000-000000000015' where right(business_user_id::text,2)='15';
-- 16: provider deposits restriction blocks invoice enforcement.
update user_profiles set bridge_account_status='deposits_restricted' where right(id::text,2)='16';
-- 17: unconfirmed email cannot authorize invoice enforcement.
update auth.users set email_confirmed_at=null where right(id::text,2)='17';
-- 18: legacy user_id ownership still qualifies.
update bridge_virtual_accounts set user_id=business_user_id,business_user_id=null where right(business_user_id::text,2)='18';

alter table user_profiles add column kyc_verified_at timestamptz;
alter table user_profiles add column bridge_kyc_completed_at timestamptz;
