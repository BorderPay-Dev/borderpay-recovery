create role anon;create role authenticated;create role service_role;
create schema extensions; create extension pgcrypto with schema extensions;
create schema vault;create table vault.decrypted_secrets(name text,decrypted_secret text);
insert into vault.decrypted_secrets values('API_CUSTOMER_AUTH_ENCRYPTION_KEY',repeat('synthetic-test-key-',4));
create schema cron;create function cron.schedule(text,text,text) returns bigint language sql as 'select 1::bigint';
create table api_tenants(id uuid primary key,tenant_name text,default_mode text,is_active boolean);
create table api_keys(id uuid primary key,tenant_id uuid references api_tenants,scopes text[],is_active boolean,revoked_at timestamptz);
create table api_partner_approvals(tenant_id uuid primary key,status text,approved_products text[]);
create table api_tenant_end_users(id uuid primary key,tenant_id uuid references api_tenants,user_id uuid,external_user_id text,account_type text);
create table user_profiles(id uuid primary key,bridge_customer_id text);
create table business_profiles(user_id uuid primary key,bridge_customer_id text);
create table api_webhook_events(id uuid primary key default gen_random_uuid(),tenant_id uuid,event_type text,idempotency_key text,payload jsonb,unique(tenant_id,idempotency_key));
create function api_webhook_enqueue_event(p_tenant_id uuid,p_tenant_end_user_id uuid,p_resource_id uuid,p_event_type text,p_idempotency_key text,p_payload jsonb,p_occurred_at timestamptz default now()) returns uuid language plpgsql as $$
declare result uuid;
begin
 insert into api_webhook_events(tenant_id,event_type,idempotency_key,payload) values(p_tenant_id,p_event_type,p_idempotency_key,p_payload) on conflict do nothing;
 select id into result from api_webhook_events where tenant_id=p_tenant_id and idempotency_key=p_idempotency_key;return result;
end $$;
