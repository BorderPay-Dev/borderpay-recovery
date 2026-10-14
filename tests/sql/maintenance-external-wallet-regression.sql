do $$
declare n integer; u uuid; account_ok boolean; invoice_ok boolean;
begin
 for n in 1..18 loop
  u:=('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
  account_ok:=public.maintenance_account_is_billable(u);
  invoice_ok:=public.business_maintenance_invoice_eligible(u);
  if account_ok is distinct from (n=any(array[1,2,14,16,17,18])) then
   raise exception 'Account eligibility regression, synthetic scenario %',n;
  end if;
  if invoice_ok is distinct from (n=any(array[1,2,13,18])) then
   raise exception 'Invoice eligibility regression, synthetic scenario %',n;
  end if;
 end loop;
 if public.maintenance_account_is_billable('ffffffff-ffff-4fff-8fff-ffffffffffff') then raise exception 'Unknown customer accepted';end if;
 raise notice '18 external/custodial VA, exemption, ownership, identity, restriction and period scenarios passed';
end $$;
