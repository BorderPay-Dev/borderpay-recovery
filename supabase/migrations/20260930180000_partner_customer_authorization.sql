begin;
create table if not exists public.api_customer_redirects (
 tenant_id uuid not null references public.api_tenants(id),
 redirect_uri text not null check (redirect_uri ~ '^https://[^/?#@]+(/[^#]*)?$'),
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 primary key(tenant_id,redirect_uri)
);
create table if not exists public.api_customer_authorizations (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.api_tenants(id),
 api_key_id uuid not null references public.api_keys(id),
 external_user_id text not null,
 redirect_uri text not null,
 state text not null,
 challenge text not null,
 scopes text[] not null,
 request_hash text unique not null,
 expires_at timestamptz not null,
 end_user_id uuid references public.api_tenant_end_users(id),
 code_hash text unique,
 code_expires_at timestamptz,
 consented_at timestamptz,
 denied_at timestamptz,
 consumed_at timestamptz,
 session_cipher bytea,
 session_expires_at timestamptz,
 created_at timestamptz not null default now(),
 foreign key(tenant_id,redirect_uri) references public.api_customer_redirects(tenant_id,redirect_uri),
 check(cardinality(scopes)>0 and not ('*'=any(scopes)))
);
create table if not exists public.api_customer_grants (
 id uuid primary key default gen_random_uuid(),
 authorization_id uuid unique not null references public.api_customer_authorizations(id),
 token_hash text unique not null,
 expires_at timestamptz not null,
 revoked_at timestamptz,
 created_at timestamptz not null default now()
);
create table if not exists public.api_customer_authorization_audit (
 id bigint generated always as identity primary key,
 authorization_id uuid not null references public.api_customer_authorizations(id),
 event text not null check(event in ('created','consented','denied','exchanged','revoked')),
 created_at timestamptz not null default now()
);
alter table public.api_customer_redirects enable row level security;
alter table public.api_customer_authorizations enable row level security;
alter table public.api_customer_grants enable row level security;
alter table public.api_customer_authorization_audit enable row level security;
revoke all on public.api_customer_redirects,public.api_customer_authorizations,public.api_customer_grants,public.api_customer_authorization_audit from public,anon,authenticated,service_role;
grant select,insert,update on public.api_customer_redirects,public.api_customer_authorizations,public.api_customer_grants to service_role;
grant select,insert on public.api_customer_authorization_audit to service_role;
grant usage,select on sequence public.api_customer_authorization_audit_id_seq to service_role;

-- A dedicated secret is provisioned through Vault before enabling callbacks.
create or replace function public.api_customer_auth_key() returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare k text;
begin
 select decrypted_secret into k from vault.decrypted_secrets where name='API_CUSTOMER_AUTH_ENCRYPTION_KEY' limit 1;
 if k is null or length(k)<32 then raise exception 'customer authorization encryption unavailable'; end if;
 return k;
end $$;

create or replace function public.api_customer_auth_allowed(p_tenant uuid,p_key uuid,p_redirect text,p_scopes text[])
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.api_tenants t
 join public.api_keys k on k.tenant_id=t.id
 join public.api_partner_approvals a on a.tenant_id=t.id
 join public.api_customer_redirects r on r.tenant_id=t.id
 where t.id=p_tenant and t.is_active and t.default_mode='production'
 and k.id=p_key and k.is_active and k.revoked_at is null
 and ('*'=any(k.scopes) or p_scopes <@ k.scopes)
 and ('*'=any(k.scopes) or 'onboarding:write'=any(k.scopes))
 and a.status='approved' and 'api'=any(a.approved_products)
 and r.is_active and r.redirect_uri=p_redirect);
$$;

create or replace function public.api_customer_auth_consent(p_request_hash text,p_user_id uuid,p_allow boolean,p_code_hash text,p_session text,p_session_expires timestamptz)
returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare a public.api_customer_authorizations%rowtype; u public.api_tenant_end_users%rowtype;
begin
 select * into a from public.api_customer_authorizations where request_hash=p_request_hash for update;
 if not found or a.expires_at<=now() or a.consented_at is not null or a.denied_at is not null
 or not public.api_customer_auth_allowed(a.tenant_id,a.api_key_id,a.redirect_uri,a.scopes) then
 raise exception 'invalid_authorization' using errcode='22023'; end if;
 select * into u from public.api_tenant_end_users where tenant_id=a.tenant_id and user_id=p_user_id and external_user_id=a.external_user_id and account_type::text='business';
 if not found then raise exception 'customer_mismatch' using errcode='42501'; end if;
 if p_allow then
  if length(p_session)<32 or p_session_expires<=now()+interval '30 seconds' or length(p_code_hash)<>64 then raise exception 'invalid_session'; end if;
  update public.api_customer_authorizations set end_user_id=u.id,consented_at=now(),code_hash=p_code_hash,
  code_expires_at=least(now()+interval '2 minutes',expires_at,p_session_expires),
  session_cipher=pgp_sym_encrypt(p_session,public.api_customer_auth_key(),'cipher-algo=aes256'),session_expires_at=p_session_expires where id=a.id;
 else
  update public.api_customer_authorizations set end_user_id=u.id,denied_at=now() where id=a.id;
 end if;
 insert into public.api_customer_authorization_audit(authorization_id,event) values(a.id,case when p_allow then 'consented' else 'denied' end);
 return jsonb_build_object('redirect_uri',a.redirect_uri,'state',a.state);
end $$;

create or replace function public.api_customer_auth_exchange(p_tenant uuid,p_key uuid,p_code_hash text,p_redirect text,p_challenge text,p_token_hash text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.api_customer_authorizations%rowtype; g public.api_customer_grants%rowtype; u public.api_tenant_end_users%rowtype;
begin
 select * into a from public.api_customer_authorizations where code_hash=p_code_hash and tenant_id=p_tenant and api_key_id=p_key for update;
 if not found or a.consumed_at is not null or a.denied_at is not null or a.consented_at is null or a.code_expires_at<=now()
 or a.session_expires_at<=now()+interval '30 seconds' or a.redirect_uri<>p_redirect or a.challenge<>p_challenge
 or not public.api_customer_auth_allowed(a.tenant_id,a.api_key_id,a.redirect_uri,a.scopes) then
 raise exception 'invalid_grant' using errcode='22023'; end if;
 select * into u from public.api_tenant_end_users where id=a.end_user_id and tenant_id=a.tenant_id and external_user_id=a.external_user_id and account_type::text='business';
 if not found then raise exception 'invalid_grant' using errcode='22023'; end if;
 insert into public.api_customer_grants(authorization_id,token_hash,expires_at) values(a.id,p_token_hash,least(now()+interval '15 minutes',a.session_expires_at)) returning * into g;
 update public.api_customer_authorizations set consumed_at=now() where id=a.id;
 insert into public.api_customer_authorization_audit(authorization_id,event) values(a.id,'exchanged');
 return jsonb_build_object('grant_id',g.id,'expires_at',g.expires_at,'scopes',a.scopes,'external_user_id',a.external_user_id);
end $$;

create or replace function public.api_customer_auth_resolve(p_tenant uuid,p_key uuid,p_token_hash text,p_scope text)
returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare a public.api_customer_authorizations%rowtype; g public.api_customer_grants%rowtype; u public.api_tenant_end_users%rowtype;
begin
 select * into g from public.api_customer_grants where token_hash=p_token_hash and revoked_at is null and expires_at>now();
 if not found then return null; end if;
 select * into a from public.api_customer_authorizations where id=g.authorization_id and tenant_id=p_tenant and api_key_id=p_key;
 if not found or a.session_expires_at<=now() or not p_scope=any(a.scopes)
 or not public.api_customer_auth_allowed(a.tenant_id,a.api_key_id,a.redirect_uri,a.scopes) then return null; end if;
 select * into u from public.api_tenant_end_users where id=a.end_user_id and tenant_id=a.tenant_id and external_user_id=a.external_user_id and account_type::text='business';
 if not found then return null; end if;
 return jsonb_build_object('user_id',u.user_id,'end_user_id',u.id,'session',pgp_sym_decrypt(a.session_cipher,public.api_customer_auth_key()));
end $$;

create or replace function public.api_customer_auth_revoke(p_tenant uuid,p_key uuid,p_token_hash text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare a_id uuid;
begin
 update public.api_customer_grants g set revoked_at=coalesce(revoked_at,now()) from public.api_customer_authorizations a
 where g.authorization_id=a.id and a.tenant_id=p_tenant and a.api_key_id=p_key and g.token_hash=p_token_hash and g.revoked_at is null returning a.id into a_id;
 if a_id is not null then
 update public.api_customer_authorizations set session_cipher=null where id=a_id;
 insert into public.api_customer_authorization_audit(authorization_id,event) values(a_id,'revoked');
 end if;
end $$;

-- Durable correlation: queue on either mapping or identity creation; reconcile asynchronously.
create table if not exists public.api_customer_link_outbox (
 end_user_id uuid primary key references public.api_tenant_end_users(id),
 event_id uuid, customer_id text, completed_at timestamptz,
 last_error_code text, attempts integer not null default 0, next_attempt_at timestamptz not null default now(), created_at timestamptz not null default now()
);
alter table public.api_customer_link_outbox enable row level security;
revoke all on public.api_customer_link_outbox from public,anon,authenticated,service_role;
grant select,insert,update on public.api_customer_link_outbox to service_role;
create or replace function public.api_customer_link_mark() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if tg_table_name='api_tenant_end_users' then
  if new.account_type::text='business' then insert into public.api_customer_link_outbox(end_user_id) values(new.id) on conflict do nothing; end if;
 else
  insert into public.api_customer_link_outbox(end_user_id)
  select id from public.api_tenant_end_users where user_id=new.user_id and account_type::text='business' on conflict do nothing;
  update public.api_customer_link_outbox o set next_attempt_at=now() from public.api_tenant_end_users u
  where o.end_user_id=u.id and u.user_id=new.user_id and o.completed_at is null;
 end if;
 return new;
end $$;
create trigger api_customer_link_membership after insert on public.api_tenant_end_users for each row execute function public.api_customer_link_mark();
create trigger api_customer_link_identity after insert or update of bridge_customer_id on public.business_profiles for each row execute function public.api_customer_link_mark();

create or replace function public.api_customer_link_drain() returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare q record; cid text; ev uuid; done integer:=0;
begin
 for q in select o.end_user_id,u.tenant_id,u.user_id,u.external_user_id from public.api_customer_link_outbox o
 join public.api_tenant_end_users u on u.id=o.end_user_id
 join public.api_tenants t on t.id=u.tenant_id and t.is_active and t.default_mode='production'
 join public.api_partner_approvals a on a.tenant_id=t.id and a.status='approved' and 'api'=any(a.approved_products)
 where o.completed_at is null and o.next_attempt_at<=now() order by o.created_at limit 100 for update of o skip locked loop
  begin
   select b.bridge_customer_id::text into cid from public.business_profiles b join public.user_profiles p on p.id=b.user_id
   where b.user_id=q.user_id and b.bridge_customer_id is not null
    and (p.bridge_customer_id is null or p.bridge_customer_id::text=b.bridge_customer_id::text)
    and not exists(select 1 from public.business_profiles other where other.bridge_customer_id=b.bridge_customer_id and other.user_id<>b.user_id)
    and not exists(select 1 from public.user_profiles other where other.bridge_customer_id=b.bridge_customer_id and other.id<>b.user_id);
   if cid is not null then
    ev:=public.api_webhook_enqueue_event(q.tenant_id,q.end_user_id,null,'customer.linked','customer-linked:'||q.end_user_id,
     jsonb_build_object('customer_id',cid,'external_user_id',q.external_user_id,'account_type','business','status','linked'));
    update public.api_customer_link_outbox set customer_id=cid,event_id=ev,completed_at=now(),last_error_code=null,attempts=attempts+1 where end_user_id=q.end_user_id;
    done:=done+1;
   else
    update public.api_customer_link_outbox set attempts=attempts+1,next_attempt_at=now()+interval '5 minutes' where end_user_id=q.end_user_id;
   end if;
  exception when others then
   update public.api_customer_link_outbox set last_error_code=sqlstate,attempts=attempts+1,next_attempt_at=now()+interval '5 minutes' where end_user_id=q.end_user_id;
  end;
 end loop;
 return done;
end $$;

create or replace function public.api_customer_auth_cleanup() returns void language sql security definer set search_path=public,pg_temp as $$
 update public.api_customer_authorizations set session_cipher=null where session_cipher is not null and
 (session_expires_at<=now() or (consumed_at is null and code_expires_at<=now()) or
 exists(select 1 from public.api_customer_grants g where g.authorization_id=api_customer_authorizations.id and (g.expires_at<=now() or g.revoked_at is not null)));
$$;
-- Explicit service-only privileges for every entry point, including SECURITY DEFINER helpers.
revoke all on function public.api_customer_auth_key(),public.api_customer_auth_allowed(uuid,uuid,text,text[]),public.api_customer_auth_consent(text,uuid,boolean,text,text,timestamptz),public.api_customer_auth_exchange(uuid,uuid,text,text,text,text),public.api_customer_auth_resolve(uuid,uuid,text,text),public.api_customer_auth_revoke(uuid,uuid,text),public.api_customer_link_mark(),public.api_customer_link_drain(),public.api_customer_auth_cleanup() from public,anon,authenticated;
grant execute on function public.api_customer_auth_key(),public.api_customer_auth_allowed(uuid,uuid,text,text[]),public.api_customer_auth_consent(text,uuid,boolean,text,text,timestamptz),public.api_customer_auth_exchange(uuid,uuid,text,text,text,text),public.api_customer_auth_resolve(uuid,uuid,text,text),public.api_customer_auth_revoke(uuid,uuid,text),public.api_customer_link_drain(),public.api_customer_auth_cleanup() to service_role;
-- Backfill membership rows only; no balances, payment status or provider calls are modified.
insert into public.api_customer_link_outbox(end_user_id)
select id from public.api_tenant_end_users where account_type::text='business' on conflict do nothing;
select cron.schedule('api-customer-link-outbox','* * * * *','select public.api_customer_link_drain()');
select cron.schedule('api-customer-auth-cleanup','*/5 * * * *','select public.api_customer_auth_cleanup()');
commit;
