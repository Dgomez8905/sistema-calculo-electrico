"use client";

import React, { useMemo, useState } from "react";
import {
  Lock,
  Plus,
  FileSpreadsheet,
  Trash2,
  Search,
  X,
  FolderOpen,
  Zap,
  Activity,
  CheckCircle2,
} from "lucide-react";
import GoogleSelect from "@/components/GoogleSelect";
import type { SavedHistoryRecord } from "@/components/SectionHistoryRegistry";
import type {
  MtdFormMetadata,
  RebtCalculatedCircuit,
} from "@/lib/electrical-calculations";
import type { ActiveSection, AppTenant, AppUser } from "@/app/page";

interface ExpedientesSectionProps {
  currentUser: AppUser;
  currentTenant: AppTenant;
  isolationScope: "strict_user" | "tenant_shared";
  setIsolationScope: (val: "strict_user" | "tenant_shared") => void;
  isolatedProjects: SavedHistoryRecord[];
  allProjects: SavedHistoryRecord[];
  activeProjectId: number | null;
  mtdMeta: MtdFormMetadata;
  calculatedCircuits: RebtCalculatedCircuit[];
  contractDesignWatts: number;
  onStartNewProject: () => void;
  onNavigate: (section: ActiveSection) => void;
  onLoadProject: (projectId: number) => Promise<void> | void;
  onDeleteProject: (projectId: number) => void;
}

type ExpedienteQuickFilter = "all" | "act" | "cor" | "mono" | "tri";

export default function ExpedientesSection({
  currentUser,
  currentTenant,
  isolationScope,
  setIsolationScope,
  isolatedProjects,
  allProjects,
  activeProjectId,
  mtdMeta,
  calculatedCircuits,
  contractDesignWatts,
  onStartNewProject,
  onNavigate,
  onLoadProject,
  onDeleteProject,
}: ExpedientesSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<ExpedienteQuickFilter>("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const counts = useMemo(() => {
    return {
      all: isolatedProjects.length,
      act: isolatedProjects.filter((p) => p.name.includes("-ACT")).length,
      cor: isolatedProjects.filter((p) => p.name.includes("-COR")).length,
      mono: isolatedProjects.filter((p) => p.system_type !== "trifasico_400v")
        .length,
      tri: isolatedProjects.filter((p) => p.system_type === "trifasico_400v")
        .length,
    };
  }, [isolatedProjects]);

  const totalPowerKw = useMemo(
    () =>
      isolatedProjects.reduce(
        (sum, p) => sum + (Number(p.total_demand_va) || 0) / 1000,
        0
      ),
    [isolatedProjects]
  );

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return isolatedProjects.filter((proj) => {
      if (quickFilter === "act" && !proj.name.includes("-ACT")) return false;
      if (quickFilter === "cor" && !proj.name.includes("-COR")) return false;
      if (quickFilter === "mono" && proj.system_type === "trifasico_400v")
        return false;
      if (quickFilter === "tri" && proj.system_type !== "trifasico_400v")
        return false;

      if (!q) return true;
      const meta = proj.mtd_metadata_json;
      return (
        proj.name.toLowerCase().includes(q) ||
        proj.client_name.toLowerCase().includes(q) ||
        proj.location.toLowerCase().includes(q) ||
        String(proj.id).includes(q) ||
        (meta?.expedienteNum || "").toLowerCase().includes(q) ||
        (meta?.titularNif || "").toLowerCase().includes(q)
      );
    });
  }, [isolatedProjects, quickFilter, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Cabecera Operativa Compacta */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#0f6cbd] ring-1 ring-[#0f6cbd]/20">
              <Lock className="h-3 w-3" />
              Espacio Multitenant Aislado
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {currentTenant?.name} · {currentTenant?.isla}
            </span>
          </div>
          <h2 className="mt-1.5 text-lg font-bold tracking-tight text-slate-900">
            Cartera de Expedientes y Reportes REBT
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Gestiona tus expedientes aislados, alterna entre diagnósticos de estado actual (<code>-ACT</code>) y propuestas corregidas (<code>-COR</code>), o abre su Ficha M.T.D.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {(currentUser.role === "super_admin" ||
            currentUser.role === "admin_empresa") && (
            <GoogleSelect
              value={isolationScope}
              onChange={(e) =>
                setIsolationScope(
                  e.target.value as "strict_user" | "tenant_shared"
                )
              }
              className="min-w-[250px]"
            >
              <option value="strict_user">
                Solo mis reportes ({currentUser.full_name})
              </option>
              <option value="tenant_shared">
                Toda la empresa ({currentTenant.name})
              </option>
            </GoogleSelect>
          )}

          <button
            type="button"
            onClick={() => onStartNewProject()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0f6cbd] px-4 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#0c5aa6]"
          >
            <Plus className="h-4 w-4" />
            Nuevo Expediente REBT
          </button>
        </div>
      </div>

      {/* 3 Indicadores Contextuales (Sin duplicar datos de sesión de la barra superior) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div>
            <span className="text-xs font-semibold text-slate-500">
              Reportes en Cartera
            </span>
            <p className="mt-1 text-2xl font-extrabold text-slate-900 tabular-nums">
              {isolatedProjects.length}{" "}
              <span className="text-xs font-medium text-slate-400">
                / {allProjects.length} global
              </span>
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#0f6cbd]">
            <FolderOpen className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div>
            <span className="text-xs font-semibold text-slate-500">
              Potencia Acumulada Gestionada
            </span>
            <p className="mt-1 text-2xl font-extrabold text-[#0f6cbd] tabular-nums">
              {totalPowerKw.toFixed(2)} kW
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Zap className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200/80 bg-blue-50/30 p-4 shadow-2xs">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-500">
              En edición activa ahora
            </span>
            <p className="mt-0.5 truncate font-mono text-sm font-bold text-slate-900">
              {mtdMeta.expedienteNum}
            </p>
            <p className="text-[11px] text-slate-500 tabular-nums">
              {calculatedCircuits.length} circuitos ·{" "}
              {(contractDesignWatts / 1000).toFixed(2)} kW
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("ficha_mtd")}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#0f6cbd] shadow-2xs transition hover:bg-blue-50"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Ficha M.T.D.
          </button>
        </div>
      </div>

      {/* Tabla SaaS con Barra de Búsqueda y Filtros Rápidos */}
      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
          {/* Píldoras de filtro rápido */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "all", label: `Todos (${counts.all})` },
                { id: "act", label: `Estado Actual -ACT (${counts.act})` },
                { id: "cor", label: `Corregido -COR (${counts.cor})` },
                { id: "mono", label: `Monofásico (${counts.mono})` },
                { id: "tri", label: `Trifásico (${counts.tri})` },
              ] as const
            ).map((pill) => {
              const active = quickFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setQuickFilter(pill.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    active
                      ? "bg-[#0f6cbd] text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Buscador instantáneo */}
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar titular, expediente, isla..."
              className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {isolatedProjects.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#0f6cbd]">
              <FolderOpen className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-900">
              Tu cartera aislada aún no tiene expedientes guardados
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
              Inicia un nuevo expediente guiado (manual o por fotografía de cuadro eléctrico) o pulsa en &ldquo;Registrar&rdquo; en la barra superior para archivar el proyecto actual.
            </p>
            <button
              type="button"
              onClick={() => onStartNewProject()}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#0f6cbd] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#0c5aa6]"
            >
              <Plus className="h-4 w-4" />
              Crear Primer Expediente REBT
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-slate-700">
              Sin coincidencias para el filtro seleccionado
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setQuickFilter("all");
              }}
              className="mt-2 text-xs font-semibold text-[#0f6cbd] hover:underline"
            >
              Restablecer búsqueda y filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Expediente / Modalidad</th>
                  <th className="px-4 py-3">Titular</th>
                  <th className="px-4 py-3">Emplazamiento</th>
                  <th className="px-4 py-3 text-right">Potencia</th>
                  <th className="px-4 py-3 text-right">Protección</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {filteredProjects.map((proj) => {
                  const isActive = activeProjectId === proj.id;
                  const isAct = proj.name.includes("-ACT");
                  const isCor = proj.name.includes("-COR");
                  const kw = ((Number(proj.total_demand_va) || 0) / 1000).toFixed(
                    2
                  );

                  return (
                    <tr
                      key={proj.id}
                      className={`transition ${
                        isActive
                          ? "bg-blue-50/50 hover:bg-blue-50/70"
                          : "hover:bg-slate-50/90"
                      }`}
                    >
                      <td className="px-4 py-3.5 font-mono font-bold text-[#0f6cbd] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>#{proj.id}</span>
                          {isActive && (
                            <span
                              className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 font-sans text-[9px] font-bold text-emerald-800"
                              title="Expediente actualmente cargado en el espacio de trabajo"
                            >
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              Activo
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-slate-900">
                            {proj.name}
                          </span>
                          {isAct && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                              Diagnóstico Actual
                            </span>
                          )}
                          {isCor && (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                              Propuesta Corregida
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {proj.system_type === "trifasico_400v"
                            ? "Trifásico 400 V"
                            : "Monofásico 230 V"}{" "}
                          · Grado {proj.electrification_grade}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-medium text-slate-800">
                        {proj.client_name}
                      </td>

                      <td className="px-4 py-3.5 text-slate-600">
                        {proj.location}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono tabular-nums whitespace-nowrap">
                        <div className="font-bold text-slate-900">{kw} kW</div>
                        <div className="text-[10px] text-slate-400">
                          {Number(proj.total_demand_va).toLocaleString()} W
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-700 tabular-nums whitespace-nowrap">
                        IGA {proj.iga_amps} A
                      </td>

                      <td className="px-4 py-3.5 text-slate-500 tabular-nums whitespace-nowrap">
                        {new Date(proj.created_at).toLocaleDateString("es-ES")}
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onLoadProject(proj.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#e8f2fc] px-2.5 py-1.5 text-xs font-semibold text-[#0f6cbd] transition hover:bg-blue-100"
                          >
                            <Activity className="h-3.5 w-3.5" />
                            <span>Cálculos</span>
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              await onLoadProject(proj.id);
                              onNavigate("ficha_mtd");
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5 text-[#0f6cbd]" />
                            <span>M.T.D.</span>
                          </button>

                          {currentUser.can_delete_projects &&
                            (confirmDeleteId === proj.id ? (
                              <div className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteProject(proj.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="text-[11px] font-bold text-rose-700 hover:underline"
                                >
                                  Confirmar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="text-[11px] text-slate-500 hover:text-slate-800"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(proj.id)}
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                title="Eliminar reporte"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
