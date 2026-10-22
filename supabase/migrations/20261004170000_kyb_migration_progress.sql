-- Read-only presentation and migration routing. Never writes provider/account/product state.
begin;
create or replace function public.kyb_migration_context(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public,kyb as $$
declare a kyb.applications;status text;provider text;
begin
 if coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb->>'role' is distinct from 'service_role' then raise exception 'SERVICE_REQUIRED';end if;
 if p_user is null or not kyb.reverification_candidate(p_user) then return jsonb_build_object('eligible',false);end if;
 select app.* into a from kyb.applications app join kyb.members m on m.tenant_id=app.tenant_id
 where m.user_id=p_user and exists(select 1 from kyb.reverification_invites i where i.user_id=p_user and i.application_id=app.id)
 order by app.created_at desc limit 1;
 if a.id is null then return jsonb_build_object('eligible',false);end if;
 status:=case when a.internal_status in ('in_review','approved') then 'under_review'
  when a.internal_status='needs_information' then 'incomplete'
  when a.internal_status='rejected' then 'rejected'
  when a.internal_status='draft' then case when a.revision>1
   or exists(select 1 from kyb.documents d where d.application_id=a.id)
   or exists(select 1 from kyb.identity_cases c where c.application_id=a.id)
   then 'incomplete' else 'not_started' end
  else null end;
 if status is null then return jsonb_build_object('eligible',false);end if;
 select bridge_account_status into provider from public.user_profiles where id=p_user;
 return jsonb_build_object('eligible',true,'applicationId',a.id,'status',status,'providerStatus',provider,'financialActionsEnabled',false);
end $$;
revoke all on function public.kyb_migration_context(uuid) from public,anon,authenticated;
grant execute on function public.kyb_migration_context(uuid) to service_role;
CREATE OR REPLACE FUNCTION public.profile_setup_context(p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'kyb'
AS $function$
declare p jsonb;u jsonb;s jsonb;b jsonb;cfg jsonb;portal_enabled boolean:=false;portal_status text:=null;review_only boolean:=false;synthetic boolean:=false;
begin
 if coalesce(current_setting('request.jwt.claims',true),'')='' then raise exception 'SERVICE_REQUIRED';end if;
 if coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role' is distinct from 'service_role' then raise exception 'SERVICE_REQUIRED';end if;
 if p_user is null then raise exception 'USER_REQUIRED';end if;
 select to_jsonb(x) into p from public.user_profiles x where x.id=p_user;
 select jsonb_build_object('full_name',to_jsonb(x)->'full_name','phone',to_jsonb(x)->'phone','country',to_jsonb(x)->'country','account_type',to_jsonb(x)->'account_type','kyc_status',to_jsonb(x)->'kyc_status','wallet_activated',to_jsonb(x)->'wallet_activated','created_at',to_jsonb(x)->'created_at','updated_at',to_jsonb(x)->'updated_at') into u from public.users x where x.id=p_user;
 select jsonb_build_object('pin_set',x.pin_set,'two_factor_enabled',x.two_factor_enabled) into s from public.user_security x where x.user_id=p_user;
 if coalesce(p->>'account_type',u->>'account_type')='business' then
  select jsonb_build_object('bridge_kyb_status',x.bridge_kyb_status,'country',to_jsonb(x)->'country','company_name',x.company_name,'registration_number',to_jsonb(x)->>'registration_number') into b from public.business_profiles x where x.user_id=p_user;
  if p->>'account_status'='frozen' and p->>'bridge_account_status'='paused' then review_only:=public.paused_business_review_access(p_user);end if;
  if nullif(btrim(p->>'bridge_customer_id'),'') is null
    and coalesce(p->>'account_status','') not in ('frozen','paused','suspended','offboarded','deactivated','closed')
    and coalesce(p->>'bridge_account_status','') not in ('frozen','paused','suspended','offboarded','deactivated','closed') then
   select coalesce(x.raw_app_meta_data->>'kyb_synthetic_test','false')='true' into synthetic from auth.users x where x.id=p_user;
   begin
    select value::jsonb into cfg from public.app_config where key='kyb_portal_onboarding';
    portal_enabled:=coalesce(cfg->'enabled'='true'::jsonb and cfg->'new_business_only'='true'::jsonb,false);
   exception when invalid_text_representation then portal_enabled:=false;
   end;
   if coalesce(synthetic,false) or (portal_enabled and p->>'account_status'='pending_kyc'
      and coalesce(p->>'bridge_account_status','') not in ('active','approved','paused','frozen','offboarded','closed','suspended','deactivated')) then
    if exists(select 1 from kyb.applications a join kyb.members m on m.tenant_id=a.tenant_id where m.user_id=p_user and a.internal_status in ('in_review','approved')) then portal_status:='under_review';end if;
   end if;
  end if;
 end if;
 return jsonb_build_object('profile',p,'userData',u,'securityData',s,'business',b,'portalStatus',portal_status,'reviewOnly',coalesce(review_only,false),'migration',public.kyb_migration_context(p_user));
end $function$;

commit;
