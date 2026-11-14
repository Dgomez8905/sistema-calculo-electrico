"use client";

import React, { useState, useMemo } from "react";
import {
  Calculator,
  FileImage,
  Tag,
  PackageCheck,
  Mic,
  CheckCircle2,
  Download,
  ArrowRight,
  RotateCcw,
  Ruler,
  Undo2,
} from "lucide-react";
import { parseDwellingQuoteFromText } from "@/lib/monpix-engine";
import {
  ITC_BT_25_TEMPLATES,
  type RebtCircuitInput,
} from "@/lib/electrical-calculations";
import {
  useSpeechDictation,
  downloadTextFile,
  type UnitPriceCatalog,
  type OfficeQuote,
  type QuoteLineItem,
  type UnifiedMaterialOrderItem,
} from "@/lib/monpix-store";

interface PresupuestosPlanoViewProps {
  projectRef: string;
  activeProjectId: number | null;
  defaultClientName: string;
  defaultClientNif: string;
  defaultClientAddress: string;
  defaultIsCanarias: boolean;
  priceCatalog: UnitPriceCatalog;
  onUpdatePriceCatalog: (next: UnitPriceCatalog) => void;
  onCreateOfficeQuote: (quote: OfficeQuote) => void;
  onNavigateToOffice: () => void;
  onApplyBudgetAndCircuitsToMtd?: (
    totalEuros: number,
    circuits: RebtCircuitInput[]
  ) => void;
  onAddToUnifiedOrder?: (items: UnifiedMaterialOrderItem[]) => void;
}

type PlanMarkerType = "enchufe" | "puntoLuz" | "interruptor" | "conmutador" | "tvRj45";

interface PlanMarker {
  id: string;
  xPct: number;
  yPct: number;
  type: PlanMarkerType;
  room: string;
}

const SERIES_FACTORS: Record<string, number> = {
  "Simon 27 Play": 1.0,
  "Schneider New Unica": 1.08,
  "Niessen Zenit": 1.16,
  "Legrand Valena Next": 1.14,
};

const PANEL_FACTORS: Record<string, number> = {
  "Schneider Resi9": 1.08,
  "Hager Residencial": 1.12,
  "Legrand Drivia": 1.05,
  "Genérico Homologado CE": 0.88,
};

export default function PresupuestosPlanoView({
  projectRef,
  activeProjectId,
  defaultClientName,
  defaultClientNif,
  defaultClientAddress,
  defaultIsCanarias,
  priceCatalog,
  onUpdatePriceCatalog,
  onCreateOfficeQuote,
  onNavigateToOffice,
  onApplyBudgetAndCircuitsToMtd,
  onAddToUnifiedOrder,
}: PresupuestosPlanoViewProps) {
  const [subTab, setSubTab] = useState<
    "calculadora" | "plano" | "mis_precios" | "material"
  >("calculadora");
  const [mtdSyncToast, setMtdSyncToast] = useState<string | null>(null);

  // Datos generales del presupuesto de vivienda
  const [jobTitle, setJobTitle] = useState("Instalación eléctrica completa de vivienda");
  const [clientName, setClientName] = useState(defaultClientName || "Cliente Vivienda");
  const [dwellingType, setDwellingType] = useState<"piso" | "chalet">("piso");
  const [scope, setScope] = useState<"completa" | "parcial" | "pequeno">("completa");
  const [areaM2, setAreaM2] = useState(90);
  const [series, setSeries] = useState<string>("Simon 27 Play");
  const [panelBrand, setPanelBrand] = useState<string>("Schneider Resi9");

  // Contadores de puntos
  const [counts, setCounts] = useState({
    interruptor: 9,
    conmutador: 6,
    cruzamiento: 2,
    puntoTecho: 14,
    enchufe16A: 22,
    tomaTv: 3,
    tomaRj45: 3,
    circuito25mm: 2,
    circuito6mm: 2,
    cuadroElevado: 1,
  });

  // Partidas extra personalizadas
  const [extraItems, setExtraItems] = useState<
    { id: string; concept: string; qty: number; unitPrice: number }[]
  >([]);
  const [newExtraConcept, setNewExtraConcept] = useState("");
  const [newExtraPrice, setNewExtraPrice] = useState(85);

  // "Cuéntamelo" por voz/texto con paso "Revísalo y guárdalo"
  const [tellMeText, setTellMeText] = useState("");
  const [pendingParsedCounts, setPendingParsedCounts] = useState<
    ReturnType<typeof parseDwellingQuoteFromText> | null
  >(null);
  const [quoteCreatedToast, setQuoteCreatedToast] = useState(false);

  const { isListening, toggleListening } = useSpeechDictation((txt) =>
    setTellMeText((prev) => (prev ? `${prev} ${txt}` : txt))
  );

  // Lector de plano interactivo
  const [planImgUrl, setPlanImgUrl] = useState<string>("");
  const [activeTool, setActiveTool] = useState<PlanMarkerType | "medir">("enchufe");
  const [currentRoom, setCurrentRoom] = useState("Salón-Cocina");
  const [markers, setMarkers] = useState<PlanMarker[]>([]);
  const [measurePts, setMeasurePts] = useState<{ x: number; y: number }[]>([]);
  const [planWidthMeters, setPlanWidthMeters] = useState(12); // escala ancho plano en metros

  const sFactor = SERIES_FACTORS[series] || 1;
  const pFactor = PANEL_FACTORS[panelBrand] || 1;
  const costRatio = priceCatalog.costRatioPct / 100;
  const taxPct = defaultIsCanarias ? 7 : 21;
  const taxLabel = defaultIsCanarias ? "IGIC" : "IVA";

  const computedLines: QuoteLineItem[] = useMemo(() => {
    const mk = (
      id: string,
      chapter: QuoteLineItem["chapter"],
      concept: string,
      qty: number,
      basePrice: number,
      factor: number
    ): QuoteLineItem => {
      const unitPriceEuro = Number((basePrice * factor).toFixed(2));
      const internalUnitCostEuro = Number((unitPriceEuro * costRatio).toFixed(2));
      return { id, chapter, concept, quantity: qty, unitPriceEuro, internalUnitCostEuro };
    };

    const list: QuoteLineItem[] = [
      mk("p1", "Mecanismos y Puntos", `Punto de luz sencillo (${series})`, counts.interruptor, priceCatalog.interruptor, sFactor),
      mk("p2", "Mecanismos y Puntos", `Punto conmutado (${series})`, counts.conmutador, priceCatalog.conmutador, sFactor),
      mk("p3", "Mecanismos y Puntos", `Cruzamiento (${series})`, counts.cruzamiento, priceCatalog.cruzamiento, sFactor),
      mk("p4", "Mecanismos y Puntos", "Punto de luz en techo c/tubo y línea 1,5 mm² AS", counts.puntoTecho, priceCatalog.puntoTecho, 1),
      mk("p5", "Mecanismos y Puntos", `Base de enchufe 16A 2P+T (${series})`, counts.enchufe16A, priceCatalog.enchufe16A, sFactor),
      mk("p6", "Mecanismos y Puntos", `Toma TV coaxial (${series})`, counts.tomaTv, priceCatalog.tomaTv, sFactor),
      mk("p7", "Mecanismos y Puntos", `Toma datos RJ45 Cat.6 (${series})`, counts.tomaRj45, priceCatalog.tomaRj45, sFactor),
      mk("c1", "Circuitos y Cableado", "Circuito dedicado 2,5 mm² / 4 mm² (lavadora/termo/secadora)", counts.circuito25mm, priceCatalog.circuito25mm, 1),
      mk("c2", "Circuitos y Cableado", "Circuito fuerza 6 mm² Cu H07Z1-K (cocina/horno o clima)", counts.circuito6mm, priceCatalog.circuito6mm, 1),
      mk("q1", "Cuadro y Protecciones", `Cuadro general completo (${panelBrand}): IGA + DPS + 2 Dif. + PIAs`, counts.cuadroElevado, scope === "pequeno" ? priceCatalog.cuadroBasico : priceCatalog.cuadroElevado, pFactor),
      ...extraItems.map((ex) =>
        mk(ex.id, "Mano de Obra / Varios", ex.concept, ex.qty, ex.unitPrice, 1)
      ),
    ];

    return list.filter((l) => l.quantity > 0);
  }, [counts, series, panelBrand, priceCatalog, sFactor, pFactor, costRatio, scope, extraItems]);

  const totals = useMemo(() => {
    const subtotal = computedLines.reduce(
      (acc, l) => acc + l.quantity * l.unitPriceEuro,
      0
    );
    const internalCost = computedLines.reduce(
      (acc, l) => acc + l.quantity * l.internalUnitCostEuro,
      0
    );
    const marginEuro = subtotal - internalCost;
    const marginPct = subtotal > 0 ? Math.round((marginEuro / subtotal) * 100) : 0;
    const taxEuro = (subtotal * taxPct) / 100;
    const totalWithTax = subtotal + taxEuro;

    return {
      subtotal: Number(subtotal.toFixed(2)),
      internalCost: Number(internalCost.toFixed(2)),
      marginEuro: Number(marginEuro.toFixed(2)),
      marginPct,
      taxEuro: Number(taxEuro.toFixed(2)),
      totalWithTax: Number(totalWithTax.toFixed(2)),
    };
  }, [computedLines, taxPct]);

  // Lista automática de material para pedir al almacén
  const materialOrderList = useMemo(() => {
    const totalMechanisms =
      counts.interruptor +
      counts.conmutador +
      counts.cruzamiento +
      counts.enchufe16A +
      counts.tomaTv +
      counts.tomaRj45;
    return [
      { item: "Rollo cable H07Z1-K (AS) 1,5 mm² (Fase/Neutro/Vuelta/TT)", qty: `${Math.max(1, Math.ceil((counts.puntoTecho * 12) / 100))} rollos (100m)` },
      { item: "Rollo cable H07Z1-K (AS) 2,5 mm² (Fase/Azul/TT)", qty: `${Math.max(2, Math.ceil(((counts.enchufe16A * 10 + counts.circuito25mm * 20) * 3) / 100))} rollos (100m)` },
      { item: "Cable H07Z1-K (AS) 6 mm² (Cocina/Clima/Puentes)", qty: `${counts.circuito6mm * 45} m` },
      { item: "Tubo corrugado libre halógenos Ø 20 mm", qty: `${Math.max(50, totalMechanisms * 6)} m` },
      { item: "Tubo corrugado libre halógenos Ø 25 mm", qty: `${Math.max(25, counts.circuito6mm * 18)} m` },
      { item: "Cajas universales de mecanismos enlazar", qty: `${totalMechanisms + 4} uds.` },
      { item: `Mecanismos completos serie ${series} (teclas + bastidores + marcos)`, qty: `${totalMechanisms} uds.` },
      { item: `Envolvente empotrar 24/36 módulos + aparamenta ${panelBrand}`, qty: `${counts.cuadroElevado} conj.` },
    ];
  }, [counts, series, panelBrand]);

  const measuredMeters = useMemo(() => {
    if (measurePts.length < 2) return 0;
    const dx = ((measurePts[1].x - measurePts[0].x) / 100) * planWidthMeters;
    const dy = ((measurePts[1].y - measurePts[0].y) / 100) * (planWidthMeters * 0.7);
    return Number(Math.hypot(dx, dy).toFixed(2));
  }, [measurePts, planWidthMeters]);

  const adjustCount = (key: keyof typeof counts, delta: number) => {
    setCounts((prev) => ({
      ...prev,
      [key]: Math.max(0, prev[key] + delta),
    }));
  };

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Calculadora de Viviendas, Lector de Planos y Material para Pedir
          </h2>
          <p className="text-xs text-slate-500">
            Ponlo a mano, cuéntamelo de voz o sácalo de un plano. El coste y tu margen solo los ves tú, nunca salen en el PDF del cliente.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: "calculadora", label: "Calculadora Vivienda", icon: <Calculator className="h-3.5 w-3.5" /> },
              { id: "plano", label: "Del Plano al Presupuesto", icon: <FileImage className="h-3.5 w-3.5" /> },
              { id: "mis_precios", label: "Mis Precios", icon: <Tag className="h-3.5 w-3.5" /> },
              { id: "material", label: "Material para pedir", icon: <PackageCheck className="h-3.5 w-3.5" /> },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold ${
                subTab === t.id
                  ? "bg-[#0f6cbd] text-white"
                  : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {quoteCreatedToast && (
        <div className="no-print flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900">
          <span>Presupuesto creado y guardado en Oficina (listo para mandar por WhatsApp o convertir en Factura).</span>
          <button
            type="button"
            onClick={onNavigateToOffice}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1 text-white"
          >
            Ver en Oficina <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* PESTAÑA 1: CALCULADORA DE VIVIENDAS */}
      {subTab === "calculadora" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-5">
            {/* Entrada rápida "Cuéntamelo" */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">
                  🎤 Cuéntamelo y te relleno los puntos (con revisión previa)
                </span>
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold ${
                    isListening
                      ? "bg-rose-600 text-white animate-pulse"
                      : "border border-slate-300 bg-slate-50 text-slate-700"
                  }`}
                >
                  <Mic className="h-3.5 w-3.5" />
                  {isListening ? "Escuchando..." : "Dictar"}
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej: Piso de 95 m2 reforma completa con 24 enchufes, 15 puntos de luz, 10 interruptores, 6 conmutadores, horno y aire"
                  value={tellMeText}
                  onChange={(e) => setTellMeText(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (tellMeText.trim()) {
                      setPendingParsedCounts(parseDwellingQuoteFromText(tellMeText));
                    }
                  }}
                  className="rounded-xl bg-slate-900 px-3.5 py-2 font-semibold text-white"
                >
                  Analizar
                </button>
              </div>

              {pendingParsedCounts && (
                <div className="rounded-xl border-2 border-amber-300 bg-amber-50/70 p-3.5 space-y-2">
                  <div className="font-bold text-amber-950">
                    Revísalo y guárdalo: esto es lo que he entendido
                  </div>
                  <p className="text-amber-900">
                    {pendingParsedCounts.dwellingType.toUpperCase()} {pendingParsedCounts.areaM2} m² ({pendingParsedCounts.scope}) →{" "}
                    {pendingParsedCounts.enchufes} enchufes, {pendingParsedCounts.puntosLuz} puntos techo,{" "}
                    {pendingParsedCounts.interruptores} interruptores, {pendingParsedCounts.conmutadores} conmutadores,{" "}
                    {pendingParsedCounts.circuitosEspeciales} líneas 6 mm².
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPendingParsedCounts(null)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAreaM2(pendingParsedCounts.areaM2);
                        setDwellingType(pendingParsedCounts.dwellingType);
                        setScope(pendingParsedCounts.scope);
                        setCounts((prev) => ({
                          ...prev,
                          enchufe16A: pendingParsedCounts.enchufes,
                          puntoTecho: pendingParsedCounts.puntosLuz,
                          interruptor: pendingParsedCounts.interruptores,
                          conmutador: pendingParsedCounts.conmutadores,
                          cruzamiento: pendingParsedCounts.cruzamientos,
                          tomaTv: pendingParsedCounts.tomasTv,
                          tomaRj45: pendingParsedCounts.tomasRj45,
                          circuito6mm: pendingParsedCounts.circuitosEspeciales,
                        }));
                        setPendingParsedCounts(null);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 font-semibold text-white"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Aplicar a la calculadora
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Datos y Selectores de Serie y Cuadro */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <label className="font-semibold text-slate-700">Trabajo</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Cliente</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Superficie (m²)</label>
                  <input
                    type="number"
                    value={areaM2}
                    onChange={(e) => setAreaM2(Number(e.target.value) || 50)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-semibold text-slate-700">Serie de mecanismos</label>
                  <select
                    value={series}
                    onChange={(e) => setSeries(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-xs"
                  >
                    {Object.keys(SERIES_FACTORS).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="font-semibold text-slate-700">Marca de cuadro</label>
                  <select
                    value={panelBrand}
                    onChange={(e) => setPanelBrand(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-xs"
                  >
                    {Object.keys(PANEL_FACTORS).map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Botonera + / - de puntos */}
              <div className="divide-y divide-slate-100 border-t border-slate-200 pt-2">
                {(
                  [
                    { key: "enchufe16A", label: "Enchufes 16A (2P+T)" },
                    { key: "puntoTecho", label: "Puntos de luz en techo" },
                    { key: "interruptor", label: "Interruptores sencillos" },
                    { key: "conmutador", label: "Conmutadores" },
                    { key: "cruzamiento", label: "Cruzamientos" },
                    { key: "tomaTv", label: "Tomas TV" },
                    { key: "tomaRj45", label: "Tomas datos RJ45" },
                    { key: "circuito25mm", label: "Líneas electrodomésticos (lavadora/termo)" },
                    { key: "circuito6mm", label: "Líneas 6 mm² (vitro/horno/aire)" },
                    { key: "cuadroElevado", label: "Cuadro general completo montado" },
                  ] as const
                ).map((row) => (
                  <div key={row.key} className="flex items-center justify-between py-2">
                    <span className="font-medium text-slate-800">{row.label}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjustCount(row.key, -1)}
                        className="h-7 w-7 rounded-lg border border-slate-300 bg-slate-50 font-bold text-slate-700 hover:bg-slate-200"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-mono font-bold text-slate-900">
                        {counts[row.key]}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustCount(row.key, 1)}
                        className="h-7 w-7 rounded-lg border border-slate-300 bg-slate-50 font-bold text-slate-700 hover:bg-slate-200"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Añadir partida suelta */}
              <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                <input
                  type="text"
                  placeholder="+ Añadir partida (ej. Videoportero, Boletín CIE...)"
                  value={newExtraConcept}
                  onChange={(e) => setNewExtraConcept(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5"
                />
                <input
                  type="number"
                  value={newExtraPrice}
                  onChange={(e) => setNewExtraPrice(Number(e.target.value) || 0)}
                  className="w-24 rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newExtraConcept.trim()) return;
                    setExtraItems((prev) => [
                      ...prev,
                      {
                        id: `ex-${Date.now()}`,
                        concept: newExtraConcept.trim(),
                        qty: 1,
                        unitPrice: newExtraPrice,
                      },
                    ]);
                    setNewExtraConcept("");
                  }}
                  className="rounded-lg bg-slate-800 px-3 py-1.5 font-semibold text-white"
                >
                  Añadir partida
                </button>
              </div>
            </div>
          </div>

          {/* Resumen económico + Coste privado del instalador */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Resumen de tu presupuesto</h3>
                <button
                  type="button"
                  onClick={() =>
                    setCounts({
                      interruptor: 0,
                      conmutador: 0,
                      cruzamiento: 0,
                      puntoTecho: 0,
                      enchufe16A: 0,
                      tomaTv: 0,
                      tomaRj45: 0,
                      circuito25mm: 0,
                      circuito6mm: 0,
                      cuadroElevado: 0,
                    })
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900"
                >
                  <RotateCcw className="h-3 w-3" /> Poner a cero
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {computedLines.map((l) => (
                  <div key={l.id} className="flex items-center justify-between py-2 gap-2">
                    <div>
                      <div className="font-medium text-slate-900">
                        {l.quantity} × {l.concept}
                      </div>
                      <div className="no-print text-[11px] text-emerald-700">
                        PVP {l.unitPriceEuro} € · Te cuesta {l.internalUnitCostEuro} €
                      </div>
                    </div>
                    <span className="font-mono font-bold text-slate-900 shrink-0">
                      {(l.quantity * l.unitPriceEuro).toFixed(2)} €
                    </span>
                  </div>
                ))}
              </div>

              {/* Bloque exclusivo para el instalador: Coste y Margen */}
              <div className="no-print rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-1">
                <div className="text-[11px] font-bold uppercase text-emerald-900">
                  Solo lo ves tú (no sale en el PDF del cliente)
                </div>
                <div className="flex justify-between text-emerald-950">
                  <span>Te cuesta (material + mano de obra est.):</span>
                  <strong className="font-mono">{totals.internalCost.toFixed(2)} €</strong>
                </div>
                <div className="flex justify-between text-emerald-950">
                  <span>Beneficio / Margen neto:</span>
                  <strong className="font-mono">
                    +{totals.marginEuro.toFixed(2)} € ({totals.marginPct}%)
                  </strong>
                </div>
              </div>

              {/* Totales cliente */}
              <div className="border-t border-slate-200 pt-3 space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Total sin impuestos:</span>
                  <strong className="font-mono">{totals.subtotal.toFixed(2)} €</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>
                    {taxLabel} ({taxPct}%):
                  </span>
                  <strong className="font-mono">{totals.taxEuro.toFixed(2)} €</strong>
                </div>
                <div className="flex justify-between text-base font-extrabold text-[#0f6cbd] pt-1">
                  <span>Total con {taxLabel}:</span>
                  <span className="font-mono">{totals.totalWithTax.toFixed(2)} €</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const csv = [
                      "Capitulo;Concepto;Cantidad;Precio_Unitario_EUR;Subtotal_EUR",
                      ...computedLines.map(
                        (l) =>
                          `"${l.chapter}";"${l.concept}";${l.quantity};${l.unitPriceEuro};${(
                            l.quantity * l.unitPriceEuro
                          ).toFixed(2)}`
                      ),
                    ].join("\n");
                    downloadTextFile(
                      `Presupuesto_${projectRef}.csv`,
                      csv,
                      "text/csv;charset=utf-8"
                    );
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  Descargar Excel (CSV)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const num = `P-2026-${String(Math.floor(100 + Math.random() * 900))}`;
                    onCreateOfficeQuote({
                      id: `q-${Date.now()}`,
                      number: num,
                      projectId: activeProjectId,
                      projectRef,
                      clientName,
                      clientNif: defaultClientNif,
                      clientPhone: "",
                      clientEmail: "",
                      clientAddress: defaultClientAddress,
                      title: `${jobTitle} (${dwellingType} ${areaM2} m²)`,
                      mechanismSeries: series,
                      panelBrand,
                      taxPct,
                      taxLabel,
                      status: "borrador",
                      createdAtIso: new Date().toISOString(),
                      lines: computedLines,
                      notes: "Validez del presupuesto: 30 días. Incluye certificado CIE/MTD.",
                    });
                    setQuoteCreatedToast(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0f6cbd] px-3 py-2.5 font-semibold text-white hover:bg-[#115ea3]"
                >
                  Hacer el presupuesto
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              {onApplyBudgetAndCircuitsToMtd && (
                <button
                  type="button"
                  onClick={() => {
                    const base = ITC_BT_25_TEMPLATES.slice(0, 5).map((c) => ({
                      ...c,
                    }));
                    const extraCircuits: RebtCircuitInput[] = [];
                    if (counts.circuito25mm > 3) {
                      for (let i = 0; i < Math.min(counts.circuito25mm - 3, 4); i++) {
                        extraCircuits.push({
                          ...ITC_BT_25_TEMPLATES[1],
                          code: `C${6 + i}`,
                          description: `Circuito adicional enchufes/fuerza ${i + 1}`,
                        });
                      }
                    }
                    if (counts.circuito6mm > 1) {
                      extraCircuits.push({
                        ...ITC_BT_25_TEMPLATES[2],
                        code: `C${6 + extraCircuits.length}`,
                        description: "Circuito climatización / bomba calor",
                      });
                    }
                    const generated = [...base, ...extraCircuits];
                    onApplyBudgetAndCircuitsToMtd(totals.totalWithTax, generated);
                    setMtdSyncToast(
                      `✅ ${totals.totalWithTax.toFixed(2)} € y ${generated.length} circuitos aplicados al expediente M.T.D.`
                    );
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 font-semibold text-emerald-900 hover:bg-emerald-100"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  Sincronizar {totals.totalWithTax.toFixed(2)} € y Circuitos con M.T.D.
                </button>
              )}
              {mtdSyncToast && (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800">
                  {mtdSyncToast}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: DEL PLANO AL PRESUPUESTO */}
      {subTab === "plano" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Del plano al presupuesto (Cuenta símbolos por estancias y mide tiradas)
              </h3>
              <p className="text-slate-500">
                Sube una imagen o captura del plano y haz clic encima para marcar enchufes, puntos de luz o medir metros.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded-xl bg-[#0f6cbd] px-3.5 py-2 font-semibold text-white hover:bg-[#115ea3]">
                Subir plano (Imagen)
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = () => setPlanImgUrl(String(r.result || ""));
                    r.readAsDataURL(f);
                  }}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={() => setMarkers((prev) => prev.slice(0, -1))}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700"
              >
                <Undo2 className="h-3.5 w-3.5" /> Deshacer
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: "enchufe", label: "🔌 Enchufe", color: "bg-blue-600" },
                { id: "puntoLuz", label: "💡 Punto Luz", color: "bg-amber-500" },
                { id: "interruptor", label: "🔘 Interruptor", color: "bg-emerald-600" },
                { id: "conmutador", label: "⇄ Conmutador", color: "bg-purple-600" },
                { id: "tvRj45", label: "📺 TV / RJ45", color: "bg-rose-600" },
                { id: "medir", label: "📏 Medir distancia", color: "bg-slate-800" },
              ] as const
            ).map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  setActiveTool(tool.id);
                  if (tool.id === "medir") setMeasurePts([]);
                }}
                className={`rounded-lg px-3 py-1.5 font-semibold ${
                  activeTool === tool.id
                    ? `${tool.color} text-white`
                    : "border border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                {tool.label}
              </button>
            ))}

            <select
              value={currentRoom}
              onChange={(e) => setCurrentRoom(e.target.value)}
              className="px-3 py-1.5 text-xs"
            >
              <option>Salón-Cocina</option>
              <option>Dormitorio Principal</option>
              <option>Dormitorio 2</option>
              <option>Baño</option>
              <option>Pasillo / Entrada</option>
            </select>

            <div className="inline-flex items-center gap-1.5 ml-auto">
              <Ruler className="h-3.5 w-3.5 text-slate-500" />
              <span>Ancho real plano (m):</span>
              <input
                type="number"
                value={planWidthMeters}
                onChange={(e) => setPlanWidthMeters(Number(e.target.value) || 10)}
                className="w-16 rounded border border-slate-300 px-2 py-1 font-mono"
              />
            </div>
          </div>

          {/* Lienzo interactivo del plano */}
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const xPct = ((e.clientX - rect.left) / rect.width) * 100;
              const yPct = ((e.clientY - rect.top) / rect.height) * 100;
              if (activeTool === "medir") {
                setMeasurePts((prev) =>
                  prev.length >= 2 ? [{ x: xPct, y: yPct }] : [...prev, { x: xPct, y: yPct }]
                );
                return;
              }
              setMarkers((prev) => [
                ...prev,
                {
                  id: `mk-${Date.now()}`,
                  xPct,
                  yPct,
                  type: activeTool,
                  room: currentRoom,
                },
              ]);
            }}
            className="relative h-96 w-full cursor-crosshair overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center select-none"
          >
            {planImgUrl ? (
              <img
                src={planImgUrl}
                alt="Plano vivienda"
                className="h-full w-full object-contain pointer-events-none"
              />
            ) : (
              <div className="text-center text-slate-400 pointer-events-none">
                <p className="font-semibold text-slate-600">
                  Haz clic aquí encima para simular el conteo en plano (o sube tu plano arriba)
                </p>
                <p className="mt-1">Cuadrícula de referencia a escala ({planWidthMeters} m de ancho)</p>
              </div>
            )}

            {markers.map((m) => (
              <span
                key={m.id}
                style={{ left: `${m.xPct}%`, top: `${m.yPct}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow"
                title={`${m.type} (${m.room})`}
              >
                {m.type === "enchufe"
                  ? "🔌"
                  : m.type === "puntoLuz"
                  ? "💡"
                  : m.type === "interruptor"
                  ? "🔘"
                  : m.type === "conmutador"
                  ? "⇄"
                  : "📺"}
              </span>
            ))}

            {measurePts.map((pt, i) => (
              <span
                key={i}
                style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-600 ring-2 ring-white"
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3.5 border border-slate-200">
            <div className="flex flex-wrap gap-4">
              <span>
                Lo que llevas contado: <strong>{markers.length} símbolos</strong>
              </span>
              {measuredMeters > 0 && (
                <span className="text-rose-700 font-bold">
                  Última medida: {measuredMeters} m
                </span>
              )}
            </div>
            <button
              type="button"
              disabled={markers.length === 0}
              onClick={() => {
                setCounts((prev) => ({
                  ...prev,
                  enchufe16A: markers.filter((m) => m.type === "enchufe").length || prev.enchufe16A,
                  puntoTecho: markers.filter((m) => m.type === "puntoLuz").length || prev.puntoTecho,
                  interruptor: markers.filter((m) => m.type === "interruptor").length || prev.interruptor,
                  conmutador: markers.filter((m) => m.type === "conmutador").length || prev.conmutador,
                  tomaTv: markers.filter((m) => m.type === "tvRj45").length || prev.tomaTv,
                }));
                setSubTab("calculadora");
              }}
              className="rounded-xl bg-[#0f6cbd] px-4 py-2 font-semibold text-white disabled:opacity-40"
            >
              Pasar conteo al Presupuesto
            </button>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: MIS PRECIOS */}
      {subTab === "mis_precios" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900">
            ¿De dónde sale el precio por punto? Ajústalo a tus tarifas
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(
              [
                { k: "enchufe16A", label: "Punto enchufe 16A (€)" },
                { k: "puntoTecho", label: "Punto luz techo (€)" },
                { k: "interruptor", label: "Interruptor sencillo (€)" },
                { k: "conmutador", label: "Conmutador (€)" },
                { k: "cruzamiento", label: "Cruzamiento (€)" },
                { k: "tomaTv", label: "Toma TV (€)" },
                { k: "tomaRj45", label: "Toma RJ45 (€)" },
                { k: "circuito25mm", label: "Circuito 2,5/4 mm² (€)" },
                { k: "circuito6mm", label: "Circuito 6 mm² (€)" },
                { k: "cuadroBasico", label: "Cuadro básico (€)" },
                { k: "cuadroElevado", label: "Cuadro elevado (€)" },
                { k: "costRatioPct", label: "Tu coste medio (% s/PVP)" },
              ] as const
            ).map((f) => (
              <div key={f.k}>
                <label className="font-semibold text-slate-700">{f.label}</label>
                <input
                  type="number"
                  value={priceCatalog[f.k]}
                  onChange={(e) =>
                    onUpdatePriceCatalog({
                      ...priceCatalog,
                      [f.k]: Number(e.target.value) || 0,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA 4: MATERIAL PARA PEDIR */}
      {subTab === "material" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Lista de material para pedir al almacén
              </h3>
              <p className="text-slate-500">
                Calculada a partir de los puntos y circuitos que tienes puestos en la calculadora.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {onAddToUnifiedOrder && (
                <button
                  type="button"
                  onClick={() => {
                    onAddToUnifiedOrder(
                      materialOrderList.map((m, idx) => {
                        const qtyMatch = m.qty.match(/(\d+)/);
                        return {
                          id: `quote-${projectRef}-${idx}-${Date.now()}`,
                          source: "Presupuesto" as const,
                          projectRef,
                          category: "Presupuesto Vivienda",
                          concept: m.item,
                          quantity: qtyMatch ? Number(qtyMatch[1]) : 1,
                          spec: m.qty,
                        };
                      })
                    );
                    setMtdSyncToast(
                      `✅ ${materialOrderList.length} líneas de material enviadas al Pedido Unificado de Obra (Oficina).`
                    );
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 font-semibold text-white hover:bg-emerald-700"
                >
                  + Añadir al Pedido de Obra
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const txt = materialOrderList
                    .map((m) => `- ${m.qty} -> ${m.item}`)
                    .join("\n");
                  downloadTextFile(`Pedido_Material_${projectRef}.txt`, txt);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f6cbd] px-3.5 py-2 font-semibold text-white"
              >
                <Download className="h-4 w-4" />
                Descargar lista de pedido
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {materialOrderList.map((m, idx) => (
              <div key={idx} className="flex items-center justify-between py-2.5">
                <span className="font-medium text-slate-800">{m.item}</span>
                <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-mono font-bold text-[#0f6cbd]">
                  {m.qty}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

