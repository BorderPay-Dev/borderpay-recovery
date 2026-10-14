do $$
declare uid uuid; result jsonb; invoice uuid; before_count integer;
begin
 select count(*) into before_count from subscription_external_invoices;
 for uid in select id from user_profiles order by id loop
   result:=queue_verified_business_maintenance(uid,subscription_current_month_end(current_date));
   invoice:=('30000000-0000-4000-8000-'||right(uid::text,12))::uuid;
   if right(uid::text,1)='1' then
     if result->>'status'<>'restored' then raise exception 'Eligible service-restored merchant did not resume';end if;
     if (select status from subscriptions where user_id=uid)<>'active' then raise exception 'Subscription not resumed';end if;
     if (select status from subscription_external_invoices where id=invoice)<>'pending_configuration' then raise exception 'Invoice not queued';end if;
     result:=queue_verified_business_maintenance(uid,subscription_current_month_end(current_date));
     if result->>'status'<>'existing' then raise exception 'Retry was not idempotent';end if;
   elsif right(uid::text,1)='2' then
     if result->>'reason'<>'ineligible' then raise exception 'Eligibility was bypassed';end if;
     if (select status from subscriptions where user_id=uid)<>'cancelled' then raise exception 'Ineligible subscription resumed';end if;
   elsif right(uid::text,1)='3' then
     if (select status from subscription_external_invoices where id=invoice)<>'cancelled' then raise exception 'Operator cancellation ignored';end if;
   elsif right(uid::text,1)='4' then
     if (select status from subscription_external_invoices where id=invoice)<>'paid' then raise exception 'Paid invoice altered';end if;
   else
     if result->>'reason'<>'subscription_inactive' then raise exception 'Explicit subscription cancellation ignored';end if;
   end if;
 end loop;
 if (select count(*) from subscription_external_invoices)<>before_count then raise exception 'Duplicate invoice created';end if;
end $$;
