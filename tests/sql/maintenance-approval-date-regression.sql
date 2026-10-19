-- Synthetic fixture only. Preserve all existing safety boundaries.
do $$
declare n integer; u uuid;
begin
 for n in 1..18 loop
  u:=('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
  if public.business_maintenance_invoice_eligible(u) is distinct from (n=any(array[1,2,13,14,18])) then
   raise exception 'Approval-date eligibility regression, synthetic scenario %',n;
  end if;
 end loop;
 -- Scenario 14: September approval + October VA belongs to September billing.
 -- October approval must not qualify for September, even with an earlier VA.
 update subscriptions set verified_at='2026-10-01Z' where id='10000000-0000-4000-8000-000000000014';
 update bridge_virtual_accounts set created_at='2026-09-01Z' where business_user_id='10000000-0000-4000-8000-000000000014';
 if public.business_maintenance_invoice_eligible('10000000-0000-4000-8000-000000000014') then
  raise exception 'October approval incorrectly billed for September';
 end if;
 raise notice 'Approval date, October exclusion, ownership, team, partner, provider hold and identity cases passed';
end $$;
