"use client";

import React from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Zap,
  FileSpreadsheet,
  FolderOpen,
  Plus,
  Building2,
  ShieldCheck,
  Users,
  Building,
  ArrowUpRight,
  Lock,
  Gauge,
  FileCheck2,
  Layers,
} from "lucide-react";
import {
  RebtCalculatedCircuit,
  MtdFormMetadata,
} from "@/lib/electrical-calculations";
import type { AppTenant, AppUser } from "@/app/page";

interface SavedProjectSummary {
  id: number;
  tenant_id: number | null;
  owner_user_id: number | null;
  name: string;
  client_name: string;
  location: string;
  total_demand_va: number;
  iga_amps: number;
  created_at: string;
}

interface TechnicianDashboardProps {
  currentUser: AppUser;
  currentTenant: AppTenant;
  isolatedProjects: SavedProjectSummary[];
  activeProjectId: number | null;
  mtdMeta: MtdFormMetadata;
  calculatedCircuits: RebtCalculatedCircuit[];
  cgmpSummary: {
    totalInstalledWatts: number;
    totalDesignWatts: number;
    contractDesignWatts: number;
    designCurrentAmps: number;
    igaAmps: number;
    rcd30mACount: number;
    diCalculation: RebtCalculatedCircuit;
    nonCompliantCircuits: number;
  };
  buildingForecast: {
    totalDwellings: number;
    totalBuildingPowerWatts: number;
    totalBuildingPowerKw: number;
    igmAmps: number;
    lgaCalculation: RebtCalculatedCircuit;
  };
  earthingResult: {
    estimatedResistanceOhm: number;
    maxAllowedRaOhm: number;
    isCompliant: boolean;
  };
  itc04Evaluation: {
    requiresProject: boolean;
    documentType: string;
    requiresInitialOcaInspection: boolean;
    normativeRule: string;
  };
  onNavigate: (
    section:
      | "expedientes"
      | "titular_ubicacion"
      | "circuitos"
      | "edificio_itc10"
      | "tierras_legalizacion"
      | "ficha_mtd"
      | "administracion"
  ) => void;
  onLoadProject: (id: number) => void;
  onNewProject: () => void;
}

export function TechnicianDashboard({
  currentUser,
  currentTenant,
  isolatedProjects,
  activeProjectId,
  mtdMeta,
  calculatedCircuits,
  cgmpSummary,
  buildingForecast,
  earthingResult,
  itc04Evaluation,
  onNavigate,
  onLoadProject,
  onNewProject,
}: TechnicianDashboardProps) {
  const compliantCount =
    calculatedCircuits.length - cgmpSummary.nonCompliantCircuits;
  const compliancePct =
    calculatedCircuits.length > 0
      ? Math.round((compliantCount / calculatedCircuits.length) * 100)
      : 100;

  const totalHistoricPowerKw = isolatedProjects.reduce(
    (acc, p) => acc + (Number(p.total_demand_va) || 0) / 1000,
    0
  );

  return (
    <div className="space-y-6">
      {/* Cabecera Ejecutiva del Dashboard del Técnico */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#0f6cbd] ring-1 ring-[#0f6cbd]/20">
              <Gauge className="h-3.5 w-3.5" />
              Dashboard Operativo del Técnico
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
              <Lock className="h-3 w-3" />
              Espacio Aislado: {currentUser.full_name}
            </span>
          </div>
          <h2 className="mt-2 text-xl font-bold text-slate-900">
            Panel de Control de Ingeniería y Cálculo REBT
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Empresa habilitada: <strong>{currentTenant.name}</strong> (
            {currentTenant.empresa_instaladora_num} · {currentTenant.isla}) ·
            Colegiado / CCI: <strong>{currentUser.cci_or_colegiado || "—"}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onNewProject}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
          >
            <Plus className="h-4 w-4 text-[#0f6cbd]" />
            Nuevo Expediente
          </button>
          <button
            type="button"
            onClick={() => onNavigate("circuitos")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f6cbd] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#115ea3]"
          >
            <Activity className="h-4 w-4" />
            Ir al Cuadro de Circuitos
          </button>
        </div>
      </div>

      {/* 4 KPIs Principales del Técnico */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Mis Expedientes Aislados
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#0f6cbd]">
              <FolderOpen className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {isolatedProjects.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Potencia acumulada:{" "}
            <strong className="text-slate-800">
              {totalHistoricPowerKw.toFixed(1)} kW
            </strong>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Potencia Prevista Activa
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#0f6cbd]">
            {(cgmpSummary.contractDesignWatts / 1000).toFixed(2)} kW
          </p>
          <p className="mt-1 text-xs text-slate-500">
            IGA: <strong>{cgmpSummary.igaAmps} A</strong> · D.I.:{" "}
            <strong>{cgmpSummary.diCalculation.sectionMm2} mm² Cu</strong>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Cumplimiento Normativo REBT
            </span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                compliancePct === 100 && earthingResult.isCompliant
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-amber-50 text-amber-600"
              }`}
            >
              {compliancePct === 100 && earthingResult.isCompliant ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {compliancePct}%{" "}
            <span className="text-xs font-semibold text-emerald-600">
              ({compliantCount}/{calculatedCircuits.length} cir.)
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Tierra Rt: <strong>{earthingResult.estimatedResistanceOhm} Ω</strong>{" "}
            (máx {earthingResult.maxAllowedRaOhm} Ω)
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Dictamen Legalización (ITC-04)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <FileCheck2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 truncate text-base font-extrabold text-slate-900">
            {itc04Evaluation.requiresProject
              ? "Proyecto Técnico"
              : "Memoria M.T.D. B.T."}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Inspección OCA:{" "}
            <strong
              className={
                itc04Evaluation.requiresInitialOcaInspection
                  ? "text-amber-700"
                  : "text-emerald-700"
              }
            >
              {itc04Evaluation.requiresInitialOcaInspection
                ? "Requerida"
                : "Exenta (CIE)"}
            </strong>
          </p>
        </div>
      </div>

      {/* Gráficos Técnicos: Caída de Tensión por Circuito + Reparto de Potencias */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Gráfico 1: Perfil de Caída de Tensión ΔU% respecto al límite REBT */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Monitor de Caída de Tensión (ΔU%) y Carga por Circuito (ITC-BT-19 / 25)
              </h3>
              <p className="text-xs text-slate-500">
                Comparativa en tiempo real frente al límite máximo reglamentario (3% alumbrado/vivienda, 5% fuerza/VE)
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("circuitos")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0f6cbd] hover:underline"
            >
              Editar circuitos
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {/* Barra de la Derivación Individual */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#0f6cbd]">
                  D.I. — Derivación Individual ({cgmpSummary.diCalculation.conductorsSummary})
                </span>
                <span className="font-mono font-semibold text-slate-800">
                  ΔU = {cgmpSummary.diCalculation.voltageDropPct}% / máx{" "}
                  {cgmpSummary.diCalculation.maxAllowedDropPct}% · Ib ={" "}
                  {cgmpSummary.diCalculation.currentIbAmps} A
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-[#0f6cbd]"
                  style={{
                    width: `${Math.min(
                      100,
                      (cgmpSummary.diCalculation.voltageDropPct /
                        cgmpSummary.diCalculation.maxAllowedDropPct) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Barras de cada circuito interior */}
            {calculatedCircuits.map((c, idx) => {
              const ratio = Math.min(
                100,
                Math.round((c.voltageDropPct / c.maxAllowedDropPct) * 100)
              );
              const isOk = c.voltageDropPct <= c.maxAllowedDropPct;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex w-9 justify-center rounded bg-slate-100 px-1.5 py-0.5 font-mono font-bold text-slate-800">
                        {c.code}
                      </span>
                      <span className="font-medium text-slate-800">
                        {c.description}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        ({c.sectionMm2} mm² · PIA {c.piaAmps}A · Ø{c.tubeDiameterMm}mm)
                      </span>
                    </div>
                    <span
                      className={`font-mono font-semibold ${
                        isOk ? "text-emerald-700" : "text-rose-600"
                      }`}
                    >
                      {c.voltageDropPct}% / {c.maxAllowedDropPct}% ({c.powerWatts} W)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        !isOk
                          ? "bg-rose-500"
                          : ratio > 75
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.max(4, ratio)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna Derecha: Flujo de Trabajo del Técnico + Resumen Edificio */}
        <div className="space-y-6">
          {/* Tarjeta de Flujo Rápido por Apartados */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Flujo de Trabajo del Expediente ({mtdMeta.expedienteNum})
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Completa o revisa cada apartado antes de generar opcionalmente la Ficha M.T.D.
            </p>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => onNavigate("titular_ubicacion")}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-left text-xs transition hover:bg-blue-50/50 hover:border-blue-200"
              >
                <div>
                  <div className="font-bold text-slate-900">
                    1. Datos del Titular y Emplazamiento
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {mtdMeta.titularNombre || "Pendiente de completar"} ·{" "}
                    {mtdMeta.isla}
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[#0f6cbd]" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate("circuitos")}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-left text-xs transition hover:bg-blue-50/50 hover:border-blue-200"
              >
                <div>
                  <div className="font-bold text-slate-900">
                    2. Cuadro de Circuitos y D.I.
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {calculatedCircuits.length} circuitos · IGA{" "}
                    {cgmpSummary.igaAmps} A · {cgmpSummary.rcd30mACount} Dif.
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[#0f6cbd]" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate("edificio_itc10")}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-left text-xs transition hover:bg-blue-50/50 hover:border-blue-200"
              >
                <div>
                  <div className="font-bold text-slate-900">
                    3. Previsión de Cargas Edificio y LGA
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {buildingForecast.totalDwellings} viviendas · Total{" "}
                    {buildingForecast.totalBuildingPowerKw} kW
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[#0f6cbd]" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate("tierras_legalizacion")}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-left text-xs transition hover:bg-blue-50/50 hover:border-blue-200"
              >
                <div>
                  <div className="font-bold text-slate-900">
                    4. Puesta a Tierra y Legalización
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Rt = {earthingResult.estimatedResistanceOhm} Ω ·{" "}
                    {itc04Evaluation.documentType}
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[#0f6cbd]" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate("ficha_mtd")}
                className="flex w-full items-center justify-between rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 py-2.5 text-left text-xs transition hover:bg-blue-100/70"
              >
                <div>
                  <div className="font-bold text-[#0f6cbd]">
                    5. Ficha Oficial M.T.D. (Descarga Opcional)
                  </div>
                  <div className="text-[11px] text-slate-600">
                    11 páginas autollenadas listas para revisar o imprimir
                  </div>
                </div>
                <FileSpreadsheet className="h-4 w-4 text-[#0f6cbd]" />
              </button>
            </div>
          </div>

          {/* Últimos Expedientes Guardados por este Técnico */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Mis Últimos Reportes Guardados
              </h3>
              <button
                type="button"
                onClick={() => onNavigate("expedientes")}
                className="text-xs font-semibold text-[#0f6cbd] hover:underline"
              >
                Ver todos ({isolatedProjects.length})
              </button>
            </div>

            {isolatedProjects.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">
                Aún no tienes reportes guardados bajo tu usuario.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-slate-100">
                {isolatedProjects.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-2 text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate font-semibold text-slate-900">
                        #{p.id} · {p.client_name}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {p.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onLoadProject(p.id)}
                      className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                        activeProjectId === p.id
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {activeProjectId === p.id ? "Activo" : "Cargar"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface AdminDashboardSummaryProps {
  tenants: AppTenant[];
  users: AppUser[];
  allProjects: SavedProjectSummary[];
  currentUser: AppUser;
  onSwitchUser: (u: AppUser) => void;
}

export function AdminDashboardSummary({
  tenants,
  users,
  allProjects,
  currentUser,
  onSwitchUser,
}: AdminDashboardSummaryProps) {
  const activeUsersCount = users.filter((u) => u.is_active).length;
  const adminUsersCount = users.filter(
    (u) => u.role === "super_admin" || u.role === "admin_empresa"
  ).length;
  const totalSystemPowerKw = allProjects.reduce(
    (acc, p) => acc + (Number(p.total_demand_va) || 0) / 1000,
    0
  );

  // Estadísticas por Tenant (Empresa Instaladora)
  const tenantStats = tenants.map((t) => {
    const tenantUsers = users.filter((u) => u.tenant_id === t.id);
    const tenantProjects = allProjects.filter((p) => p.tenant_id === t.id);
    const tenantPowerKw = tenantProjects.reduce(
      (acc, p) => acc + (Number(p.total_demand_va) || 0) / 1000,
      0
    );
    return {
      tenant: t,
      usersCount: tenantUsers.length,
      projectsCount: tenantProjects.length,
      powerKw: tenantPowerKw,
    };
  });

  // Cobertura de Permisos RBAC
  const permMetrics = [
    {
      label: "Crear Expedientes REBT",
      count: users.filter((u) => u.can_create_projects).length,
    },
    {
      label: "Editar Cálculos Eléctricos",
      count: users.filter((u) => u.can_edit_calculations).length,
    },
    {
      label: "Exportar / Imprimir Ficha M.T.D.",
      count: users.filter((u) => u.can_export_mtd).length,
    },
    {
      label: "Eliminar Reportes",
      count: users.filter((u) => u.can_delete_projects).length,
    },
    {
      label: "Administrar Usuarios y Permisos",
      count: users.filter((u) => u.can_manage_users).length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 4 KPIs Ejecutivos del Dashboard Administrativo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Empresas Instaladoras (Tenants)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#0f6cbd]">
              <Building className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {tenants.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Entornos corporativos 100% aislados
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Usuarios y Técnicos Activos
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {activeUsersCount}{" "}
            <span className="text-xs font-normal text-slate-500">
              / {users.length} reg.
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {adminUsersCount} administradores · {users.length - adminUsersCount}{" "}
            técnicos/visores
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Expedientes Totales en Plataforma
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#0f6cbd]">
            {allProjects.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Potencia gestionada:{" "}
            <strong>{totalSystemPowerKw.toFixed(1)} kW</strong>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Estado de Aislamiento Multi-Tenant
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-lg font-extrabold text-emerald-700">
            100% Segregado
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Sin cruce de reportes entre técnicos
          </p>
        </div>
      </div>

      {/* Gráficos del Dashboard Administrativo: Actividad por Empresa y Cobertura RBAC */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Distribución de Usuarios y Reportes por Empresa (Tenant) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-900">
            Rendimiento y Aislamiento por Empresa Instaladora (Tenant)
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Comparativa de técnicos asignados, expedientes M.T.D. generados y potencia acumulada por organización
          </p>

          <div className="mt-4 space-y-4">
            {tenantStats.map((st) => {
              const pctProjects =
                allProjects.length > 0
                  ? Math.round((st.projectsCount / allProjects.length) * 100)
                  : 0;
              return (
                <div
                  key={st.tenant.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        {st.tenant.name}
                      </span>
                      <span className="ml-2 rounded bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">
                        {st.tenant.empresa_instaladora_num} · {st.tenant.isla}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span>
                        Usuarios: <strong>{st.usersCount}</strong>
                      </span>
                      <span>
                        Reportes:{" "}
                        <strong className="text-[#0f6cbd]">
                          {st.projectsCount}
                        </strong>
                      </span>
                      <span>
                        Potencia: <strong>{st.powerKw.toFixed(1)} kW</strong>
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-[#0f6cbd]"
                      style={{ width: `${Math.max(8, pctProjects)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cobertura de Permisología RBAC */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">
            Distribución de Permisos (RBAC)
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Usuarios habilitados por cada privilegio operativo
          </p>

          <div className="mt-4 space-y-3">
            {permMetrics.map((m, i) => {
              const pct =
                users.length > 0
                  ? Math.round((m.count / users.length) * 100)
                  : 0;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">{m.label}</span>
                    <span className="font-mono font-bold text-slate-900">
                      {m.count}/{users.length} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#0f6cbd]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-[11px] text-slate-600">
            Sesión actual:{" "}
            <strong className="text-slate-900">{currentUser.full_name}</strong>{" "}
            ({currentUser.role}). Puedes cambiar de técnico en la tabla inferior con un clic.
          </div>
        </div>
      </div>
    </div>
  );
}
