
do $$ begin
 if not public.maintenance_account_is_billable_for_period('319804e4-ad61-4116-839e-d15e12019967','2026-09-30') then raise exception 'Active business-owner-linked EUR VA wrongly excluded';end if;
 if not public.maintenance_account_is_billable_for_period('aef293b2-c24a-4967-a573-2908c18cfdbe','2026-09-30') then raise exception 'DEVNOVA wrongly excluded';end if;
 if public.maintenance_account_is_billable_for_period('6ce730ff-dc82-4b34-955b-0f9466443af4','2026-09-30') then raise exception 'Missing custody incorrectly billed';end if;
 if public.maintenance_account_is_billable_for_period('25620aba-6284-4cec-bf6f-9b770c3ff333','2026-09-30') then raise exception 'Deactivated VA incorrectly billed';end if;
 if exists(select 1 from subscriptions where verified_at>='2026-10-01' and public.maintenance_account_is_billable_for_period(user_id,'2026-09-30')) then raise exception 'October approval billed for September';end if;
 if public.maintenance_account_is_billable('b000f84b-5488-4a8a-b934-f669978c7e20') then raise exception 'Team account eligible';end if;
end $$;
