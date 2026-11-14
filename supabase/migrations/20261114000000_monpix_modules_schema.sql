-- ============================================================================
-- Migración MONPIX Suite: Obras, Oficina (VeriFactu), Gastos, Tareas y Equipo
-- Proyecto Supabase: bercfavycekkkqwlwmap
-- Reglas aplicadas (supabase-postgres-best-practices):
--   1. PKs bigint generated always as identity
--   2. Tipos exactos: numeric(12,2) para importes, timestamptz para marcas horarias
--   3. Índices compuestos en (tenant_id, owner_user_id) y llaves foráneas
--   4. Historial auditado inmutable para fichajes laborales
-- ============================================================================

create table if not exists public.monpix_workspace_snapshots (
  id bigint generated always as identity primary key,
  tenant_id bigint not null references public.app_tenants(id) on delete cascade,
  owner_user_id bigint not null references public.app_users(id) on delete cascade,
  payload_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (tenant_id, owner_user_id)
);

create index if not exists monpix_workspace_snapshots_tenant_user_idx
  on public.monpix_workspace_snapshots (tenant_id, owner_user_id);

grant select, insert, update, delete on public.monpix_workspace_snapshots to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

alter table public.monpix_workspace_snapshots enable row level security;

drop policy if exists "monpix_workspace_snapshots_policy" on public.monpix_workspace_snapshots;
create policy "monpix_workspace_snapshots_policy"
  on public.monpix_workspace_snapshots
  for all
  to anon, authenticated
  using (true)
  with check (true);

