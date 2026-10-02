create role anon;create role authenticated;create role service_role;
create schema auth;create schema kyb;
create function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,banned_until timestamptz,deleted_at timestamptz);
create table public.user_profiles(id uuid primary key,email text,account_type text,account_status text,bridge_account_status text,bridge_customer_id text,account_frozen_at timestamptz,account_frozen_reason text,is_admin boolean,is_demo boolean);
create table public.wallets(id uuid primary key,user_id uuid,currency text,balance numeric,updated_at timestamptz);
create table public.bridge_virtual_accounts(user_id uuid,business_user_id uuid,currency text,account_number text);
create table kyb.reverification_authorizations(user_id uuid primary key,email text,eligibility text,revoked_at timestamptz);
create function public.is_partner_customer(uuid) returns boolean language sql as $$select false$$;
create function public.can_read_bridge_financial_data(uuid) returns boolean language sql as $$select coalesce(current_setting('test.sca',true),'true')<>'false'$$;
create function public.can_read_borderpay_usdt(uuid) returns boolean language sql as $$select false$$;
create function public.can_read_borderpay_eurc(uuid) returns boolean language sql as $$select true$$;
create or replace function kyb.reverification_candidate(u uuid) returns boolean language plpgsql security definer set search_path=pg_catalog,kyb as $$
declare p jsonb;a jsonb;authorized_email text;lane text;partner boolean;
begin
 select email,eligibility into authorized_email,lane from kyb.reverification_authorizations where user_id=u and revoked_at is null;
 if authorized_email is null then return false;end if;
 select to_jsonb(x) into p from public.user_profiles x where x.id=u;
 select to_jsonb(x) into a from auth.users x where x.id=u;
 if p is null or a is null or (p->>'account_type') is distinct from 'business' or nullif(p->>'bridge_customer_id','') is null
 or coalesce(p->>'is_admin','false')='true' or coalesce(p->>'is_demo','false')='true'

 or a->>'deleted_at' is not null or a->>'email_confirmed_at' is null
 or lower(a->>'email') is distinct from lower(authorized_email) or lower(p->>'email') is distinct from lower(authorized_email)
 or coalesce((a->>'banned_until')::timestamptz,'epoch'::timestamptz)>now() then return false;end if;
 -- This exception permits evidence submission only; it never alters financial restrictions.
 if lane='rejected' then
  if (p->>'account_status') is distinct from 'pending_kyc' or (p->>'bridge_account_status') is distinct from 'rejected'
   or nullif(p->>'account_frozen_at','') is not null or nullif(btrim(p->>'account_frozen_reason'),'') is not null then return false;end if;
 elsif lane='provider_paused' then
  -- Fail closed for fraud, discretionary holds, suspended accounts and later status changes.
  if (p->>'account_status') is distinct from 'frozen' or (p->>'bridge_account_status') is distinct from 'paused'
   or (p->>'account_frozen_reason') is distinct from 'Bridge account paused' then return false;end if;
 else return false;
 end if;
 if to_regprocedure('public.is_partner_customer(uuid)') is null then return false;end if;
 select public.is_partner_customer(u) into partner;
 return partner is false;
end $$;

insert into public.user_profiles values('00000000-0000-4000-8000-000000000001','merchant@example.test','business','frozen','paused','synthetic-provider',now(),'Bridge account paused',false,false),('00000000-0000-4000-8000-000000000002','other@example.test','business','frozen','paused','synthetic-other',now(),'Bridge account paused',false,false);
insert into auth.users select id,email,now(),null,null from public.user_profiles;
insert into kyb.reverification_authorizations select id,email,'provider_paused',null from public.user_profiles where id='00000000-0000-4000-8000-000000000001';
insert into public.wallets values('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','USDC',123.45,now()),('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','USDC',999,now()),('10000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','USDT',555,now());
insert into public.bridge_virtual_accounts values('00000000-0000-4000-8000-000000000001',null,'EUR','private-account-number'),('00000000-0000-4000-8000-000000000002',null,'USD','other-account');
