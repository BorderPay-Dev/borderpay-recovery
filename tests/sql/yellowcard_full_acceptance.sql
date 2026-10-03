\set ON_ERROR_STOP on
begin;
insert into public.yc_merchants(merchant_id,environment,status,controls_satisfied,cutover_approved_at,approval_reference,enabled_operations)
select id,'production','active',true,now(),'SYNTHETIC-CI',array['createSend','createVault'] from auth.users;
insert into public.yc_resources(id,merchant_id,environment,resource_kind,provider_resource_id,status)
values('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','production','vault','synthetic-vault','active');
insert into public.yc_balances(resource_id,merchant_id,environment,asset,available,observed_at,provider_reference)
values('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','production','USDC_BASE',100,now(),'synthetic-vault');
do $$ declare op public.yc_operations; same public.yc_operations; claimed public.yc_operations; n integer; begin
  if has_table_privilege('authenticated','public.yc_balances','SELECT') then raise exception 'Customer raw balance access';end if;
  if has_function_privilege('authenticated','public.yc_runtime_configuration(text)','EXECUTE') then raise exception 'Secrets exposed';end if;
  if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'yc_%' and c.relkind='r' and not c.relrowsecurity)>0 then raise exception 'Missing RLS';end if;
  begin
    perform public.yc_reserve_operation('00000000-0000-0000-0000-000000000002','production','createSend','cross-owner',repeat('a',64),'10000000-0000-0000-0000-000000000001','USDC_BASE',10,'proof-cross',now()+interval '1 minute','{}');
    raise exception 'Cross-owner source was accepted';
  exception when others then if sqlerrm='Cross-owner source was accepted' then raise;end if;end;
  op:=public.yc_reserve_operation('00000000-0000-0000-0000-000000000001','production','createSend','sequence-one',repeat('a',64),'10000000-0000-0000-0000-000000000001','USDC_BASE',90,'proof-one',now()+interval '1 minute','{}');
  same:=public.yc_reserve_operation('00000000-0000-0000-0000-000000000001','production','createSend','sequence-one',repeat('a',64),'10000000-0000-0000-0000-000000000001','USDC_BASE',90,'proof-one',now()+interval '1 minute','{}');
  if op.id<>same.id then raise exception 'Idempotency failed';end if;
  begin
    perform public.yc_reserve_operation('00000000-0000-0000-0000-000000000001','production','createSend','sequence-two',repeat('b',64),'10000000-0000-0000-0000-000000000001','USDC_BASE',90,'proof-two',now()+interval '1 minute','{}');
    raise exception 'Double spending permitted';
  exception when others then if sqlerrm='Double spending permitted' then raise;end if;end;
  claimed:=public.yc_claim_operation(op.id,op.merchant_id,op.environment,op.request_hash);
  if claimed.lease_token is null then raise exception 'Claim failed';end if;
  same:=public.yc_claim_operation(op.id,op.merchant_id,op.environment,op.request_hash);
  if same.id is not null then raise exception 'Duplicate claim permitted';end if;
  if not public.yc_finish_operation(op.id,claimed.lease_token,'outcome_unknown',null,null) then raise exception 'Finish failed';end if;
  if (select reservation_released from public.yc_operations where id=op.id) then raise exception 'Unknown debit released';end if;
  begin update public.yc_resources set merchant_id='00000000-0000-0000-0000-000000000002' where id=op.source_resource_id;raise exception 'Ownership mutation permitted';exception when others then if sqlerrm='Ownership mutation permitted' then raise;end if;end;
  begin update public.yc_audit_events set action='changed';raise exception 'Audit mutation permitted';exception when others then if sqlerrm='Audit mutation permitted' then raise;end if;end;
  insert into public.yc_webhook_inbox(environment,fingerprint,event_type,sealed_payload)values('production','production:synthetic','CUSTODY.COMPLETE','{}');
  select count(*) into n from public.yc_claim_events('production',10);if n<>1 then raise exception 'Inbox claim failed';end if;
  select count(*) into n from public.yc_claim_events('production',10);if n<>0 then raise exception 'Inbox duplicate claim';end if;
  perform public.yc_record_observation('production',op.merchant_id,'{"family":"custody","provider_transaction_id":"t1","status":"completed","amount":"10","currency":"USDC"}','{}',repeat('c',64),now());
  perform public.yc_record_observation('production',op.merchant_id,'{"family":"custody","provider_transaction_id":"t1","status":"completed","amount":"10","currency":"USDC"}','{}',repeat('c',64),now());
  if (select count(*) from public.yc_ledger_outbox)<>1 then raise exception 'Duplicate ledger event';end if;
  perform public.yc_record_observation('production',op.merchant_id,'{"family":"custody","provider_transaction_id":"t1","status":"completed","amount":"11","currency":"USDC"}','{}',repeat('d',64),now());
  if (select state from public.yc_ledger_outbox limit 1)<>'review_required' then raise exception 'Changed settlement not flagged';end if;
  raise notice 'YC isolation, source reservations, idempotency, leases, audit and reconciliation checks passed';
end $$;
rollback;
