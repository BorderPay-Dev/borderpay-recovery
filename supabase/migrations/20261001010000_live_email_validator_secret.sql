-- Exact-secret access for the trusted signup service only. No generic Vault reader.
begin;
create or replace function public.get_signup_email_validator_key()
returns text
language sql stable security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets
  where name = 'KICKBOX_API_KEY' limit 1;
$$;
revoke all on function public.get_signup_email_validator_key() from public, anon, authenticated;
grant execute on function public.get_signup_email_validator_key() to service_role;
comment on function public.get_signup_email_validator_key() is 'Server-only access to the Kickbox signup email validator key. Never expose to clients.';
commit;
