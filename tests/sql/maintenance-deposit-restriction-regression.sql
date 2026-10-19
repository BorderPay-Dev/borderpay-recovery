-- Synthetic database only; no production data or credentials.
begin;
do $$
declare target uuid := '10000000-0000-4000-8000-000000000016'; n integer; expected boolean;
begin
 for n in 1..18 loop
   expected := n=any(array[1,2,13,14,16,18]);
   if business_maintenance_invoice_eligible(('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid) is distinct from expected then
     raise exception 'Invoice eligibility mismatch for synthetic case %', n;
   end if;
 end loop;
 update subscriptions set verified_at=now()-interval '2 months',restricted_at=now() where id=target;
 update subscription_external_invoices set billing_period=current_date-30,metadata=jsonb_build_object('provider_payment_check','unpaid','provider_payment_checked_at',now()) where id=target;
 if not business_maintenance_action_allowed(target) then raise exception 'Overdue unpaid deposit-restricted account must allow deactivation'; end if;
 update subscription_external_invoices set metadata=jsonb_build_object('provider_payment_check','unpaid','provider_payment_checked_at',now()-interval '11 minutes') where id=target;
 if business_maintenance_action_allowed(target) then raise exception 'Stale payment checks must not authorize deactivation'; end if;
 update subscription_external_invoices set metadata=jsonb_build_object('provider_payment_check','unpaid','provider_payment_checked_at',now()),billing_period=current_date+10 where id=target;
 if business_maintenance_action_allowed(target) then raise exception 'Future invoices must not authorize restriction'; end if;
 update subscription_external_invoices set billing_period=current_date-30,status='paid',paid_at=now() where id=target;
 if business_maintenance_action_allowed(target) then raise exception 'Paid invoice must not authorize deactivation'; end if;
 update subscriptions set restricted_at=null where id=target;
 update bridge_virtual_accounts set status='deactivated',deactivation_reason='subscription_nonpayment' where bridge_virtual_account_id=target::text;
 update subscription_provider_access_actions set action='reactivate' where id=target;
 if business_maintenance_action_allowed(target) then raise exception 'Payment must never release a deposit restriction'; end if;
 update user_profiles set bridge_account_status='active' where id=target;
 if not business_maintenance_action_allowed(target) then raise exception 'Paid account can reactivate only after provider restriction is cleared'; end if;
 update user_profiles set bridge_account_status='paused' where id=target;
 if business_maintenance_action_allowed(target) then raise exception 'Paused account must never reactivate through billing'; end if;
end $$;
rollback;
