create role anon;
create role authenticated;
create role service_role;
create schema auth;
create table auth.users(id uuid primary key,email text,deleted_at timestamptz);
create table public.account_origin_provenance("user_id" uuid,"account_type" text,"origin_kind" text,"onboarding_channel" text,"source_path" text,"account_created_at" timestamp with time zone,"recorded_at" timestamp with time zone,"tenant_id" uuid,"api_key_id" uuid,"authorization_id" uuid,"external_user_id" text,"source_reference" text);
create table public.api_tenant_end_users("id" uuid,"tenant_id" uuid,"user_id" uuid,"external_user_id" text,"account_type" text,"onboarding_channel" text,"created_at" timestamp with time zone);
create table public.api_tenants("id" uuid,"business_user_id" uuid,"tenant_name" text,"default_mode" text,"is_active" boolean,"rate_limit_per_minute" integer,"metadata" jsonb,"created_at" timestamp with time zone,"updated_at" timestamp with time zone,"beta_access_enabled" boolean,"max_single_transfer_usd" numeric);
create table public.billing_revenue_wallets("id" uuid,"whitelist_wallet_id" uuid,"asset" text,"network" text,"balance_minor" bigint,"status" text,"created_at" timestamp with time zone,"updated_at" timestamp with time zone);
create table public.billing_transactions("id" uuid,"subscription_id" uuid,"user_id" uuid,"billing_period" date,"type" text,"asset" text,"amount" numeric,"collected_amount" numeric,"status" text,"asset_breakdown" jsonb,"attempt_count" integer,"failure_code" text,"completed_at" timestamp with time zone,"created_at" timestamp with time zone);
create table public.bridge_balance_ledger("id" uuid,"event_id" text,"provider" text,"entity_type" text,"entity_id" text,"user_id" uuid,"business_user_id" uuid,"currency" text,"amount_minor" bigint,"direction" text,"balance_after_minor" bigint,"metadata" jsonb,"created_at" timestamp with time zone);
create table public.bridge_virtual_account_balances("id" uuid,"bridge_virtual_account_id" text,"user_id" uuid,"business_user_id" uuid,"currency" text,"available_balance_minor" bigint,"pending_balance_minor" bigint,"updated_at" timestamp with time zone);
create table public.bridge_virtual_accounts("id" uuid,"user_id" uuid,"business_user_id" uuid,"bridge_customer_id" text,"bridge_virtual_account_id" text,"currency" text,"rail" text,"account_details" jsonb,"status" text,"created_at" timestamp with time zone,"updated_at" timestamp with time zone,"developer_fee_percent" numeric,"activated_at" timestamp with time zone,"deactivated_at" timestamp with time zone,"deactivation_reason" text);
create table public.bridge_wallets("id" uuid,"user_id" uuid,"business_user_id" uuid,"bridge_customer_id" text,"bridge_wallet_id" text,"currency" text,"chain" text,"address" text,"status" text,"created_at" timestamp with time zone,"updated_at" timestamp with time zone);
create table public.business_profiles("id" uuid,"user_id" uuid,"company_name" text,"registration_number" text,"country" text,"company_email" text,"company_phone" text,"industry" text,"website" text,"address" text,"city" text,"state" text,"postal_code" text,"status" text,"metadata" jsonb,"created_at" timestamp with time zone,"updated_at" timestamp with time zone,"bridge_customer_id" text,"bridge_kyb_status" text,"bridge_kyb_link_id" text,"bridge_kyb_link_url" text,"bridge_kyb_completed_at" timestamp with time zone,"bridge_identity_metadata" jsonb,"bridge_identity_synced_at" timestamp with time zone);
create table public.ledger_entries("id" uuid,"from_wallet_id" uuid,"to_wallet_id" uuid,"user_id" uuid,"asset" text,"amount" numeric,"transaction_type" text,"reference_id" uuid,"canonical_ledger_id" uuid,"created_at" timestamp with time zone);
create table public.maintenance_wallet_whitelist("id" uuid,"currency" text,"chain" text,"address" text,"active" boolean,"created_at" timestamp with time zone,"updated_at" timestamp with time zone);
create table public.notifications("id" uuid,"user_id" uuid,"type" text,"title" text,"body" text,"read" boolean,"metadata" jsonb,"created_at" timestamp with time zone,"read_at" timestamp with time zone);
create table public.partner_organizations("id" uuid,"owner_user_id" uuid,"legal_name" text,"trading_name" text,"primary_email" text,"website" text,"country_of_incorporation" text,"registration_number" text,"tax_identifier" text,"status" text,"approved_tenant_id" uuid,"created_at" timestamp with time zone,"updated_at" timestamp with time zone,"kyb_source" text,"bridge_customer_id" text,"bridge_verified_at" timestamp with time zone,"bridge_verified_by" uuid,"partner_model" text,"commercial_status" text);
create table public.subscription_admin_logs("id" uuid,"user_id" uuid,"subscription_id" uuid,"billing_transaction_id" uuid,"action" text,"details" jsonb,"created_at" timestamp with time zone);
create table public.subscription_bridge_collection_legs("id" uuid,"collection_id" uuid,"source_bridge_wallet_id" text,"bridge_customer_id" text,"destination_address" text,"asset" text,"network" text,"amount_minor" bigint,"provider_transfer_id" text,"status" text,"provider_state" text,"last_error" text,"created_at" timestamp with time zone,"updated_at" timestamp with time zone,"completed_at" timestamp with time zone);
create table public.subscription_bridge_collections("id" uuid,"subscription_id" uuid,"user_id" uuid,"billing_period" date,"amount" numeric,"collected_amount" numeric,"status" text,"failure_code" text,"created_at" timestamp with time zone,"updated_at" timestamp with time zone,"completed_at" timestamp with time zone);
create table public.subscription_email_jobs("id" uuid,"user_id" uuid,"template" text,"recipient" text,"props" jsonb,"idempotency_key" text,"status" text,"attempt_count" integer,"next_attempt_at" timestamp with time zone,"last_error" text,"sent_at" timestamp with time zone,"created_at" timestamp with time zone);
create table public.subscription_external_invoices("id" uuid,"subscription_id" uuid,"user_id" uuid,"billing_period" date,"provider" text,"scope_country" text,"amount" numeric,"currency" text,"status" text,"provider_reference" text,"provider_transaction_id" text,"payment_link" text,"attempt_count" integer,"last_error" text,"expires_at" timestamp with time zone,"paid_at" timestamp with time zone,"metadata" jsonb,"created_at" timestamp with time zone,"updated_at" timestamp with time zone);
create table public.subscription_provider_access_actions("id" uuid,"subscription_id" uuid,"user_id" uuid,"bridge_virtual_account_id" text,"bridge_customer_id" text,"action" text,"reason" text,"status" text,"idempotency_key" text,"attempt_count" integer,"next_attempt_at" timestamp with time zone,"last_attempt_at" timestamp with time zone,"completed_at" timestamp with time zone,"last_error" text,"provider_response" jsonb,"created_at" timestamp with time zone,"updated_at" timestamp with time zone);
create table public.subscriptions("id" uuid,"user_id" uuid,"account_type" text,"monthly_fee" numeric,"currency" text,"status" text,"payment_status" text,"next_billing_date" date,"verified_at" timestamp with time zone,"last_billed_at" timestamp with time zone,"failure_count" integer,"grace_started_at" timestamp with time zone,"reminder_sent_at" timestamp with time zone,"restricted_at" timestamp with time zone,"metadata" jsonb,"created_at" timestamp with time zone,"updated_at" timestamp with time zone);
create table public.transactions("id" uuid,"user_id" uuid,"type" text,"amount" numeric,"currency" text,"fee" numeric,"status" text,"reference" text,"recipient_name" text,"recipient_account" text,"recipient_bank" text,"description" text,"metadata" jsonb,"created_at" timestamp with time zone,"updated_at" timestamp with time zone,"bridge_transfer_id" text,"provider" text);
create table public.user_profiles("id" uuid,"email" text,"full_name" text,"phone" text,"country" text,"account_type" text,"kyc_status" text,"kyc_level" integer,"address" text,"city" text,"state" text,"postal_code" text,"date_of_birth" date,"language" text,"profile_picture_url" text,"address_verification_status" text,"created_at" timestamp with time zone,"updated_at" timestamp with time zone,"kyc_verified_at" timestamp with time zone,"id_number" text,"gender" text,"account_status" text,"enrolled_at" timestamp with time zone,"tier0_email_sent_at" timestamp with time zone,"admin_kyc_approved_at" timestamp with time zone,"admin_kyc_reviewer" uuid,"admin_kyc_decision" text,"admin_kyc_notes" text,"bridge_environment" text,"is_admin" boolean,"payment_provider" text,"bridge_customer_id" text,"bridge_kyc_status" text,"bridge_kyc_link_id" text,"bridge_kyc_link_url" text,"bridge_kyc_completed_at" timestamp with time zone,"bridge_account_status" text,"verification_review_status" text,"verification_authorized_at" timestamp with time zone,"verification_authorized_by" uuid,"maintenance_overdue" boolean,"maintenance_last_charged_at" timestamp with time zone,"is_demo" boolean,"wallet_maintenance_overdue" boolean,"wallet_maintenance_last_charged_at" timestamp with time zone,"bridge_address_object" jsonb,"bridge_verification_status" text,"maintenance_overdue_since" timestamp with time zone,"wallet_maintenance_overdue_since" timestamp with time zone,"maintenance_grace_expired" boolean,"maintenance_grace_checked_at" timestamp with time zone,"tos_accepted_at" timestamp with time zone,"tos_version" text,"id_type" text,"bridge_identity_metadata" jsonb,"bridge_identity_synced_at" timestamp with time zone,"bridge_account_paused_at" timestamp with time zone,"account_frozen_at" timestamp with time zone,"account_frozen_reason" text,"account_frozen_by" uuid);
create table public.wallet_maintenance_charges("id" uuid,"user_id" uuid,"period_month" date,"currency" text,"amount_minor" integer,"status" text,"created_at" timestamp with time zone,"updated_at" timestamp with time zone);
create table public.wallets("id" uuid,"user_id" uuid,"currency" text,"balance" numeric,"virtual_account_number" text,"status" text,"created_at" timestamp with time zone,"updated_at" timestamp with time zone,"bridge_wallet_id" text,"bridge_virtual_account_id" text,"asset_type" text,"stablecoin_chain" text,"provider" text);
CREATE OR REPLACE FUNCTION public.subscription_current_month_end(p_date date)
 RETURNS date
 LANGUAGE sql
 IMMUTABLE STRICT
AS $function$
  select (date_trunc('month', p_date::timestamp) + interval '1 month - 1 day')::date
$function$
;
CREATE OR REPLACE FUNCTION public.subscription_next_month_end(p_date date)
 RETURNS date
 LANGUAGE sql
 IMMUTABLE STRICT
 SET search_path TO 'public', 'public', 'pg_temp'
AS $function$
  select (date_trunc('month', p_date::timestamp) + interval '2 months - 1 day')::date
$function$
;
CREATE OR REPLACE FUNCTION public.subscription_fee_for_period(p_account_type text, p_billing_period date)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE STRICT
AS $function$
begin
  if lower(p_account_type) = 'individual' then return 5.00; end if;
  if lower(p_account_type) = 'business' then return 29.99; end if;
  raise exception 'Unsupported subscription account type: %', p_account_type;
end;
$function$
;
