alter table subscriptions add column restricted_at timestamptz,add column grace_started_at timestamptz;
create table subscription_email_jobs(id uuid primary key default gen_random_uuid(),user_id uuid,template text,status text,sent_at timestamptz,last_error text);
insert into auth.users(id) values('00000000-0000-4000-8000-000000000021'),('00000000-0000-4000-8000-000000000022');
insert into user_profiles(id,email,account_type,kyc_status) values
('00000000-0000-4000-8000-000000000021','founder@borderpayafrica.com','business','verified'),
('00000000-0000-4000-8000-000000000022','adhiamboadhiambo22@gmail.com','individual','verified');
insert into business_profiles values('00000000-0000-4000-8000-000000000021','approved','Synthetic Treasury');
insert into subscriptions(user_id,next_billing_date) values('00000000-0000-4000-8000-000000000022',current_date);
insert into subscription_external_invoices(subscription_id,user_id,billing_period,status,paid_at,amount,currency) select id,user_id,current_date,'paid',now(),5,'USD' from subscriptions where user_id='00000000-0000-4000-8000-000000000022';
insert into subscription_email_jobs(user_id,template,status) values('00000000-0000-4000-8000-000000000021','business.subscription_external_invoice','pending');
