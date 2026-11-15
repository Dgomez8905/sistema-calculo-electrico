"use client";

import React, { useState } from "react";
import {
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  FileSpreadsheet,
  FileWarning,
  FolderPlus,
  Layers,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  Wrench,
  X,
  ArrowLeft,
  Search,
  XCircle,
} from "lucide-react";
import type {
  MtdFormMetadata,
  SystemSupplyType,
} from "@/lib/electrical-calculations";
import {
  analyzePanelImageToDualEvaluation,
  buildDualPanelEvaluation,
  type DualPanelEvaluationResult,
} from "@/lib/rebt-vision-canarias";

export type GuidedScratchTemplateId =
  | "vivienda_basica"
  | "vivienda_elevada_ve"
  | "local_comercial"
  | "industrial_mccb";

export interface GuidedScratchExpedientePayload {
  titularNombre: string;
  titularNif: string;
  direccionCalle: string;
  direccionNum: string;
  terminoMunicipal: string;
  isla: string;
  superficieUtilM2: number;
  usoDestino: string;
  tipoActuacion:
    | "Nueva instalación"
    | "Ampliación / Modificación"
    | "Reforma de importancia";
  supplyType: SystemSupplyType;
  templateId: GuidedScratchTemplateId;
  openTarget: "titular_ubicacion" | "circuitos" | "ficha_mtd";
}

interface NewExpedienteWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultIsla: string;
  defaultMunicipio: string;
  onCreateGuidedScratch: (payload: GuidedScratchExpedientePayload) => void;
  onApplyPhotoOption: (
    evaluation: DualPanelEvaluationResult,
    selectedMode: "estado_actual" | "instalacion_corregida",
    destination: "ficha_mtd" | "unifilar_cuadro" | "circuitos"
  ) => void;
  onSaveBothPhotoOptions: (
    evaluation: DualPanelEvaluationResult,
    openAfterSave: "estado_actual" | "instalacion_corregida"
  ) => Promise<void> | void;
  initialMeta?: MtdFormMetadata;
}

export default function NewExpedienteWizardModal({
  isOpen,
  onClose,
  defaultIsla,
  defaultMunicipio,
  onCreateGuidedScratch,
  onApplyPhotoOption,
  onSaveBothPhotoOptions,
}: NewExpedienteWizardModalProps) {
  const [wizardMode, setWizardMode] = useState<
    "choose_mode" | "from_photo" | "from_scratch"
  >("choose_mode");

  // Estado del camino por Fotografía Dual
  const [photoDataUrl, setPhotoDataUrl] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingBoth, setIsSavingBoth] = useState(false);
  const [dualResult, setDualResult] = useState<DualPanelEvaluationResult | null>(
    null
  );
  const [showManualAdjust, setShowManualAdjust] = useState(false);

  // Estado del camino Guiado desde Cero (2 pasos)
  const [scratchStep, setScratchStep] = useState<1 | 2>(1);
  const [titularNombre, setTitularNombre] = useState("");
  const [titularNif, setTitularNif] = useState("");
  const [direccionCalle, setDireccionCalle] = useState("");
  const [direccionNum, setDireccionNum] = useState("");
  const [terminoMunicipal, setTerminoMunicipal] = useState(
    defaultMunicipio || "Santa Cruz de Tenerife"
  );
  const [isla, setIsla] = useState(defaultIsla || "Tenerife");
  const [superficieUtilM2, setSuperficieUtilM2] = useState<number>(95);
  const [tipoActuacion, setTipoActuacion] = useState<
    "Nueva instalación" | "Ampliación / Modificación" | "Reforma de importancia"
  >("Nueva instalación");
  const [templateId, setTemplateId] =
    useState<GuidedScratchTemplateId>("vivienda_basica");
  const [supplyType, setSupplyType] =
    useState<SystemSupplyType>("monofasico_230v");

  if (!isOpen) return null;

  const generateFreshBaseCodes = () => {
    const year = new Date().getFullYear();
    const num = Math.floor(100 + Math.random() * 900);
    const islandCode = (isla || defaultIsla || "TE")
      .slice(0, 2)
      .toUpperCase();
    return {
      baseExpedienteNum: `EXP-${islandCode}-${year}-${num}`,
      baseInstalacionNum: `BT-${year}-${num}`,
    };
  };

  const processPanelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || "");
      setPhotoDataUrl(dataUrl);
      setWizardMode("from_photo");
      setIsAnalyzing(true);
      try {
        const codes = generateFreshBaseCodes();
        const evaluation = await analyzePanelImageToDualEvaluation({
          imageDataUrl: dataUrl,
          baseExpedienteNum: codes.baseExpedienteNum,
          baseInstalacionNum: codes.baseInstalacionNum,
        });
        setDualResult(evaluation);
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processPanelFile(file);
  };

  const handleRecalculateDualWithOverride = (patch: {
    supplyType?: SystemSupplyType;
    rawIgaAmps?: number;
    hasIcpOnly?: boolean;
    hasSurgeProtection?: boolean;
    rcdCount?: number;
    diferencialClase?: "AC" | "A";
  }) => {
    if (!dualResult) return;
    const act = dualResult.actual;
    const nextEval = buildDualPanelEvaluation({
      supplyType: patch.supplyType ?? act.supplyType,
      rawIgaAmps: patch.rawIgaAmps ?? act.rawDetectedIgaAmps,
      hasIcpOnly: patch.hasIcpOnly ?? act.hasIcpOnly,
      hasSurgeProtection: patch.hasSurgeProtection ?? act.hasSurgeProtection,
      rcdCount: patch.rcdCount ?? act.rcdCount,
      diferencialCalibreAmps: act.diferencialCalibreAmps,
      diferencialClase: patch.diferencialClase ?? act.diferencialClase,
      brandDetected: act.brandDetected,
      circuits: act.circuits,
      sourceLabel: `${dualResult.sourceLabel} (ajustado por técnico)`,
      photoDataUrl: dualResult.photoDataUrl,
      baseExpedienteNum: dualResult.baseExpedienteNum,
      baseInstalacionNum: dualResult.baseInstalacionNum,
      structuredVision: dualResult.structuredVision,
    });
    setDualResult(nextEval);
  };

  const resolveUsoDestinoFromTemplate = (tpl: GuidedScratchTemplateId) => {
    switch (tpl) {
      case "vivienda_basica":
        return "Vivienda (Electrificación Básica)";
      case "vivienda_elevada_ve":
        return "Vivienda (Electrificación Elevada + VE)";
      case "local_comercial":
        return "Local Comercial / Oficina";
      case "industrial_mccb":
        return "Nave Industrial / Gran Comercio";
    }
  };

  const handleFinishScratch = (
    openTarget: "titular_ubicacion" | "circuitos" | "ficha_mtd"
  ) => {
    onCreateGuidedScratch({
      titularNombre: titularNombre.trim(),
      titularNif: titularNif.trim(),
      direccionCalle: direccionCalle.trim(),
      direccionNum: direccionNum.trim(),
      terminoMunicipal: terminoMunicipal.trim() || defaultMunicipio,
      isla: isla || defaultIsla,
      superficieUtilM2: Number(superficieUtilM2) || 95,
      usoDestino: resolveUsoDestinoFromTemplate(templateId),
      tipoActuacion,
      supplyType,
      templateId,
      openTarget,
    });
    onClose();
  };

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-3 sm:p-5 backdrop-blur-xs overflow-y-auto">
      <div className="relative my-auto w-full max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-[#0f6cbd] to-[#115ea3] px-5 py-4 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-50">
                Asistente Guiado REBT · RD 842/2002
              </span>
              <h2 className="text-base sm:text-lg font-bold leading-tight">
                {wizardMode === "choose_mode" &&
                  "Iniciar Nuevo Expediente o Diagnóstico de Cuadro Eléctrico"}
                {wizardMode === "from_photo" &&
                  "Análisis de Cuadro por Foto: 2 Reportes y 2 Fichas Técnicas Separadas"}
                {wizardMode === "from_scratch" &&
                  `Nuevo Expediente Guiado Paso a Paso (Paso ${scratchStep} de 2)`}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {wizardMode !== "choose_mode" && (
              <button
                type="button"
                onClick={() => setWizardMode("choose_mode")}
                className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25 transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Cambiar modo
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar asistente"
              className="rounded-lg bg-white/10 p-1.5 text-white hover:bg-white/25 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Cuerpo desplazable */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-5 flex-1">
          {/* =================================================================
              PANTALLA INICIAL: ELEGIR CAMINO (FOTO DUAL vs DESDE CERO GUIADO)
             ================================================================= */}
          {wizardMode === "choose_mode" && (
            <div className="space-y-5">
              <p className="text-xs sm:text-sm text-slate-600">
                Selecciona cómo quieres comenzar. Si partes de una fotografía de un cuadro eléctrico existente, el sistema generará{" "}
                <strong className="text-slate-900">
                  dos opciones completamente separadas con fichas técnicas M.T.D. diferentes
                </strong>{" "}
                (Estado Actual vs Instalación Corregida).
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Tarjeta 1: Subir Foto del Cuadro Eléctrico */}
                <div className="group flex flex-col justify-between rounded-2xl border-2 border-blue-200 bg-gradient-to-b from-blue-50/70 to-white p-5 shadow-xs hover:border-[#0f6cbd] transition">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f6cbd] text-white shadow-xs">
                        <Camera className="h-5 w-5" />
                      </span>
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold text-[#0f6cbd]">
                        2 FICHAS M.T.D. SEPARADAS
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">
                      1. Desde Foto del Cuadro Eléctrico
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Sube la foto del cuadro eléctrico y obtén dos reportes independientes listos para abrir o guardar por separado:
                    </p>

                    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-xs">
                      <div className="flex items-start gap-2">
                        <FileWarning className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-900">
                            Opción A · Cómo está la instalación (Ficha -ACT):
                          </strong>{" "}
                          <span className="text-slate-600">
                            Refleja el cuadro tal cual está e indica si{" "}
                            <strong>CUMPLE o NO CUMPLE</strong> las normativas REBT.
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 pt-1 border-t border-slate-100">
                        <FileCheck2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-900">
                            Opción B · Correcciones y cómo debe ir (Ficha -COR):
                          </strong>{" "}
                          <span className="text-slate-600">
                            Detalla todas las correcciones obligatorias y genera su propia Ficha Técnica M.T.D. reformada al 100%.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <label className="flex-1 cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f6cbd] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#115ea3] transition">
                      <Upload className="h-4 w-4" />
                      Subir Foto del Cuadro Eléctrico
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoInputChange}
                        className="hidden"
                      />
                    </label>
                    {dualResult && (
                      <button
                        type="button"
                        onClick={() => setWizardMode("from_photo")}
                        className="rounded-xl border border-blue-300 bg-white px-3 py-2.5 text-xs font-semibold text-[#0f6cbd] hover:bg-blue-50"
                      >
                        Ver análisis actual
                      </button>
                    )}
                  </div>
                </div>

                {/* Tarjeta 2: Asistente Guiado Paso a Paso desde Cero */}
                <div className="flex flex-col justify-between rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-xs hover:border-emerald-500 transition">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                        <FolderPlus className="h-5 w-5" />
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-500/20">
                        PASO A PASO GUIADO
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">
                      2. Crear Expediente Nuevo desde Cero
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Asistente guiado para obras nuevas, ampliaciones o legalizaciones sin fotografía previa del cuadro:
                    </p>

                    <ul className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-700">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>
                          <strong>Paso 1:</strong> Titular, NIF/CIF, dirección, municipio e isla.
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>
                          <strong>Paso 2:</strong> Suministro (230 V / 400 V) y plantilla ITC-BT-25 (Básica, Elevada + VE, Comercio o Industria).
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>
                          Genera código limpio de expediente y abre los cálculos o la Ficha M.T.D.
                        </span>
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setScratchStep(1);
                      setWizardMode("from_scratch");
                    }}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                  >
                    Iniciar Asistente Paso a Paso
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              CAMINO 1: ANÁLISIS DUAL DESDE FOTO (ESTADO ACTUAL vs CORREGIDO)
             ================================================================= */}
          {wizardMode === "from_photo" && (
            <div className="space-y-5">
              {/* Barra superior con miniatura de la foto + botón cambiar foto + ajuste fino */}
              <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5">
                  {photoDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoDataUrl}
                      alt="Cuadro eléctrico subido"
                      className="h-20 w-28 rounded-lg border border-slate-300 bg-white object-contain shrink-0"
                    />
                  ) : (
                    <div className="flex h-20 w-28 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-slate-400">
                      <Camera className="h-6 w-6" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        Fotografía del Cuadro Eléctrico Analizada
                      </span>
                      {dualResult && (
                        <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-[#0f6cbd]">
                          {dualResult.sourceLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Se han generado <strong>dos expedientes separados</strong> con distinta numeración M.T.D.:{" "}
                      <code className="font-bold text-amber-800">
                        {dualResult?.actual.expedienteNum || "...-ACT"}
                      </code>{" "}
                      (Estado Actual) y{" "}
                      <code className="font-bold text-emerald-800">
                        {dualResult?.corregido.expedienteNum || "...-COR"}
                      </code>{" "}
                      (Instalación Corregida).
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {dualResult && (
                    <button
                      type="button"
                      onClick={() => setShowManualAdjust((v) => !v)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      {showManualAdjust
                        ? "Ocultar ajuste visual"
                        : "Ajustar lectura si foto borrosa"}
                    </button>
                  )}
                  <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[#0f6cbd] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#115ea3]">
                    <Upload className="h-3.5 w-3.5" />
                    Cambiar foto
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoInputChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {isAnalyzing && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-center space-y-2">
                  <p className="inline-flex items-center justify-center gap-2 text-sm font-bold text-[#0f6cbd]">
                    <Search className="h-4 w-4 animate-pulse" />
                    <span>Escaneando aparamenta DIN, protecciones y circuitos del cuadro eléctrico...</span>
                  </p>
                  <p className="text-xs text-slate-600">
                    Generando en paralelo el Diagnóstico de Estado Actual (-ACT) y la Propuesta de Correcciones REBT (-COR).
                  </p>
                </div>
              )}

              {/* Panel opcional de ajuste rápido por si alguna inscripción en la foto no es legible */}
              {!isAnalyzing && dualResult && showManualAdjust && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-2.5">
                  <p className="text-[11px] font-bold text-amber-900">
                    Ajuste rápido de lo observado en el cuadro real (recalcula al instante el Dictamen REBT y las Correcciones):
                  </p>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5 text-xs">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600">
                        Suministro visto
                      </label>
                      <select
                        value={dualResult.actual.supplyType}
                        onChange={(e) =>
                          handleRecalculateDualWithOverride({
                            supplyType: e.target.value as SystemSupplyType,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                      >
                        <option value="monofasico_230v">Monofásico 230 V</option>
                        <option value="trifasico_400v">Trifásico 400 V</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600">
                        Calibre cabecera (A)
                      </label>
                      <select
                        value={dualResult.actual.rawDetectedIgaAmps}
                        onChange={(e) =>
                          handleRecalculateDualWithOverride({
                            rawIgaAmps: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                      >
                        {[10, 15, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125].map(
                          (a) => (
                            <option key={a} value={a}>
                              {a} A
                            </option>
                          )
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600">
                        Tipo de cabecera
                      </label>
                      <select
                        value={dualResult.actual.hasIcpOnly ? "icp" : "iga"}
                        onChange={(e) =>
                          handleRecalculateDualWithOverride({
                            hasIcpOnly: e.target.value === "icp",
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                      >
                        <option value="iga">IGA omnipolar</option>
                        <option value="icp">Solo ICP antiguo (sin IGA)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600">
                        Sobretensiones visto
                      </label>
                      <select
                        value={
                          dualResult.actual.hasSurgeProtection ? "si" : "no"
                        }
                        onChange={(e) =>
                          handleRecalculateDualWithOverride({
                            hasSurgeProtection: e.target.value === "si",
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                      >
                        <option value="no">No tiene sobretensiones</option>
                        <option value="si">Sí tiene POP + DPS T2</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600">
                        Nº Diferenciales / Clase
                      </label>
                      <div className="mt-1 flex gap-1">
                        <select
                          value={dualResult.actual.rcdCount}
                          onChange={(e) =>
                            handleRecalculateDualWithOverride({
                              rcdCount: Number(e.target.value),
                            })
                          }
                          className="w-1/2 rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-xs"
                        >
                          {[1, 2, 3, 4].map((n) => (
                            <option key={n} value={n}>
                              {n} ID
                            </option>
                          ))}
                        </select>
                        <select
                          value={
                            dualResult.actual.diferencialClase === "A"
                              ? "A"
                              : "AC"
                          }
                          onChange={(e) =>
                            handleRecalculateDualWithOverride({
                              diferencialClase: e.target.value as "AC" | "A",
                            })
                          }
                          className="w-1/2 rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-xs"
                        >
                          <option value="AC">AC</option>
                          <option value="A">A</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ===============================================================
                  LAS DOS OPCIONES SEPARADAS LADO A LADO (FICHAS DIFERENTES)
                 =============================================================== */}
              {!isAnalyzing && dualResult && (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {/* OPCIÓN 1: ESTADO ACTUAL Y DICTAMEN DE CUMPLIMIENTO REBT */}
                  <div className="flex flex-col justify-between rounded-2xl border-2 border-amber-300 bg-white p-4 sm:p-5 shadow-xs">
                    <div className="space-y-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1 text-[11px] font-extrabold text-amber-950">
                          <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
                          OPCIÓN 1 · ESTADO ACTUAL DE LA INSTALACIÓN
                        </span>
                        <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-900">
                          Ficha #1: {dualResult.actual.expedienteNum}
                        </span>
                      </div>

                      {/* Dictamen grande ¿Cumple o No Cumple? */}
                      <div
                        className={`rounded-xl border p-3 ${
                          dualResult.overallCompliant
                            ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                            : "border-rose-300 bg-rose-50 text-rose-950"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase">
                            {dualResult.overallCompliant ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                <span>SÍ CUMPLE NORMATIVA REBT</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
                                <span>NO CUMPLE NORMATIVA REBT</span>
                              </>
                            )}
                          </span>
                          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold">
                            Índice: {dualResult.complianceScorePct}%
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] opacity-90">
                          {dualResult.actual.summarySentence}
                        </p>
                      </div>

                      {/* Checklist normativo ITC por ITC */}
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                          Verificación Normativa del Cuadro Existente:
                        </p>
                        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                          {dualResult.checks.map((chk) => (
                            <div
                              key={chk.id}
                              className={`rounded-lg border px-2.5 py-2 text-[11px] ${
                                chk.passed
                                  ? "border-emerald-200 bg-emerald-50/40"
                                  : chk.severity === "grave"
                                  ? "border-rose-200 bg-rose-50/50"
                                  : "border-amber-200 bg-amber-50/50"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-slate-900">
                                  {chk.passed ? "✓" : "✗"} {chk.itc} — {chk.title}
                                </span>
                                <span
                                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                    chk.passed
                                      ? "bg-emerald-100 text-emerald-800"
                                      : chk.severity === "grave"
                                      ? "bg-rose-100 text-rose-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {chk.passed
                                    ? "CUMPLE"
                                    : chk.severity === "grave"
                                    ? "NO CUMPLE"
                                    : "MEJORA"}
                                </span>
                              </div>
                              <p className="mt-0.5 text-slate-700">
                                <strong>Detectado:</strong> {chk.observedValue}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Acciones exclusivas de la Opción 1 (Ficha #1 -ACT) */}
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          onApplyPhotoOption(
                            dualResult,
                            "estado_actual",
                            "ficha_mtd"
                          );
                          onClose();
                        }}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Abrir Ficha Técnica #1 — Estado Actual (
                        {dualResult.actual.expedienteSuffix})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onApplyPhotoOption(
                            dualResult,
                            "estado_actual",
                            "unifilar_cuadro"
                          );
                          onClose();
                        }}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50/70 px-3 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-100 transition"
                      >
                        <Layers className="h-3.5 w-3.5" />
                        Ver Cuadro DIN y Unifilar tal como está instalado
                      </button>
                    </div>
                  </div>

                  {/* OPCIÓN 2: CORRECCIONES Y CÓMO DEBE IR LA INSTALACIÓN */}
                  <div className="flex flex-col justify-between rounded-2xl border-2 border-emerald-400 bg-white p-4 sm:p-5 shadow-xs">
                    <div className="space-y-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-950">
                          <Wrench className="h-3.5 w-3.5 text-emerald-700" />
                          OPCIÓN 2 · CORRECCIONES Y CÓMO DEBE IR
                        </span>
                        <span className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-900">
                          Ficha #2: {dualResult.corregido.expedienteNum}
                        </span>
                      </div>

                      {/* Resumen objetivo REBT */}
                      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-emerald-950">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase">
                            <ShieldCheck className="h-4 w-4 text-emerald-700" />
                            DISEÑO ADECUADO 100% REBT / NRZ103
                          </span>
                          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-emerald-900">
                            IGA {dualResult.corregido.igaAmps} A ·{" "}
                            {dualResult.corregido.rcdCount} ID Clase A ·{" "}
                            {dualResult.corregido.circuits.length} Cir.
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] opacity-90">
                          {dualResult.corregido.summarySentence}
                        </p>
                      </div>

                      {/* Lista paso a paso de correcciones y cómo debe ir */}
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                          Correcciones a realizar y cómo debe ir la instalación:
                        </p>
                        <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                          {dualResult.corrections.map((cor) => (
                            <div
                              key={cor.id}
                              className="rounded-lg border border-emerald-200 bg-emerald-50/35 px-2.5 py-2 text-[11px]"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-slate-900">
                                  {cor.order}. {cor.componentTarget}
                                </span>
                                <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-[#0f6cbd]">
                                  {cor.itc}
                                </span>
                              </div>
                              <p className="mt-0.5 text-rose-800">
                                <strong>Detectado:</strong> {cor.currentState}
                              </p>
                              <p className="mt-0.5 text-emerald-950">
                                <strong>Cómo debe ir:</strong> {cor.howItMustGo}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Acciones exclusivas de la Opción 2 (Ficha #2 -COR) */}
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          onApplyPhotoOption(
                            dualResult,
                            "instalacion_corregida",
                            "ficha_mtd"
                          );
                          onClose();
                        }}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Abrir Ficha Técnica #2 — Instalación Corregida (
                        {dualResult.corregido.expedienteSuffix})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onApplyPhotoOption(
                            dualResult,
                            "instalacion_corregida",
                            "unifilar_cuadro"
                          );
                          onClose();
                        }}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-950 hover:bg-emerald-100 transition"
                      >
                        <Layers className="h-3.5 w-3.5" />
                        Ver Cuadro DIN y Unifilar Corregido según REBT
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Barra inferior para guardar AMBAS opciones como dos expedientes independientes */}
              {!isAnalyzing && dualResult && (
                <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-slate-700">
                    <strong className="text-slate-900">
                      ¿Necesitas conservar ambos reportes por separado en tu historial?
                    </strong>
                    <p className="text-[11px] text-slate-600">
                      Guarda de una sola vez el expediente{" "}
                      <strong>{dualResult.actual.expedienteNum}</strong> (Estado Actual) y el expediente{" "}
                      <strong>{dualResult.corregido.expedienteNum}</strong> (Instalación Corregida), cada uno con su propia Ficha M.T.D.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isSavingBoth}
                    onClick={async () => {
                      setIsSavingBoth(true);
                      try {
                        await onSaveBothPhotoOptions(
                          dualResult,
                          "instalacion_corregida"
                        );
                        onClose();
                      } finally {
                        setIsSavingBoth(false);
                      }
                    }}
                    className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f6cbd] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#115ea3] disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {isSavingBoth
                      ? "Guardando 2 Fichas..."
                      : "Guardar Ambos Reportes por Separado (2 Fichas M.T.D.)"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              CAMINO 2: ASISTENTE GUIADO PASO A PASO DESDE CERO
             ================================================================= */}
          {wizardMode === "from_scratch" && (
            <div className="space-y-5">
              {/* Indicador visual de pasos */}
              <div className="flex items-center gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setScratchStep(1)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 ${
                    scratchStep === 1
                      ? "bg-[#0f6cbd] text-white"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  }`}
                >
                  <span>1. Titular y Ubicación</span>
                </button>
                <ChevronRight className="h-4 w-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setScratchStep(2)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 ${
                    scratchStep === 2
                      ? "bg-[#0f6cbd] text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <span>2. Tipo de Instalación y Plantilla REBT</span>
                </button>
              </div>

              {scratchStep === 1 && (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700">
                        Nombre o Razón Social del Titular
                      </label>
                      <input
                        type="text"
                        value={titularNombre}
                        onChange={(e) => setTitularNombre(e.target.value)}
                        placeholder="Ej. Juan Pérez Delgado / Comunidad Edificio Mar"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        NIF / NIE / CIF
                      </label>
                      <input
                        type="text"
                        value={titularNif}
                        onChange={(e) => setTitularNif(e.target.value)}
                        placeholder="Ej. 43829104Z"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700">
                        Calle / Avenida del Emplazamiento
                      </label>
                      <input
                        type="text"
                        value={direccionCalle}
                        onChange={(e) => setDireccionCalle(e.target.value)}
                        placeholder="Ej. Avda. Tres de Mayo"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Número / Piso
                      </label>
                      <input
                        type="text"
                        value={direccionNum}
                        onChange={(e) => setDireccionNum(e.target.value)}
                        placeholder="Ej. 42, 2ºA"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Término Municipal
                      </label>
                      <input
                        type="text"
                        value={terminoMunicipal}
                        onChange={(e) => setTerminoMunicipal(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Isla / Provincia
                      </label>
                      <select
                        value={isla}
                        onChange={(e) => setIsla(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                      >
                        <option value="Tenerife">Tenerife</option>
                        <option value="Gran Canaria">Gran Canaria</option>
                        <option value="Lanzarote">Lanzarote</option>
                        <option value="Fuerteventura">Fuerteventura</option>
                        <option value="La Palma">La Palma</option>
                        <option value="La Gomera">La Gomera</option>
                        <option value="El Hierro">El Hierro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Superficie Útil (m²)
                      </label>
                      <input
                        type="number"
                        min={10}
                        value={superficieUtilM2}
                        onChange={(e) =>
                          setSuperficieUtilM2(Number(e.target.value) || 95)
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setScratchStep(2)}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#0f6cbd] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#115ea3]"
                    >
                      Siguiente: Elegir Plantilla REBT
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {scratchStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Tipo de Actuación Administrativa
                      </label>
                      <select
                        value={tipoActuacion}
                        onChange={(e) =>
                          setTipoActuacion(
                            e.target.value as
                              | "Nueva instalación"
                              | "Ampliación / Modificación"
                              | "Reforma de importancia"
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                      >
                        <option value="Nueva instalación">
                          Nueva instalación
                        </option>
                        <option value="Ampliación / Modificación">
                          Ampliación / Modificación
                        </option>
                        <option value="Reforma de importancia">
                          Reforma de importancia
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Sistema de Suministro
                      </label>
                      <select
                        value={supplyType}
                        onChange={(e) =>
                          setSupplyType(e.target.value as SystemSupplyType)
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                      >
                        <option value="monofasico_230v">
                          Monofásico 230 V (Tarifa 2.0TD ≤ 14,49 kW)
                        </option>
                        <option value="trifasico_400v">
                          Trifásico 400/230 V (2.0TD / 3.0TD)
                        </option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Plantilla Inicial de Circuitos y Protecciones (ITC-BT-25 / ITC-BT-10):
                    </label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {[
                        {
                          id: "vivienda_basica" as GuidedScratchTemplateId,
                          title: "Vivienda Electrificación Básica (5,75 kW)",
                          sub: "IGA 25 A Combi + 2 ID 40A/30mA Clase A + 5 circuitos C1..C5",
                          supply: "monofasico_230v" as SystemSupplyType,
                        },
                        {
                          id: "vivienda_elevada_ve" as GuidedScratchTemplateId,
                          title: "Vivienda Electrificación Elevada + VE (≥ 9,20 kW)",
                          sub: "IGA 40/50 A Combi + Diferenciales Clase A + Circuitos C1..C13",
                          supply: "monofasico_230v" as SystemSupplyType,
                        },
                        {
                          id: "local_comercial" as GuidedScratchTemplateId,
                          title: "Local Comercial / Oficina Estándar (≤ 43 kW)",
                          sub: "Combi DIN 40 A + Alumbrado, Tomas, Climatización y Emergencia",
                          supply: "trifasico_400v" as SystemSupplyType,
                        },
                        {
                          id: "industrial_mccb" as GuidedScratchTemplateId,
                          title: "Gran Comercio / Industria (> 43 kW · MCCB)",
                          sub: "Trifásico 400 V · Caja Moldeada 80 A + Bobina MX + Fuerza",
                          supply: "trifasico_400v" as SystemSupplyType,
                        },
                      ].map((item) => {
                        const active = templateId === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setTemplateId(item.id);
                              setSupplyType(item.supply);
                            }}
                            className={`rounded-xl border p-3.5 text-left transition ${
                              active
                                ? "border-[#0f6cbd] bg-blue-50/70 ring-2 ring-[#0f6cbd]/20"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <div className="text-xs font-bold text-slate-900">
                              {item.title}
                            </div>
                            <div className="mt-1 text-[11px] text-slate-600">
                              {item.sub}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setScratchStep(1)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      ← Volver al Paso 1
                    </button>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleFinishScratch("titular_ubicacion")}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-xs font-bold text-[#0f6cbd] hover:bg-blue-100"
                      >
                        <ClipboardList className="h-4 w-4" />
                        Crear e Ir a Paso 1 (Titular)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFinishScratch("circuitos")}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                      >
                        Crear e Ir al Cuadro de Circuitos →
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFinishScratch("ficha_mtd")}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f6cbd] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#115ea3]"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Crear y Ver Ficha M.T.D.
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
