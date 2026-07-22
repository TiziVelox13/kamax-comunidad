-- RPC para que las Edge Functions (service role) lean secretos del Vault.
-- anon/authenticated NO pueden ejecutarla.
create or replace function public.get_secret(p_name text)
returns text language sql security definer set search_path = public as
$$ select decrypted_secret from vault.decrypted_secrets where name = p_name $$;
revoke execute on function public.get_secret(text) from public, anon, authenticated;
grant execute on function public.get_secret(text) to service_role;

-- Permitir invitaciones de rol admin (bootstrap del equipo fundador)
alter table public.invites drop constraint invites_role_check;
alter table public.invites add constraint invites_role_check
  check (role in ('admin','lider','creador','vendedor','observador'));

-- Invite semilla para Tiziano (admin). Token fijo conocido solo por él.
insert into public.invites (token, first_name, phone, role, expires_at)
values ('smush-fundador-al125', 'Tiziano', '3512550593', 'admin', now() + interval '30 days');
