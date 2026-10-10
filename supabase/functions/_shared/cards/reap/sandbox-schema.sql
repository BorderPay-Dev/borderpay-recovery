-- REVIEW-ONLY sandbox migration; intentionally outside supabase/migrations.
-- Never apply to the production ledger. service_role is the only API role granted access.
begin;
create schema reap_sandbox;
revoke all on schema reap_sandbox from public, anon, authenticated;
grant usage on schema reap_sandbox to service_role;
create table reap_sandbox.programmes (
 id uuid primary key, environment text not null default 'sandbox' check(environment='sandbox'),
 authorization_model text not null check(authorization_model in ('standard','real_time')),
 enabled boolean not null default false, created_at timestamptz not null default now()
);
create table reap_sandbox.merchants (
 program_id uuid not null references reap_sandbox.programmes(id), tenant_id uuid not null,
 entity_id uuid not null, kyb_status text not null default 'PENDING_SUBMISSION',
 issuance_enabled boolean not null default false, verified_email_domains text[] not null default array[]::text[],
 primary key(program_id,tenant_id),unique(program_id,entity_id)
);
create table reap_sandbox.resources (
 program_id uuid not null, tenant_id uuid not null, kind text not null check(kind in ('card','ubo','transaction')),
 resource_id text not null, primary key(program_id,kind,resource_id),
 foreign key(program_id,tenant_id) references reap_sandbox.merchants(program_id,tenant_id)
);
create table reap_sandbox.commands (
 program_id uuid not null,tenant_id uuid not null,id uuid not null,operation text not null,
 request_hash text not null check(request_hash ~ '^[0-9a-f]{64}$'),
 state text not null default 'IN_FLIGHT' check(state in ('IN_FLIGHT','SUCCEEDED','REJECTED','UNKNOWN')),
 provider_id text,error_code text,created_at timestamptz not null default now(),finished_at timestamptz,
 primary key(program_id,id),foreign key(program_id,tenant_id) references reap_sandbox.merchants(program_id,tenant_id)
);
create table reap_sandbox.webhook_inbox (
 id bigint generated always as identity primary key,program_id uuid not null references reap_sandbox.programmes(id),
 service text not null check(service in ('cards','compliance')),trace_id text not null,business_key text not null,
 payload_hash text not null check(payload_hash ~ '^[0-9a-f]{64}$'),event_type text not null,event_name text not null,
 key_id text not null,ciphertext text not null,nonce text not null,received_at timestamptz not null default now(),
 unique(program_id,service,trace_id),unique(program_id,service,business_key)
);
create table reap_sandbox.audit_events (
 id bigint generated always as identity primary key,program_id uuid not null,event_kind text not null,
 record_id text not null,created_at timestamptz not null default now()
);
create function reap_sandbox.audit_change() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 insert into reap_sandbox.audit_events(program_id,event_kind,record_id)
 values(new.program_id,tg_table_name || ':' || tg_op,new.id::text);
 return new;
end; $$;
create trigger commands_audit after insert or update on reap_sandbox.commands for each row execute function reap_sandbox.audit_change();
create trigger inbox_audit after insert on reap_sandbox.webhook_inbox for each row execute function reap_sandbox.audit_change();
create function reap_sandbox.forbid_change() returns trigger language plpgsql as $$
begin raise exception 'Append-only evidence'; end; $$;
create trigger audit_immutable before update or delete on reap_sandbox.audit_events for each row execute function reap_sandbox.forbid_change();
create trigger inbox_immutable before update or delete on reap_sandbox.webhook_inbox for each row execute function reap_sandbox.forbid_change();
alter table reap_sandbox.programmes enable row level security;
alter table reap_sandbox.merchants enable row level security;
alter table reap_sandbox.resources enable row level security;
alter table reap_sandbox.commands enable row level security;
alter table reap_sandbox.webhook_inbox enable row level security;
alter table reap_sandbox.audit_events enable row level security;
-- No anon/authenticated policies: private backend-only schema.
revoke all on all tables in schema reap_sandbox from public,anon,authenticated;
revoke all on all sequences in schema reap_sandbox from public,anon,authenticated;
revoke all on all functions in schema reap_sandbox from public,anon,authenticated;
grant select,insert,update on reap_sandbox.programmes,reap_sandbox.merchants,reap_sandbox.resources,reap_sandbox.commands to service_role;
grant select,insert on reap_sandbox.webhook_inbox,reap_sandbox.audit_events to service_role;
grant usage,select on all sequences in schema reap_sandbox to service_role;
commit;
