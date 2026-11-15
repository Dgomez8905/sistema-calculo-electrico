"use client";

import React from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Zap,
  FileSpreadsheet,
  FolderOpen,
  ShieldCheck,
  Users,
  Building,
  ArrowUpRight,
  FileCheck2,
  Layers,
  CircleDashed,
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
    maxAdmissibleKw?: number;
    accessTariff?: string;
    tariffBadgeLabel?: string;
    electrificationLabel?: string;
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

  const designKw = cgmpSummary.contractDesignWatts / 1000;
  const pmaKw =
    cgmpSummary.maxAdmissibleKw && cgmpSummary.maxAdmissibleKw > 0
      ? cgmpSummary.maxAdmissibleKw
      : Math.max(designKw, (cgmpSummary.igaAmps * 230) / 1000);
  const powerLoadPct = Math.min(100, Math.round((designKw / pmaKw) * 100));

  const totalCircuitWatts = Math.max(
    1,
    calculatedCircuits.reduce((sum, c) => sum + (Number(c.powerWatts) || 0), 0)
  );

  // Checklist interactivo de completitud del expediente activo
  const readinessChecks = [
    {
      id: "titular",
      label: "Titular y NIF/CIF cumplimentados",
      detail: mtdMeta.titularNombre
        ? `${mtdMeta.titularNombre}${mtdMeta.titularNif ? ` · ${mtdMeta.titularNif}` : ""}`
        : "Pendiente de indicar nombre y documento",
      done: Boolean(
        mtdMeta.titularNombre?.trim() && mtdMeta.titularNif?.trim()
      ),
      target: "titular_ubicacion" as const,
    },
    {
      id: "ubicacion",
      label: "Emplazamiento e isla definidos",
      detail: mtdMeta.direccionCalle?.trim()
        ? `${mtdMeta.direccionCalle} ${mtdMeta.direccionNum || ""} (${mtdMeta.isla})`
        : `Falta calle/número en ${mtdMeta.isla}`,
      done: Boolean(
        mtdMeta.direccionCalle?.trim() && mtdMeta.terminoMunicipal?.trim()
      ),
      target: "titular_ubicacion" as const,
    },
    {
      id: "circuitos",
      label: "Cuadro de circuitos conforme REBT",
      detail: `${compliantCount}/${calculatedCircuits.length} líneas OK · IGA ${cgmpSummary.igaAmps} A · ${cgmpSummary.rcd30mACount} Dif.`,
      done:
        calculatedCircuits.length > 0 &&
        cgmpSummary.nonCompliantCircuits === 0,
      target: "circuitos" as const,
    },
    {
      id: "tierra",
      label: "Puesta a tierra verificada (ITC-BT-18)",
      detail: `Rt = ${earthingResult.estimatedResistanceOhm} Ω (límite ${earthingResult.maxAllowedRaOhm} Ω)`,
      done: earthingResult.isCompliant,
      target: "tierras_legalizacion" as const,
    },
    {
      id: "firmante",
      label: "Instalador PH / Técnico firmante",
      detail: mtdMeta.instaladorNombrePh
        ? `${mtdMeta.instaladorNombrePh} · ${mtdMeta.empresaInstaladoraNum}`
        : "Pendiente datos de firma",
      done: Boolean(mtdMeta.instaladorNombrePh?.trim()),
      target: "titular_ubicacion" as const,
    },
  ];

  const completedChecks = readinessChecks.filter((c) => c.done).length;
  const readinessPct = Math.round(
    (completedChecks / readinessChecks.length) * 100
  );

  return (
    <div className="space-y-5">
      {/* 4 KPIs Principales del Técnico con Micro-Indicadores Visuales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* KPI 1: Cartera Aislada */}
        <button
          type="button"
          onClick={() => onNavigate("expedientes")}
          className="group rounded-xl border border-slate-200/90 bg-white p-4 text-left shadow-2xs transition hover:border-blue-300 hover:shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Mis Expedientes Aislados
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#0f6cbd] transition group-hover:bg-[#0f6cbd] group-hover:text-white">
              <FolderOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">
              {isolatedProjects.length}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              proyectos registrados
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
            <span>Potencia gestionada</span>
            <strong className="font-mono text-slate-800">
              {totalHistoricPowerKw.toFixed(1)} kW
            </strong>
          </div>
        </button>

        {/* KPI 2: Potencia Prevista y Margen IGA */}
        <button
          type="button"
          onClick={() => onNavigate("circuitos")}
          className="group rounded-xl border border-slate-200/90 bg-white p-4 text-left shadow-2xs transition hover:border-blue-300 hover:shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Potencia Prevista Activa
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-[#0f6cbd] tabular-nums">
              {designKw.toFixed(2)} kW
            </span>
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-600/20">
              {cgmpSummary.accessTariff
                ? `Tarifa ${cgmpSummary.accessTariff}`
                : "Tarifa 2.0TD"}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#0f6cbd] transition-all"
              style={{ width: `${Math.max(10, powerLoadPct)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500 tabular-nums">
            IGA <strong>{cgmpSummary.igaAmps} A</strong> ({powerLoadPct}% PMA) · D.I.{" "}
            <strong>{cgmpSummary.diCalculation.sectionMm2} mm² Cu</strong>
          </p>
        </button>

        {/* KPI 3: Cumplimiento Normativo REBT */}
        <button
          type="button"
          onClick={() => onNavigate("circuitos")}
          className="group rounded-xl border border-slate-200/90 bg-white p-4 text-left shadow-2xs transition hover:border-blue-300 hover:shadow-xs"
        >
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
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">
              {compliancePct}%
            </span>
            <span
              className={`text-xs font-semibold ${
                compliancePct === 100 ? "text-emerald-600" : "text-amber-700"
              }`}
            >
              ({compliantCount}/{calculatedCircuits.length} circuitos)
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${
                compliancePct === 100 ? "bg-emerald-500" : "bg-amber-500"
              }`}
              style={{ width: `${Math.max(8, compliancePct)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500 tabular-nums">
            Tierra Rt: <strong>{earthingResult.estimatedResistanceOhm} Ω</strong>{" "}
            (máx. {earthingResult.maxAllowedRaOhm} Ω)
          </p>
        </button>

        {/* KPI 4: Dictamen Legalización ITC-BT-04 */}
        <button
          type="button"
          onClick={() => onNavigate("tierras_legalizacion")}
          className="group rounded-xl border border-slate-200/90 bg-white p-4 text-left shadow-2xs transition hover:border-blue-300 hover:shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Dictamen Legalización (ITC-04)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <FileCheck2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 truncate text-lg font-extrabold tracking-tight text-slate-900">
            {itc04Evaluation.requiresProject
              ? "Proyecto Técnico"
              : "Memoria M.T.D. B.T."}
          </p>
          <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
            <span>Inspección inicial OCA</span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                itc04Evaluation.requiresInitialOcaInspection
                  ? "bg-amber-50 text-amber-800 ring-1 ring-amber-500/25"
                  : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
              }`}
            >
              {itc04Evaluation.requiresInitialOcaInspection
                ? "Requerida"
                : "Exenta (CIE)"}
            </span>
          </div>
        </button>
      </div>

      {/* Panel Analítico: Monitor ΔU% + Índice de Completitud y Últimos Expedientes */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Columna Izquierda (2/3): Monitor de Caída de Tensión y Carga por Circuito */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Monitor de Caída de Tensión (ΔU%) y Carga por Circuito
                </h3>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  ITC-BT-19 / 25
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Margen reglamentario en vivo (3% alumbrado/vivienda · 5% fuerza/VE) y peso de potencia instalada
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2.5 text-[10px] font-semibold text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Óptimo
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  &gt;75% límite
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Excede
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("circuitos")}
                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/60 px-2.5 py-1 text-xs font-semibold text-[#0f6cbd] transition hover:bg-blue-100/70"
              >
                <Activity className="h-3.5 w-3.5" />
                Editar cuadro
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {/* Derivación Individual */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#0f6cbd] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                    D.I.
                  </span>
                  <span className="font-bold text-slate-900">
                    Derivación Individual ({cgmpSummary.diCalculation.conductorsSummary})
                  </span>
                </div>
                <span className="font-mono text-xs font-semibold text-slate-800 tabular-nums">
                  ΔU = {cgmpSummary.diCalculation.voltageDropPct}% / máx.{" "}
                  {cgmpSummary.diCalculation.maxAllowedDropPct}% · Ib ={" "}
                  {cgmpSummary.diCalculation.currentIbAmps} A
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-blue-100">
                <div
                  className="h-full rounded-full bg-[#0f6cbd] transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        5,
                        (cgmpSummary.diCalculation.voltageDropPct /
                          cgmpSummary.diCalculation.maxAllowedDropPct) *
                          100
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Circuitos interiores */}
            <div className="divide-y divide-slate-100">
              {calculatedCircuits.map((c, idx) => {
                const ratio = Math.min(
                  100,
                  Math.round((c.voltageDropPct / c.maxAllowedDropPct) * 100)
                );
                const powerSharePct = Math.round(
                  ((Number(c.powerWatts) || 0) / totalCircuitWatts) * 100
                );
                const isOk = c.voltageDropPct <= c.maxAllowedDropPct;
                return (
                  <div key={idx} className="py-2.5 first:pt-1 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="inline-flex w-9 shrink-0 justify-center rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-800">
                          {c.code}
                        </span>
                        <span className="truncate font-semibold text-slate-800">
                          {c.description}
                        </span>
                        <span className="hidden sm:inline text-[11px] text-slate-400 tabular-nums">
                          {c.sectionMm2} mm² · PIA {c.piaAmps} A · Ø{c.tubeDiameterMm} mm
                        </span>
                      </div>
                      <div className="flex items-center gap-2 tabular-nums">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-600">
                          {c.powerWatts.toLocaleString()} W ({powerSharePct}%)
                        </span>
                        <span
                          className={`min-w-[82px] text-right font-mono font-bold ${
                            !isOk
                              ? "text-rose-600"
                              : ratio > 75
                              ? "text-amber-700"
                              : "text-emerald-700"
                          }`}
                        >
                          {c.voltageDropPct}% / {c.maxAllowedDropPct}%
                        </span>
                      </div>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
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

            {/* Resumen compacto pie: Edificio LGA */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-[11px] text-slate-600">
              <span>
                Previsión Edificio ITC-BT-10:{" "}
                <strong className="text-slate-800">
                  {buildingForecast.totalDwellings} viv. ·{" "}
                  {buildingForecast.totalBuildingPowerKw} kW
                </strong>{" "}
                (IGM {buildingForecast.igmAmps} A)
              </span>
              <button
                type="button"
                onClick={() => onNavigate("edificio_itc10")}
                className="font-semibold text-[#0f6cbd] hover:underline"
              >
                Revisar LGA →
              </button>
            </div>
          </div>
        </div>

        {/* Columna Derecha (1/3): Estado de Preparación del Expediente + Últimos Guardados */}
        <div className="space-y-5">
          {/* Tarjeta 1: Checklist de Preparación para Emitir M.T.D. */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Estado del Expediente Activo
                </h3>
                <p className="text-[11px] font-mono text-slate-500">
                  {mtdMeta.expedienteNum}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold tabular-nums ${
                  readinessPct === 100
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                    : "bg-blue-50 text-[#0f6cbd] ring-1 ring-[#0f6cbd]/20"
                }`}
              >
                {readinessPct}% listo
              </span>
            </div>

            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${
                  readinessPct === 100 ? "bg-emerald-500" : "bg-[#0f6cbd]"
                }`}
                style={{ width: `${Math.max(10, readinessPct)}%` }}
              />
            </div>

            <div className="mt-3.5 space-y-2">
              {readinessChecks.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.target)}
                  className="flex w-full items-start gap-2.5 rounded-lg border border-slate-200/80 bg-slate-50/50 px-3 py-2 text-left text-xs transition hover:border-blue-200 hover:bg-blue-50/40"
                >
                  {item.done ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 truncate">
                      {item.label}
                    </div>
                    <div className="truncate text-[11px] text-slate-500">
                      {item.detail}
                    </div>
                  </div>
                  <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onNavigate("ficha_mtd")}
              className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f6cbd] px-4 py-2.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#0c5aa6]"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Abrir Ficha Oficial M.T.D. (11 Págs.)
            </button>
          </div>

          {/* Tarjeta 2: Últimos Expedientes Guardados */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Últimos Reportes Guardados
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
              <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
                <p className="text-xs font-medium text-slate-600">
                  Sin expedientes guardados todavía.
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Usa &ldquo;Registrar&rdquo; en la barra superior para archivar el expediente actual.
                </p>
              </div>
            ) : (
              <div className="mt-3 divide-y divide-slate-100">
                {isolatedProjects.slice(0, 4).map((p) => {
                  const isAct = p.name.includes("-ACT");
                  const isCor = p.name.includes("-COR");
                  const isActive = activeProjectId === p.id;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 py-2.5 first:pt-1 last:pb-0 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-bold text-[#0f6cbd]">
                            #{p.id}
                          </span>
                          <span className="truncate font-semibold text-slate-900">
                            {p.client_name}
                          </span>
                          {isAct && (
                            <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                              ACTUAL
                            </span>
                          )}
                          {isCor && (
                            <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                              CORREGIDO
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[11px] text-slate-500 tabular-nums">
                          {p.name} · {((Number(p.total_demand_va) || 0) / 1000).toFixed(2)} kW
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onLoadProject(p.id)}
                        className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                          isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-[#0f6cbd]"
                        }`}
                      >
                        {isActive ? "Activo" : "Cargar"}
                      </button>
                    </div>
                  );
                })}
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
  showCharts?: boolean;
}

export function AdminDashboardSummary({
  tenants,
  users,
  allProjects,
  currentUser,
  showCharts = true,
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
    <div className="space-y-5">
      {/* 4 KPIs Ejecutivos del Dashboard Administrativo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Empresas Instaladoras (Tenants)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#0f6cbd]">
              <Building className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums">
            {tenants.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Entornos corporativos 100% aislados
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Usuarios y Técnicos Activos
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums">
            {activeUsersCount}{" "}
            <span className="text-xs font-normal text-slate-500">
              / {users.length} reg.
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {adminUsersCount} admin · {users.length - adminUsersCount} técnicos/visores
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Expedientes en Plataforma
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#0f6cbd] tabular-nums">
            {allProjects.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Potencia gestionada: <strong>{totalSystemPowerKw.toFixed(1)} kW</strong>
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Aislamiento Multi-Tenant
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

      {/* Gráficos del Dashboard Administrativo (bajo conmutador limpio) */}
      {showCharts && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs lg:col-span-2">
            <h3 className="text-sm font-bold text-slate-900">
              Rendimiento y Aislamiento por Empresa Instaladora (Tenant)
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Comparativa de técnicos asignados, expedientes generados y potencia acumulada por organización
            </p>

            <div className="mt-4 space-y-3.5">
              {tenantStats.map((st) => {
                const pctProjects =
                  allProjects.length > 0
                    ? Math.round((st.projectsCount / allProjects.length) * 100)
                    : 0;
                return (
                  <div
                    key={st.tenant.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5"
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
                      <div className="flex items-center gap-4 text-xs tabular-nums">
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

          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900">
              Distribución de Permisos (RBAC)
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Usuarios habilitados por privilegio operativo
            </p>

            <div className="mt-4 space-y-3">
              {permMetrics.map((m, i) => {
                const pct =
                  users.length > 0
                    ? Math.round((m.count / users.length) * 100)
                    : 0;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs tabular-nums">
                      <span className="font-medium text-slate-700">
                        {m.label}
                      </span>
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
              ({currentUser.role}). Cambia de técnico en la matriz con un clic.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
