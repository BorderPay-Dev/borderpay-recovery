-- Synthetic database only. Extends the existing minimal maintenance fixture.
alter table subscriptions add column restricted_at timestamptz;
alter table bridge_virtual_accounts add column bridge_virtual_account_id text;
update bridge_virtual_accounts set bridge_virtual_account_id=coalesce(business_user_id,user_id)::text;
alter table subscription_external_invoices add column status text default 'payment_link_created';
alter table subscription_external_invoices add column paid_at timestamptz;
alter table subscription_external_invoices add column metadata jsonb default '{}';
create table subscription_provider_access_actions(id uuid primary key,subscription_id uuid,user_id uuid,bridge_virtual_account_id text,action text);
insert into subscription_provider_access_actions select id,id,id,id::text,'deactivate' from user_profiles;
