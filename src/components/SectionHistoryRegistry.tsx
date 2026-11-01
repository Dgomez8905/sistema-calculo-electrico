"use client";

import React, { useState } from "react";
import {
  Eye,
  Pencil,
  Trash2,
  Plus,
  Save,
  History,
  CheckCircle2,
  FileSpreadsheet,
  X,
  RotateCcw,
} from "lucide-react";
import {
  MtdFormMetadata,
  DEFAULT_MTD_METADATA,
  SystemSupplyType,
  Itc04GroupCode,
} from "@/lib/electrical-calculations";

export interface SavedHistoryRecord {
  id: number;
  tenant_id: number | null;
  owner_user_id: number | null;
  name: string;
  client_name: string;
  location: string;
  system_type: SystemSupplyType;
  electrification_grade: "basica" | "elevada";
  itc04_group?: Itc04GroupCode;
  document_type?: string;
  requires_oca?: boolean;
  total_connected_va?: number;
  total_demand_va: number;
  iga_amps: number;
  di_section_mm2?: number;
  rcd_count?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  building_forecast_json?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  earthing_json?: any;
  mtd_metadata_json?: MtdFormMetadata;
  created_at: string;
}

export type HistorySectionType =
  | "titular_ubicacion"
  | "circuitos"
  | "edificio_itc10"
  | "tierras_legalizacion";

interface SectionHistoryRegistryProps {
  section: HistorySectionType;
  records: SavedHistoryRecord[];
  activeRecordId: number | null;
  isSaving: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onSaveNew: () => Promise<void>;
  onUpdateActive: () => Promise<void>;
  onEditRecord: (recordId: number) => Promise<void>;
  onDeleteRecord: (recordId: number) => Promise<void>;
  onOpenMtdForRecord: (recordId: number) => Promise<void>;
  onResetForm: () => void;
}

const SECTION_TITLES: Record<
  HistorySectionType,
  { title: string; subtitle: string }
> = {
  titular_ubicacion: {
    title: "Historial de Registros — Titular, Ubicación y Profesional Habilitado",
    subtitle:
      "Cada registro almacena los datos administrativos del titular, emplazamiento, presupuesto y firmante habilitado. Puedes ver el detalle, cargar para editar o eliminar.",
  },
  circuitos: {
    title: "Historial de Registros — Cuadro de Circuitos y Derivación Individual",
    subtitle:
      "Cada registro guarda la configuración de suministro, grado de electrificación, IGA, diferenciales, D.I. y líneas interiores calculadas.",
  },
  edificio_itc10: {
    title: "Historial de Registros — Previsión de Cargas del Edificio y LGA (ITC-BT-10 / 52)",
    subtitle:
      "Cada registro conserva el cálculo de viviendas (P1), servicios generales (P2), locales (P3), garajes (P4), recarga VE (P5) y Línea General de Alimentación (LGA).",
  },
  tierras_legalizacion: {
    title: "Historial de Registros — Puesta a Tierra y Legalización (ITC-BT-18 / 04 / 05)",
    subtitle:
      "Cada registro almacena la resistividad del terreno, electrodos, resistencia óhmica Rt prevista, clasificación ITC-BT-04 y exigencia de inspección OCA.",
  },
};

export default function SectionHistoryRegistry({
  section,
  records,
  activeRecordId,
  isSaving,
  canEdit,
  canDelete,
  onSaveNew,
  onUpdateActive,
  onEditRecord,
  onDeleteRecord,
  onOpenMtdForRecord,
  onResetForm,
}: SectionHistoryRegistryProps) {
  const [viewingRecord, setViewingRecord] =
    useState<SavedHistoryRecord | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const info = SECTION_TITLES[section];

  const getMeta = (r: SavedHistoryRecord): MtdFormMetadata => ({
    ...DEFAULT_MTD_METADATA,
    ...(r.mtd_metadata_json || {}),
  });

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      {/* Cabecera del Historial con Botones de Registro / Actualización */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/70 px-6 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0f6cbd] ring-1 ring-blue-200">
            <History className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">{info.title}</h3>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-[#0f6cbd]">
                {records.length} {records.length === 1 ? "registro" : "registros"}
              </span>
              {activeRecordId && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                  Editando Registro #{activeRecordId}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{info.subtitle}</p>
          </div>
        </div>

        {/* Barra de Botones para Registrar o Actualizar en el Historial */}
        <div className="flex flex-wrap items-center gap-2">
          {activeRecordId !== null && (
            <>
              <button
                type="button"
                onClick={onResetForm}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                title="Salir del modo edición y limpiar formulario"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                Cancelar Edición
              </button>
              <button
                type="button"
                disabled={isSaving || !canEdit}
                onClick={onUpdateActive}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {isSaving
                  ? "Actualizando..."
                  : `Guardar Cambios (#${activeRecordId})`}
              </button>
            </>
          )}

          <button
            type="button"
            disabled={isSaving || !canEdit}
            onClick={onSaveNew}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f6cbd] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#115ea3] disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            {isSaving
              ? "Registrando..."
              : activeRecordId !== null
              ? "Guardar como Nuevo Registro"
              : "Registrar en Historial"}
          </button>
        </div>
      </div>

      {/* Tabla de Registros según el Apartado Activo */}
      {records.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm font-semibold text-slate-700">
            Aún no hay registros guardados en este historial.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Completa los campos del formulario superior y pulsa en{" "}
            <strong className="text-[#0f6cbd]">&ldquo;Registrar en Historial&rdquo;</strong>{" "}
            para añadir el primer registro editable.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
              {section === "titular_ubicacion" && (
                <tr>
                  <th className="px-4 py-3">ID / Expediente</th>
                  <th className="px-4 py-3">Titular y NIF/CIF</th>
                  <th className="px-4 py-3">Dirección y Municipio</th>
                  <th className="px-4 py-3">Uso / Superficie</th>
                  <th className="px-4 py-3 text-right">Presupuesto</th>
                  <th className="px-4 py-3">Profesional / Empresa</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              )}
              {section === "circuitos" && (
                <tr>
                  <th className="px-4 py-3">ID / Expediente</th>
                  <th className="px-4 py-3">Titular</th>
                  <th className="px-4 py-3">Suministro / Grado</th>
                  <th className="px-4 py-3 text-right">Potencia Prevista</th>
                  <th className="px-4 py-3 text-right">IGA / Dif.</th>
                  <th className="px-4 py-3">Derivación Individual</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              )}
              {section === "edificio_itc10" && (
                <tr>
                  <th className="px-4 py-3">ID / Expediente</th>
                  <th className="px-4 py-3">Viviendas (P1 Simultánea)</th>
                  <th className="px-4 py-3">Serv. Gen. (P2) y Locales (P3)</th>
                  <th className="px-4 py-3">Garaje (P4) y VE (P5)</th>
                  <th className="px-4 py-3 text-right">Potencia Total Edificio</th>
                  <th className="px-4 py-3">Sección LGA / IGM</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              )}
              {section === "tierras_legalizacion" && (
                <tr>
                  <th className="px-4 py-3">ID / Expediente</th>
                  <th className="px-4 py-3">Terreno ρ y Electrodos</th>
                  <th className="px-4 py-3">Diferencial / UL</th>
                  <th className="px-4 py-3 text-right">Resistencia Rt</th>
                  <th className="px-4 py-3">Grupo ITC-BT-04</th>
                  <th className="px-4 py-3">Dictamen / Inspección OCA</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              )}
            </thead>

            <tbody className="divide-y divide-slate-200">
              {records.map((rec) => {
                const isEditing = activeRecordId === rec.id;
                const meta = getMeta(rec);
                const bf = rec.building_forecast_json || {};
                const bfInputs = bf._inputs || {};
                const earth = rec.earthing_json || {};
                const earthInputs = earth._inputs || {};

                return (
                  <tr
                    key={rec.id}
                    className={`transition ${
                      isEditing
                        ? "bg-amber-50/60 hover:bg-amber-50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    {/* Columna 1 común: ID y Expediente */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[#0f6cbd]">
                          #{rec.id}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {meta.expedienteNum || rec.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Inst.: {meta.instalacionNum || `BT-2026-${rec.id}`}
                      </div>
                    </td>

                    {/* Columnas específicas: TITULAR Y UBICACIÓN */}
                    {section === "titular_ubicacion" && (
                      <>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            {meta.titularNombre || rec.client_name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            NIF/CIF: {meta.titularNif || "—"} · Tel:{" "}
                            {meta.telefono || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-800">
                            {meta.direccionCalle} {meta.direccionNum}{" "}
                            {meta.portalPlanta ? `(${meta.portalPlanta})` : ""}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {meta.terminoMunicipal} · {meta.isla} (CP{" "}
                            {meta.codigoPostal})
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">
                            {meta.usoDestino}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Superficie: {meta.superficieUtilM2} m²
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                          {Number(
                            meta.presupuestoTotalEuros || 0
                          ).toLocaleString()}{" "}
                          €
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">
                            {meta.instaladorNombrePh}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {meta.empresaInstaladoraNombre} (
                            {meta.empresaInstaladoraNum})
                          </div>
                        </td>
                      </>
                    )}

                    {/* Columnas específicas: CUADRO DE CIRCUITOS */}
                    {section === "circuitos" && (
                      <>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {meta.titularNombre || rec.client_name}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            {rec.system_type === "trifasico_400v"
                              ? "Trifásico 400 V"
                              : "Monofásico 230 V"}
                          </span>
                          <div className="mt-0.5 text-[11px] text-slate-500 capitalize">
                            Electrificación {rec.electrification_grade}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-[#0f6cbd]">
                          {Number(rec.total_demand_va || 0).toLocaleString()} W
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-800">
                          <div>IGA {rec.iga_amps} A</div>
                          <div className="text-[11px] text-slate-500">
                            {rec.rcd_count || 2} dif. 30 mA
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700">
                          D.I. {rec.di_section_mm2 || 10} mm² Cu XLPE
                        </td>
                      </>
                    )}

                    {/* Columnas específicas: PREVISIÓN DE EDIFICIO (ITC-BT-10 / 52) */}
                    {section === "edificio_itc10" && (
                      <>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            {bf.totalDwellings ?? 16} viviendas (Cs{" "}
                            {bf.simultaneityCoefficient ?? 12.5})
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Bás.: {bfInputs.basicDwellings ?? 12} · Elev.:{" "}
                            {bfInputs.elevatedDwellings ?? 4} → P1:{" "}
                            <strong>
                              {Number(
                                bf.p1DwellingsWatts ?? 82656
                              ).toLocaleString()}{" "}
                              W
                            </strong>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-800">
                            P2 Serv. Gen.:{" "}
                            <strong>
                              {Number(
                                bf.p2GeneralServicesWatts ?? 11500
                              ).toLocaleString()}{" "}
                              W
                            </strong>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            P3 Locales:{" "}
                            <strong>
                              {Number(
                                bf.p3CommercialWatts ?? 14000
                              ).toLocaleString()}{" "}
                              W
                            </strong>{" "}
                            ({bfInputs.commercialCount ?? 2} loc. /{" "}
                            {bfInputs.commercialAreaM2 ?? 140} m²)
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-800">
                            P4 Garaje:{" "}
                            <strong>
                              {Number(
                                bf.p4GarageWatts ?? 9000
                              ).toLocaleString()}{" "}
                              W
                            </strong>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            P5 Recarga VE:{" "}
                            <strong>
                              {Number(
                                bf.p5EffectiveEvWatts ?? 7360
                              ).toLocaleString()}{" "}
                              W
                            </strong>{" "}
                            ({bf.evChargingStations ?? 2} pl.)
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-extrabold text-[#0f6cbd]">
                          {Number(
                            bf.totalBuildingPowerWatts ?? 124516
                          ).toLocaleString()}{" "}
                          W
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono font-semibold text-slate-900">
                            3×{bf.lgaCalculation?.sectionMm2 ?? 95} + 1×
                            {bf.lgaCalculation?.neutralSectionMm2 ?? 50} mm² Cu
                          </div>
                          <div className="text-[11px] text-slate-500">
                            ΔU {bf.lgaCalculation?.voltageDropPct ?? 0.47}% ·
                            IGM {bf.igmAmps ?? 250} A
                          </div>
                        </td>
                      </>
                    )}

                    {/* Columnas específicas: TIERRA Y LEGALIZACIÓN (ITC-BT-18 / 04 / 05) */}
                    {section === "tierras_legalizacion" && (
                      <>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            ρ = {earthInputs.soilResistivity ?? 150} Ω·m
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {earthInputs.numRods ?? 4} picas (
                            {earthInputs.rodLengthMeters ?? 2} m) +{" "}
                            {earthInputs.buriedConductorMeters ?? 15} m Cu
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">
                            IΔn = {earthInputs.rcdSensitivityMa ?? 30} mA
                          </div>
                          <div className="text-[11px] text-slate-500">
                            UL = {earthInputs.maxContactVoltageV ?? 50} V
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 ring-1 ring-emerald-600/20">
                            {earth.estimatedResistanceOhm ?? 9.68} Ω
                          </span>
                          <div className="mt-0.5 text-[10px] text-slate-500">
                            máx. {earth.maxAllowedRaOhm ?? 1666.7} Ω
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">
                            {rec.itc04_group ||
                              earthInputs.itc04Group ||
                              "e_edificio_viviendas"}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Pot. legalizar:{" "}
                            {earthInputs.itc04CustomPowerKw ?? 115} kW
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">
                            {rec.document_type || "Proyecto Técnico"}
                          </div>
                          <div className="text-[11px] font-semibold text-emerald-700">
                            OCA Inicial:{" "}
                            {rec.requires_oca ? "Requerida" : "Exenta (CIE)"}
                          </div>
                        </td>
                      </>
                    )}

                    {/* Columna Fecha */}
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      <div>{new Date(rec.created_at).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(rec.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>

                    {/* Columna Acciones: VER, EDITAR, ELIMINAR */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Botón VER */}
                        <button
                          type="button"
                          onClick={() => setViewingRecord(rec)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-100"
                          title="Ver todos los detalles de este registro"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500" />
                          Ver
                        </button>

                        {/* Botón EDITAR */}
                        <button
                          type="button"
                          onClick={async () => {
                            await onEditRecord(rec.id);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                            isEditing
                              ? "bg-amber-500 text-white shadow-2xs"
                              : "bg-[#e8f0fe] text-[#0f6cbd] hover:bg-blue-100"
                          }`}
                          title="Cargar este registro en el formulario superior para editarlo"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {isEditing ? "Editando" : "Editar"}
                        </button>

                        {/* Botón ELIMINAR (con confirmación rápida) */}
                        {canDelete && (
                          <>
                            {confirmDeleteId === rec.id ? (
                              <div className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-0.5">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await onDeleteRecord(rec.id);
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
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(rec.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/70 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                                title="Eliminar este registro del historial"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Eliminar
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* =====================================================================
          MODAL DE INSPECCIÓN DETALLADA DEL REGISTRO ("VER")
         ===================================================================== */}
      {viewingRecord && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-blue-50 px-2.5 py-0.5 font-mono text-xs font-bold text-[#0f6cbd]">
                    Registro #{viewingRecord.id}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Guardado en Historial
                  </span>
                </div>
                <h3 className="mt-1.5 text-base font-bold text-slate-900">
                  {getMeta(viewingRecord).expedienteNum} —{" "}
                  {getMeta(viewingRecord).titularNombre ||
                    viewingRecord.client_name}
                </h3>
                <p className="text-xs text-slate-500">
                  Registrado el{" "}
                  {new Date(viewingRecord.created_at).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Contenido Detallado del Registro */}
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Bloque 1: Titular y Ubicación */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2 text-xs">
                <div className="font-bold text-[#0f6cbd] uppercase text-[11px]">
                  1. Datos del Titular y Ubicación
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nº Instalación / Exp.:</span>
                  <span className="font-semibold text-slate-900">
                    {getMeta(viewingRecord).instalacionNum} /{" "}
                    {getMeta(viewingRecord).expedienteNum}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Titular (NIF/CIF):</span>
                  <span className="font-semibold text-slate-900">
                    {getMeta(viewingRecord).titularNombre} (
                    {getMeta(viewingRecord).titularNif})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dirección:</span>
                  <span className="font-semibold text-slate-900">
                    {getMeta(viewingRecord).direccionCalle}{" "}
                    {getMeta(viewingRecord).direccionNum},{" "}
                    {getMeta(viewingRecord).portalPlanta}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Municipio / Isla:</span>
                  <span className="font-semibold text-slate-900">
                    {getMeta(viewingRecord).terminoMunicipal} (
                    {getMeta(viewingRecord).isla})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Uso y Superficie:</span>
                  <span className="font-semibold text-slate-900">
                    {getMeta(viewingRecord).usoDestino} ·{" "}
                    {getMeta(viewingRecord).superficieUtilM2} m²
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Presupuesto Total:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {Number(
                      getMeta(viewingRecord).presupuestoTotalEuros || 0
                    ).toLocaleString()}{" "}
                    €
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Instalador / Empresa:</span>
                  <span className="font-semibold text-slate-900">
                    {getMeta(viewingRecord).instaladorNombrePh} (
                    {getMeta(viewingRecord).empresaInstaladoraNum})
                  </span>
                </div>
              </div>

              {/* Bloque 2: Cuadro de Circuitos y D.I. */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2 text-xs">
                <div className="font-bold text-[#0f6cbd] uppercase text-[11px]">
                  2. Cuadro de Circuitos y D.I.
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Suministro:</span>
                  <span className="font-semibold text-slate-900">
                    {viewingRecord.system_type === "trifasico_400v"
                      ? "Trifásico 400 V"
                      : "Monofásico 230 V"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Grado Electrificación:</span>
                  <span className="font-semibold capitalize text-slate-900">
                    {viewingRecord.electrification_grade}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Potencia Prevista:</span>
                  <span className="font-mono font-bold text-[#0f6cbd]">
                    {Number(viewingRecord.total_demand_va || 0).toLocaleString()}{" "}
                    W
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Protección General:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    IGA {viewingRecord.iga_amps} A ·{" "}
                    {viewingRecord.rcd_count || 2} Diferenciales
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Derivación Individual:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {viewingRecord.di_section_mm2 || 10} mm² Cu XLPE
                  </span>
                </div>
              </div>

              {/* Bloque 3: Previsión de Cargas del Edificio y LGA */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2 text-xs">
                <div className="font-bold text-[#0f6cbd] uppercase text-[11px]">
                  3. Previsión de Edificio y LGA (ITC-BT-10 / 52)
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">P1 Viviendas Simultánea:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {Number(
                      viewingRecord.building_forecast_json?.p1DwellingsWatts ??
                        82656
                    ).toLocaleString()}{" "}
                    W (
                    {viewingRecord.building_forecast_json?.totalDwellings ?? 16}{" "}
                    viv.)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">P2 Servicios Generales:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {Number(
                      viewingRecord.building_forecast_json
                        ?.p2GeneralServicesWatts ?? 11500
                    ).toLocaleString()}{" "}
                    W
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">P3 Locales Comerciales:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {Number(
                      viewingRecord.building_forecast_json?.p3CommercialWatts ??
                        14000
                    ).toLocaleString()}{" "}
                    W
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">P4 Garaje + P5 VE:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {Number(
                      viewingRecord.building_forecast_json?.p4GarageWatts ?? 9000
                    ).toLocaleString()}{" "}
                    W +{" "}
                    {Number(
                      viewingRecord.building_forecast_json?.p5EffectiveEvWatts ??
                        7360
                    ).toLocaleString()}{" "}
                    W
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5">
                  <span className="font-bold text-slate-700">
                    Potencia Total Edificio:
                  </span>
                  <span className="font-mono font-extrabold text-[#0f6cbd]">
                    {Number(
                      viewingRecord.building_forecast_json
                        ?.totalBuildingPowerWatts ?? 124516
                    ).toLocaleString()}{" "}
                    W
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">LGA / IGM:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    3×
                    {viewingRecord.building_forecast_json?.lgaCalculation
                      ?.sectionMm2 ?? 95}{" "}
                    mm² Cu · IGM{" "}
                    {viewingRecord.building_forecast_json?.igmAmps ?? 250} A
                  </span>
                </div>
              </div>

              {/* Bloque 4: Puesta a Tierra y Legalización */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2 text-xs">
                <div className="font-bold text-[#0f6cbd] uppercase text-[11px]">
                  4. Tierra y Legalización (ITC-BT-18 / 04 / 05)
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Resistencia Tierra Rt:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {viewingRecord.earthing_json?.estimatedResistanceOhm ??
                      9.68}{" "}
                    Ω (máx.{" "}
                    {viewingRecord.earthing_json?.maxAllowedRaOhm ?? 1666.7} Ω)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Configuración Picas/Cu:</span>
                  <span className="font-semibold text-slate-900">
                    {viewingRecord.earthing_json?._inputs?.numRods ?? 4} picas ·{" "}
                    {viewingRecord.earthing_json?._inputs
                      ?.buriedConductorMeters ?? 15}{" "}
                    m Cu
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Grupo ITC-BT-04:</span>
                  <span className="font-semibold text-slate-900">
                    {viewingRecord.itc04_group || "e_edificio_viviendas"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dictamen Legalización:</span>
                  <span className="font-bold text-slate-900">
                    {viewingRecord.document_type || "Proyecto Técnico"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Inspección Inicial OCA:</span>
                  <span className="font-semibold text-emerald-700">
                    {viewingRecord.requires_oca
                      ? "Sí Requerida"
                      : "Exenta (CIE)"}
                  </span>
                </div>
              </div>
            </div>

            {/* Acciones dentro del Modal */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={async () => {
                  const id = viewingRecord.id;
                  setViewingRecord(null);
                  await onOpenMtdForRecord(id);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-[#0f6cbd] hover:bg-blue-100"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Ver Ficha Técnica M.T.D. de este Registro
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewingRecord(null)}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const id = viewingRecord.id;
                    setViewingRecord(null);
                    await onEditRecord(id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f6cbd] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#115ea3]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Cargar para Editar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

