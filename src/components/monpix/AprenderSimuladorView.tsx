"use client";

import React, { useMemo, useState } from "react";
import {
  GraduationCap,
  Cpu,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
} from "lucide-react";
import DinModularDeviceVisual from "@/components/monpix/DinModularDeviceVisual";
import {
  computePanelLiveState,
  type DinModule,
} from "@/components/monpix/dinPanelHelpers";

type SimPiece =
  | "IGA_40A"
  | "DPS_COMBI"
  | "DIF_40A_30MA"
  | "PIA_10A_C1"
  | "PIA_16A_C2"
  | "PIA_25A_C3"
  | "PIA_20A_C4"
  | "PIA_16A_C5"
  | "PIA_25A_C9";

interface SimRailItem {
  uid: string;
  piece: SimPiece;
  isOn: boolean;
  isTripped?: boolean;
}

const PIECE_LABELS: Record<
  SimPiece,
  {
    short: string;
    color: string;
    template: Omit<DinModule, "id" | "isOn" | "isTripped" | "parentRcdId">;
  }
> = {
  DPS_COMBI: {
    short: "Combi 40A (IGA+DPS)",
    color: "bg-amber-500 text-white",
    template: {
      kind: "COMBI",
      label: "COMBI IGA",
      sublabel: "IGA 40A + T2+POP",
      ratingAmps: 40,
      curve: "C",
      poles: 2,
      modulesWidth: 3,
    },
  },
  IGA_40A: {
    short: "IGA 40A (suelto)",
    color: "bg-slate-900 text-white",
    template: {
      kind: "IGA",
      label: "IGA",
      sublabel: "Corte Gral.",
      ratingAmps: 40,
      curve: "C",
      poles: 2,
      modulesWidth: 2,
    },
  },
  DIF_40A_30MA: {
    short: "Dif. 40A/30mA",
    color: "bg-emerald-600 text-white",
    template: {
      kind: "DIF",
      label: "DIF",
      sublabel: "Clase A",
      ratingAmps: 40,
      sensitivityMa: 30,
      rcdClass: "A",
      poles: 2,
      modulesWidth: 2,
    },
  },
  PIA_10A_C1: {
    short: "C1 · 10A Luz",
    color: "bg-[#0f6cbd] text-white",
    template: {
      kind: "PIA",
      label: "C1",
      sublabel: "Alumbrado",
      ratingAmps: 10,
      curve: "C",
      poles: 2,
      modulesWidth: 1,
      cableSectionMm2: 1.5,
      hasEarthConnected: true,
    },
  },
  PIA_16A_C2: {
    short: "C2 · 16A Tomas",
    color: "bg-[#0f6cbd] text-white",
    template: {
      kind: "PIA",
      label: "C2",
      sublabel: "Enchufes Gral.",
      ratingAmps: 16,
      curve: "C",
      poles: 2,
      modulesWidth: 1,
      cableSectionMm2: 2.5,
      hasEarthConnected: true,
    },
  },
  PIA_25A_C3: {
    short: "C3 · 25A Cocina",
    color: "bg-[#0f6cbd] text-white",
    template: {
      kind: "PIA",
      label: "C3",
      sublabel: "Cocina/Horno",
      ratingAmps: 25,
      curve: "C",
      poles: 2,
      modulesWidth: 1,
      cableSectionMm2: 6,
      hasEarthConnected: true,
    },
  },
  PIA_20A_C4: {
    short: "C4 · 20A Lavad.",
    color: "bg-[#0f6cbd] text-white",
    template: {
      kind: "PIA",
      label: "C4",
      sublabel: "Lav./Termo",
      ratingAmps: 20,
      curve: "C",
      poles: 2,
      modulesWidth: 1,
      cableSectionMm2: 4,
      hasEarthConnected: true,
    },
  },
  PIA_16A_C5: {
    short: "C5 · 16A Baño",
    color: "bg-[#0f6cbd] text-white",
    template: {
      kind: "PIA",
      label: "C5",
      sublabel: "Tomas Baño",
      ratingAmps: 16,
      curve: "C",
      poles: 2,
      modulesWidth: 1,
      cableSectionMm2: 2.5,
      hasEarthConnected: true,
    },
  },
  PIA_25A_C9: {
    short: "C9 · 25A Aire",
    color: "bg-[#0f6cbd] text-white",
    template: {
      kind: "PIA",
      label: "C9",
      sublabel: "Climatización",
      ratingAmps: 25,
      curve: "C",
      poles: 2,
      modulesWidth: 1,
      cableSectionMm2: 6,
      hasEarthConnected: true,
    },
  },
};

const EXAM_QUESTIONS = [
  {
    q: "1. En una vivienda con 7 circuitos interiores instalados, ¿cuántos diferenciales de 30 mA exige como mínimo la ITC-BT-25?",
    options: [
      "Con 1 diferencial de 40 A / 30 mA es suficiente",
      "Mínimo 2 diferenciales (máximo 5 circuitos por diferencial)",
      "Mínimo 3 diferenciales",
    ],
    correct: 1,
    explanation:
      "ITC-BT-25 apdo. 2.3.1: se instalará al menos un interruptor diferencial por cada 5 circuitos o fracción.",
  },
  {
    q: "2. ¿Qué caída de tensión máxima permite la ITC-BT-15 en una Derivación Individual cuando hay contadores totalmente centralizados?",
    options: ["0,5 %", "1,0 %", "1,5 %"],
    correct: 1,
    explanation:
      "ITC-BT-15 apdo. 3: 1,0 % en contadores totalmente concentrados, 0,5 % en parcialmente concentrados y 1,5 % para suministro único sin LGA.",
  },
  {
    q: "3. ¿A qué distancia horizontal mínima del borde exterior del plato de ducha o bañera (fuera de Volumen 2) puede colocarse una base de enchufe 230 V?",
    options: ["0,30 metros", "0,60 metros", "1,20 metros"],
    correct: 1,
    explanation:
      "ITC-BT-27 apdo. 2.2: el Volumen 2 abarca 0,60 m alrededor del Volumen 1; las bases 2P+T de 16 A solo se admiten fuera del Volumen 2.",
  },
  {
    q: "4. Un garaje con ventilación natural que tiene 8 plazas de aparcamiento, ¿qué documentación requiere según ITC-BT-04?",
    options: [
      "Memoria Técnica de Diseño (MTD)",
      "Proyecto Técnico redactado por técnico competente",
      "Solo boletín sin memoria",
    ],
    correct: 1,
    explanation:
      "ITC-BT-04 Grupo h: los estacionamientos con ventilación natural de más de 5 plazas requieren Proyecto Técnico.",
  },
];

export default function AprenderSimuladorView() {
  const [tab, setTab] = useState<"simulador" | "guias" | "examen_rebt">("simulador");

  // Estado del simulador "Monta el cuadro de un piso"
  const [rail, setRail] = useState<SimRailItem[]>([]);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [hintIdx, setHintIdx] = useState(0);

  // Estado del examen REBT
  const [answers, setAnswers] = useState<Record<number, number>>({});

  // Transformar piezas elegidas en DinModule reales encadenando cada PIA al DIF anterior
  const simDinModules = useMemo<DinModule[]>(() => {
    let currentDifId: string | undefined;
    let difIdx = 0;
    return rail.map((item) => {
      const tpl = PIECE_LABELS[item.piece].template;
      if (tpl.kind === "DIF") {
        difIdx += 1;
        currentDifId = item.uid;
        return {
          ...tpl,
          id: item.uid,
          label: `DIF #${difIdx}`,
          isOn: item.isOn,
          isTripped: item.isTripped,
        };
      }
      return {
        ...tpl,
        id: item.uid,
        isOn: item.isOn,
        isTripped: item.isTripped,
        parentRcdId: tpl.kind === "PIA" ? currentDifId : undefined,
        neutralSourceRcdId: tpl.kind === "PIA" ? currentDifId : undefined,
      };
    });
  }, [rail]);

  const simLiveMap = useMemo(
    () => computePanelLiveState(simDinModules, null),
    [simDinModules]
  );

  const handleMoveSimPiece = (uid: string, delta: -1 | 1) => {
    setRail((prev) => {
      const idx = prev.findIndex((i) => i.uid === uid);
      const nextIdx = idx + delta;
      if (idx < 0 || nextIdx < 0 || nextIdx >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(idx, 1);
      copy.splice(nextIdx, 0, moved);
      return copy;
    });
  };

  const handleToggleSimPiece = (uid: string) => {
    setRail((prev) =>
      prev.map((item) =>
        item.uid === uid
          ? { ...item, isOn: !item.isOn, isTripped: false }
          : item
      )
    );
  };

  const handleTriggerSimRcdTest = (uid: string) => {
    setRail((prev) =>
      prev.map((item) =>
        item.uid === uid ? { ...item, isOn: false, isTripped: true } : item
      )
    );
  };

  const checkPanelSolution = () => {
    const hasCombiFirst = rail[0]?.piece === "DPS_COMBI";
    const hasStandaloneIgaFirst = rail[0]?.piece === "IGA_40A";
    const hasHeaderFirst = hasCombiFirst || hasStandaloneIgaFirst;
    const hasBothCombiAndIga =
      rail.some((p) => p.piece === "DPS_COMBI") &&
      rail.some((p) => p.piece === "IGA_40A");
    const difCount = rail.filter((p) => p.piece === "DIF_40A_30MA").length;
    const pias = rail.filter((p) => p.piece.startsWith("PIA_"));
    const requiredPias: SimPiece[] = [
      "PIA_10A_C1",
      "PIA_16A_C2",
      "PIA_25A_C3",
      "PIA_20A_C4",
      "PIA_16A_C5",
      "PIA_25A_C9",
    ];
    const hasAllSix = requiredPias.every((req) =>
      pias.some((item) => item.piece === req)
    );

    if (hasBothCombiAndIga) {
      setFeedback({
        ok: false,
        msg: "IGA duplicado: actualmente el bloque Combi 40A (IGA + Sobretensiones T2+POP) sustituye al IGA suelto en cabecera. Quita el IGA suelto.",
      });
      return;
    }
    if (!hasHeaderFirst) {
      setFeedback({
        ok: false,
        msg: "Fallo en cabecera: lo primero a la izquierda debe ser el Combi 40A (IGA+DPS integrado) o el IGA de 40 A (ITC-BT-17 / ITC-BT-23).",
      });
      return;
    }
    if (!hasAllSix) {
      setFeedback({
        ok: false,
        msg: "Te faltan automáticos: el piso lleva los 5 básicos (C1 a C5) más el C9 de Aire Acondicionado (6 PIAs en total).",
      });
      return;
    }
    if (difCount < 2) {
      setFeedback({
        ok: false,
        msg: "Ojo a la ITC-BT-25: al tener 6 circuitos (más de 5), necesitas como mínimo 2 diferenciales de 30 mA.",
      });
      return;
    }

    setFeedback({
      ok: true,
      msg: hasCombiFirst
        ? "¡Cuadro perfecto según REBT! El Combi 40A sustituye al IGA integrando corte general + sobretensiones (T2+POP), llevas 2 diferenciales para 6 circuitos (≤5 por DIF) y todos los calibres C1–C5 + C9 correctos."
        : "¡Cuadro válido en calibres y diferenciales! Consejo profesional: en instalaciones actuales se monta un bloque Combi 40A (IGA + Sobretensiones T2+POP) que sustituye al IGA suelto en cabecera.",
    });
  };

  const hints = [
    "Pista 1: Empieza colocando a la izquierda el Combi 40A (integra IGA + Sobretensiones T2+POP y sustituye al IGA suelto).",
    "Pista 2: Como hay 6 circuitos (C1, C2, C3, C4, C5 y C9 Aire), la ITC-BT-25 obliga a poner 2 diferenciales de 30 mA.",
    "Pista 3: Coloca máx. 5 PIAs detrás del primer diferencial y el resto detrás del segundo diferencial.",
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Aprender Electricidad, Simulador de Cuadro y Examen REBT
          </h2>
          <p className="text-xs text-slate-500">
            Practica montando el cuadro de un piso, repasa trucos de polímetro en obra y entrena preguntas reales de examen.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setTab("simulador")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold ${
              tab === "simulador"
                ? "bg-[#0f6cbd] text-white"
                : "border border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            Simulador «Monta el cuadro»
          </button>
          <button
            type="button"
            onClick={() => setTab("guias")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold ${
              tab === "guias"
                ? "bg-[#0f6cbd] text-white"
                : "border border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            El polímetro y Cómo se hace
          </button>
          <button
            type="button"
            onClick={() => setTab("examen_rebt")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold ${
              tab === "examen_rebt"
                ? "bg-[#0f6cbd] text-white"
                : "border border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            Test Examen REBT
          </button>
        </div>
      </div>

      {/* 1. SIMULADOR INTERACTIVO */}
      {tab === "simulador" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5 text-xs">
          <div>
            <span className="rounded-md bg-blue-50 px-2.5 py-1 font-bold text-[#0f6cbd]">
              Reto práctico
            </span>
            <h3 className="mt-2 text-sm font-bold text-slate-900">
              Monta el cuadro de un piso con aire acondicionado (9,2 kW — C1 a C5 + C9)
            </h3>
            <p className="text-slate-600">
              Haz clic en las protecciones para subirlas al carril DIN en el orden correcto. Haz clic en una pieza del carril si quieres quitarla.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(PIECE_LABELS) as SimPiece[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  const newItem: SimRailItem = {
                    uid: `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    piece: p,
                    isOn: true,
                  };
                  setRail((prev) => {
                    // Si añade Combi 40A, sustituye automáticamente al IGA suelto en cabecera (y viceversa)
                    if (p === "DPS_COMBI" || p === "IGA_40A") {
                      const withoutOldHeader = prev.filter(
                        (item) =>
                          item.piece !== "IGA_40A" && item.piece !== "DPS_COMBI"
                      );
                      return [newItem, ...withoutOldHeader];
                    }
                    return [...prev, newItem];
                  });
                  setFeedback(null);
                }}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-semibold text-slate-800 hover:bg-blue-50 hover:border-blue-300"
              >
                + {PIECE_LABELS[p].short}
              </button>
            ))}
          </div>

          {/* Carril DIN realista del simulador */}
          <div className="relative rounded-2xl border-4 border-slate-400/80 bg-gradient-to-b from-[#d8e3f3] via-[#eaf0f9] to-[#dce6f4] p-5 shadow-inner min-h-[250px]">
            <div className="pointer-events-none absolute left-3 right-3 top-1/2 -translate-y-4 h-8 rounded-xs border-y-2 border-slate-400/70 bg-gradient-to-b from-slate-300 via-slate-200 to-slate-400 opacity-75" />
            {simDinModules.length === 0 ? (
              <div className="relative z-10 flex min-h-[190px] items-center justify-center">
                <p className="rounded-xl bg-white/85 px-4 py-3 text-slate-500 font-medium shadow-xs">
                  El carril DIN está vacío. Pulsa los botones de arriba para montar las protecciones y haz clic en cada palanca I-ON / 0-OFF.
                </p>
              </div>
            ) : (
              <div className="relative z-10 flex flex-wrap items-start gap-2.5">
                {simDinModules.map((mod) => (
                  <DinModularDeviceVisual
                    key={mod.id}
                    mod={mod}
                    liveStatus={
                      simLiveMap[mod.id] || {
                        supplyLive: false,
                        loadLive: false,
                        reason: "",
                      }
                    }
                    hasError={false}
                    isSelected={false}
                    showEditControls={true}
                    is3DMode={false}
                    onToggleSwitch={handleToggleSimPiece}
                    onTriggerRcdTest={handleTriggerSimRcdTest}
                    onSelect={() => {}}
                    onMoveLeft={(id) => handleMoveSimPiece(id, -1)}
                    onMoveRight={(id) => handleMoveSimPiece(id, 1)}
                    onRemove={(id) => {
                      setRail((prev) => prev.filter((item) => item.uid !== id));
                      setFeedback(null);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {feedback && (
            <div
              className={`flex items-start gap-2.5 rounded-xl border p-4 ${
                feedback.ok
                  ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                  : "border-amber-300 bg-amber-50 text-amber-950"
              }`}
            >
              {feedback.ok ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              )}
              <p className="font-semibold">{feedback.msg}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={checkPanelSolution}
              className="rounded-xl bg-[#0f6cbd] px-4 py-2 font-semibold text-white hover:bg-[#115ea3]"
            >
              Comprobar
            </button>
            <button
              type="button"
              onClick={() => {
                setFeedback({ ok: false, msg: hints[hintIdx % hints.length] });
                setHintIdx((prev) => prev + 1);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-semibold text-slate-700"
            >
              <HelpCircle className="h-3.5 w-3.5" /> Dame una pista
            </button>
            <button
              type="button"
              onClick={() => {
                const sol: SimPiece[] = [
                  "DPS_COMBI",
                  "DIF_40A_30MA",
                  "PIA_10A_C1",
                  "PIA_25A_C3",
                  "PIA_16A_C5",
                  "DIF_40A_30MA",
                  "PIA_16A_C2",
                  "PIA_20A_C4",
                  "PIA_25A_C9",
                ];
                setRail(
                  sol.map((piece, idx) => ({
                    uid: `sol-${idx}-${piece}`,
                    piece,
                    isOn: true,
                  }))
                );
                setFeedback({
                  ok: true,
                  msg: "Solución cargada: el bloque Combi 40A sustituye al IGA en cabecera integrando corte general + sobretensiones (T2+POP), y C1/C2 quedan repartidos en diferenciales distintos.",
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-semibold text-slate-700"
            >
              <Eye className="h-3.5 w-3.5" /> Ver la solución
            </button>
            <button
              type="button"
              onClick={() => {
                setRail([]);
                setFeedback(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-semibold text-slate-700"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Empezar de nuevo
            </button>
          </div>
        </div>
      )}

      {/* 2. GUÍAS DE OBRA Y POLÍMETRO */}
      {tab === "guias" && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 text-xs">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
            <h3 className="text-sm font-bold text-[#0f6cbd]">1. Lo básico en obra</h3>
            <p className="text-slate-700">
              • <strong>Colores reglamentarios (ITC-BT-19):</strong> Azul claro = Neutro; Amarillo-Verde = Protección PE; Marrón / Negro / Gris = Fases L1, L2, L3.
            </p>
            <p className="text-slate-700">
              • Nunca uses el amarillo-verde como vuelta de lámpara ni dejes empalmes con cinta aislante fuera de cajas de registro (usa regletas o conectores rápidos homologados).
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
            <h3 className="text-sm font-bold text-[#0f6cbd]">2. El polímetro sin sustos</h3>
            <p className="text-slate-700">
              • <strong>Tensión alterna (V~ 750V):</strong> Fase–Neutro ≈ 230 V; Fase–Tierra ≈ 230 V; Neutro–Tierra &lt; 2 V (si marca 50–100 V tienes el neutro abierto o tierra flotante).
            </p>
            <p className="text-slate-700">
              • <strong>Continuidad (Ω / pitido):</strong> SIEMPRE sin tensión. Antes de medir continuidad recuerda sacar las puntas de la clavija de Amperios (10A) o fundirás el fusible al tocar 230 V.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
            <h3 className="text-sm font-bold text-[#0f6cbd]">3. Antes de dar tensión</h3>
            <p className="text-slate-700">
              1. Reaprieta bornes de IGA, peines y neutro general (un neutro flojo en trifásica quema electrodomésticos a 400 V).
            </p>
            <p className="text-slate-700">
              2. Mide aislamiento ≥ 0,5 MΩ a 500 V CC (ITC-BT-19) y prueba el botón TEST y rampa de disparo de cada diferencial.
            </p>
          </div>
        </div>
      )}

      {/* 3. TEST EXAMEN INSTALADOR REBT */}
      {tab === "examen_rebt" && (
        <div className="space-y-4 text-xs">
          {EXAM_QUESTIONS.map((item, qIdx) => {
            const picked = answers[qIdx];
            return (
              <div key={qIdx} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                <div className="font-bold text-slate-900 text-sm">{item.q}</div>
                <div className="space-y-1.5">
                  {item.options.map((opt, oIdx) => {
                    const isSelected = picked === oIdx;
                    const isRight = item.correct === oIdx;
                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => setAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))}
                        className={`block w-full rounded-xl border px-3.5 py-2.5 text-left font-medium transition ${
                          picked === undefined
                            ? "border-slate-200 bg-slate-50 hover:bg-blue-50"
                            : isRight
                            ? "border-emerald-300 bg-emerald-50 text-emerald-950 font-bold"
                            : isSelected
                            ? "border-rose-300 bg-rose-50 text-rose-900"
                            : "border-slate-200 bg-white opacity-60"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {picked !== undefined && (
                  <p className="rounded-lg bg-blue-50/70 p-2.5 text-slate-700">
                    <strong>Explicación REBT:</strong> {item.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

