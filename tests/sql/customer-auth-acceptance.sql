\set ON_ERROR_STOP on
create function pg_temp.check_true(test boolean,label text) returns void language plpgsql as $$begin if test is not true then raise exception 'FAILED: %',label;end if;end $$;
insert into api_tenants values('10000000-0000-0000-0000-000000000001','Synthetic partner','production',true);
insert into api_keys values('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',array['onboarding:write','customers:read'],true,null);
insert into api_partner_approvals values('10000000-0000-0000-0000-000000000001','approved',array['api']);
insert into api_customer_redirects(tenant_id,redirect_uri) values('10000000-0000-0000-0000-000000000001','https://partner.example.com/callback');
insert into api_tenant_end_users values('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','external-1','business');
insert into user_profiles values('40000000-0000-0000-0000-000000000001',null);
insert into business_profiles values('40000000-0000-0000-0000-000000000001','synthetic-customer-1');
select api_customer_link_drain();select api_customer_link_drain();
select pg_temp.check_true((select count(*)=1 from api_webhook_events),'correlation emits once');
select pg_temp.check_true((select payload->>'customer_id'='synthetic-customer-1' and payload->>'external_user_id'='external-1' and event_type='customer.linked' from api_webhook_events),'correlation carries both identifiers');
select pg_temp.check_true(not has_function_privilege('anon','api_customer_auth_key()','execute'),'anon cannot read encryption key');
select pg_temp.check_true(not has_function_privilege('authenticated','api_customer_auth_resolve(uuid,uuid,text,text)','execute'),'authenticated cannot resolve another customer');
select pg_temp.check_true(not has_table_privilege('authenticated','api_customer_authorizations','select'),'customer secrets private');
select pg_temp.check_true((select relrowsecurity from pg_class where relname='api_customer_authorizations'),'RLS enabled');
insert into api_customer_authorizations(id,tenant_id,api_key_id,external_user_id,redirect_uri,state,challenge,scopes,request_hash,expires_at)
values('50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','external-1','https://partner.example.com/callback','csrf-synthetic-state','challenge',array['customers:read'],repeat('a',64),now()+interval '30 minutes');
do $$begin
 begin perform api_customer_auth_consent(repeat('a',64),'40000000-0000-0000-0000-000000000002',true,repeat('b',64),repeat('jwt',32),now()+interval '1 hour');raise exception 'wrong customer accepted';exception when insufficient_privilege then null;end;
end $$;
select api_customer_auth_consent(repeat('a',64),'40000000-0000-0000-0000-000000000001',true,repeat('b',64),repeat('jwt',32),now()+interval '1 hour');
select pg_temp.check_true((select position(convert_to(repeat('jwt',32),'UTF8') in session_cipher)=0 from api_customer_authorizations),'session encrypted at rest');
do $$begin
 begin perform api_customer_auth_exchange('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',repeat('b',64),'https://evil.example/callback','challenge',repeat('c',64));raise exception 'wrong redirect accepted';exception when invalid_parameter_value then null;end;
 begin perform api_customer_auth_exchange('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',repeat('b',64),'https://partner.example.com/callback','wrong',repeat('c',64));raise exception 'wrong PKCE accepted';exception when invalid_parameter_value then null;end;
end $$;
select api_customer_auth_exchange('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',repeat('b',64),'https://partner.example.com/callback','challenge',repeat('c',64));
do $$begin
 begin perform api_customer_auth_exchange('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',repeat('b',64),'https://partner.example.com/callback','challenge',repeat('d',64));raise exception 'code replay accepted';exception when invalid_parameter_value then null;end;
end $$;
select pg_temp.check_true(api_customer_auth_resolve('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',repeat('c',64),'customers:read')->>'session'=repeat('jwt',32),'valid scoped session resolves');
select pg_temp.check_true(api_customer_auth_resolve('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001',repeat('c',64),'customers:read') is null,'cross tenant denied');
select pg_temp.check_true(api_customer_auth_resolve('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002',repeat('c',64),'customers:read') is null,'cross key denied');
select pg_temp.check_true(api_customer_auth_resolve('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',repeat('c',64),'payouts:write') is null,'unconsented scope denied');
update api_keys set is_active=false;
select pg_temp.check_true(api_customer_auth_resolve('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',repeat('c',64),'customers:read') is null,'revoked API key denied');
update api_keys set is_active=true;update api_tenants set is_active=false;
select pg_temp.check_true(api_customer_auth_resolve('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',repeat('c',64),'customers:read') is null,'suspended tenant denied');
update api_tenants set is_active=true;
select api_customer_auth_revoke('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',repeat('c',64));
select pg_temp.check_true(api_customer_auth_resolve('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',repeat('c',64),'customers:read') is null,'revoked consent denied');
select pg_temp.check_true((select session_cipher is null from api_customer_authorizations),'revocation removes encrypted session');
select 'customer authorization SQL acceptance passed';
