do $$begin
if has_function_privilege('authenticated','public.paused_business_review_access(uuid)','execute') or has_function_privilege('anon','public.paused_account_wallet_summary()','execute') then raise exception 'unsafe_grants';end if;
end $$;
select set_config('request.jwt.claims','{"role":"service_role"}',false);
do $$begin
 if not public.paused_business_review_access('00000000-0000-4000-8000-000000000001') then raise exception 'authorized_business_missing';end if;
 if public.paused_business_review_access('00000000-0000-4000-8000-000000000002') then raise exception 'uninvited_business_allowed';end if;
end $$;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-4000-8000-000000000001"}',false);
set role authenticated;
do $$declare j jsonb;begin
 j:=public.paused_account_wallet_summary();
 if j->>'mode'<>'receiving_paused' or j->>'review_status'<>'under_review' or j->>'financial_actions_enabled'<>'false' then raise exception 'unsafe_mode';end if;
 if jsonb_array_length(j->'wallets')<>1 or j#>>'{wallets,0,balance}'<>'123.45' then raise exception 'wallet_isolation_or_currency_failed';end if;
 if j->'receiving_currencies'<>'["EUR"]'::jsonb or j::text like '%private-account%' or j::text like '%other-account%' then raise exception 'account_details_leaked';end if;
end $$;
reset role;
select set_config('test.sca','false',false);
do $$begin
 begin perform public.paused_account_wallet_summary();raise exception 'sca_not_enforced';exception when others then if sqlerrm<>'FINANCIAL_AUTH_REQUIRED' then raise;end if;end;
end $$;
select set_config('test.sca','true',false);
do $$declare reason text;begin
 foreach reason in array array['Fraud hold','Manual compliance restriction'] loop
 update public.user_profiles set account_frozen_reason=reason where id='00000000-0000-4000-8000-000000000001';
 if public.paused_account_wallet_summary()->>'mode'<>'locked' then raise exception 'fraud_or_internal_hold_bypassed';end if;
 end loop;
 update public.user_profiles set account_frozen_reason='Bridge account paused',account_type='individual' where id='00000000-0000-4000-8000-000000000001';
 if public.paused_account_wallet_summary()->>'mode'<>'locked' then raise exception 'individual_allowed';end if;
 update public.user_profiles set account_type='business' where id='00000000-0000-4000-8000-000000000001';
 update kyb.reverification_authorizations set revoked_at=now();
 if public.paused_account_wallet_summary()->>'mode'<>'locked' then raise exception 'revocation_ignored';end if;
 if exists(select 1 from public.user_profiles where account_status<>'frozen' or bridge_account_status<>'paused' or account_frozen_at is null) then raise exception 'financial_status_changed';end if;
end $$;
select 'Read-only balance, grants, tenant isolation, SCA, individual/fraud/revocation exclusions and preserved financial holds passed' result;
