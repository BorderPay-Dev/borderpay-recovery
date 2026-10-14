do $$declare r jsonb; n int;begin
 r:=queue_maintenance_reactivation_emails();if r->>'queued'<>'1' then raise exception 'Expected one combined notice: %',r;end if;
 if (select jsonb_array_length(props->'reactivated_currencies') from subscription_email_jobs)<>2 then raise exception 'Failed GBP activation included';end if;
 if (select count(*) from subscription_provider_access_actions where reactivation_email_job_id is not null)<>2 then raise exception 'Wrong actions acknowledged';end if;
 r:=queue_maintenance_reactivation_emails();if r->>'queued'<>'0' then raise exception 'Duplicate notice queued';end if;
 update subscription_email_jobs set status='sent';
 update subscription_provider_access_actions set status='completed' where bridge_virtual_account_id='va-GBP';
 update user_profiles set bridge_account_status='paused';r:=queue_maintenance_reactivation_emails();if r->>'queued'<>'0' then raise exception 'Provider-paused customer notified';end if;
 update user_profiles set bridge_account_status='active';
 r:=queue_maintenance_reactivation_emails();if r->>'queued'<>'1' then raise exception 'Later completed VA not notified';end if;
 if (select props->'reactivated_currencies' from subscription_email_jobs where status='pending')<>'["GBP"]'::jsonb then raise exception 'Previously notified currencies duplicated';end if;
 if has_function_privilege('anon','public.queue_maintenance_reactivation_emails(uuid)','EXECUTE') or has_function_privilege('authenticated','public.queue_maintenance_reactivation_emails(uuid)','EXECUTE') then raise exception 'Unprivileged caller can queue email';end if;
end $$;
