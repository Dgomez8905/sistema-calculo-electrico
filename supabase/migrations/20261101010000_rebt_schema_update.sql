-- ============================================================================
-- Migración REBT (RD 842/2002 actualizado a 2025 - ITC-BT-01 a ITC-BT-52)
-- Proyecto Supabase: bercfavycekkkqwlwmap
-- ============================================================================

-- 1. Ampliar restricción de system_type en electrical_projects para admitir tensiones REBT (230V / 400V 50Hz)
alter table public.electrical_projects
  drop constraint if exists electrical_projects_system_type_check;

alter table public.electrical_projects
  alter column system_type set default 'monofasico_230v';

alter table public.electrical_projects
  add constraint electrical_projects_system_type_check
  check (system_type in (
    'monofasico_230v',
    'trifasico_400v',
    'monofasico_120v',
    'bifasico_120_240v',
    'trifasico_208v',
    'trifasico_480v'
  ));

-- Columnas normativas REBT en electrical_projects (ITC-BT-04, ITC-BT-05, ITC-BT-10, ITC-BT-18, ITC-BT-25)
alter table public.electrical_projects
  add column if not exists electrification_grade text not null default 'basica'
    check (electrification_grade in ('basica', 'elevada', 'no_aplica')),
  add column if not exists itc04_group text not null default 'f_vivienda_unifamiliar',
  add column if not exists document_type text not null default 'Memoria Técnica de Diseño (MTD)',
  add column if not exists requires_oca boolean not null default false,
  add column if not exists iga_amps integer not null default 25,
  add column if not exists di_section_mm2 numeric(8,2) not null default 6.00,
  add column if not exists rcd_count integer not null default 2,
  add column if not exists building_forecast_json jsonb not null default '{}'::jsonb,
  add column if not exists earthing_json jsonb not null default '{}'::jsonb,
  add column if not exists mtd_metadata_json jsonb not null default '{}'::jsonb;

-- 2. Actualizar electrical_circuits para secciones métricas en mm² (ITC-BT-19 / 21 / 22 / 25)
alter table public.electrical_circuits
  drop constraint if exists electrical_circuits_load_category_check,
  drop constraint if exists electrical_circuits_phase_assignment_check;

alter table public.electrical_circuits
  add column if not exists circuit_code text not null default 'C1',
  add column if not exists usage_type text not null default 'vivienda_interior',
  add column if not exists simultaneity_factor numeric(5,2) not null default 1.00,
  add column if not exists utilization_factor numeric(5,2) not null default 1.00,
  add column if not exists installation_method text not null default 'B',
  add column if not exists insulation_type text not null default 'PVC_70',
  add column if not exists section_mm2 numeric(8,2) not null default 1.50,
  add column if not exists neutral_section_mm2 numeric(8,2) not null default 1.50,
  add column if not exists pe_section_mm2 numeric(8,2) not null default 1.50,
  add column if not exists ampacity_iz_amps numeric(10,2) not null default 15.00,
  add column if not exists tube_diameter_mm integer not null default 16,
  add column if not exists max_allowed_drop_pct numeric(5,2) not null default 3.00;

