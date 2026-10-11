-- Run after the migration inside BEGIN/ROLLBACK only. No external payment calls.
DO $$
declare sid uuid; sep uuid; oct uuid; restricted timestamptz; payment text;
begin
 select i.subscription_id,i.id,n.id into sid,sep,oct from public.subscription_external_invoices i
 join public.subscription_external_invoices n on n.subscription_id=i.subscription_id and n.billing_period='2026-10-31'
 where i.billing_period='2026-09-30' and i.status='payment_link_created' and n.status='payment_link_created'
 and public.business_maintenance_invoice_eligible(i.id) limit 1;
 if sid is null then raise exception 'Missing two-invoice test fixture'; end if;
 update public.subscriptions set restricted_at=now(),grace_started_at='2026-10-31' where id=sid;
 perform public.refresh_business_maintenance_state(sid);
 if (select grace_started_at from public.subscriptions where id=sid) <> '2026-10-01'::timestamptz then raise exception 'Future invoice postponed older debt';end if;
 update public.subscription_external_invoices set status='paid',paid_at=now() where id=oct;
 select restricted_at,payment_status into restricted,payment from public.subscriptions where id=sid;
 if restricted is null or payment<>'pending' then raise exception 'Paying October cleared unpaid September';end if;
 update public.subscription_external_invoices set status='paid',paid_at=now() where id=sep;
 select restricted_at,payment_status into restricted,payment from public.subscriptions where id=sid;
 if restricted is not null or payment<>'active' then raise exception 'Settled invoices did not release maintenance restriction';end if;
end $$;
