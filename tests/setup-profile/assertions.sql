do $$begin
 if has_function_privilege('authenticated','public.profile_setup_context(uuid)','execute') or has_function_privilege('anon','public.profile_setup_context(uuid)','execute') then raise exception 'client_privilege_leak';end if;
 begin perform public.profile_setup_context('00000000-0000-4000-8000-000000000003');raise exception 'role_check_missing';exception when others then if sqlerrm<>'SERVICE_REQUIRED' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"role":"service_role"}',false);
do $$declare j jsonb;begin
 j:=public.profile_setup_context('00000000-0000-4000-8000-000000000003');
 if j#>>'{profile,account_type}'<>'business' or j#>>'{profile,kyc_status}'<>'unverified' or j#>>'{business,bridge_kyb_status}'<>'not_started' then raise exception 'setup_state_incorrect';end if;
 if j->'securityData'<>'null'::jsonb or j->'portalStatus'<>'null'::jsonb or j->>'reviewOnly'<>'false' then raise exception 'new_business_marked_complete_or_frozen';end if;
 if j::text like '%other@example%' then raise exception 'cross_tenant_leak';end if;
 insert into public.user_security values('00000000-0000-4000-8000-000000000003',false,false,'synthetic-seed-never-return');
 j:=public.profile_setup_context('00000000-0000-4000-8000-000000000003');
 if j#>>'{securityData,pin_set}'<>'false' or j#>>'{securityData,two_factor_enabled}'<>'false' or j::text like '%synthetic-seed%' then raise exception 'security_status_or_secret_exposure';end if;
 insert into kyb.members values('20000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000003');
 insert into kyb.applications values('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003','draft');
 if public.profile_setup_context('00000000-0000-4000-8000-000000000003')->'portalStatus'<>'null'::jsonb then raise exception 'draft_treated_as_submitted';end if;
 update kyb.applications set internal_status='in_review' where id='10000000-0000-4000-8000-000000000003';
 if public.profile_setup_context('00000000-0000-4000-8000-000000000003')->>'portalStatus'<>'under_review' then raise exception 'submitted_status_missing';end if;
 update kyb.applications set internal_status='approved' where id='10000000-0000-4000-8000-000000000003';
 if public.profile_setup_context('00000000-0000-4000-8000-000000000003')->>'portalStatus'<>'under_review' then raise exception 'internal_approval_became_financial_approval';end if;
 update public.app_config set value='invalid json';
 j:=public.profile_setup_context('00000000-0000-4000-8000-000000000003');
 if j->'portalStatus'<>'null'::jsonb or j#>>'{business,bridge_kyb_status}'<>'not_started' then raise exception 'invalid_config_hides_profile';end if;
 update public.app_config set value='{"enabled":true,"new_business_only":true}';
 update public.user_profiles set bridge_customer_id='existing-provider',bridge_account_status='active',account_status='active' where id='00000000-0000-4000-8000-000000000003';
 update public.business_profiles set bridge_kyb_status='approved' where user_id='00000000-0000-4000-8000-000000000003';
 j:=public.profile_setup_context('00000000-0000-4000-8000-000000000003');
 if j->'portalStatus'<>'null'::jsonb or j#>>'{business,bridge_kyb_status}'<>'approved' then raise exception 'existing_provider_approval_changed';end if;
 -- Paused cohort still requires redemption and keeps the raw financial profile.
 update kyb.reverification_invites set consumed_at=now() where user_id='00000000-0000-4000-8000-000000000001';
 j:=public.profile_setup_context('00000000-0000-4000-8000-000000000001');
 if j->>'reviewOnly'<>'true' or j#>>'{profile,account_status}'<>'frozen' then raise exception 'paused_review_regression';end if;
end $$;
select 'Setup status, missing security records, isolation, secrets, drafts, submissions, existing provider status, paused cohort and invalid config passed' result;
