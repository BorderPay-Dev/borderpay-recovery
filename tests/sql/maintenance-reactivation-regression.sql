do $$declare result jsonb; before_count int; after_count int;begin
 select count(*) into before_count from subscription_provider_access_actions;
 result:=reconcile_subscription_access_actions(true,100);
 if (result->>'would_queue_reactivate')::int<>2 then raise exception 'Expected exactly two safe recoveries: %',result;end if;
 select count(*) into after_count from subscription_provider_access_actions;
 if before_count<>after_count then raise exception 'Preview inserted actions';end if;
 perform reconcile_subscription_access_actions(false,100);
 if (select count(*) from subscription_provider_access_actions where action='reactivate')<>2 then raise exception 'Unsafe or missing reactivation';end if;
 if exists(select 1 from subscription_provider_access_actions where action='reactivate' and right(subscription_id::text,1) not in ('1','5')) then raise exception 'Unrelated closure or unpaid debt was reactivated';end if;
 perform reconcile_subscription_access_actions(false,100);
 if (select count(*) from subscription_provider_access_actions where action='reactivate')<>2 then raise exception 'Duplicate actions queued';end if;
end $$;
