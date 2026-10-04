create role anon;create role authenticated;create role service_role;
create schema auth;create schema kyb;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,banned_until timestamptz,deleted_at timestamptz,raw_app_meta_data jsonb default '{}');
create table public.user_profiles(id uuid primary key,email text,account_type text,account_status text,bridge_account_status text,bridge_customer_id text,account_frozen_at timestamptz,account_frozen_reason text,is_admin boolean default false,is_demo boolean default false);
create table public.users(id uuid primary key,full_name text);
create table public.user_security(user_id uuid primary key,pin_set boolean,two_factor_enabled boolean,secret_totp_seed text);
create table public.business_profiles(user_id uuid primary key,bridge_kyb_status text,country text,company_name text);
create table public.app_config(key text primary key,value text);
create table kyb.reverification_authorizations(user_id uuid primary key,email text,eligibility text,revoked_at timestamptz);
create table kyb.applications(id uuid primary key,tenant_id uuid,internal_status text,revision int default 1,created_at timestamptz default now());
create table kyb.members(tenant_id uuid,user_id uuid);
create table kyb.reverification_invites(user_id uuid,application_id uuid,consumed_at timestamptz,expires_at timestamptz);
create table kyb.documents(application_id uuid);
create table kyb.identity_cases(application_id uuid);
create function public.is_partner_customer(uuid) returns boolean language sql as $$select coalesce(current_setting('test.partner',true),'false')='true'$$;
create function public.paused_business_review_access(uuid) returns boolean language sql as $$select false$$;
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

insert into public.user_profiles(id,email,account_type,account_status,bridge_account_status,bridge_customer_id,account_frozen_at,account_frozen_reason) values
('00000000-0000-4000-8000-000000000001','paused@example.test','business','frozen','paused','p1',now(),'Bridge account paused'),
('00000000-0000-4000-8000-000000000002','rejected@example.test','business','pending_kyc','rejected','p2',null,null),
('00000000-0000-4000-8000-000000000003','active@example.test','business','active','active','p3',null,null);
insert into auth.users(id,email,email_confirmed_at) select id,email,now() from public.user_profiles;
insert into kyb.reverification_authorizations select id,email,case when bridge_account_status='paused' then 'provider_paused' else 'rejected' end,null from public.user_profiles;
insert into kyb.members select id,id from public.user_profiles;
insert into kyb.applications(id,tenant_id,internal_status) select id,id,'draft' from public.user_profiles;
-- Old and consumed links must not determine application progress or authorised app access.
insert into kyb.reverification_invites select id,id,now()-interval '3 days',now()-interval '2 days' from public.user_profiles;
insert into public.app_config values('kyb_portal_onboarding','{"enabled":true,"new_business_only":true}');
