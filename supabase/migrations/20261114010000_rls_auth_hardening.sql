-- ============================================================================
-- Migración de Endurecimiento Auth / RLS y Hash de PINs
-- Reglas aplicadas (supabase-postgres-best-practices):
--   - Índices en auth_user_id para políticas RLS eficientes con (select auth.uid())
--   - Eliminación progresiva de PIN en texto claro mediante pin_hash SHA-256
-- ============================================================================

create extension if not exists pgcrypto;

alter table public.app_users
  add column if not exists auth_user_id uuid unique,
  add column if not exists pin_hash text not null default '';

create index if not exists app_users_auth_user_id_idx
  on public.app_users (auth_user_id)
  where auth_user_id is not null;

-- Poblar pin_hash para cuentas iniciales que aún no lo tenían calculado
update public.app_users
set pin_hash = encode(digest(access_pin, 'sha256'), 'hex')
where pin_hash = '' and access_pin <> '';

-- Función segura para validar acceso por email + PIN con comprobación SHA-256 en BD
create or replace function public.verify_app_user_pin(p_email text, p_pin text)
returns table (
  id bigint,
  tenant_id bigint,
  full_name text,
  email text,
  role text,
  is_active boolean
)
language sql
security definer
set search_path = public
as $$
  select
    u.id,
    u.tenant_id,
    u.full_name,
    u.email,
    u.role,
    u.is_active
  from public.app_users u
  where lower(trim(u.email)) = lower(trim(p_email))
    and (
      u.pin_hash = encode(digest(trim(p_pin), 'sha256'), 'hex')
      or (u.pin_hash = '' and u.access_pin = trim(p_pin))
    )
    and u.is_active = true
  limit 1;
$$;

grant execute on function public.verify_app_user_pin(text, text) to anon, authenticated;

-- Endurecer políticas cuando exista sesión Supabase Auth real (authenticated)
-- manteniendo compatibilidad con sesiones demo anónimas hasta activar JWT Auth.
drop policy if exists "monpix_workspace_snapshots_select_auth" on public.monpix_workspace_snapshots;
create policy "monpix_workspace_snapshots_select_auth"
  on public.monpix_workspace_snapshots
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.app_users u
      where u.id = monpix_workspace_snapshots.owner_user_id
        and u.tenant_id = monpix_workspace_snapshots.tenant_id
        and (
          u.auth_user_id = (select auth.uid())
          or u.auth_user_id is null
        )
    )
  );

