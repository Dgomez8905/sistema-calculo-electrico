-- ============================================================================
-- Sistema de Cálculo Eléctrico - Esquema Postgres Optimizado (Supabase)
-- Proyecto: bercfavycekkkqwlwmap
-- Reglas aplicadas (supabase-postgres-best-practices):
--   1. PKs con bigint generated always as identity
--   2. Tipos exactos: numeric para magnitudes eléctricas, timestamptz para fechas
--   3. Índices explícitos en todas las llaves foráneas y columnas de filtro RLS
--   4. RLS habilitado con (select auth.uid()) cacheado por consulta y cláusula TO
-- ============================================================================

create table if not exists public.electrical_projects (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  client_name text not null default '',
  location text not null default '',
  system_type text not null default 'bifasico_120_240v'
    check (system_type in (
      'monofasico_120v',
      'bifasico_120_240v',
      'trifasico_208v',
      'trifasico_480v'
    )),
  demand_factor numeric(5,2) not null default 0.80
    check (demand_factor > 0 and demand_factor <= 1.00),
  ambient_temp_c numeric(5,2) not null default 30.00,
  total_connected_va numeric(14,2) not null default 0.00,
  total_demand_va numeric(14,2) not null default 0.00,
  main_breaker_amps integer not null default 100,
  main_feeder_awg text not null default '2 AWG',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.electrical_circuits (
  id bigint generated always as identity primary key,
  project_id bigint not null references public.electrical_projects(id) on delete cascade,
  circuit_number integer not null,
  description text not null,
  load_category text not null default 'iluminacion'
    check (load_category in (
      'iluminacion',
      'tomacorrientes',
      'climatizacion',
      'motores',
      'especial'
    )),
  phase_assignment text not null default 'A'
    check (phase_assignment in ('A', 'B', 'C', 'AB', 'BC', 'CA', 'ABC')),
  phases smallint not null default 1
    check (phases in (1, 2, 3)),
  voltage numeric(8,2) not null default 120.00
    check (voltage > 0),
  power_va numeric(12,2) not null
    check (power_va >= 0),
  power_factor numeric(4,2) not null default 0.90
    check (power_factor > 0 and power_factor <= 1.00),
  is_continuous boolean not null default true,
  length_meters numeric(10,2) not null default 15.00
    check (length_meters >= 0),
  conductor_material text not null default 'Cu'
    check (conductor_material in ('Cu', 'Al')),
  calculated_current_amps numeric(10,2) not null default 0.00,
  design_current_amps numeric(10,2) not null default 0.00,
  recommended_awg text not null default '12 AWG',
  breaker_amps integer not null default 20,
  voltage_drop_pct numeric(5,2) not null default 0.00,
  created_at timestamptz not null default now()
);

-- Índices en llaves foráneas y búsquedas frecuentes (schema-foreign-key-indexes / query-composite-indexes)
create index if not exists electrical_projects_user_id_idx
  on public.electrical_projects (user_id);

create index if not exists electrical_projects_created_at_idx
  on public.electrical_projects (created_at desc);

create index if not exists electrical_circuits_project_id_idx
  on public.electrical_circuits (project_id);

create index if not exists electrical_circuits_project_circuit_idx
  on public.electrical_circuits (project_id, circuit_number);

-- Permisos de acceso para el Data API de Supabase
grant select, insert, update, delete on public.electrical_projects to anon, authenticated;
grant select, insert, update, delete on public.electrical_circuits to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- Row Level Security (RLS) optimizado con (select auth.uid())
alter table public.electrical_projects enable row level security;
alter table public.electrical_circuits enable row level security;

create policy "electrical_projects_select_policy"
  on public.electrical_projects
  for select
  to anon, authenticated
  using (user_id is null or user_id = (select auth.uid()));

create policy "electrical_projects_insert_policy"
  on public.electrical_projects
  for insert
  to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));

create policy "electrical_projects_update_policy"
  on public.electrical_projects
  for update
  to anon, authenticated
  using (user_id is null or user_id = (select auth.uid()))
  with check (user_id is null or user_id = (select auth.uid()));

create policy "electrical_projects_delete_policy"
  on public.electrical_projects
  for delete
  to anon, authenticated
  using (user_id is null or user_id = (select auth.uid()));

create policy "electrical_circuits_access_policy"
  on public.electrical_circuits
  for all
  to anon, authenticated
  using (
    exists (
      select 1
      from public.electrical_projects p
      where p.id = electrical_circuits.project_id
        and (p.user_id is null or p.user_id = (select auth.uid()))
    )
  )
  with check (
    exists (
      select 1
      from public.electrical_projects p
      where p.id = electrical_circuits.project_id
        and (p.user_id is null or p.user_id = (select auth.uid()))
    )
  );

