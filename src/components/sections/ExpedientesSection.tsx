"use client";

import React from "react";
import { Lock, Plus, FileSpreadsheet, Trash2 } from "lucide-react";
import GoogleSelect from "@/components/GoogleSelect";
import type { SavedHistoryRecord } from "@/components/SectionHistoryRegistry";
import type { MtdFormMetadata, RebtCalculatedCircuit } from "@/lib/electrical-calculations";
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
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#0f6cbd]">
            <Lock className="h-3.5 w-3.5" />
            Espacio de Trabajo Aislado (Multitenant)
          </span>
          <h2 className="mt-2 text-lg font-bold text-slate-900">
            Reportes y Expedientes de {currentUser?.full_name}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Los expedientes creados bajo tu usuario quedan asociados exclusivamente a tu identificador (
            <code>owner_user_id = {currentUser?.id}</code>) y organización (
            <code>{currentTenant?.name}</code>), evitando que se mezclen con los reportes de otros usuarios.
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
              className="min-w-[260px]"
            >
              <option value="strict_user">
                Vista Estricta: Solo mis reportes ({currentUser.full_name})
              </option>
              <option value="tenant_shared">
                Vista Empresa: Todos los de {currentTenant.name}
              </option>
            </GoogleSelect>
          )}

          <button
            type="button"
            onClick={() => onStartNewProject()}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0f6cbd] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#115ea3]"
          >
            <Plus className="h-4 w-4" />
            Crear Nuevo Expediente REBT
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen Rápido del Expediente en Curso */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Usuario Activo</span>
          <p className="mt-1 truncate text-base font-bold text-slate-900">
            {currentUser?.full_name}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {currentTenant?.name} · {currentTenant?.isla}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">
            Mis Reportes Guardados
          </span>
          <p className="mt-1 text-2xl font-bold text-[#0f6cbd]">
            {isolatedProjects.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Aislados de otros usuarios ({allProjects.length} totales en BD)
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">
            Expediente en Edición
          </span>
          <p className="mt-1 truncate text-base font-bold text-slate-900">
            {mtdMeta.expedienteNum}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {calculatedCircuits.length} circuitos ·{" "}
            {contractDesignWatts.toLocaleString()} W
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">
            Descarga Ficha M.T.D. (11 Págs)
          </span>
          <div className="mt-2">
            <button
              type="button"
              onClick={() => onNavigate("ficha_mtd")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-200"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-[#0f6cbd]" />
              Ir a Vista / Descarga Opcional
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Expedientes Aislados por Usuario */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Listado de Reportes de {currentUser?.full_name}
          </h3>
          <span className="text-xs text-slate-500">
            Mostrando {isolatedProjects.length} expediente(s)
          </span>
        </div>

        {isolatedProjects.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-slate-700">
              Este usuario aún no tiene reportes guardados en su espacio aislado.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Pulsa en &ldquo;Guardar Reporte del Usuario&rdquo; arriba a la derecha o crea un nuevo expediente para registrarlo bajo {currentUser?.full_name}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Expediente / Uso</th>
                  <th className="px-4 py-3">Titular</th>
                  <th className="px-4 py-3">Emplazamiento</th>
                  <th className="px-4 py-3 text-right">Potencia</th>
                  <th className="px-4 py-3 text-right">IGA</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isolatedProjects.map((proj) => (
                  <tr
                    key={proj.id}
                    className={`hover:bg-slate-50 ${
                      activeProjectId === proj.id ? "bg-blue-50/40" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-mono font-bold text-[#0f6cbd]">
                      #{proj.id}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {proj.name}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {proj.client_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{proj.location}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">
                      {Number(proj.total_demand_va).toLocaleString()} W
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">
                      {proj.iga_amps} A
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(proj.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => onLoadProject(proj.id)}
                        className="rounded-lg bg-[#e8f0fe] px-3 py-1 text-xs font-semibold text-[#0f6cbd] hover:bg-blue-100"
                      >
                        Abrir Cálculos
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await onLoadProject(proj.id);
                          onNavigate("ficha_mtd");
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Ver M.T.D.
                      </button>
                      {currentUser.can_delete_projects && (
                        <button
                          type="button"
                          onClick={() => onDeleteProject(proj.id)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          title="Eliminar reporte"
                        >
                          <Trash2 className="inline h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

