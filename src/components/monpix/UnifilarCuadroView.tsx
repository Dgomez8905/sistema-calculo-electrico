"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Camera,
  Mic,
  GitBranch,
  Printer,
  Download,
  Save,
  CheckCircle2,
  Plus,
  Trash2,
  Layers,
  ShieldAlert,
  Pencil,
  Box,
  ClipboardList,
  Cable,
  Zap,
  SearchCode,
  RotateCcw,
  AlertTriangle,
  Wrench,
  BookOpen,
} from "lucide-react";
import {
  calculateRebtCircuit,
  getSpanishIgaStepsForSupply,
  sanitizeSpanishIgaAmps,
  type RebtCalculatedCircuit,
  type RebtCircuitInput,
  type MtdFormMetadata,
  type SystemSupplyType,
} from "@/lib/electrical-calculations";
import {
  ORIENTATIVE_DISCLAIMER,
  parseUnifilarFromSpeechOrText,
  type ParsedPanelDraft,
} from "@/lib/monpix-engine";
import {
  useSpeechDictation,
  downloadTextFile,
  type SavedUnifilarDiagram,
  type UnifiedMaterialOrderItem,
} from "@/lib/monpix-store";
import { buildUnifilarIec60617Svg } from "@/lib/unifilar-iec60617";
import DinModularDeviceVisual, {
  DIN_BRAND_STYLES,
  type DinBrandId,
} from "./DinModularDeviceVisual";
import {
  type DinModule,
  type DinModuleKind,
  FAULT_CHALLENGES,
  IEC_60617_LEGEND,
  buildDinModulesFromProject,
  computePanelLiveState,
  suggestBoxCapacityModules,
  validateDinPanelInstallation,
} from "./dinPanelHelpers";

interface UnifilarCuadroViewProps {
  meta: MtdFormMetadata;
  supplyType: SystemSupplyType;
  igaAmps: number;
  rcdCount: number;
  diSectionMm2: number;
  calculatedCircuits: RebtCalculatedCircuit[];
  companyLogoDataUrl: string;
  savedUnifilares: SavedUnifilarDiagram[];
  savedDinModules?: DinModule[];
  savedBoxModules?: number | "auto";
  onPersistDinPanel?: (modules: DinModule[], boxSize: number | "auto") => void;
  onAddToUnifiedOrder?: (items: UnifiedMaterialOrderItem[]) => void;
  onApplyDraftCircuits: (
    nextCircuits: RebtCircuitInput[],
    nextSupply: SystemSupplyType,
    panelMeta?: {
      igaAmps?: number;
      rcdCount?: number;
      hasSurgeProtection?: boolean;
      electrificationGrade?: "basica" | "elevada";
      diferencialCalibreAmps?: number;
      diferencialClase?: "AC" | "A";
      formatLabel?: string;
      isAutoFromPhoto?: boolean;
    }
  ) => void;
  onOpenFichaMtd?: () => void;
  onSaveDiagramRecord: (item: SavedUnifilarDiagram) => void;
}

export default function UnifilarCuadroView({
  meta,
  supplyType,
  igaAmps,
  rcdCount,
  diSectionMm2,
  calculatedCircuits,
  companyLogoDataUrl,
  savedUnifilares,
  savedDinModules,
  savedBoxModules,
  onPersistDinPanel,
  onAddToUnifiedOrder,
  onApplyDraftCircuits,
  onOpenFichaMtd,
  onSaveDiagramRecord,
}: UnifilarCuadroViewProps) {
  const [stepTab, setStepTab] = useState<
    "captura_datos" | "cuadro_din" | "esquema_a3"
  >("cuadro_din");
  const [hasCombiSurge, setHasCombiSurge] = useState(true);
  const [planNumber, setPlanNumber] = useState("01");
  const [icuKa, setIcuKa] = useState(6);
  const [draggedModId, setDraggedModId] = useState<string | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);

  // ============================================================================
  // Estado Interactivo del Simulador de Cuadro Eléctrico DIN (Persistente por Obra)
  // ============================================================================
  const sanitizeSavedModules = (mods: DinModule[]) =>
    mods.map((m) =>
      (m.kind === "IGA" || m.kind === "COMBI") &&
      m.poles <= 2 &&
      m.ratingAmps > 63
        ? { ...m, ratingAmps: sanitizeSpanishIgaAmps(igaAmps, "monofasico_230v") }
        : m
    );

  const [dinModules, setDinModules] = useState<DinModule[]>(() =>
    savedDinModules && savedDinModules.length > 0
      ? sanitizeSavedModules(savedDinModules)
      : buildDinModulesFromProject({
          supplyType,
          igaAmps,
          rcdCount,
          hasCombiSurge,
          meta,
          circuits: calculatedCircuits,
        })
  );
  const [customBoxModules, setCustomBoxModules] = useState<number | "auto">(
    savedBoxModules ?? "auto"
  );
  const [dinBrand, setDinBrand] = useState<DinBrandId>("Schneider");
  const [selectedModId, setSelectedModId] = useState<string>("mod-iga");
  const [editDrawerOpen, setEditDrawerOpen] = useState<boolean>(false);
  const [showCables, setShowCables] = useState<boolean>(false);
  const [is3DMode, setIs3DMode] = useState<boolean>(false);
  const [showMaterialModal, setShowMaterialModal] = useState<boolean>(false);
  const [earthFaultModuleId, setEarthFaultModuleId] = useState<string | null>(null);
  const [simFeedback, setSimFeedback] = useState<string>(
    "Haz clic sobre cualquier maneta del cuadro para encender/apagar o pulsa TEST en un diferencial."
  );

  // Modo "Encuentra la avería"
  const [activeChallengeIdx, setActiveChallengeIdx] = useState<number | null>(null);
  const [challengePickedOption, setChallengePickedOption] = useState<number | null>(
    null
  );

  // Añadir nuevo componente rápido en paleta
  const [newModKind, setNewModKind] = useState<DinModuleKind>("PIA");
  const [newModLabel, setNewModLabel] = useState("C14");
  const [newModDesc, setNewModDesc] = useState("Circuito Auxiliar");
  const [newModAmps, setNewModAmps] = useState(16);
  const [newModSection, setNewModSection] = useState(2.5);

  // Entrada por texto/voz o foto con paso obligatorio "Revísalo y guárdalo"
  const [speechText, setSpeechText] = useState(
    "Cuadro vivienda monofásico IGA 40A con combi sobretensiones, 2 diferenciales de 40A 30mA, C1 alumbrado 10A, C2 enchufes 16A, C3 cocina y horno 25A, C4 lavadora 20A, C5 baño 16A, C9 aire acondicionado 25A y recarga coche 32A"
  );
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string>("");
  const [photoVisionNote, setPhotoVisionNote] = useState<string>("");
  const [pendingDraft, setPendingDraft] = useState<ParsedPanelDraft | null>(null);
  const [lastGeneratedDraft, setLastGeneratedDraft] =
    useState<ParsedPanelDraft | null>(null);
  const [draftConfirmedMsg, setDraftConfirmedMsg] = useState<string>("");

  const prevExpedienteRef = useRef<string>(meta.expedienteNum);
  const skipNextSignatureRebuildRef = useRef<boolean>(false);

  // Sincronización inteligente:
  // - Si cambia el número de expediente, restaura el cuadro DIN guardado de esa obra (si existe).
  // - Si dentro del mismo expediente cambian los circuitos/IGA/diferenciales/sobretensiones,
  //   regenera el cuadro DIN y el Unifilar para reflejar los nuevos datos al instante.
  const projectSignature = useMemo(
    () =>
      `${meta.expedienteNum}|${supplyType}|${igaAmps}|${rcdCount}|${hasCombiSurge}|${calculatedCircuits
        .map((c) => `${c.code}:${c.piaAmps}:${c.sectionMm2}:${c.description}`)
        .join(",")}`,
    [meta.expedienteNum, supplyType, igaAmps, rcdCount, hasCombiSurge, calculatedCircuits]
  );

  useEffect(() => {
    const isExpedienteSwitch = prevExpedienteRef.current !== meta.expedienteNum;
    prevExpedienteRef.current = meta.expedienteNum;

    if (skipNextSignatureRebuildRef.current && !isExpedienteSwitch) {
      skipNextSignatureRebuildRef.current = false;
      return;
    }

    if (isExpedienteSwitch && savedDinModules && savedDinModules.length > 0) {
      setDinModules(sanitizeSavedModules(savedDinModules));
    } else {
      setDinModules(
        buildDinModulesFromProject({
          supplyType,
          igaAmps,
          rcdCount,
          hasCombiSurge,
          meta,
          circuits: calculatedCircuits,
        })
      );
    }
    setEarthFaultModuleId(null);
    setActiveChallengeIdx(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectSignature]);

  // Persistir automáticamente cada cambio del simulador DIN en el workspace del expediente
  const lastPersistedJsonRef = useRef<string>("");
  useEffect(() => {
    const serialized = JSON.stringify({
      exp: meta.expedienteNum,
      box: customBoxModules,
      mods: dinModules,
    });
    if (serialized === lastPersistedJsonRef.current) return;
    lastPersistedJsonRef.current = serialized;
    onPersistDinPanel?.(dinModules, customBoxModules);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dinModules, customBoxModules, meta.expedienteNum]);

  const { isListening, voiceError, toggleListening } = useSpeechDictation(
    (spoken) => {
      setSpeechText((prev) => (prev ? `${prev}, ${spoken}` : spoken));
    }
  );

  // Aplica automáticamente el formato de circuito detectado al Simulador DIN, al Plano Unifilar IEC 60617 y a la Ficha Técnica M.T.D.
  const applyDraftEverywhere = (
    draft: ParsedPanelDraft,
    opts?: {
      switchToTab?: "cuadro_din" | "esquema_a3";
      isAutoFromPhoto?: boolean;
    }
  ) => {
    const calcFromDraft = draft.circuits.map((c) => calculateRebtCircuit(c));
    const freshDinModules = buildDinModulesFromProject({
      supplyType: draft.supplyType,
      igaAmps: draft.igaAmps,
      rcdCount: draft.rcdCount,
      hasCombiSurge: draft.hasSurgeProtection,
      meta: { ...meta, diferencialClase: draft.diferencialClase },
      circuits: calcFromDraft,
    });
    skipNextSignatureRebuildRef.current = true;
    setHasCombiSurge(draft.hasSurgeProtection);
    setDinModules(freshDinModules);
    onPersistDinPanel?.(freshDinModules, customBoxModules);
    onApplyDraftCircuits(draft.circuits, draft.supplyType, {
      igaAmps: draft.igaAmps,
      rcdCount: draft.rcdCount,
      hasSurgeProtection: draft.hasSurgeProtection,
      electrificationGrade: draft.electrificationGrade,
      diferencialCalibreAmps: draft.diferencialCalibreAmps,
      diferencialClase: draft.diferencialClase,
      formatLabel: draft.formatLabel,
      isAutoFromPhoto: opts?.isAutoFromPhoto,
    });
    setLastGeneratedDraft(draft);
    setDraftConfirmedMsg(
      `⚡ Generación automática completada (${draft.formatLabel}): IGA ${draft.igaAmps} A · ${draft.rcdCount} diferencial(es) · ${draft.circuits.length} circuitos actualizados en Simulador DIN, Plano Unifilar IEC 60617 y Ficha Técnica M.T.D.`
    );
    if (opts?.switchToTab) {
      setStepTab(opts.switchToTab);
    }
  };

  // Escáner visual local sobre <canvas>: detecta formato monofásico 2P vs trifásico 4P, cartuchos DPS y número de manetas DIN
  const analyzePanelPhotoLocally = (dataUrl: string): Promise<string> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const w = 320;
          const h = Math.max(120, Math.round((img.height / Math.max(1, img.width)) * w));
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve("Monofásico 230V IGA 25A sin sobretensiones, 1 diferencial de 40A 30mA, 5 automáticos");
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          const { data } = ctx.getImageData(0, 0, w, h);

          // 1. Detectar manetas oscuras y anchura máxima de puente (4P trifásico vs 1P/2P monofásico)
          let bestPeaks = 0;
          let hasGapSplit = false;
          let widestBarPx = 0;
          for (let rowPct = 0.34; rowPct <= 0.66; rowPct += 0.04) {
            const y = Math.floor(h * rowPct);
            let darkRun = 0;
            let lightGap = 0;
            let peaks = 0;
            let splitDetected = false;
            let rowWidest = 0;
            for (let x = Math.floor(w * 0.08); x < Math.floor(w * 0.92); x++) {
              const idx = (y * w + x) * 4;
              const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
              if (lum < 78) {
                darkRun++;
                if (darkRun > rowWidest) rowWidest = darkRun;
                if (peaks > 0 && lightGap > Math.floor(w * 0.12)) {
                  splitDetected = true;
                }
                lightGap = 0;
              } else {
                if (darkRun >= 3 && darkRun <= 56) {
                  peaks++;
                }
                darkRun = 0;
                lightGap++;
              }
            }
            if (peaks > bestPeaks) {
              bestPeaks = peaks;
              hasGapSplit = splitDetected;
              widestBarPx = rowWidest;
            }
          }

          // 2. Detectar visor verde/naranja vivo típico de cartucho DPS T2 en el tercio izquierdo del carril
          let vividGreenOrOrange = 0;
          for (let y = Math.floor(h * 0.28); y < Math.floor(h * 0.55); y += 2) {
            for (let x = Math.floor(w * 0.14); x < Math.floor(w * 0.45); x += 2) {
              const idx = (y * w + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              if ((g > 155 && g > r * 1.35 && g > b * 1.35) || (r > 195 && g > 90 && g < 155 && b < 60)) {
                vividGreenOrOrange++;
              }
            }
          }

          const isThreePhaseBar = widestBarPx >= Math.floor(w * 0.125) && bestPeaks >= 4;
          const hasSurge = vividGreenOrOrange >= 18;
          const estimatedPias = Math.max(3, Math.min(9, bestPeaks >= 4 ? bestPeaks - 2 : 6));
          const rcds = estimatedPias > 5 ? 2 : 1;
          const iga = isThreePhaseBar ? 40 : hasGapSplit ? 25 : estimatedPias >= 6 ? 40 : 32;
          const formatStr = isThreePhaseBar ? "Trifásico 400V (4 polos)" : "Monofásico 230V";
          const surgeStr = hasSurge ? "con sobretensiones T2+POP" : "sin sobretensiones";

          resolve(
            `Cuadro detectado (${formatStr}): IGA ${iga}A ${surgeStr}, ${rcds} diferencial${
              rcds > 1 ? "es" : ""
            } de 40A 30mA, ${estimatedPias} automáticos`
          );
        } catch {
          resolve("Cuadro detectado (Monofásico 230V): IGA 32A sin sobretensiones, 1 diferencial de 40A 30mA, 6 automáticos");
        }
      };
      img.onerror = () =>
        resolve("Cuadro detectado (Monofásico 230V): IGA 32A sin sobretensiones, 1 diferencial de 40A 30mA, 6 automáticos");
      img.src = dataUrl;
    });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || "");
      setPhotoPreviewUrl(dataUrl);
      setIsAnalyzingPhoto(true);
      setPhotoVisionNote("");
      try {
        const res = await fetch("/api/analyze-vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "cuadro_electrico",
            imageDataUrl: dataUrl,
          }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          mode?: string;
          extractedText?: string;
          note?: string;
        };

        let textToParse = "";
        let sourceTag = "Escáner visual local";
        if (
          json?.ok &&
          json.extractedText &&
          json.mode &&
          json.mode !== "heuristic_fallback"
        ) {
          textToParse = json.extractedText;
          sourceTag = `Visión IA (${json.mode})`;
        } else {
          textToParse = await analyzePanelPhotoLocally(dataUrl);
        }
        const detectedDraft = parseUnifilarFromSpeechOrText(textToParse);
        setSpeechText(textToParse);
        setPendingDraft(detectedDraft);
        applyDraftEverywhere(detectedDraft, { isAutoFromPhoto: true });
        setPhotoVisionNote(
          `✅ ${sourceTag}: Formato «${detectedDraft.formatLabel}» detectado. El Simulador DIN, el Esquema Unifilar IEC 60617 y la Ficha Técnica M.T.D. ya se han generado automáticamente.`
        );
      } catch {
        const localText = await analyzePanelPhotoLocally(dataUrl);
        const detectedDraft = parseUnifilarFromSpeechOrText(localText);
        setSpeechText(localText);
        setPendingDraft(detectedDraft);
        applyDraftEverywhere(detectedDraft, { isAutoFromPhoto: true });
        setPhotoVisionNote(
          `✅ Escáner visual local: Formato «${detectedDraft.formatLabel}» detectado. Simulador DIN, Esquema Unifilar y Ficha Técnica M.T.D. generados automáticamente.`
        );
      } finally {
        setIsAnalyzingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Capacidad envolvente & ocupación
  const usedModulesCount = useMemo(
    () => dinModules.reduce((acc, m) => acc + m.modulesWidth, 0),
    [dinModules]
  );

  const boxGeometry = useMemo(() => {
    const autoGeo = suggestBoxCapacityModules(usedModulesCount);
    if (customBoxModules === "auto") return autoGeo;
    const free = Math.max(0, customBoxModules - usedModulesCount);
    const perRow = customBoxModules <= 18 ? customBoxModules : 12;
    const rows = Math.max(1, Math.ceil(customBoxModules / perRow));
    return {
      boxModules: customBoxModules,
      rows,
      perRow,
      freeModules: free,
      reservePct: Math.round((free / customBoxModules) * 100),
    };
  }, [usedModulesCount, customBoxModules]);

  // Estado eléctrico vivo y validación REBT en tiempo real
  const liveStatusMap = useMemo(
    () => computePanelLiveState(dinModules, earthFaultModuleId),
    [dinModules, earthFaultModuleId]
  );

  const diagnostics = useMemo(
    () => validateDinPanelInstallation(dinModules, boxGeometry.boxModules),
    [dinModules, boxGeometry.boxModules]
  );

  const errorDiagnostics = diagnostics.filter((d) => d.severity === "error");
  const errorModuleIds = useMemo(
    () => new Set(errorDiagnostics.map((d) => d.moduleId).filter(Boolean)),
    [errorDiagnostics]
  );

  const selectedModule =
    dinModules.find((m) => m.id === selectedModId) || dinModules[0] || null;
  const availableRcds = dinModules.filter((m) => m.kind === "DIF");
  const piasCount = dinModules.filter((m) => m.kind === "PIA").length;

  // ============================================================================
  // Interacciones con Interruptores y Simulación de Averías
  // ============================================================================
  const handleToggleSwitch = (id: string) => {
    setDinModules((prev) => {
      const target = prev.find((m) => m.id === id);
      if (!target) return prev;
      const nextOn = !target.isOn;

      // Rearmar diferencial si estaba disparado y lo vuelve a subir
      if (target.kind === "DIF" && target.isTripped && nextOn) {
        if (earthFaultModuleId) {
          const faultyMod = prev.find((p) => p.id === earthFaultModuleId);
          if (faultyMod && faultyMod.parentRcdId === target.id && faultyMod.isOn) {
            setSimFeedback(
              `⚠️ ${target.label} vuelve a saltar al intentar rearmarlo porque persiste la fuga a tierra en ${faultyMod.label}. Baja primero ${faultyMod.label} para aislar la avería.`
            );
            return prev.map((m) =>
              m.id === id ? { ...m, isOn: false, isTripped: true } : m
            );
          }
        }
        setSimFeedback(`✅ ${target.label} rearmado correctamente (30 mA en servicio).`);
        return prev.map((m) =>
          m.id === id ? { ...m, isOn: true, isTripped: false } : m
        );
      }

      // Si sube un PIA con neutro cruzado mientras hay tensión -> dispara los dos DIFs
      if (
        target.kind === "PIA" &&
        nextOn &&
        target.parentRcdId &&
        target.neutralSourceRcdId &&
        target.neutralSourceRcdId !== target.parentRcdId
      ) {
        setSimFeedback(
          `⚡ ¡Disparo instantáneo al subir ${target.label}! Su fase y su neutro pertenecen a diferenciales distintos (neutro cruzado).`
        );
        return prev.map((m) => {
          if (m.id === id) return { ...m, isOn: true };
          if (
            m.id === target.parentRcdId ||
            m.id === target.neutralSourceRcdId
          ) {
            return { ...m, isOn: false, isTripped: true };
          }
          return m;
        });
      }

      // Si sube un PIA que tiene fuga activa -> vuelve a disparar su DIF
      if (target.kind === "PIA" && nextOn && earthFaultModuleId === target.id) {
        const parent = prev.find((r) => r.id === target.parentRcdId);
        if (parent) {
          setSimFeedback(
            `⚡ ¡${parent.label} ha saltado al subir ${target.label}! Confirmas que la fuga está en este circuito.`
          );
          return prev.map((m) => {
            if (m.id === id) return { ...m, isOn: true };
            if (m.id === parent.id) return { ...m, isOn: false, isTripped: true };
            return m;
          });
        }
      }

      setSimFeedback(
        nextOn
          ? `🔵 ${target.label} (${target.sublabel}) encendido (I-ON).`
          : `⚪ ${target.label} (${target.sublabel}) apagado (0-OFF).`
      );
      return prev.map((m) =>
        m.id === id ? { ...m, isOn: nextOn, isTripped: false } : m
      );
    });
  };

  const handleTriggerRcdTest = (rcdId: string) => {
    setDinModules((prev) =>
      prev.map((m) =>
        m.id === rcdId ? { ...m, isOn: false, isTripped: true } : m
      )
    );
    const rcd = dinModules.find((m) => m.id === rcdId);
    setSimFeedback(
      `🧪 Pulsado botón TEST en ${rcd?.label || "Diferencial"}: disparo mecánico correcto (< 30 ms). Sube su maneta para rearmar.`
    );
  };

  const handleInjectEarthLeakage = () => {
    const energizedPias = dinModules.filter(
      (m) => m.kind === "PIA" && m.isOn
    );
    const targetPia =
      energizedPias[Math.min(2, Math.max(0, energizedPias.length - 1))] ||
      dinModules.find((m) => m.kind === "PIA");

    if (!targetPia) {
      setSimFeedback("⚠️ Añade al menos un PIA de circuito para simular una fuga a tierra.");
      return;
    }

    setEarthFaultModuleId(targetPia.id);
    const parentRcd = dinModules.find((r) => r.id === targetPia.parentRcdId);

    if (parentRcd) {
      setDinModules((prev) =>
        prev.map((m) =>
          m.id === parentRcd.id ? { ...m, isOn: false, isTripped: true } : m
        )
      );
      setSimFeedback(
        `⚡ Fuga de 45 mA provocada en ${targetPia.label} (${targetPia.sublabel}): ${parentRcd.label} ha disparado protegiendo a las personas. Prueba a bajar los PIAs de ese grupo y rearmar ${parentRcd.label}.`
      );
    } else {
      setSimFeedback(
        `🚨 PELIGRO CRÍTICO: Fuga provocada en ${targetPia.label}, pero NO tiene diferencial aguas arriba. ¡La fuga NO ha disparado ningún corte automático!`
      );
    }
  };

  const handleStartFaultChallenge = () => {
    const nextIdx =
      activeChallengeIdx === null
        ? 0
        : (activeChallengeIdx + 1) % FAULT_CHALLENGES.length;
    const scenario = FAULT_CHALLENGES[nextIdx];
    setActiveChallengeIdx(nextIdx);
    setChallengePickedOption(null);
    setShowCables(true);

    // Base limpia para inyectar la avería concreta
    const base = buildDinModulesFromProject({
      supplyType,
      igaAmps,
      rcdCount: Math.max(2, rcdCount),
      hasCombiSurge,
      meta,
      circuits: calculatedCircuits,
    });

    if (scenario.id === "fault_undersized_wire") {
      const idx = base.findIndex((m) => m.kind === "PIA");
      if (idx >= 0) {
        base[idx] = {
          ...base[idx],
          ratingAmps: 25,
          cableSectionMm2: 1.5,
        };
      }
    } else if (scenario.id === "fault_no_rcd") {
      const idx = base.findIndex((m, i) => m.kind === "PIA" && i > 3);
      if (idx >= 0) {
        base[idx] = { ...base[idx], parentRcdId: "" };
      }
    } else if (scenario.id === "fault_crossed_neutral") {
      const rcds = base.filter((m) => m.kind === "DIF");
      const idx = base.findIndex((m) => m.kind === "PIA");
      if (rcds.length >= 2 && idx >= 0) {
        base[idx] = {
          ...base[idx],
          parentRcdId: rcds[0].id,
          neutralSourceRcdId: rcds[1].id,
        };
      }
    } else if (scenario.id === "fault_missing_pe") {
      const idx = base.findIndex((m) => m.kind === "PIA");
      if (idx >= 0) {
        base[idx] = { ...base[idx], hasEarthConnected: false };
      }
    }

    setDinModules(base);
    setEarthFaultModuleId(null);
    setSimFeedback(
      `🕵️ Modo Avería activo: «${scenario.title}». Revisa los cables, prueba los interruptores y elige el diagnóstico abajo.`
    );
  };

  const handleResetSimulator = () => {
    setDinModules(
      buildDinModulesFromProject({
        supplyType,
        igaAmps,
        rcdCount,
        hasCombiSurge,
        meta,
        circuits: calculatedCircuits,
      })
    );
    setEarthFaultModuleId(null);
    setActiveChallengeIdx(null);
    setChallengePickedOption(null);
    setSimFeedback("🔄 Simulador reiniciado con todos los interruptores I-ON y sin averías.");
  };

  // ============================================================================
  // Agregar, editar, mover, quitar y autocorregir componentes en el cuadro
  // ============================================================================
  const handleAddComponentToRail = () => {
    const id = `mod-custom-${Date.now()}`;
    const firstRcdId = availableRcds[0]?.id || "";
    const isThreePhase = supplyType === "trifasico_400v";

    let mod: DinModule;
    if (newModKind === "IGA") {
      mod = {
        id,
        kind: "IGA",
        label: "IGA",
        sublabel: isThreePhase ? "4P" : "2P",
        ratingAmps: sanitizeSpanishIgaAmps(newModAmps, supplyType),
        curve: "C",
        poles: isThreePhase ? 4 : 2,
        modulesWidth: isThreePhase ? 4 : 2,
        isOn: true,
      };
    } else if (newModKind === "COMBI") {
      mod = {
        id,
        kind: "COMBI",
        label: "COMBI IGA",
        sublabel: isThreePhase ? "4P IGA+T2+POP" : "2P IGA+T2+POP",
        ratingAmps: sanitizeSpanishIgaAmps(newModAmps, supplyType),
        curve: "C",
        poles: isThreePhase ? 4 : 2,
        modulesWidth: isThreePhase ? 4 : 3,
        isOn: true,
      };
    } else if (newModKind === "DPS") {
      mod = {
        id,
        kind: "DPS",
        label: "DPS",
        sublabel: "Transitorias",
        ratingAmps: 15,
        poles: isThreePhase ? 4 : 2,
        modulesWidth: 2,
        isOn: true,
      };
    } else if (newModKind === "POP") {
      mod = {
        id,
        kind: "POP",
        label: "POP",
        sublabel: "Permanentes",
        ratingAmps: 40,
        poles: 1,
        modulesWidth: 1,
        isOn: true,
      };
    } else if (newModKind === "DIF") {
      const nextNum = availableRcds.length + 1;
      mod = {
        id,
        kind: "DIF",
        label: `DIF #${nextNum}`,
        sublabel: `30mA · ${meta.diferencialClase}`,
        ratingAmps: Math.max(40, newModAmps),
        sensitivityMa: 30,
        rcdClass: meta.diferencialClase,
        poles: isThreePhase ? 4 : 2,
        modulesWidth: isThreePhase ? 4 : 2,
        isOn: true,
        isTripped: false,
      };
    } else if (newModKind === "PIA") {
      mod = {
        id,
        kind: "PIA",
        label: newModLabel.trim() || `C${piasCount + 1}`,
        sublabel: newModDesc.trim() || "Nuevo circuito",
        ratingAmps: newModAmps,
        curve: "C",
        poles: 2,
        modulesWidth: 1,
        isOn: true,
        parentRcdId: firstRcdId,
        neutralSourceRcdId: firstRcdId,
        cableSectionMm2: newModSection,
        hasEarthConnected: true,
        powerWatts: Math.round(newModAmps * 230 * 0.8),
        phaseAssigned: "L1",
        circuitCode: newModLabel.trim() || `C${piasCount + 1}`,
      };
    } else {
      mod = {
        id,
        kind: newModKind,
        label:
          newModKind === "CONTACTOR"
            ? "KM1"
            : newModKind === "TIMER"
            ? "K1"
            : "kWh",
        sublabel:
          newModKind === "CONTACTOR"
            ? "Contactor"
            : newModKind === "TIMER"
            ? "Reloj"
            : "Medidor",
        ratingAmps: newModAmps,
        poles: 2,
        modulesWidth: newModKind === "METER" ? 2 : 1,
        isOn: true,
      };
    }

    setDinModules((prev) => {
      if (mod.kind === "COMBI") {
        // El Combi sustituye al IGA suelto y a DPS/POP separados en cabecera
        const cleaned = prev.filter(
          (m) => m.kind !== "IGA" && m.kind !== "COMBI" && m.kind !== "DPS" && m.kind !== "POP"
        );
        return [mod, ...cleaned];
      }
      if (mod.kind === "IGA") {
        const cleaned = prev.filter((m) => m.kind !== "IGA" && m.kind !== "COMBI");
        return [mod, ...cleaned];
      }
      return [...prev, mod];
    });
    setSelectedModId(mod.id);
    setSimFeedback(
      mod.kind === "COMBI"
        ? `➕ Cabecera actualizada con ${mod.label} (${mod.ratingAmps} A + T2 + POP), sustituyendo al IGA suelto.`
        : `➕ Añadido ${mod.label} (${mod.sublabel}) al carril DIN.`
    );
  };

  const handleRemoveModule = (id: string) => {
    setDinModules((prev) => prev.filter((m) => m.id !== id));
    if (earthFaultModuleId === id) setEarthFaultModuleId(null);
    setSimFeedback("🗑️ Componente retirado del cuadro eléctrico.");
  };

  const handleMoveModule = (id: string, dir: -1 | 1) => {
    setDinModules((prev) => {
      const idx = prev.findIndex((m) => m.id === id);
      if (idx < 0) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  };

  const handleDropReorder = (targetId: string) => {
    if (!draggedModId || draggedModId === targetId) return;
    setDinModules((prev) => {
      const fromIdx = prev.findIndex((m) => m.id === draggedModId);
      const toIdx = prev.findIndex((m) => m.id === targetId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, moved);
      return copy;
    });
    setDraggedModId(null);
    setSimFeedback("↔️ Módulo recolocado arrastrando sobre el carril DIN.");
  };

  const handleAutoFixDiagnostic = (
    autoFixType?: string,
    moduleId?: string
  ) => {
    if (!autoFixType) return;
    setDinModules((prev) => {
      if (autoFixType === "assign_rcd" && moduleId) {
        const firstRcd = prev.find((m) => m.kind === "DIF");
        if (!firstRcd) return prev;
        return prev.map((m) =>
          m.id === moduleId
            ? {
                ...m,
                parentRcdId: firstRcd.id,
                neutralSourceRcdId: firstRcd.id,
              }
            : m
        );
      }
      if (autoFixType === "fix_neutral" && moduleId) {
        return prev.map((m) =>
          m.id === moduleId
            ? { ...m, neutralSourceRcdId: m.parentRcdId, isTripped: false }
            : { ...m, isTripped: false }
        );
      }
      if (autoFixType === "fix_pe" && moduleId) {
        return prev.map((m) =>
          m.id === moduleId ? { ...m, hasEarthConnected: true } : m
        );
      }
      if (autoFixType === "upsize_wire" && moduleId) {
        return prev.map((m) => {
          if (m.id !== moduleId) return m;
          const neededSec =
            m.ratingAmps <= 10
              ? 1.5
              : m.ratingAmps <= 16
              ? 2.5
              : m.ratingAmps <= 25
              ? 4
              : m.ratingAmps <= 32
              ? 6
              : 10;
          return { ...m, cableSectionMm2: neededSec };
        });
      }
      if (autoFixType === "add_rcd") {
        const newRcd: DinModule = {
          id: `mod-dif-fix-${Date.now()}`,
          kind: "DIF",
          label: `DIF #${prev.filter((x) => x.kind === "DIF").length + 1}`,
          sublabel: `30mA · ${meta.diferencialClase}`,
          ratingAmps: Math.max(40, igaAmps),
          sensitivityMa: 30,
          rcdClass: meta.diferencialClase,
          poles: 2,
          modulesWidth: 2,
          isOn: true,
        };
        return [...prev, newRcd];
      }
      if (autoFixType === "remove_redundant_iga" && moduleId) {
        return prev.filter((m) => m.id !== moduleId);
      }
      if (autoFixType === "add_iga") {
        const isTri = supplyType === "trifasico_400v";
        const newCombi: DinModule = {
          id: `mod-combi-fix-${Date.now()}`,
          kind: "COMBI",
          label: "COMBI IGA",
          sublabel: isTri ? "4P IGA+T2+POP" : "2P IGA+T2+POP",
          ratingAmps: sanitizeSpanishIgaAmps(igaAmps, supplyType),
          curve: "C",
          poles: isTri ? 4 : 2,
          modulesWidth: isTri ? 4 : 3,
          isOn: true,
        };
        return [newCombi, ...prev];
      }
      if (autoFixType === "add_surge") {
        setHasCombiSurge(true);
        const existingIga = prev.find((m) => m.kind === "IGA");
        if (existingIga) {
          // Sustituimos el IGA suelto por el bloque Combi integrado (IGA + T2 + POP)
          return prev
            .filter((m) => m.kind !== "DPS" && m.kind !== "POP")
            .map((m) =>
              m.id === existingIga.id
                ? {
                    ...m,
                    kind: "COMBI" as const,
                    label: "COMBI IGA",
                    sublabel: m.poles === 4 ? "4P IGA+T2+POP" : "2P IGA+T2+POP",
                    modulesWidth: m.poles === 4 ? 4 : 3,
                  }
                : m
            );
        }
        const isTri = supplyType === "trifasico_400v";
        const newCombi: DinModule = {
          id: `mod-combi-fix-${Date.now()}`,
          kind: "COMBI",
          label: "COMBI IGA",
          sublabel: isTri ? "4P IGA+T2+POP" : "2P IGA+T2+POP",
          ratingAmps: sanitizeSpanishIgaAmps(igaAmps, supplyType),
          curve: "C",
          poles: isTri ? 4 : 2,
          modulesWidth: isTri ? 4 : 3,
          isOn: true,
        };
        return [
          newCombi,
          ...prev.filter((m) => m.kind !== "DPS" && m.kind !== "POP"),
        ];
      }
      if (autoFixType === "split_rcd") {
        const extraRcdId = `mod-dif-split-${Date.now()}`;
        const rcdCountNow = prev.filter((m) => m.kind === "DIF").length;
        const extraRcd: DinModule = {
          id: extraRcdId,
          kind: "DIF",
          label: `DIF #${rcdCountNow + 1}`,
          sublabel: `30mA · ${meta.diferencialClase}`,
          ratingAmps: Math.max(40, igaAmps),
          sensitivityMa: 30,
          rcdClass: meta.diferencialClase,
          poles: 2,
          modulesWidth: 2,
          isOn: true,
        };
        let seenInFirst = 0;
        const reassigned = prev.map((m) => {
          if (m.kind === "PIA" && m.parentRcdId === moduleId) {
            seenInFirst += 1;
            if (seenInFirst > 5) {
              return {
                ...m,
                parentRcdId: extraRcdId,
                neutralSourceRcdId: extraRcdId,
              };
            }
          }
          return m;
        });
        return [...reassigned, extraRcd];
      }
      if (autoFixType === "upsize_iga" && moduleId) {
        const maxPia = Math.max(
          25,
          ...prev.filter((m) => m.kind === "PIA").map((p) => p.ratingAmps)
        );
        return prev.map((m) =>
          m.id === moduleId
            ? {
                ...m,
                ratingAmps: sanitizeSpanishIgaAmps(
                  maxPia,
                  m.poles === 4 ? "trifasico_400v" : "monofasico_230v"
                ),
              }
            : m
        );
      }
      if (autoFixType === "normalize_iga" && moduleId) {
        return prev.map((m) =>
          m.id === moduleId
            ? {
                ...m,
                ratingAmps: sanitizeSpanishIgaAmps(
                  igaAmps,
                  m.poles === 4 ? "trifasico_400v" : "monofasico_230v"
                ),
              }
            : m
        );
      }
      return prev;
    });
    setSimFeedback("🔧 Corrección aplicada automáticamente al cuadro eléctrico.");
  };

  // Exportar lista de material de cuadro DIN para almacén
  const panelMaterialBom = useMemo(() => {
    const rows: { item: string; qty: number; spec: string }[] = [];
    rows.push({
      item: `Envolvente empotrar / superficie ${boxGeometry.boxModules} módulos DIN`,
      qty: 1,
      spec: `${boxGeometry.rows} fila(s) · IP40 / IK07 · con bornero de tierra y neutro`,
    });
    const counts = new Map<string, { item: string; qty: number; spec: string }>();
    dinModules.forEach((m) => {
      const key = `${m.kind}-${m.ratingAmps}-${m.poles}`;
      const existing = counts.get(key);
      if (existing) {
        existing.qty += 1;
      } else {
        counts.set(key, {
          item:
            m.kind === "COMBI"
              ? `Combinado IGA + Sobretensiones Permanentes y Transitorias T2 (${m.poles}P ${m.ratingAmps} A)`
              : m.kind === "IGA"
              ? `Interruptor General Automático (IGA) ${m.poles}P ${m.ratingAmps} A`
              : m.kind === "DPS"
              ? `Descargador Sobretensiones Transitorias DPS Tipo 2 (${m.poles}P)`
              : m.kind === "POP"
              ? `Protector Sobretensiones Permanentes POP 230/400V (${m.ratingAmps} A)`
              : m.kind === "DIF"
              ? `Interruptor Diferencial ${m.poles}P ${m.ratingAmps} A / ${m.sensitivityMa || 30} mA Clase ${m.rcdClass || "AC"}`
              : m.kind === "PIA"
              ? `Magnetotérmico Curva ${m.curve || "C"} ${m.ratingAmps} A (${m.poles}P / 1P+N)`
              : `${m.label} modular DIN (${m.ratingAmps} A)`,
          qty: 1,
          spec: `${DIN_BRAND_STYLES[dinBrand].seriesName} · Icu ${icuKa} kA · ${m.modulesWidth} mód. DIN`,
        });
      }
    });
    return [...rows, ...Array.from(counts.values())];
  }, [dinModules, boxGeometry, icuKa, dinBrand]);

  // ============================================================================
  // GENERADOR SVG UNIFILAR INTERNACIONAL IEC 60617 (A3 HORIZONTAL + LEYENDA)
  // ============================================================================
  const buildCadSvgString = () =>
    buildUnifilarIec60617Svg({
      meta,
      supplyType,
      igaAmps,
      diSectionMm2,
      icuKa,
      planNumber,
      hasCombiSurge,
      calculatedCircuits,
      dinModules,
      disclaimer: ORIENTATIVE_DISCLAIMER,
    });

  // Descarga imagen SVG del propio cuadro eléctrico DIN realista
  const handleDownloadDinPanelImage = () => {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="440" viewBox="0 0 1100 440">
  <rect x="10" y="10" width="1080" height="420" rx="18" fill="#dbe6f5" stroke="#94a3b8" stroke-width="4"/>
  <text x="550" y="42" font-family="Arial" font-size="16" font-weight="bold" text-anchor="middle" fill="#1e3a8a">CUADRO DE ${boxGeometry.boxModules} MÓDULOS · ${boxGeometry.rows} FILA(S) · ${boxGeometry.freeModules} LIBRES</text>
  <rect x="40" y="95" width="1020" height="36" fill="#cbd5e1" stroke="#64748b"/>
  ${dinModules
    .map((m, idx) => {
      const x = 48 + idx * 96;
      return `
      <g transform="translate(${x}, 62)">
        <rect x="0" y="0" width="84" height="22" rx="4" fill="#ffffff" stroke="#94a3b8"/>
        <text x="42" y="15" font-family="Arial" font-size="10" font-weight="bold" text-anchor="middle" fill="#0f172a">${m.label}</text>
        <rect x="0" y="28" width="84" height="168" rx="6" fill="#f8fafc" stroke="#475569" stroke-width="1.5"/>
        <text x="42" y="46" font-family="Arial" font-size="9" font-weight="bold" text-anchor="middle" fill="${DIN_BRAND_STYLES[dinBrand].svgHex}">${DIN_BRAND_STYLES[dinBrand].shortLabel}</text>
        <text x="42" y="68" font-family="Arial" font-size="12" font-weight="bold" text-anchor="middle" fill="#0f172a">${m.ratingAmps}A</text>
        <rect x="20" y="88" width="44" height="20" rx="3" fill="${m.isOn ? "#dc2626" : "#059669"}"/>
        <text x="42" y="102" font-family="Arial" font-size="10" font-weight="bold" text-anchor="middle" fill="#ffffff">${m.isOn ? "I-ON" : "0-OFF"}</text>
        <text x="42" y="175" font-family="Arial" font-size="9" text-anchor="middle" fill="#475569">${m.cableSectionMm2 ? m.cableSectionMm2 + " mm²" : m.sublabel}</text>
      </g>`;
    })
    .join("")}
  <text x="550" y="340" font-family="Arial" font-size="12" font-weight="bold" text-anchor="middle" fill="#0f172a">BORNERO DE TIERRA · ${piasCount + 3} BORNAS (llegada + ${piasCount} circuitos + 2 de reserva)</text>
  <rect x="48" y="356" width="1004" height="28" rx="6" fill="#eab308" stroke="#15803d" stroke-width="2"/>
</svg>`;
    downloadTextFile(
      `Cuadro_Electrico_${meta.expedienteNum}.svg`,
      svg,
      "image/svg+xml;charset=utf-8"
    );
  };

  // Sincronizar PIAs montados en el simulador de cuadro hacia el expediente principal
  const handleSyncDinToExpediente = () => {
    const piaModules = dinModules.filter((m) => m.kind === "PIA");
    if (piaModules.length === 0) return;
    const synced: RebtCircuitInput[] = piaModules.map((p, idx) => {
      const existing = calculatedCircuits.find((c) => c.code === p.label);
      return {
        code: p.label,
        description: existing?.description || p.sublabel || `Circuito ${idx + 1}`,
        usageType: existing?.usageType || "vivienda_interior",
        phaseSystem: p.phaseAssigned === "L1-L2-L3" ? "trifasico" : "monofasico",
        phaseAssigned: p.phaseAssigned || "L1",
        voltage: p.phaseAssigned === "L1-L2-L3" ? 400 : 230,
        powerWatts: existing?.powerWatts || p.powerWatts || Math.round(p.ratingAmps * 230 * 0.75),
        cosPhi: existing?.cosPhi || 1,
        simultaneityFactor: existing?.simultaneityFactor || 1,
        utilizationFactor: existing?.utilizationFactor || 1,
        lengthMeters: existing?.lengthMeters || 18,
        installationMethod: existing?.installationMethod || "B1",
        insulationType: existing?.insulationType || "PVC_70",
        material: existing?.material || "Cu",
        minSectionMm2: p.cableSectionMm2 || existing?.sectionMm2 || 2.5,
        fixedPiaAmps: p.ratingAmps,
      };
    });
    onApplyDraftCircuits(synced, supplyType);
    setDraftConfirmedMsg(
      "✅ Cuadro DIN sincronizado con los circuitos del expediente activo."
    );
  };

  const activeChallenge =
    activeChallengeIdx !== null ? FAULT_CHALLENGES[activeChallengeIdx] : null;

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-300/60">
            <ShieldAlert className="h-3.5 w-3.5" />
            {ORIENTATIVE_DISCLAIMER}
          </span>
          <h2 className="mt-2 text-lg font-bold text-slate-900">
            Simulador Interactivo de Cuadro Eléctrico DIN + Unifilar IEC 60617
          </h2>
          <p className="text-xs text-slate-500">
            Enciende/apaga cada interruptor con un clic animado, añade o quita protecciones, provoca fugas, detecta errores de cableado y exporta el Unifilar con leyenda internacional.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStepTab("captura_datos")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold ${
              stepTab === "captura_datos"
                ? "bg-[#0f6cbd] text-white"
                : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            1. Foto / Voz / Datos
          </button>
          <button
            type="button"
            onClick={() => setStepTab("cuadro_din")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold ${
              stepTab === "cuadro_din"
                ? "bg-[#0f6cbd] text-white"
                : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            2. Simulador Cuadro (DIN)
          </button>
          <button
            type="button"
            onClick={() => setStepTab("esquema_a3")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold ${
              stepTab === "esquema_a3"
                ? "bg-[#0f6cbd] text-white"
                : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <GitBranch className="h-3.5 w-3.5" />
            3. Unifilar IEC 60617 (A3/SVG)
          </button>
        </div>
      </div>

      {draftConfirmedMsg && (
        <div className="no-print rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900">
          {draftConfirmedMsg}
        </div>
      )}

      {/* PESTAÑA 1: DESDE FOTO, DESDE TEXTO/VOZ Y CAJETÍN */}
      {stepTab === "captura_datos" && (
        <div className="no-print grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Empezar desde una foto del cuadro o desde lo que me cuentas
            </h3>

            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-800">
                    📷 Desde una foto del cuadro (Detección y Generación Automática)
                  </div>
                  <p className="text-slate-500">
                    Al subir la foto, el sistema detecta el formato del circuito y genera automáticamente el Simulador DIN, el Plano Unifilar IEC 60617 y la Ficha Técnica M.T.D.
                  </p>
                </div>
                <label className="cursor-pointer rounded-lg bg-[#0f6cbd] px-3.5 py-2 font-semibold text-white shadow-xs hover:bg-[#115ea3]">
                  {isAnalyzingPhoto ? "Analizando foto..." : "Elegir foto"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {isAnalyzingPhoto && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-medium text-blue-800">
                  🔍 Detectando formato de suministro (230V/400V), IGA, diferenciales y PIAs para generar Simulador, Unifilar y Ficha M.T.D....
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {photoPreviewUrl && (
                  <img
                    src={photoPreviewUrl}
                    alt="Foto del cuadro eléctrico"
                    className="max-h-44 rounded-lg border border-slate-200 bg-white object-contain"
                  />
                )}

                <div className="flex-1 space-y-2.5 rounded-xl border border-slate-200 bg-white p-3">
                  {(pendingDraft || lastGeneratedDraft) && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 font-bold text-[#0f6cbd] border border-blue-200">
                        ⚡ {(pendingDraft || lastGeneratedDraft)!.formatLabel}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono font-bold text-slate-800">
                        IGA {(pendingDraft || lastGeneratedDraft)!.igaAmps} A
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono font-semibold text-slate-700">
                        {(pendingDraft || lastGeneratedDraft)!.rcdCount} DIF 30mA
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono font-semibold text-slate-700">
                        {(pendingDraft || lastGeneratedDraft)!.circuits.length} Circuitos
                      </span>
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800 border border-emerald-200">
                        Ficha M.T.D. auto-rellenada ✓
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const targetDraft =
                          pendingDraft || parseUnifilarFromSpeechOrText(speechText);
                        setPendingDraft(targetDraft);
                        applyDraftEverywhere(targetDraft, {
                          switchToTab: "cuadro_din",
                        });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Generar Esquema y Simulador
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (pendingDraft) {
                          applyDraftEverywhere(pendingDraft, {
                            switchToTab: "cuadro_din",
                          });
                        } else {
                          setStepTab("cuadro_din");
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                    >
                      <Layers className="h-3.5 w-3.5 text-[#0f6cbd]" />
                      2. Simulador Cuadro (DIN)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (pendingDraft) {
                          applyDraftEverywhere(pendingDraft, {
                            switchToTab: "esquema_a3",
                          });
                        } else {
                          setStepTab("esquema_a3");
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                    >
                      <GitBranch className="h-3.5 w-3.5 text-[#0f6cbd]" />
                      3. Unifilar IEC 60617 (A3/SVG)
                    </button>

                    {onOpenFichaMtd && (
                      <button
                        type="button"
                        onClick={() => {
                          if (pendingDraft) {
                            applyDraftEverywhere(pendingDraft);
                          }
                          onOpenFichaMtd();
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                      >
                        <ClipboardList className="h-3.5 w-3.5 text-emerald-700" />
                        Ver Ficha Técnica M.T.D.
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {photoVisionNote && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-950">
                  {photoVisionNote}
                </div>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800">
                  🎤 Desde lo que me cuentas (escribe o dicta con el micro)
                </label>
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold ${
                    isListening
                      ? "bg-rose-600 text-white animate-pulse"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Mic className="h-3.5 w-3.5" />
                  {isListening ? "Escuchando..." : "Dictar"}
                </button>
              </div>
              {voiceError && <p className="text-rose-600">{voiceError}</p>}
              <textarea
                rows={3}
                value={speechText}
                onChange={(e) => setSpeechText(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-3 text-xs"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const parsed = parseUnifilarFromSpeechOrText(speechText);
                    setPendingDraft(parsed);
                    applyDraftEverywhere(parsed, { switchToTab: "cuadro_din" });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Detectar formato y generar Esquema + Simulador
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPendingDraft(parseUnifilarFromSpeechOrText(speechText))
                  }
                  className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Editar protecciones abajo
                </button>
              </div>
            </div>

            {pendingDraft && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-4 space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-emerald-950">
                    ✅ Formato de Circuito Detectado (Ajuste fino opcional en tiempo real)
                  </span>
                  <span className="rounded bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-800 border border-emerald-200">
                    {pendingDraft.circuits.length} PIAs · {pendingDraft.formatLabel}
                  </span>
                </div>

                {/* Ajustes rápidos de cabecera del cuadro detectado */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 rounded-lg bg-white p-2.5 border border-emerald-200">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600">
                      Formato del Circuito
                    </label>
                    <select
                      value={pendingDraft.supplyType}
                      onChange={(e) => {
                        const nextSupply = e.target.value as SystemSupplyType;
                        setPendingDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                supplyType: nextSupply,
                                formatLabel: `${
                                  nextSupply === "trifasico_400v"
                                    ? "Trifásico 400/230 V (3F+N+PE)"
                                    : "Monofásico 230 V (1F+N+PE)"
                                } · Electrificación ${
                                  prev.electrificationGrade === "elevada"
                                    ? "Elevada"
                                    : "Básica"
                                }`,
                              }
                            : prev
                        );
                      }}
                      className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-xs font-semibold"
                    >
                      <option value="monofasico_230v">Monofásico 230 V (2P)</option>
                      <option value="trifasico_400v">Trifásico 400 V (4P)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600">
                      IGA / Corte General
                    </label>
                    <select
                      value={pendingDraft.igaAmps}
                      onChange={(e) => {
                        const nextIga = Number(e.target.value);
                        setPendingDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                igaAmps: nextIga,
                                electrificationGrade:
                                  nextIga >= 40 || prev.circuits.length > 5
                                    ? "elevada"
                                    : "basica",
                                diferencialCalibreAmps: nextIga > 40 ? 63 : 40,
                              }
                            : prev
                        );
                      }}
                      className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-xs font-semibold"
                    >
                      {getSpanishIgaStepsForSupply(pendingDraft.supplyType).map((st) => (
                        <option key={st.igaAmps} value={st.igaAmps}>
                          {st.shortLabel}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600">
                      Nº Diferenciales 30 mA
                    </label>
                    <select
                      value={pendingDraft.rcdCount}
                      onChange={(e) =>
                        setPendingDraft((prev) =>
                          prev
                            ? { ...prev, rcdCount: Number(e.target.value) }
                            : prev
                        )
                      }
                      className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-xs font-semibold"
                    >
                      {[1, 2, 3, 4].map((n) => (
                        <option key={n} value={n}>
                          {n} Diferencial{n > 1 ? "es" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end pb-1">
                    <label className="inline-flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pendingDraft.hasSurgeProtection}
                        onChange={(e) =>
                          setPendingDraft((prev) =>
                            prev
                              ? { ...prev, hasSurgeProtection: e.target.checked }
                              : prev
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Combi (IGA+DPS+POP)
                    </label>
                  </div>
                </div>

                {/* Lista editable de PIAs detectados */}
                <div className="max-h-52 overflow-y-auto rounded-lg bg-white p-2.5 divide-y divide-slate-100 border border-emerald-200">
                  {pendingDraft.circuits.map((c, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap items-center justify-between gap-2 py-1.5"
                    >
                      <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
                        <span className="font-mono font-bold text-slate-900 w-7">
                          {c.code}
                        </span>
                        <input
                          type="text"
                          value={c.description}
                          onChange={(e) =>
                            setPendingDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    circuits: prev.circuits.map((item, i) =>
                                      i === idx
                                        ? { ...item, description: e.target.value }
                                        : item
                                    ),
                                  }
                                : prev
                            )
                          }
                          className="flex-1 rounded border border-slate-200 px-2 py-0.5 text-xs"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={c.fixedPiaAmps || 16}
                          onChange={(e) => {
                            const amps = Number(e.target.value);
                            const sec =
                              amps <= 10
                                ? 1.5
                                : amps <= 16
                                ? 2.5
                                : amps <= 20
                                ? 4
                                : amps <= 25
                                ? 6
                                : 10;
                            const watts =
                              amps <= 10
                                ? 2300
                                : amps <= 16
                                ? 3450
                                : amps <= 20
                                ? 3680
                                : 5400;
                            setPendingDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    circuits: prev.circuits.map((item, i) =>
                                      i === idx
                                        ? {
                                            ...item,
                                            fixedPiaAmps: amps,
                                            minSectionMm2: sec,
                                            powerWatts: watts,
                                          }
                                        : item
                                    ),
                                  }
                                : prev
                            );
                          }}
                          className="rounded border border-slate-300 px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#0f6cbd]"
                        >
                          {[10, 16, 20, 25, 32, 40].map((a) => (
                            <option key={a} value={a}>
                              C{a} ({a}A)
                            </option>
                          ))}
                        </select>
                        <span className="font-mono text-[10px] text-slate-500 w-12 text-right">
                          {c.minSectionMm2} mm²
                        </span>
                        {pendingDraft.circuits.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setPendingDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      circuits: prev.circuits.filter(
                                        (_, i) => i !== idx
                                      ),
                                    }
                                  : prev
                              )
                            }
                            className="text-rose-500 hover:text-rose-700 p-0.5"
                            title="Quitar PIA"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPendingDraft((prev) => {
                        if (!prev) return prev;
                        const nextIdx = prev.circuits.length + 1;
                        return {
                          ...prev,
                          circuits: [
                            ...prev.circuits,
                            {
                              code: `C${nextIdx}`,
                              description: `Circuito ${nextIdx}`,
                              usageType: "vivienda_interior",
                              phaseSystem: "monofasico",
                              phaseAssigned: "L1",
                              voltage: 230,
                              powerWatts: 3450,
                              cosPhi: 1,
                              simultaneityFactor: 1,
                              utilizationFactor: 1,
                              lengthMeters: 15,
                              installationMethod: "B1",
                              insulationType: "PVC_70",
                              material: "Cu",
                              minSectionMm2: 2.5,
                              fixedPiaAmps: 16,
                            },
                          ],
                        };
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-400 bg-white px-2.5 py-1 font-semibold text-emerald-900 hover:bg-emerald-100"
                  >
                    <Plus className="h-3.5 w-3.5" /> Añadir PIA
                  </button>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPendingDraft(null)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700"
                    >
                      Ocultar ajustes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        applyDraftEverywhere(pendingDraft, {
                          switchToTab: "cuadro_din",
                        });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 font-semibold text-white hover:bg-emerald-700"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Generar Esquema y Simulador
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Ajustes de Cajetín, Corte Icu y Esquemas Guardados
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700">
                  Nº de Plano (Cajetín)
                </label>
                <input
                  type="text"
                  value={planNumber}
                  onChange={(e) => setPlanNumber(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">
                  Poder de corte Icu (kA)
                </label>
                <select
                  value={icuKa}
                  onChange={(e) => setIcuKa(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 text-xs"
                >
                  <option value={6}>6 kA (Vivienda habitual UNE-EN 60898)</option>
                  <option value={10}>10 kA (Local / Terciario)</option>
                  <option value={15}>15 kA (Industrial)</option>
                </select>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={hasCombiSurge}
                onChange={(e) => setHasCombiSurge(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#0f6cbd]"
              />
              Cabecera con Combi integrado (IGA + Sobretensiones T2 + POP — sustituye al IGA suelto)
            </label>

            <div className="border-t border-slate-200 pt-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">
                  Mis esquemas guardados ({savedUnifilares.length})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onSaveDiagramRecord({
                      id: `unif-${Date.now()}`,
                      title: `${meta.expedienteNum} (${planNumber})`,
                      titular: meta.titularNombre || "Sin titular",
                      address: `${meta.direccionCalle} ${meta.direccionNum}`,
                      createdAtIso: new Date().toISOString(),
                      igaAmps,
                      hasDps: hasCombiSurge,
                      rcdCount,
                      supplyType,
                      circuitsSummary: calculatedCircuits
                        .map((c) => `${c.code}:${c.piaAmps}A`)
                        .join(" · "),
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-lg bg-[#0f6cbd] px-3 py-1.5 font-semibold text-white"
                >
                  <Save className="h-3.5 w-3.5" />
                  Guardar en Mis esquemas
                </button>
              </div>

              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                {savedUnifilares.length === 0 ? (
                  <p className="text-slate-500">Aún no has guardado esquemas sueltos.</p>
                ) : (
                  savedUnifilares.map((u) => (
                    <div
                      key={u.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-900">
                          {u.title} — {u.titular}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {u.circuitsSummary}
                        </div>
                      </div>
                      <span className="font-mono text-[11px] text-[#0f6cbd]">
                        IGA {u.igaAmps}A
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: SIMULADOR INTERACTIVO DE CUADRO ELÉCTRICO REALISTA */}
      {stepTab === "cuadro_din" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-4">
            {/* Título resumen de caja */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Cuadro general · caja de {boxGeometry.boxModules} módulos
                </h3>
                <p className="text-xs text-slate-600">
                  Ocupa <strong>{usedModulesCount} módulos</strong>; con reserva reglamentaria ({boxGeometry.reservePct}%), caja de{" "}
                  <strong>{boxGeometry.boxModules}</strong> ({boxGeometry.rows} fila(s) de {boxGeometry.perRow}), quedan{" "}
                  <strong>{boxGeometry.freeModules} libres</strong>.
                </p>
              </div>

              <div className="no-print flex flex-wrap items-center gap-2 text-xs">
                <label className="text-slate-600 font-semibold">Marca:</label>
                <select
                  value={dinBrand}
                  onChange={(e) => setDinBrand(e.target.value as DinBrandId)}
                  className="px-2.5 py-1 text-xs font-semibold"
                  title="Cambiar fabricante/serie comercial de los interruptores del cuadro"
                >
                  {(Object.keys(DIN_BRAND_STYLES) as DinBrandId[]).map((b) => (
                    <option key={b} value={b}>
                      {DIN_BRAND_STYLES[b].seriesName}
                    </option>
                  ))}
                </select>
                <label className="text-slate-600 font-semibold">Envolvente:</label>
                <select
                  value={customBoxModules}
                  onChange={(e) =>
                    setCustomBoxModules(
                      e.target.value === "auto" ? "auto" : Number(e.target.value)
                    )
                  }
                  className="px-2.5 py-1 text-xs"
                >
                  <option value="auto">Automática (+30% reserva)</option>
                  <option value={12}>12 módulos (1 fila)</option>
                  <option value={18}>18 módulos (1 fila)</option>
                  <option value={24}>24 módulos (2 filas)</option>
                  <option value={36}>36 módulos (3 filas)</option>
                  <option value={48}>48 módulos (4 filas)</option>
                </select>
                <button
                  type="button"
                  onClick={handleSyncDinToExpediente}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700"
                  title="Pasar los PIAs y secciones configurados aquí al cuadro de circuitos del expediente"
                >
                  <Save className="h-3.5 w-3.5" />
                  Sincronizar con obra
                </button>
              </div>
            </div>

            {/* Banner interactivo del estado de simulación */}
            <div
              className={`rounded-xl border px-3.5 py-2.5 text-xs font-semibold flex flex-wrap items-center justify-between gap-2 ${
                earthFaultModuleId
                  ? "border-rose-300 bg-rose-50 text-rose-900"
                  : errorDiagnostics.length > 0
                  ? "border-amber-300 bg-amber-50 text-amber-950"
                  : "border-blue-200 bg-blue-50/70 text-slate-800"
              }`}
            >
              <span>{simFeedback}</span>
              <span className="font-mono text-[11px] text-slate-600">
                Haz clic en cualquier maneta I-ON / 0-OFF para probar corte
              </span>
            </div>

            {/* ENVOLVENTE FÍSICA ESTILO CARRIL DIN REALISTA */}
            <div
              className="mx-auto max-w-5xl rounded-2xl border-[3px] border-[#94a3b8] bg-gradient-to-b from-[#dce7f7] via-[#e4ecf8] to-[#d5e1f4] p-4 sm:p-5 shadow-lg transition-transform duration-500"
              style={
                is3DMode
                  ? {
                      transform:
                        "perspective(1100px) rotateX(10deg) rotateY(-6deg)",
                      boxShadow: "16px 24px 36px rgba(15, 23, 42, 0.25)",
                    }
                  : undefined
              }
            >
              <div className="mb-3 text-center text-xs font-extrabold tracking-wide text-[#1e3a8a]">
                CUADRO DE {boxGeometry.boxModules} MÓDULOS · {boxGeometry.rows} FILA(S) · {boxGeometry.freeModules} LIBRES
              </div>

              {/* Carril DIN + Dispositivos + Huecos libres */}
              <div className="relative rounded-xl border border-slate-300/80 bg-[#e8effa]/80 p-3 sm:p-4">
                {/* Barra metálica DIN detrás de los aparatos */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-2 right-2 top-1/2 -translate-y-4 h-9 rounded-xs border-y-2 border-slate-400/70 bg-gradient-to-b from-slate-300 via-slate-200 to-slate-400 opacity-75 shadow-inner"
                />

                {/* Capa SVG de Cableado Interno cuando "Ver cables" está activo */}
                {showCables && (
                  <div className="mb-3 rounded-lg border border-slate-300 bg-white/90 p-2.5 text-[11px]">
                    <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-slate-800">
                      <span>🔌 Esquema de cableado vivo del cuadro:</span>
                      <div className="flex flex-wrap items-center gap-3 text-[10px]">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2.5 w-4 rounded-xs bg-amber-800" /> Fase (L)
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2.5 w-4 rounded-xs bg-sky-600" /> Neutro (N)
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2.5 w-4 rounded-xs bg-emerald-500" /> Tierra (PE)
                        </span>
                        <span className="inline-flex items-center gap-1 text-rose-700">
                          <span className="h-2.5 w-4 rounded-xs bg-rose-600" /> Fallo de conexión
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                      {dinModules
                        .filter((m) => m.kind === "PIA")
                        .map((p) => {
                          const rcdParent = dinModules.find(
                            (r) => r.id === p.parentRcdId
                          );
                          const neutralCrossed =
                            p.neutralSourceRcdId &&
                            p.parentRcdId &&
                            p.neutralSourceRcdId !== p.parentRcdId;
                          const noEarth = p.hasEarthConnected === false;
                          const noRcd = !rcdParent;
                          const hasWireFault =
                            neutralCrossed || noEarth || noRcd;

                          return (
                            <div
                              key={p.id}
                              className={`flex items-center justify-between rounded-md border px-2 py-1 ${
                                hasWireFault
                                  ? "border-rose-400 bg-rose-50 text-rose-900 font-bold"
                                  : "border-slate-200 bg-slate-50 text-slate-700"
                              }`}
                            >
                              <span>
                                <strong>{p.label}</strong> ({p.cableSectionMm2 ?? 2.5} mm²)
                              </span>
                              <span className="text-[10px]">
                                {noRcd
                                  ? "⚠️ Directo sin DIF"
                                  : neutralCrossed
                                  ? `⚠️ Neutro en otro DIF`
                                  : `← ${rcdParent.label}`}{" "}
                                · {noEarth ? "❌ Sin PE" : "⏚ PE OK"}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Dispositivos montados sobre el carril */}
                <div className="relative z-10 flex flex-wrap items-start gap-2 sm:gap-2.5">
                  {dinModules.map((mod) => (
                    <DinModularDeviceVisual
                      key={mod.id}
                      mod={mod}
                      brand={dinBrand}
                      liveStatus={
                        liveStatusMap[mod.id] || {
                          supplyLive: false,
                          loadLive: false,
                          reason: "",
                        }
                      }
                      hasError={
                        errorModuleIds.has(mod.id) ||
                        earthFaultModuleId === mod.id
                      }
                      isSelected={selectedModId === mod.id}
                      showEditControls={editDrawerOpen}
                      is3DMode={is3DMode}
                      onToggleSwitch={handleToggleSwitch}
                      onTriggerRcdTest={handleTriggerRcdTest}
                      onSelect={(id) => setSelectedModId(id)}
                      onRemove={handleRemoveModule}
                      onMoveLeft={(id) => handleMoveModule(id, -1)}
                      onMoveRight={(id) => handleMoveModule(id, 1)}
                      onDragStartReorder={(id) => setDraggedModId(id)}
                      onDropReorder={handleDropReorder}
                    />
                  ))}

                  {/* Módulos de reserva LIBRES (tapas ciegas reales DIN) */}
                  {boxGeometry.freeModules > 0 && (
                    <div className="flex flex-col items-center">
                      <div className="mb-1.5 h-[30px] w-full" />
                      <div
                        className="relative flex items-center justify-center rounded-md border border-slate-300 bg-slate-100/95 shadow-inner overflow-hidden"
                        style={{
                          height: "164px",
                          width: `${Math.min(boxGeometry.freeModules, 8) * 34}px`,
                          minWidth: "56px",
                        }}
                      >
                        <div className="absolute inset-0 flex">
                          {Array.from({
                            length: Math.min(boxGeometry.freeModules, 8),
                          }).map((_, i) => (
                            <div
                              key={i}
                              className="flex-1 border-r border-slate-300/70 last:border-r-0"
                            />
                          ))}
                        </div>
                        <span className="relative z-10 rounded bg-white/80 px-2 py-0.5 text-[10px] font-bold tracking-wider text-slate-500">
                          {boxGeometry.freeModules} LIBRES
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Línea animada de cableado visual hacia el bornero */}
                {showCables && (
                  <svg
                    viewBox="0 0 1000 38"
                    className="mt-2 h-8 w-full overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M 40 2 L 40 16 L 960 16 L 960 2"
                      fill="none"
                      stroke="#92400e"
                      strokeWidth="3"
                    />
                    <path
                      d="M 55 2 L 55 24 L 945 24 L 945 2"
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="3"
                      strokeDasharray={
                        errorDiagnostics.some((d) => d.code === "NEUTRO-CRUZADO")
                          ? "6,4"
                          : undefined
                      }
                    />
                    <path
                      d="M 120 2 L 120 34 L 500 34"
                      fill="none"
                      stroke={
                        errorDiagnostics.some((d) => d.code === "SIN-TIERRA-PE")
                          ? "#dc2626"
                          : "#16a34a"
                      }
                      strokeWidth="3"
                    />
                  </svg>
                )}
              </div>

              {/* BORNERO DE TIERRA INFERIOR REALISTA */}
              <div className="mt-4 text-center">
                <div className="text-[11px] font-extrabold tracking-wide text-slate-800">
                  BORNERO DE TIERRA · {piasCount + 3} BORNAS (llegada + {piasCount} circuitos + 2 de reserva)
                </div>
                <div
                  className="mt-1.5 flex h-8 items-center justify-center rounded-md border-2 border-emerald-700 px-3 shadow-inner"
                  style={{
                    background:
                      "repeating-linear-gradient(-45deg, #16a34a, #16a34a 10px, #facc15 10px, #facc15 20px)",
                  }}
                >
                  <div className="flex items-center gap-1 rounded bg-slate-200/95 px-2.5 py-1 border border-slate-500 shadow-sm">
                    {Array.from({
                      length: Math.min(12, Math.max(3, piasCount + 2)),
                    }).map((_, i) => (
                      <span
                        key={i}
                        className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-500 bg-slate-300 text-[8px] font-bold text-slate-700"
                        title={`Borna PE #${i + 1}`}
                      >
                        ⊖
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-1 text-[10px] font-medium text-slate-600">
                  Una borna por conductor: nunca dos tierras bajo el mismo tornillo (ITC-BT-18)
                </div>
              </div>
            </div>

            {/* BARRA DE ACCIONES INTERACTIVAS ESTILO REFERENCIA */}
            <div className="no-print flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditDrawerOpen((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-2xs transition ${
                  editDrawerOpen
                    ? "border-[#0f6cbd] bg-blue-50 text-[#0f6cbd]"
                    : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Pencil className="h-3.5 w-3.5 text-amber-600" />
                {editDrawerOpen ? "Cerrar editor" : "Editar cuadro"}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50"
              >
                <Printer className="h-3.5 w-3.5 text-slate-600" />
                PDF del cuadro
              </button>

              <button
                type="button"
                onClick={handleDownloadDinPanelImage}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5 text-[#0f6cbd]" />
                Descargar imagen
              </button>

              <button
                type="button"
                onClick={() => setIs3DMode((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-2xs transition ${
                  is3DMode
                    ? "border-sky-500 bg-sky-50 text-sky-900"
                    : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Box className="h-3.5 w-3.5 text-sky-600" />
                {is3DMode ? "Vista frontal" : "Ver en 3D"}
              </button>

              <button
                type="button"
                onClick={() => setShowMaterialModal((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-2xs transition ${
                  showMaterialModal
                    ? "border-indigo-400 bg-indigo-50 text-indigo-900"
                    : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                }`}
              >
                <ClipboardList className="h-3.5 w-3.5 text-indigo-600" />
                Pedir el material
              </button>

              <button
                type="button"
                onClick={() => setShowCables((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-2xs transition ${
                  showCables
                    ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                    : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Cable className="h-3.5 w-3.5 text-emerald-700" />
                {showCables ? "Ocultar cables" : "Ver cables"}
              </button>

              <button
                type="button"
                onClick={handleInjectEarthLeakage}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50/70 px-3.5 py-2 text-xs font-semibold text-amber-950 shadow-2xs hover:bg-amber-100"
              >
                <Zap className="h-3.5 w-3.5 text-amber-600" />
                Provocar una fuga
              </button>

              <button
                type="button"
                onClick={handleStartFaultChallenge}
                className="inline-flex items-center gap-1.5 rounded-xl border border-purple-300 bg-purple-50/70 px-3.5 py-2 text-xs font-semibold text-purple-950 shadow-2xs hover:bg-purple-100"
              >
                <SearchCode className="h-3.5 w-3.5 text-purple-700" />
                Encuentra la avería
              </button>

              <button
                type="button"
                onClick={handleResetSimulator}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reiniciar
              </button>
            </div>

            {/* EDITOR DE AGREGAR Y CONFIGURAR COMPONENTES DEL CUADRO */}
            {editDrawerOpen && (
              <div className="no-print grid grid-cols-1 gap-4 rounded-2xl border border-blue-200 bg-blue-50/40 p-4 lg:grid-cols-2">
                {/* 1. Añadir componente al carril */}
                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-xs">
                  <h4 className="font-bold text-slate-900">
                    ➕ Agregar componente al cuadro eléctrico
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    <div>
                      <label className="font-semibold text-slate-700">Tipo aparato</label>
                      <select
                        value={newModKind}
                        onChange={(e) =>
                          setNewModKind(e.target.value as DinModuleKind)
                        }
                        className="mt-1 w-full px-2.5 py-1.5 text-xs"
                      >
                        <option value="PIA">PIA Magnetotérmico</option>
                        <option value="DIF">Diferencial 30 mA</option>
                        <option value="COMBI">Combi IGA + T2 + POP (sustituye IGA)</option>
                        <option value="IGA">IGA Corte General (suelto)</option>
                        <option value="DPS">DPS Transitorias T2</option>
                        <option value="POP">POP Permanentes</option>
                        <option value="CONTACTOR">Contactor Modular</option>
                        <option value="TIMER">Reloj Horario DIN</option>
                        <option value="METER">Medidor kWh DIN</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700">Calibre (A)</label>
                      <select
                        value={newModAmps}
                        onChange={(e) => setNewModAmps(Number(e.target.value))}
                        className="mt-1 w-full px-2.5 py-1.5 text-xs"
                      >
                        {newModKind === "IGA" || newModKind === "COMBI"
                          ? getSpanishIgaStepsForSupply(supplyType).map((st) => (
                              <option key={st.igaAmps} value={st.igaAmps}>
                                {st.shortLabel}
                              </option>
                            ))
                          : [10, 16, 20, 25, 32, 40, 50, 63].map((a) => (
                              <option key={a} value={a}>
                                {a} A
                              </option>
                            ))}
                      </select>
                    </div>
                    {newModKind === "PIA" && (
                      <div>
                        <label className="font-semibold text-slate-700">
                          Cable (mm²)
                        </label>
                        <select
                          value={newModSection}
                          onChange={(e) =>
                            setNewModSection(Number(e.target.value))
                          }
                          className="mt-1 w-full px-2.5 py-1.5 text-xs"
                        >
                          {[1.5, 2.5, 4, 6, 10, 16].map((s) => (
                            <option key={s} value={s}>
                              {s} mm²
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="font-semibold text-slate-700">Código</label>
                      <input
                        type="text"
                        value={newModLabel}
                        onChange={(e) => setNewModLabel(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="font-semibold text-slate-700">
                        Descripción / Estancia
                      </label>
                      <input
                        type="text"
                        value={newModDesc}
                        onChange={(e) => setNewModDesc(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddComponentToRail}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f6cbd] px-4 py-2 font-semibold text-white hover:bg-[#115ea3]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Añadir al carril DIN
                  </button>
                </div>

                {/* 2. Inspector del componente seleccionado (para probar conexiones buenas o malas) */}
                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900">
                      🔧 Inspector del módulo seleccionado:{" "}
                      <span className="text-[#0f6cbd]">
                        {selectedModule?.label || "Ninguno"}
                      </span>
                    </h4>
                    {selectedModule && (
                      <button
                        type="button"
                        onClick={() => handleRemoveModule(selectedModule.id)}
                        className="text-rose-600 font-semibold hover:underline"
                      >
                        Quitar módulo
                      </button>
                    )}
                  </div>

                  {selectedModule ? (
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="font-semibold text-slate-700">
                          Calibre In (A)
                        </label>
                        <select
                          value={selectedModule.ratingAmps}
                          onChange={(e) =>
                            setDinModules((prev) =>
                              prev.map((m) =>
                                m.id === selectedModule.id
                                  ? { ...m, ratingAmps: Number(e.target.value) }
                                  : m
                              )
                            )
                          }
                          className="mt-1 w-full px-2.5 py-1.5 text-xs"
                        >
                          {selectedModule.kind === "IGA" ||
                          selectedModule.kind === "COMBI"
                            ? getSpanishIgaStepsForSupply(
                                selectedModule.poles === 4
                                  ? "trifasico_400v"
                                  : "monofasico_230v"
                              ).map((st) => (
                                <option key={st.igaAmps} value={st.igaAmps}>
                                  {st.shortLabel}
                                </option>
                              ))
                            : [10, 16, 20, 25, 32, 40, 50, 63].map((a) => (
                                <option key={a} value={a}>
                                  {a} A
                                </option>
                              ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700">
                          Etiqueta
                        </label>
                        <input
                          type="text"
                          value={selectedModule.label}
                          onChange={(e) =>
                            setDinModules((prev) =>
                              prev.map((m) =>
                                m.id === selectedModule.id
                                  ? { ...m, label: e.target.value }
                                  : m
                              )
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                        />
                      </div>

                      {selectedModule.kind === "PIA" && (
                        <>
                          <div>
                            <label className="font-semibold text-slate-700">
                              Sección cable (mm²)
                            </label>
                            <select
                              value={selectedModule.cableSectionMm2 ?? 2.5}
                              onChange={(e) =>
                                setDinModules((prev) =>
                                  prev.map((m) =>
                                    m.id === selectedModule.id
                                      ? {
                                          ...m,
                                          cableSectionMm2: Number(e.target.value),
                                        }
                                      : m
                                  )
                                )
                              }
                              className="mt-1 w-full px-2.5 py-1.5 text-xs"
                            >
                              {[1.5, 2.5, 4, 6, 10, 16].map((s) => (
                                <option key={s} value={s}>
                                  {s} mm²
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="font-semibold text-slate-700">
                              Diferencial padre (Fase)
                            </label>
                            <select
                              value={selectedModule.parentRcdId || ""}
                              onChange={(e) =>
                                setDinModules((prev) =>
                                  prev.map((m) =>
                                    m.id === selectedModule.id
                                      ? {
                                          ...m,
                                          parentRcdId: e.target.value,
                                          neutralSourceRcdId:
                                            m.neutralSourceRcdId || e.target.value,
                                        }
                                      : m
                                  )
                                )
                              }
                              className="mt-1 w-full px-2.5 py-1.5 text-xs"
                            >
                              <option value="">
                                ⚠️ Sin diferencial (probar fallo)
                              </option>
                              {availableRcds.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.label} ({r.ratingAmps}A)
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="font-semibold text-slate-700">
                              Retorno Neutro (N)
                            </label>
                            <select
                              value={selectedModule.neutralSourceRcdId || ""}
                              onChange={(e) =>
                                setDinModules((prev) =>
                                  prev.map((m) =>
                                    m.id === selectedModule.id
                                      ? {
                                          ...m,
                                          neutralSourceRcdId: e.target.value,
                                        }
                                      : m
                                  )
                                )
                              }
                              className="mt-1 w-full px-2.5 py-1.5 text-xs"
                            >
                              {availableRcds.map((r) => (
                                <option key={r.id} value={r.id}>
                                  Bornero N de {r.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-end pb-1">
                            <label className="inline-flex items-center gap-2 font-semibold text-slate-700">
                              <input
                                type="checkbox"
                                checked={selectedModule.hasEarthConnected !== false}
                                onChange={(e) =>
                                  setDinModules((prev) =>
                                    prev.map((m) =>
                                      m.id === selectedModule.id
                                        ? {
                                            ...m,
                                            hasEarthConnected: e.target.checked,
                                          }
                                        : m
                                    )
                                  )
                                }
                                className="h-4 w-4 rounded border-slate-300"
                              />
                              Tierra PE conectada a bornero
                            </label>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-500">
                      Haz clic encima del cuerpo de cualquier aparato en el carril DIN para editarlo.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* PEDIDO DE MATERIAL DEL CUADRO */}
            {showMaterialModal && (
              <div className="no-print rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 text-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-bold text-indigo-950">
                    📋 Lista de Material del Cuadro para Almacén ({panelMaterialBom.length} líneas)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {onAddToUnifiedOrder && (
                      <button
                        type="button"
                        onClick={() => {
                          onAddToUnifiedOrder(
                            panelMaterialBom.map((r, idx) => ({
                              id: `din-${meta.expedienteNum}-${idx}-${Date.now()}`,
                              source: "Cuadro DIN" as const,
                              projectRef: meta.expedienteNum,
                              category: "Cuadro DIN / Protecciones",
                              concept: r.item,
                              quantity: r.qty,
                              spec: r.spec,
                            }))
                          );
                          setDraftConfirmedMsg(
                            `✅ ${panelMaterialBom.length} líneas del cuadro DIN añadidas al Pedido Unificado de Obra.`
                          );
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700"
                      >
                        + Añadir al Pedido de Obra
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const csv = [
                          "Cantidad;Concepto;Especificacion",
                          ...panelMaterialBom.map(
                            (r) => `${r.qty};"${r.item}";"${r.spec}"`
                          ),
                        ].join("\n");
                        downloadTextFile(
                          `Pedido_Cuadro_${meta.expedienteNum}.csv`,
                          csv,
                          "text/csv;charset=utf-8"
                        );
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-700 px-3 py-1.5 font-semibold text-white hover:bg-indigo-800"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Exportar CSV Almacén
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {panelMaterialBom.map((row, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-indigo-100 bg-white px-3 py-2"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{row.item}</div>
                        <div className="text-[11px] text-slate-500">{row.spec}</div>
                      </div>
                      <span className="rounded-md bg-indigo-100 px-2 py-0.5 font-mono font-bold text-indigo-900">
                        x{row.qty}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RETO INTERACTIVO: ENCUENTRA LA AVERÍA */}
            {activeChallenge && (
              <div className="no-print rounded-2xl border-2 border-purple-300 bg-purple-50/60 p-4 text-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-purple-950 text-sm">
                    🕵️ {activeChallenge.title}
                  </div>
                  <button
                    type="button"
                    onClick={handleStartFaultChallenge}
                    className="rounded-lg border border-purple-300 bg-white px-2.5 py-1 font-semibold text-purple-800 hover:bg-purple-100"
                  >
                    Otra avería →
                  </button>
                </div>
                <p className="text-purple-900">{activeChallenge.symptomHint}</p>
                <div className="space-y-1.5">
                  {activeChallenge.options.map((opt, idx) => {
                    const chosen = challengePickedOption === idx;
                    const isRight = idx === activeChallenge.correctOptionIndex;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setChallengePickedOption(idx)}
                        className={`block w-full rounded-xl border px-3 py-2 text-left font-medium transition ${
                          chosen
                            ? isRight
                              ? "border-emerald-500 bg-emerald-100 text-emerald-950 font-bold"
                              : "border-rose-500 bg-rose-100 text-rose-900"
                            : "border-purple-200 bg-white hover:bg-purple-100/60 text-slate-800"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {challengePickedOption !== null && (
                  <div
                    className={`rounded-xl p-3 font-medium ${
                      challengePickedOption ===
                      activeChallenge.correctOptionIndex
                        ? "bg-emerald-100 text-emerald-950"
                        : "bg-rose-100 text-rose-900"
                    }`}
                  >
                    {challengePickedOption ===
                    activeChallenge.correctOptionIndex
                      ? "✅ ¡Diagnóstico exacto! "
                      : "❌ No es esa la causa. "}
                    {activeChallenge.explanation}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PANEL DE VALIDACIÓN REBT AUTOMÁTICA (DETECTA MALA CONEXIÓN + SOLUCIÓN) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {errorDiagnostics.length > 0 ? (
                  <AlertTriangle className="h-5 w-5 text-rose-600" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                )}
                <h3 className="text-sm font-bold text-slate-900">
                  Validador Técnico del Cuadro (Detección de Errores y Soluciones REBT)
                </h3>
              </div>
              <span
                className={`rounded-full px-3 py-0.5 text-[11px] font-bold ${
                  errorDiagnostics.length > 0
                    ? "bg-rose-100 text-rose-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {errorDiagnostics.length > 0
                  ? `${errorDiagnostics.length} problema(s) detectado(s)`
                  : "Instalación validada sin fallos"}
              </span>
            </div>

            <div className="space-y-2.5">
              {diagnostics.map((diag) => (
                <div
                  key={diag.id}
                  className={`rounded-xl border p-3.5 text-xs ${
                    diag.severity === "error"
                      ? "border-rose-300 bg-rose-50/70 text-rose-950"
                      : diag.severity === "warning"
                      ? "border-amber-300 bg-amber-50/70 text-amber-950"
                      : "border-emerald-300 bg-emerald-50/70 text-emerald-950"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-bold">
                      {diag.severity === "error"
                        ? "❌ "
                        : diag.severity === "warning"
                        ? "⚠️ "
                        : "✅ "}
                      {diag.title}
                    </div>
                    <span className="rounded bg-white/80 px-2 py-0.5 font-mono text-[10px] font-bold">
                      {diag.itc}
                    </span>
                  </div>
                  <p className="mt-1 opacity-90">{diag.detail}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/80 px-3 py-2">
                    <span>
                      <strong>Posible solución:</strong> {diag.solution}
                    </span>
                    {diag.autoFixType && (
                      <button
                        type="button"
                        onClick={() =>
                          handleAutoFixDiagnostic(
                            diag.autoFixType,
                            diag.moduleId
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 shrink-0"
                      >
                        <Wrench className="h-3 w-3" />
                        Corregir ahora
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: ESQUEMA UNIFILAR IEC 60617 + LEYENDA MUNDIAL + CAJETÍN A3 */}
      {stepTab === "esquema_a3" && (
        <div className="space-y-4">
          <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-600">
              Simbología normalizada mundial <strong>IEC 60617 / UNE-EN 60617</strong> con tabla de circuitos, notas REBT y cajetín A3 (sin costes internos).
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  downloadTextFile(
                    `Unifilar_IEC60617_${meta.expedienteNum}_${planNumber}.svg`,
                    buildCadSvgString(),
                    "image/svg+xml;charset=utf-8"
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Download className="h-4 w-4 text-[#0f6cbd]" />
                Descargar SVG para CAD
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f6cbd] px-4 py-2 text-xs font-semibold text-white hover:bg-[#115ea3]"
              >
                <Printer className="h-4 w-4" />
                Imprimir / Guardar PDF A3 con Cajetín
              </button>
            </div>
          </div>

          <div className="print-a3-sheet overflow-x-auto rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
            {companyLogoDataUrl && (
              <div className="mb-2 flex justify-end">
                <img
                  src={companyLogoDataUrl}
                  alt="Logo empresa"
                  className="h-10 object-contain"
                />
              </div>
            )}
            <div
              className="min-w-[960px]"
              dangerouslySetInnerHTML={{ __html: buildCadSvgString() }}
            />
          </div>

          {/* Guía interactiva de la Leyenda Mundial IEC 60617 usada en el plano */}
          <div className="no-print rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#0f6cbd]" />
              <h3 className="text-sm font-bold text-slate-900">
                Leyenda Normalizada Internacional de Simbología Unifilar (IEC 60617 / UNE-EN 60617)
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
              {IEC_60617_LEGEND.map((item) => (
                <div
                  key={item.code}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">{item.name}</span>
                    <span className="rounded bg-blue-100 px-2 py-0.5 font-mono text-[10px] font-bold text-[#0f6cbd]">
                      {item.standard}
                    </span>
                  </div>
                  <p className="text-slate-600">{item.meaning}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
