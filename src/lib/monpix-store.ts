"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";
import type { DinModule } from "@/components/monpix/dinPanelHelpers";

// ============================================================================
// Tipos de Dominio MONPIX (Aislados por Empresa Tenant y Usuario)
// ============================================================================

export interface QuoteLineItem {
  id: string;
  chapter: "Mecanismos y Puntos" | "Circuitos y Cableado" | "Cuadro y Protecciones" | "Mano de Obra / Varios";
  concept: string;
  quantity: number;
  unitPriceEuro: number; // Precio venta al cliente (sin IVA/IGIC)
  internalUnitCostEuro: number; // Coste interno para el instalador (NUNCA sale en PDF)
}

export interface OfficeQuote {
  id: string;
  number: string; // P-2026-0001
  projectId: number | null;
  projectRef: string;
  clientName: string;
  clientNif: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  title: string;
  mechanismSeries: string;
  panelBrand: string;
  taxPct: number; // 21 IVA o 7 IGIC
  taxLabel: "IVA" | "IGIC";
  status: "borrador" | "enviado" | "aceptado" | "facturado";
  createdAtIso: string;
  lines: QuoteLineItem[];
  notes: string;
}

export interface OfficeInvoice {
  id: string;
  seriesNumber: string; // F-2026-0001 (correlativa)
  fromQuoteNumber?: string;
  projectId: number | null;
  projectRef: string;
  clientName: string;
  clientNif: string;
  clientAddress: string;
  issueDateIso: string; // YYYY-MM-DD
  generatedAtIso: string;
  taxPct: number;
  taxLabel: "IVA" | "IGIC";
  subtotalEuro: number;
  taxAmountEuro: number;
  totalEuro: number;
  lines: { concept: string; quantity: number; unitPriceEuro: number }[];
  previousHash: string;
  verifactuHash: string;
  verifactuQrUrl: string;
  paid: boolean;
}

export interface OfficeClient {
  id: string;
  name: string;
  nif: string;
  phone: string;
  email: string;
  address: string;
}

export interface OfficeIncident {
  id: string;
  title: string;
  clientName: string;
  phone: string;
  address: string;
  urgency: "normal" | "urgente";
  status: "pendiente" | "en_curso" | "resuelto";
  createdAtIso: string;
}

export interface ExpenseRecord {
  id: string;
  dateIso: string;
  docType: "Ticket" | "Factura" | "Albarán";
  supplierName: string;
  supplierNif: string;
  docNumber: string;
  category: "Material eléctrico" | "Herramienta" | "Combustible / Furgoneta" | "Subcontrata" | "Fijo / Gestoría";
  concept: string;
  projectRef: string;
  baseEuro: number;
  taxPct: number;
  taxEuro: number;
  totalEuro: number;
  paymentMethod: "Tarjeta" | "Transferencia" | "Efectivo" | "Domiciliado";
  isFixedExpense: boolean;
}

export interface WorkTask {
  id: string;
  title: string;
  whenDate: string;
  assignedTo: string;
  projectRef: string;
  phone: string;
  email: string;
  notes: string;
  origin: "manual" | "voz" | "whatsapp";
  priority: "normal" | "alta";
  completed: boolean;
}

export interface TeamWorker {
  id: string;
  name: string;
  category: "Oficial 1ª" | "Oficial 2ª" | "Ayudante" | "Instalador Autorizado";
  phone: string;
  statusToday: "trabajando" | "en_pausa" | "terminado" | "sin_fichar" | "ausencia";
  currentProjectRef: string;
  shareToken: string;
}

export interface AssignedJob {
  id: string;
  workerId: string;
  workerName: string;
  projectRef: string;
  address: string;
  dateIso: string;
  timeStr: string;
  instructions: string;
  materialsToBring: string;
  notified: boolean;
}

export interface TimeLogCorrection {
  correctedAtIso: string;
  correctedBy: string;
  previousCheckIn: string;
  previousCheckOut: string;
  newCheckIn: string;
  newCheckOut: string;
  reason: string;
}

export interface ImmutableTimeLog {
  id: string;
  workerId: string;
  workerName: string;
  projectRef: string;
  dateIso: string;
  originalCheckIn: string; // Inmutable
  originalCheckOut: string; // Inmutable
  effectiveCheckIn: string;
  effectiveCheckOut: string;
  hoursWorked: number;
  correctionHistory: TimeLogCorrection[];
}

export interface WorkReport {
  id: string;
  dateIso: string;
  workerName: string;
  projectRef: string;
  summary: string;
  materialsUsed: string;
  hours: number;
  clientSignedBy: string;
  signatureDataUrl: string;
}

export interface UnitPriceCatalog {
  interruptor: number;
  conmutador: number;
  cruzamiento: number;
  puntoTecho: number;
  enchufe16A: number;
  tomaTv: number;
  tomaRj45: number;
  circuito25mm: number;
  circuito6mm: number;
  cuadroBasico: number;
  cuadroElevado: number;
  costRatioPct: number; // % coste sobre PVP base
}

export interface SavedUnifilarDiagram {
  id: string;
  title: string;
  titular: string;
  address: string;
  createdAtIso: string;
  igaAmps: number;
  hasDps: boolean;
  rcdCount: number;
  supplyType: "monofasico_230v" | "trifasico_400v";
  circuitsSummary: string;
}

export interface UnifiedMaterialOrderItem {
  id: string;
  source: "Presupuesto" | "Cuadro DIN" | "Manual";
  projectRef: string;
  category: string;
  concept: string;
  quantity: number;
  spec: string;
}

export interface MonpixWorkspaceData {
  version: 1;
  companyLogoDataUrl: string;
  hourlyCostConfig: {
    grossAnnualSalary: number;
    socialSecurityPct: number;
    effectiveAnnualHours: number;
    nonBillableMermaPct: number;
  };
  priceCatalog: UnitPriceCatalog;
  quotes: OfficeQuote[];
  invoices: OfficeInvoice[];
  clients: OfficeClient[];
  incidents: OfficeIncident[];
  expenses: ExpenseRecord[];
  tasks: WorkTask[];
  workers: TeamWorker[];
  jobs: AssignedJob[];
  timeLogs: ImmutableTimeLog[];
  workReports: WorkReport[];
  savedUnifilares: SavedUnifilarDiagram[];
  dinPanelsByExpediente?: Record<string, DinModule[]>;
  dinBoxSizesByExpediente?: Record<string, number | "auto">;
  unifiedOrderCart?: UnifiedMaterialOrderItem[];
}

export function createDefaultMonpixWorkspace(
  tenantName: string,
  islaOrRegion: string
): MonpixWorkspaceData {
  const isCanarias =
    islaOrRegion.toLowerCase().includes("tenerife") ||
    islaOrRegion.toLowerCase().includes("canaria") ||
    islaOrRegion.toLowerCase().includes("palma") ||
    islaOrRegion.toLowerCase().includes("lanzarote") ||
    islaOrRegion.toLowerCase().includes("fuerteventura");

  const taxPct = isCanarias ? 7 : 21;
  const taxLabel = isCanarias ? "IGIC" : "IVA";

  return {
    version: 1,
    companyLogoDataUrl: "",
    hourlyCostConfig: {
      grossAnnualSalary: 24500,
      socialSecurityPct: 32,
      effectiveAnnualHours: 1752,
      nonBillableMermaPct: 15,
    },
    priceCatalog: {
      interruptor: 38,
      conmutador: 44,
      cruzamiento: 52,
      puntoTecho: 42,
      enchufe16A: 41,
      tomaTv: 55,
      tomaRj45: 62,
      circuito25mm: 165,
      circuito6mm: 245,
      cuadroBasico: 420,
      cuadroElevado: 690,
      costRatioPct: 58,
    },
    quotes: [
      {
        id: "q-seed-1",
        number: "P-2026-0001",
        projectId: null,
        projectRef: "EXP-2026-VIVIENDA",
        clientName: "Comunidad / Reforma Piso 3ºB",
        clientNif: "43829104Z",
        clientPhone: "629 48 12 30",
        clientEmail: "cliente@ejemplo.es",
        clientAddress: "Avda. Tres de Mayo 42, 3ºB",
        title: "Reforma eléctrica completa vivienda 90 m² (Electrificación Elevada)",
        mechanismSeries: "Simon 27 Play / Blanco",
        panelBrand: "Schneider Resi9",
        taxPct,
        taxLabel,
        status: "enviado",
        createdAtIso: "2026-11-12T09:30:00Z",
        notes: "Incluye legalización CIE/MTD y pruebas de aislamiento y diferencial.",
        lines: [
          {
            id: "l1",
            chapter: "Cuadro y Protecciones",
            concept: "Cuadro empotrar 24 mód. con IGA 40A + Combi DPS + 2 Dif. 40A/30mA Clase A + 8 PIAs",
            quantity: 1,
            unitPriceEuro: 690,
            internalUnitCostEuro: 385,
          },
          {
            id: "l2",
            chapter: "Mecanismos y Puntos",
            concept: "Puntos de enchufe 16A c/tierra tubo Ø20mm cable 2,5 mm² H07Z1-K (AS)",
            quantity: 22,
            unitPriceEuro: 41,
            internalUnitCostEuro: 23,
          },
          {
            id: "l3",
            chapter: "Mecanismos y Puntos",
            concept: "Puntos de luz sencillos y conmutados cable 1,5 mm² H07Z1-K (AS)",
            quantity: 14,
            unitPriceEuro: 42,
            internalUnitCostEuro: 24,
          },
          {
            id: "l4",
            chapter: "Circuitos y Cableado",
            concept: "Línea especial C3 Cocina/Horno 6 mm² Cu + base 25A y C9 Clima 6 mm²",
            quantity: 2,
            unitPriceEuro: 245,
            internalUnitCostEuro: 140,
          },
        ],
      },
    ],
    invoices: [],
    clients: [
      {
        id: "cl-1",
        name: "Promociones Residenciales S.L.",
        nif: "B38901245",
        phone: "922 24 58 90",
        email: "administracion@promociones.es",
        address: "Avda. Tres de Mayo 42",
      },
    ],
    incidents: [
      {
        id: "inc-1",
        title: "Disparo intermitente diferencial general en cuadro de local",
        clientName: "Cafetería Central",
        phone: "611 22 33 44",
        address: "C/ Castillo 18, Bajo",
        urgency: "urgente",
        status: "pendiente",
        createdAtIso: "2026-11-14T08:15:00Z",
      },
    ],
    expenses: [
      {
        id: "exp-1",
        dateIso: "2026-11-11",
        docType: "Factura",
        supplierName: `Almacén Eléctrico Distribuidor (${tenantName.slice(0, 18)})`,
        supplierNif: "A28012345",
        docNumber: "ALB-98412",
        category: "Material eléctrico",
        concept: "Rollos H07Z1-K 1.5/2.5/6 mm², aparamenta modular Schneider y cajas",
        projectRef: "EXP-2026-VIVIENDA",
        baseEuro: 740,
        taxPct,
        taxEuro: Number(((740 * taxPct) / 100).toFixed(2)),
        totalEuro: Number((740 * (1 + taxPct / 100)).toFixed(2)),
        paymentMethod: "Transferencia",
        isFixedExpense: false,
      },
    ],
    tasks: [
      {
        id: "tsk-1",
        title: "Revisar medida de tierra con telurómetro y firmar CIE",
        whenDate: "2026-11-14",
        assignedTo: "Oficial de guardia",
        projectRef: "EXP-2026-VIVIENDA",
        phone: "629 48 12 30",
        email: "",
        notes: "Llevar puente comprobación y etiquetas para rotular los automáticos del cuadro.",
        origin: "manual",
        priority: "alta",
        completed: false,
      },
    ],
    workers: [
      {
        id: "wk-1",
        name: "Sergio Delgado",
        category: "Oficial 1ª",
        phone: "644 10 20 30",
        statusToday: "trabajando",
        currentProjectRef: "EXP-2026-VIVIENDA",
        shareToken: "op-sergio-8821",
      },
      {
        id: "wk-2",
        name: "Rubén Padrón",
        category: "Oficial 2ª",
        phone: "655 80 90 11",
        statusToday: "en_pausa",
        currentProjectRef: "EXP-2026-VIVIENDA",
        shareToken: "op-ruben-4410",
      },
    ],
    jobs: [
      {
        id: "jb-1",
        workerId: "wk-1",
        workerName: "Sergio Delgado",
        projectRef: "EXP-2026-VIVIENDA",
        address: "Avda. Tres de Mayo 42, 3ºB",
        dateIso: "2026-11-14",
        timeStr: "08:00",
        instructions: "Pasar manguera DI 2x10+TT 10mm² desde cuarto contadores y peinar cuadro general.",
        materialsToBring: "Guía pasacables 30m, punteras huecas 2.5/6/10mm², peine bipolar 63A.",
        notified: true,
      },
    ],
    timeLogs: [
      {
        id: "tl-1",
        workerId: "wk-1",
        workerName: "Sergio Delgado",
        projectRef: "EXP-2026-VIVIENDA",
        dateIso: "2026-11-13",
        originalCheckIn: "07:58",
        originalCheckOut: "16:02",
        effectiveCheckIn: "07:58",
        effectiveCheckOut: "16:02",
        hoursWorked: 8.0,
        correctionHistory: [],
      },
    ],
    workReports: [],
    savedUnifilares: [],
    dinPanelsByExpediente: {},
    dinBoxSizesByExpediente: {},
    unifiedOrderCart: [],
  };
}

// ============================================================================
// Hook Principal de Estado Persistente y Aislado Multi-Tenant + Cola Offline
// ============================================================================
export function useMonpixWorkspace(params: {
  tenantId: number;
  userId: number;
  tenantName: string;
  islaOrRegion: string;
}) {
  const storageKey = `rebt_monpix_v1_t${params.tenantId}_u${params.userId}`;
  const pendingKey = `${storageKey}_pending_sync`;
  const [workspace, setWorkspace] = useState<MonpixWorkspaceData>(() =>
    createDefaultMonpixWorkspace(params.tenantName, params.islaOrRegion)
  );
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<string>("");
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const initializedKeyRef = useRef<string>("");

  const pushSnapshotToSupabase = useCallback(
    async (
      data: MonpixWorkspaceData
    ): Promise<"synced" | "offline_pending" | "local_only"> => {
      if (!supabase) return "local_only";
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return "offline_pending";
      }
      try {
        const { error } = await supabase.from("monpix_workspace_snapshots").upsert(
          {
            tenant_id: params.tenantId,
            owner_user_id: params.userId,
            payload_json: data,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id,owner_user_id" }
        );
        // Si la tabla opcional aún no existe en Supabase remoto, mantenemos persistencia local limpia sin bucle de reintento
        if (error) return "local_only";
        return "synced";
      } catch {
        return typeof navigator !== "undefined" && !navigator.onLine
          ? "offline_pending"
          : "local_only";
      }
    },
    [params.tenantId, params.userId]
  );

  // Cargar al cambiar de usuario/empresa (aislamiento estricto) y vigilar conexión
  useEffect(() => {
    if (typeof window === "undefined") return;
    initializedKeyRef.current = "";
    const onlineNow = navigator.onLine;
    setIsOnline(onlineNow);
    try {
      const cached = window.localStorage.getItem(storageKey);
      if (onlineNow) {
        window.localStorage.removeItem(pendingKey);
        setPendingSyncCount(0);
      } else {
        const pendingRaw = window.localStorage.getItem(pendingKey);
        setPendingSyncCount(pendingRaw ? Number(pendingRaw) || 1 : 0);
      }
      if (cached) {
        const parsed = JSON.parse(cached) as Partial<MonpixWorkspaceData>;
        const defaults = createDefaultMonpixWorkspace(
          params.tenantName,
          params.islaOrRegion
        );
        setWorkspace({ ...defaults, ...parsed, version: 1 });
      } else {
        setWorkspace(
          createDefaultMonpixWorkspace(params.tenantName, params.islaOrRegion)
        );
      }
    } catch {
      setWorkspace(
        createDefaultMonpixWorkspace(params.tenantName, params.islaOrRegion)
      );
    }
    initializedKeyRef.current = storageKey;

    const handleOnline = async () => {
      setIsOnline(true);
      const cached = window.localStorage.getItem(storageKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as MonpixWorkspaceData;
          const res = await pushSnapshotToSupabase(parsed);
          if (res !== "offline_pending") {
            window.localStorage.removeItem(pendingKey);
            setPendingSyncCount(0);
          }
        } catch {
          // ignore
        }
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [storageKey, pendingKey, params.tenantName, params.islaOrRegion, pushSnapshotToSupabase]);

  // Guardado automático en localStorage + cola offline + sincronización Supabase
  const updateWorkspace = useCallback(
    (
      updater:
        | MonpixWorkspaceData
        | ((prev: MonpixWorkspaceData) => MonpixWorkspaceData)
    ) => {
      setWorkspace((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(storageKey, JSON.stringify(next));
            setLastAutoSavedAt(
              new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            );
          } catch {
            // Ignorar cuota llena
          }
        }
        if (supabase) {
          void pushSnapshotToSupabase(next).then((status) => {
            if (typeof window === "undefined") return;
            if (status !== "offline_pending") {
              window.localStorage.removeItem(pendingKey);
              setPendingSyncCount(0);
            } else {
              setPendingSyncCount((c) => {
                const updated = c + 1;
                window.localStorage.setItem(pendingKey, String(updated));
                return updated;
              });
            }
          });
        }
        return next;
      });
    },
    [storageKey, pendingKey, pushSnapshotToSupabase]
  );

  return {
    workspace,
    updateWorkspace,
    lastAutoSavedAt,
    isOnline,
    pendingSyncCount,
  };
}

// ============================================================================
// Hook de Dictado por Voz Nativo (🎤 Web Speech API en Español)
// ============================================================================
export function useSpeechDictation(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const toggleListening = useCallback(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      setVoiceError(
        "Tu navegador actual no soporta dictado por voz directo (usa Chrome o Edge)."
      );
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    setVoiceError(null);
    const recognition = new SpeechRec();
    recognition.lang = "es-ES";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      setVoiceError("No se pudo escuchar el micrófono. Revisa el permiso del navegador.");
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript;
      if (transcript) {
        onTranscript(transcript);
      }
    };

    recognition.start();
  }, [isListening, onTranscript]);

  return { isListening, voiceError, toggleListening };
}

// ============================================================================
// Utilidad para descargar archivos CSV / SVG / JSON en cliente
// ============================================================================
export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = "text/plain;charset=utf-8"
) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

