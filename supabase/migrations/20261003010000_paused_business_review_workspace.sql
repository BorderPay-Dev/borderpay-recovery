-- Explicitly invited paused businesses: balance visibility only, no profile writes.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
create or replace function public.paused_business_review_access(p_user uuid)
returns boolean language plpgsql stable security definer set search_path=pg_catalog,kyb as $$
begin
 if coalesce(current_setting('request.jwt.claims',true),'')='' then return false;end if;
 if coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role' is distinct from 'service_role' then return false;end if;
 return exists(select 1 from kyb.reverification_authorizations r where r.user_id=p_user
   and r.eligibility='provider_paused' and r.revoked_at is null)
   and kyb.reverification_candidate(p_user);
end $$;
revoke all on function public.paused_business_review_access(uuid) from public,anon,authenticated;
grant execute on function public.paused_business_review_access(uuid) to service_role;

create or replace function public.paused_account_wallet_summary()
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public,kyb as $$
declare u uuid:=auth.uid();v_wallets jsonb;v_currencies jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if not exists(select 1 from public.user_profiles where id=u) then raise exception 'PROFILE_UNAVAILABLE';end if;
 if not exists(select 1 from kyb.reverification_authorizations r where r.user_id=u and r.eligibility='provider_paused' and r.revoked_at is null)
   or not kyb.reverification_candidate(u) then return jsonb_build_object('mode','locked');end if;
 if not public.can_read_bridge_financial_data(u) then raise exception 'FINANCIAL_AUTH_REQUIRED';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'currency',upper(w.currency::text),
   'balance',w.balance::text,'updated_at',w.updated_at) order by w.currency::text,w.id),'[]'::jsonb)
 into v_wallets from public.wallets w where w.user_id=u and (
 upper(w.currency::text)='USDC' or (upper(w.currency::text)='USDT' and public.can_read_borderpay_usdt(u))
 or (upper(w.currency::text)='EURC' and public.can_read_borderpay_eurc(u)));
 select coalesce(jsonb_agg(currency order by currency),'[]'::jsonb) into v_currencies
 from(select distinct upper(currency) currency from public.bridge_virtual_accounts
 where (user_id=u or business_user_id=u) and upper(currency) in ('USD','EUR','GBP')) a;
 -- No account numbers, payment instructions, addresses, or transfer capability.
 return jsonb_build_object('mode','receiving_paused','review_status','under_review',
 'financial_actions_enabled',false,'receiving_status','deactivated','wallets',v_wallets,'receiving_currencies',v_currencies);
end $$;
revoke all on function public.paused_account_wallet_summary() from public,anon;
grant execute on function public.paused_account_wallet_summary() to authenticated;
commit;
