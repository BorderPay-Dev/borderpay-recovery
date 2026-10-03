-- DRAFT / NOT APPLIED. New YC tables only; never modifies existing balances or Bridge state.
-- Apply only after approval. Service-only writes. No automatic provider activation.
begin;
create table public.yc_runtime_settings (
  environment text primary key check(environment in ('production','sandbox')),
  settings jsonb not null default '{"enabled":false,"writes_enabled":false,"approval_reference":"","confirmed_contracts":[],"enabled_operations":[],"fiat_currencies":[],"webhook_keys":{},"encryption_keys":{},"encryption_key_id":"","corporate_mapping_approved":false}'::jsonb
);
insert into public.yc_runtime_settings(environment) values('production'),('sandbox');
create or replace function public.yc_runtime_configuration(p_environment text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare config jsonb; secrets jsonb:='{}';
begin
 select settings into config from public.yc_runtime_settings where environment=p_environment;
 if config is null then raise exception 'Environment unavailable';end if;
 -- Secret-name allowlist: this resolver cannot be used to read unrelated bank/provider credentials.
 if to_regclass('vault.decrypted_secrets') is not null then
   execute 'select coalesce(jsonb_object_agg(name,decrypted_secret),''{}''::jsonb) from vault.decrypted_secrets where name = any($1)' into secrets
   using array['YC_PRODUCTION_API_KEY','YC_PRODUCTION_SECRET_KEY','YC_SANDBOX_API_KEY','YC_SANDBOX_SECRET_KEY','YC_EGRESS_RELAY_URL','YC_EGRESS_RELAY_TOKEN','YC_FULL_EVIDENCE_KEY_V1','YC_FULL_EVIDENCE_KEY_V2','YC_WEBHOOK_PREVIOUS_SECRET'];
 end if;
 return jsonb_build_object('settings',config,'secrets',secrets);
end $$;
create table public.yc_merchants (
  merchant_id uuid not null references auth.users(id), environment text not null check(environment in ('production','sandbox')),
  tenant_id uuid, provider_customer_id text, account_type text not null default 'business' check(account_type='business'),
  status text not null default 'incomplete' check(status in ('incomplete','under_review','active','paused','rejected','closed')),
  global_blocked boolean not null default false, controls_satisfied boolean not null default false,
  cutover_approved_at timestamptz, approval_reference text, enabled_operations text[] not null default '{}',
  created_at timestamptz not null default now(), primary key(merchant_id,environment),
  check(cutover_approved_at is null or nullif(approval_reference,'') is not null)
);
create table public.yc_memberships (
  merchant_id uuid not null, environment text not null, user_id uuid not null references auth.users(id),
  permission text not null check(permission in ('view','transact','admin')), primary key(merchant_id,environment,user_id),
  foreign key(merchant_id,environment) references public.yc_merchants
);
create table public.yc_resources (
  id uuid primary key default gen_random_uuid(), merchant_id uuid not null, environment text not null,
  resource_kind text not null check(resource_kind in ('vault','sub_wallet','virtual_account')),
  provider_resource_id text not null, parent_resource_id uuid references public.yc_resources(id), currency text,
  status text not null default 'pending', observed_at timestamptz, created_at timestamptz not null default now(),
  foreign key(merchant_id,environment) references public.yc_merchants,
  unique(environment,resource_kind,provider_resource_id), unique(id,merchant_id,environment)
);
create unique index yc_one_vault_per_merchant on public.yc_resources(merchant_id,environment) where resource_kind='vault';
create table public.yc_vault_identities (
  resource_id uuid primary key references public.yc_resources(id), sealed_identity jsonb not null,
  verified boolean not null default false, mapping_approved boolean not null default false,
  approval_reference text, updated_at timestamptz not null default now(),
  check(not mapping_approved or nullif(approval_reference,'') is not null)
);
create table public.yc_balances (
  resource_id uuid not null, merchant_id uuid not null, environment text not null, asset text not null,
  available numeric(36,12) not null check(available>=0), held numeric(36,12) check(held>=0),
  observed_at timestamptz not null, provider_reference text not null,
  primary key(resource_id,asset), foreign key(resource_id,merchant_id,environment) references public.yc_resources(id,merchant_id,environment)
);
create table public.yc_operations (
  id uuid primary key default gen_random_uuid(), merchant_id uuid not null, environment text not null,
  operation text not null, sequence_id text not null, request_hash text not null check(request_hash ~ '^[0-9a-f]{64}$'),
  source_resource_id uuid, asset text, reserved_amount numeric(36,12) not null default 0 check(reserved_amount>=0),
  authorization_reference text not null, authorization_expires_at timestamptz not null,
  sealed_request jsonb not null, provider_id text,
  state text not null default 'reserved' check(state in ('reserved','submitting','submitted','outcome_unknown','completed','rejected','review_required')),
  reservation_released boolean not null default false, provider_code text, lease_token uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(merchant_id,environment) references public.yc_merchants,
  foreign key(source_resource_id,merchant_id,environment) references public.yc_resources(id,merchant_id,environment),
  unique(environment,sequence_id), unique(merchant_id,environment,authorization_reference),
  check((source_resource_id is not null and reserved_amount>0 and asset is not null) or (source_resource_id is null and reserved_amount=0))
);
create index yc_operations_source_open on public.yc_operations(source_resource_id) where not reservation_released;
create table public.yc_webhook_inbox (
  id uuid primary key default gen_random_uuid(), environment text not null check(environment in ('production','sandbox')),
  fingerprint text not null unique, event_type text not null, sealed_payload jsonb not null,
  state text not null default 'pending' check(state in ('pending','processing','processed','quarantined')),
  attempts integer not null default 0, lease_token uuid, lease_until timestamptz,
  received_at timestamptz not null default now(), finished_at timestamptz, last_error_code text
);
create table public.yc_transaction_observations (
  id uuid primary key default gen_random_uuid(), environment text not null, merchant_id uuid not null,
  family text not null, provider_transaction_id text not null, sequence_id text, status text not null,
  amount numeric(36,12), currency text, settled_amount numeric(36,12), settled_currency text,
  provider_fee numeric(36,12), provider_fee_currency text, network_fee numeric(36,12), network_fee_currency text,
  rate numeric(36,12), transaction_hash text, observed_at timestamptz not null, evidence_hash text not null,
  sealed_evidence jsonb not null, foreign key(merchant_id,environment) references public.yc_merchants,
  unique(environment,merchant_id,family,provider_transaction_id,evidence_hash)
);
-- Outbox is evidence for existing ledger integration, not an independent customer balance.
create table public.yc_ledger_outbox (
  id uuid primary key default gen_random_uuid(), observation_id uuid not null references public.yc_transaction_observations,
  posting_key text not null unique, state text not null default 'pending' check(state in ('pending','posted','review_required')),
  ledger_reference text, created_at timestamptz not null default now(), check(state<>'posted' or ledger_reference is not null)
);
create table public.yc_reconciliation_cursors (
  environment text not null check(environment in ('production','sandbox')), stream text not null, resource_key text not null,
  cursor text, covered_until timestamptz, window_from timestamptz, window_to timestamptz, lease_token uuid, lease_until timestamptz, updated_at timestamptz not null default now(),
  primary key(environment,stream,resource_key)
);
create table public.yc_compliance_cases (
  id uuid primary key default gen_random_uuid(), merchant_id uuid not null, environment text not null,
  provider_case_id text, provider_transaction_id text, requested_at timestamptz not null default now(), deadline timestamptz,
  state text not null default 'open' check(state in ('open','collecting','ready_to_send','sent','under_review','resolved','rejected')),
  sealed_evidence jsonb, delivery_channel text, delivery_acknowledgement text,
  foreign key(merchant_id,environment) references public.yc_merchants,
  check(state not in ('sent','under_review','resolved','rejected') or delivery_acknowledgement is not null)
);
create table public.yc_audit_events (
  id bigint generated always as identity primary key, merchant_id uuid, environment text, actor_id uuid,
  action text not null, resource_reference text, evidence_hash text, created_at timestamptz not null default now()
);
create or replace function public.yc_immutable_audit() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Audit events are immutable'; end $$;
create trigger yc_audit_immutable before update or delete on public.yc_audit_events for each row execute function public.yc_immutable_audit();
create or replace function public.yc_validate_resource_parent() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='UPDATE' and (new.merchant_id,new.environment,new.resource_kind,new.provider_resource_id) is distinct from (old.merchant_id,old.environment,old.resource_kind,old.provider_resource_id) then raise exception 'Resource ownership is immutable'; end if;
  if new.parent_resource_id is not null and not exists(select 1 from public.yc_resources p where p.id=new.parent_resource_id and p.merchant_id=new.merchant_id and p.environment=new.environment and p.resource_kind='sub_wallet' and new.resource_kind='virtual_account') then raise exception 'Invalid account ownership'; end if;
  return new;
end $$;
create trigger yc_resource_parent before insert or update on public.yc_resources for each row execute function public.yc_validate_resource_parent();
-- Request payload is already authorized against the exact hash by the existing PIN/biometric/SCA adapter.
-- This RPC is not executable by end users. Never accept authorization_reference from unchecked browser input.
create or replace function public.yc_reserve_operation(p_merchant uuid,p_environment text,p_operation text,p_sequence text,p_hash text,p_source uuid,p_asset text,p_amount numeric,p_authorization text,p_expires timestamptz,p_sealed jsonb)
returns public.yc_operations language plpgsql security definer set search_path='' as $$
declare m public.yc_merchants; op public.yc_operations; bal public.yc_balances;
begin
  select * into m from public.yc_merchants where merchant_id=p_merchant and environment=p_environment for update;
  if not found or m.status<>'active' or m.global_blocked or not m.controls_satisfied or m.cutover_approved_at is null or not(p_operation=any(m.enabled_operations)) then raise exception 'Merchant operation not enabled'; end if;
  select * into op from public.yc_operations where environment=p_environment and sequence_id=p_sequence;
  if found then
    if op.merchant_id<>p_merchant or op.request_hash<>p_hash or op.operation<>p_operation then raise exception 'Idempotency conflict';end if;
    return op;
  end if;
  if p_amount::text in ('NaN','Infinity','-Infinity') then raise exception 'Invalid reservation amount';end if;
  if p_expires<=now() or p_expires>now()+interval '5 minutes' or nullif(p_authorization,'') is null then raise exception 'Authorization expired';end if;
  if p_source is not null then
    if not exists(select 1 from public.yc_resources where id=p_source and merchant_id=p_merchant and environment=p_environment and resource_kind in ('sub_wallet','vault') and status='active') then raise exception 'Source unavailable';end if;
    select * into bal from public.yc_balances where resource_id=p_source and asset=p_asset for update;
    if not found or bal.observed_at<now()-interval '30 seconds' or bal.observed_at>now()+interval '5 seconds' or p_amount<=0 or bal.available<p_amount then raise exception 'Balance unavailable';end if;
    if exists(select 1 from public.yc_operations where source_resource_id=p_source and not reservation_released) then raise exception 'Source has an unreconciled operation';end if;
  elsif p_amount<>0 then raise exception 'Missing payment source';end if;
  insert into public.yc_operations(merchant_id,environment,operation,sequence_id,request_hash,source_resource_id,asset,reserved_amount,authorization_reference,authorization_expires_at,sealed_request)
  values(p_merchant,p_environment,p_operation,p_sequence,p_hash,p_source,p_asset,p_amount,p_authorization,p_expires,p_sealed) returning * into op;
  insert into public.yc_audit_events(merchant_id,environment,action,resource_reference,evidence_hash) values(p_merchant,p_environment,'operation_reserved',op.id::text,p_hash);
  return op;
end $$;
-- A crash after submitting must never reset the operation to reserved automatically.
create or replace function public.yc_claim_operation(p_id uuid,p_merchant uuid,p_environment text,p_hash text)
returns public.yc_operations language plpgsql security definer set search_path='' as $$
declare op public.yc_operations;
begin
  update public.yc_operations set state='submitting',lease_token=gen_random_uuid(),updated_at=now()
  where id=p_id and merchant_id=p_merchant and environment=p_environment and request_hash=p_hash and state='reserved' and authorization_expires_at>now()
  and exists(select 1 from public.yc_merchants m where m.merchant_id=p_merchant and m.environment=p_environment and m.status='active' and not m.global_blocked and m.controls_satisfied and m.cutover_approved_at is not null and operation=any(m.enabled_operations)) returning * into op;
  if not found then return null;end if;return op;
end $$;
create or replace function public.yc_finish_operation(p_id uuid,p_lease uuid,p_state text,p_provider_id text,p_code text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if p_state not in ('submitted','outcome_unknown','rejected','review_required') then raise exception 'Invalid submit outcome';end if;
  update public.yc_operations set state=p_state,provider_id=p_provider_id,provider_code=p_code,updated_at=now(),reservation_released=(p_state='rejected')
    where id=p_id and lease_token=p_lease and state='submitting';
  return found;
end $$;
create or replace function public.yc_claim_events(p_environment text,p_limit integer default 25)
returns setof public.yc_webhook_inbox language plpgsql security definer set search_path='' as $$
begin
  return query with candidates as (
    select id from public.yc_webhook_inbox where environment=p_environment and (state='pending' or (state='processing' and lease_until<now())) and attempts<8
    order by received_at for update skip locked limit least(greatest(p_limit,1),100)
  ) update public.yc_webhook_inbox w set state='processing',attempts=w.attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes'
  from candidates c where w.id=c.id returning w.*;
end $$;
create or replace function public.yc_finish_event(p_id uuid,p_lease uuid,p_state text,p_code text default null)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if p_state not in ('pending','processed','quarantined') then raise exception 'Invalid event result';end if;
  update public.yc_webhook_inbox set state=case when p_state='pending' and attempts>=8 then 'quarantined' else p_state end,finished_at=case when p_state='pending' then null else now() end,last_error_code=p_code,lease_until=null
  where id=p_id and lease_token=p_lease and state='processing';return found;
end $$;
create or replace function public.yc_record_observation(p_environment text,p_merchant uuid,p_observation jsonb,p_sealed jsonb,p_hash text,p_observed_at timestamptz)
returns uuid language plpgsql security definer set search_path='' as $$
declare obs public.yc_transaction_observations; prior public.yc_transaction_observations; key text;
begin
  -- Serialize financial observations per merchant/transaction before generating an outbox entry.
  perform pg_advisory_xact_lock(hashtextextended(p_environment||p_merchant::text||(p_observation->>'provider_transaction_id'),0));
  select * into prior from public.yc_transaction_observations where environment=p_environment and merchant_id=p_merchant and family=p_observation->>'family' and provider_transaction_id=p_observation->>'provider_transaction_id' order by observed_at desc limit 1;
  if prior.status='refunded' and p_observation->>'status'<>'refunded' then return null;end if;
  if prior.status='completed' and p_observation->>'status' not in ('completed','refund_pending','refunded','review_required') then return null;end if;
  insert into public.yc_transaction_observations(environment,merchant_id,family,provider_transaction_id,sequence_id,status,amount,currency,settled_amount,settled_currency,provider_fee,provider_fee_currency,network_fee,network_fee_currency,rate,transaction_hash,observed_at,evidence_hash,sealed_evidence)
  values(p_environment,p_merchant,p_observation->>'family',p_observation->>'provider_transaction_id',p_observation->>'sequence_id',p_observation->>'status',(p_observation->>'amount')::numeric,p_observation->>'currency',(p_observation->>'settled_amount')::numeric,p_observation->>'settled_currency',(p_observation->>'provider_fee')::numeric,p_observation->>'provider_fee_currency',(p_observation->>'network_fee')::numeric,p_observation->>'network_fee_currency',(p_observation->>'rate')::numeric,p_observation->>'transaction_hash',p_observed_at,p_hash,p_sealed)
  on conflict(environment,merchant_id,family,provider_transaction_id,evidence_hash) do nothing returning * into obs;
  if not found then return null; end if;
  if obs.status in ('completed','refunded') then
    key:=p_environment||':'||p_merchant::text||':'||obs.family||':'||obs.provider_transaction_id||':'||obs.status;
    insert into public.yc_ledger_outbox(observation_id,posting_key,state) values(obs.id,key,case when obs.amount is null or obs.currency is null then 'review_required' else 'pending' end) on conflict(posting_key) do nothing;
    if prior.status=obs.status and (prior.amount,prior.currency,prior.settled_amount,prior.settled_currency,prior.provider_fee,prior.network_fee) is distinct from (obs.amount,obs.currency,obs.settled_amount,obs.settled_currency,obs.provider_fee,obs.network_fee) then
      update public.yc_ledger_outbox set state='review_required' where posting_key=key;
    end if;
  end if;
  return obs.id;
end $$;
create or replace function public.yc_balance_monotonic() returns trigger language plpgsql set search_path='' as $$
begin
  if new.available::text in ('NaN','Infinity','-Infinity') or new.held::text in ('NaN','Infinity','-Infinity') then raise exception 'Invalid monetary value';end if;
  if tg_op='UPDATE' and new.observed_at<old.observed_at then raise exception 'Stale balance observation';end if;
  return new;
end $$;
create trigger yc_balance_version before insert or update on public.yc_balances for each row execute function public.yc_balance_monotonic();
create or replace function public.yc_claim_poll(p_environment text,p_resource text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.yc_reconciliation_cursors;
begin
  -- No default cursor: initial inventory explicitly seeds the earliest required date.
  update public.yc_reconciliation_cursors set lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes',updated_at=now()
  where environment=p_environment and stream='custody' and resource_key=p_resource and (lease_until is null or lease_until<now()) and window_from is not null and window_to is not null returning * into r;
  if not found then return null;end if;
  return jsonb_build_object('token',r.lease_token,'cursor',r.cursor,'from',r.window_from,'to',r.window_to);
end $$;
create or replace function public.yc_checkpoint_poll(p_environment text,p_resource text,p_token uuid,p_cursor text,p_complete boolean)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  update public.yc_reconciliation_cursors set cursor=p_cursor,covered_until=case when p_complete then window_to else covered_until end,
    window_from=case when p_complete then window_to-interval '7 days' else window_from end,
    window_to=case when p_complete then now() else window_to end,
    lease_until=case when p_complete then null else lease_until end,updated_at=now()
  where environment=p_environment and stream='custody' and resource_key=p_resource and lease_token=p_token and lease_until>now();return found;
end $$;
create or replace function public.yc_settle_operation(p_environment text,p_merchant uuid,p_provider_id text,p_resource uuid,p_status text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_status not in ('completed','failed','denied','expired','refunded') then raise exception 'Not a final financial observation';end if;
 update public.yc_operations op set state=case when p_status in ('completed','refunded') then 'completed' else 'rejected' end,reservation_released=true,updated_at=now()
 where op.environment=p_environment and op.merchant_id=p_merchant and op.provider_id=p_provider_id and op.source_resource_id=p_resource and not op.reservation_released
 and exists(select 1 from public.yc_transaction_observations ob join public.yc_balances b on b.resource_id=p_resource and b.asset=op.asset
   where ob.environment=p_environment and ob.merchant_id=p_merchant and ob.provider_transaction_id=p_provider_id and ob.status=p_status and b.observed_at>=ob.observed_at and b.observed_at>now()-interval '30 seconds');
 return found;
end $$;
-- Authenticated clients have no raw-table access, including partner users. All DTOs are filtered server-side.
do $$ declare t text; f record; begin
  foreach t in array array['yc_runtime_settings','yc_vault_identities','yc_merchants','yc_memberships','yc_resources','yc_balances','yc_operations','yc_webhook_inbox','yc_transaction_observations','yc_ledger_outbox','yc_reconciliation_cursors','yc_compliance_cases','yc_audit_events'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant select, insert, update on public.%I to service_role',t);
  end loop;
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'yc\_%' escape '\' loop
    execute format('revoke all on function %s from public, anon, authenticated',f.sig);
    execute format('grant execute on function %s to service_role',f.sig);
  end loop;
end $$;
grant usage,select on sequence public.yc_audit_events_id_seq to service_role;
commit;
