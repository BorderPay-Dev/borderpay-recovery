do $$begin
 if (select count(*) from maintenance_billing_exemptions)<>2 then raise exception 'Both team accounts must be exempt';end if;
 if exists(select 1 from maintenance_billing_exemptions where maintenance_account_is_billable(user_id)) then raise exception 'Exempt account remains billable';end if;
 if exists(select 1 from subscriptions where user_id in(select user_id from maintenance_billing_exemptions) and (status<>'cancelled' or payment_status<>'active')) then raise exception 'Team subscription remains active';end if;
 if exists(select 1 from subscription_external_invoices where user_id in(select user_id from maintenance_billing_exemptions) and status not in ('paid','cancelled')) then raise exception 'Unpaid team invoice remains payable';end if;
 if not exists(select 1 from subscription_external_invoices where user_id='00000000-0000-4000-8000-000000000022' and status='paid' and amount=5) then raise exception 'Paid history changed';end if;
 if has_table_privilege('authenticated','maintenance_billing_exemptions','INSERT') then raise exception 'Customer can self exempt';end if;
end$$;
update subscriptions set status='active',payment_status='failed' where user_id in(select user_id from maintenance_billing_exemptions);
insert into subscription_email_jobs(user_id,template,status) values('00000000-0000-4000-8000-000000000021','business.subscription_external_invoice','pending');
update user_profiles set email='renamed-synthetic@example.test' where id='00000000-0000-4000-8000-000000000021';
do $$begin
 if exists(select 1 from subscriptions where user_id in(select user_id from maintenance_billing_exemptions) and status='active') then raise exception 'Legacy sync reactivated team subscription';end if;
 if exists(select 1 from subscription_email_jobs where user_id in(select user_id from maintenance_billing_exemptions) and status='pending') then raise exception 'Team receives reminder';end if;
 if maintenance_account_is_billable('00000000-0000-4000-8000-000000000021') then raise exception 'Email rename removed exemption';end if;
 if not maintenance_account_is_billable('00000000-0000-4000-8000-000000000010') then raise exception 'Real merchant excluded';end if;
end$$;
select 'PASS: team exclusions, legacy sync, reminder suppression, paid history and customer isolation';
