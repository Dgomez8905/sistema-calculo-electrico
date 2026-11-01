-- ============================================================================
-- Migración de Multitenencia, Usuarios y Permisología (RBAC)
-- Proyecto Supabase: bercfavycekkkqwlwmap
-- Reglas aplicadas (supabase-postgres-best-practices):
--   - bigint generated always as identity en todas las PKs
--   - Índices explícitos en todas las llaves foráneas (tenant_id, owner_user_id)
--   - Aislamiento de expedientes por tenant_id y owner_user_id
-- ============================================================================

create table if not exists public.app_tenants (
  id bigint generated always as identity primary key,
  name text not null,
  cif text not null default '',
  empresa_instaladora_num text not null default '',
  isla text not null default 'Tenerife',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.app_users (
  id bigint generated always as identity primary key,
  tenant_id bigint not null references public.app_tenants(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  access_pin text not null default '1234',
  doi_nif text not null default '',
  role text not null default 'ingeniero_instalador'
    check (role in ('super_admin', 'admin_empresa', 'ingeniero_instalador', 'visor_auditor')),
  cci_or_colegiado text not null default '',
  can_create_projects boolean not null default true,
  can_edit_calculations boolean not null default true,
  can_export_mtd boolean not null default true,
  can_delete_projects boolean not null default false,
  can_manage_users boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Columnas de aislamiento multi-tenant y usuario propietario en electrical_projects
alter table public.electrical_projects
  add column if not exists tenant_id bigint references public.app_tenants(id) on delete cascade,
  add column if not exists owner_user_id bigint references public.app_users(id) on delete set null;

-- Índices para llaves foráneas y filtrado multi-tenant
create index if not exists app_users_tenant_id_idx
  on public.app_users (tenant_id);

create index if not exists electrical_projects_tenant_id_idx
  on public.electrical_projects (tenant_id);

create index if not exists electrical_projects_owner_user_id_idx
  on public.electrical_projects (owner_user_id);

create index if not exists electrical_projects_tenant_owner_idx
  on public.electrical_projects (tenant_id, owner_user_id, created_at desc);

-- Permisos de acceso Data API y RLS
grant select, insert, update, delete on public.app_tenants to anon, authenticated;
grant select, insert, update, delete on public.app_users to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

alter table public.app_tenants enable row level security;
alter table public.app_users enable row level security;

drop policy if exists "app_tenants_access_policy" on public.app_tenants;
create policy "app_tenants_access_policy"
  on public.app_tenants
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "app_users_access_policy" on public.app_users;
create policy "app_users_access_policy"
  on public.app_users
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- Datos iniciales (Semilla de 2 Empresas/Tenants y 3 Usuarios con distintos roles)
insert into public.app_tenants (name, cif, empresa_instaladora_num, isla)
select 'Ingeniería e Instalaciones Gómez S.L.', 'B-38901245', 'EI-38-02941', 'Tenerife'
where not exists (select 1 from public.app_tenants where cif = 'B-38901245');

insert into public.app_tenants (name, cif, empresa_instaladora_num, isla)
select 'ElectroCanarias Proyectos B.T. S.L.', 'B-35419820', 'EI-35-01184', 'Gran Canaria'
where not exists (select 1 from public.app_tenants where cif = 'B-35419820');

insert into public.app_users (
  tenant_id, full_name, email, access_pin, doi_nif, role, cci_or_colegiado,
  can_create_projects, can_edit_calculations, can_export_mtd, can_delete_projects, can_manage_users
)
select
  (select id from public.app_tenants where cif = 'B-38901245' limit 1),
  'Daniel Gómez Rojas (Admin General)',
  'daniel@ingenieriagomez.es',
  '1234',
  '43.829.104-Z',
  'super_admin',
  'COIITF-3109 / CCI-TF-4821',
  true, true, true, true, true
where not exists (select 1 from public.app_users where email = 'daniel@ingenieriagomez.es');

insert into public.app_users (
  tenant_id, full_name, email, access_pin, doi_nif, role, cci_or_colegiado,
  can_create_projects, can_edit_calculations, can_export_mtd, can_delete_projects, can_manage_users
)
select
  (select id from public.app_tenants where cif = 'B-38901245' limit 1),
  'Carlos Morales (Instalador PH - Tenerife)',
  'carlos@ingenieriagomez.es',
  '1234',
  '78.412.509-M',
  'ingeniero_instalador',
  'CCI-TF-5510',
  true, true, true, false, false
where not exists (select 1 from public.app_users where email = 'carlos@ingenieriagomez.es');

insert into public.app_users (
  tenant_id, full_name, email, access_pin, doi_nif, role, cci_or_colegiado,
  can_create_projects, can_edit_calculations, can_export_mtd, can_delete_projects, can_manage_users
)
select
  (select id from public.app_tenants where cif = 'B-35419820' limit 1),
  'Elena Betancor (Ingeniera - Gran Canaria)',
  'elena@electrocanarias.es',
  '1234',
  '42.918.301-P',
  'admin_empresa',
  'COIIGC-2045',
  true, true, true, true, true
where not exists (select 1 from public.app_users where email = 'elena@electrocanarias.es');

-- Asignar expedientes existentes sin tenant al primer usuario/tenant por defecto
update public.electrical_projects
set
  tenant_id = (select id from public.app_tenants order by id asc limit 1),
  owner_user_id = (select id from public.app_users order by id asc limit 1)
where tenant_id is null;
