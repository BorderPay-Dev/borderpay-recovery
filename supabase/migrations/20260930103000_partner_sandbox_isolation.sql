begin;
-- Sandbox-only records deliberately have no FK to live users, wallets or transactions.
create table public.api_sandbox_resources (
 tenant_id uuid not null references public.api_tenants(id),
 kind text not null check(kind in ('customer','wallet','virtual_account','external_account','transfer','authorization')),
 resource_id text not null,
 customer_id text,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 primary key(tenant_id,kind,resource_id)
);
alter table public.api_sandbox_resources enable row level security;
revoke all on public.api_sandbox_resources from anon,authenticated;
grant all on public.api_sandbox_resources to service_role;
create function public.api_sandbox_credential() returns text
language sql stable security definer set search_path=pg_catalog,pg_temp as $$
 select decrypted_secret from vault.decrypted_secrets where name='BRIDGE_SANDBOX_API_KEY' limit 1
$$;
revoke all on function public.api_sandbox_credential() from public,anon,authenticated;
grant execute on function public.api_sandbox_credential() to service_role;
comment on table public.api_sandbox_resources is 'Synthetic partner test resources only. Never financial ledger entries or live customer mappings.';
commit;
