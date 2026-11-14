"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageSquareText,
  Mic,
  Send,
  X,
  ArrowRight,
  PlusCircle,
  ShieldAlert,
  GripVertical,
  Minimize2,
  RotateCcw,
} from "lucide-react";
import {
  answerRebtQuestion,
  ORIENTATIVE_DISCLAIMER,
  type RebtQaResponse,
} from "@/lib/monpix-engine";
import { useSpeechDictation } from "@/lib/monpix-store";

interface AsistenteMonpixFloatingProps {
  onNavigateSection: (sectionId: string) => void;
  onQuickCreateTask: (title: string) => void;
}

interface FloatingPos {
  x: number;
  y: number;
}

const STORAGE_POS_KEY = "rebt_assistant_fab_pos_v1";
const STORAGE_COMPACT_KEY = "rebt_assistant_fab_compact_v1";

const QUICK_PROMPTS = [
  "¿Qué sección para un horno de 3,5 kW?",
  "¿Cómo hago una toma de tierra?",
  "¿Este local necesita proyecto o MTD?",
  "Volúmenes de enchufes en el baño",
  "Punto de recarga coche eléctrico",
];

function clampPosition(
  pos: FloatingPos,
  btnWidth = 210,
  btnHeight = 48
): FloatingPos {
  if (typeof window === "undefined") return pos;
  const margin = 12;
  const maxX = Math.max(margin, window.innerWidth - btnWidth - margin);
  const maxY = Math.max(margin, window.innerHeight - btnHeight - margin);
  return {
    x: Math.min(Math.max(margin, Math.round(pos.x)), maxX),
    y: Math.min(Math.max(margin, Math.round(pos.y)), maxY),
  };
}

function getDefaultPosition(compact = false): FloatingPos {
  if (typeof window === "undefined") return { x: 24, y: 24 };
  const isMobile = window.innerWidth < 1024;
  const btnW = compact ? 52 : 215;
  const btnH = 48;
  return clampPosition(
    {
      x: window.innerWidth - btnW - (isMobile ? 16 : 24),
      y: window.innerHeight - btnH - (isMobile ? 72 : 24),
    },
    btnW,
    btnH
  );
}

export default function AsistenteMonpixFloating({
  onNavigateSection,
  onQuickCreateTask,
}: AsistenteMonpixFloatingProps) {
  const [open, setOpen] = useState(false);
  const [compactPill, setCompactPill] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<FloatingPos>({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);

  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<
    { question: string; response: RebtQaResponse }[]
  >([]);
  const [pendingActionConfirm, setPendingActionConfirm] = useState<string | null>(
    null
  );

  const buttonRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
    moved: boolean;
  }>({
    active: false,
    pointerId: -1,
    startClientX: 0,
    startClientY: 0,
    originX: 0,
    originY: 0,
    moved: false,
  });

  // Inicializar posición persistida y mantener dentro del viewport al redimensionar
  useEffect(() => {
    if (typeof window === "undefined") return;
    let initialCompact = false;
    try {
      initialCompact = window.localStorage.getItem(STORAGE_COMPACT_KEY) === "1";
      setCompactPill(initialCompact);
      const raw = window.localStorage.getItem(STORAGE_POS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FloatingPos;
        if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
          setPos(clampPosition(parsed, initialCompact ? 52 : 215, 48));
          setMounted(true);
          return;
        }
      }
    } catch {
      // Ignorar errores de lectura de localStorage
    }
    setPos(getDefaultPosition(initialCompact));
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const handleResize = () => {
      const w = buttonRef.current?.offsetWidth || (compactPill ? 52 : 215);
      const h = buttonRef.current?.offsetHeight || 48;
      setPos((prev) => clampPosition(prev, w, h));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mounted, compactPill]);

  const persistPos = useCallback((next: FloatingPos) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_POS_KEY, JSON.stringify(next));
    } catch {
      // Ignorar errores de cuota
    }
  }, []);

  const toggleCompactMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextCompact = !compactPill;
    setCompactPill(nextCompact);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_COMPACT_KEY, nextCompact ? "1" : "0");
      } catch {
        // Ignorar
      }
    }
    setPos((prev) => clampPosition(prev, nextCompact ? 52 : 215, 48));
  };

  const resetToDefaultCorner = (e: React.MouseEvent) => {
    e.stopPropagation();
    const def = getDefaultPosition(compactPill);
    setPos(def);
    persistPos(def);
  };

  // Gestión de arrastre interactivo (ratón, táctil y lápiz)
  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      active: true,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      originX: pos.x,
      originY: pos.y,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const st = dragStateRef.current;
    if (!st.active || st.pointerId !== e.pointerId) return;
    const dx = e.clientX - st.startClientX;
    const dy = e.clientY - st.startClientY;
    if (!st.moved && Math.hypot(dx, dy) < 6) {
      return;
    }
    if (!st.moved) {
      st.moved = true;
      setIsDragging(true);
    }
    const w = buttonRef.current?.offsetWidth || (compactPill ? 52 : 215);
    const h = buttonRef.current?.offsetHeight || 48;
    const next = clampPosition(
      {
        x: st.originX + dx,
        y: st.originY + dy,
      },
      w,
      h
    );
    setPos(next);
  };

  const handlePointerUp = (
    e: React.PointerEvent<HTMLElement>,
    toggleOnClick: boolean
  ) => {
    const st = dragStateRef.current;
    if (!st.active || st.pointerId !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignorar si ya fue liberado
    }
    const wasDragged = st.moved;
    dragStateRef.current.active = false;
    setIsDragging(false);

    if (wasDragged) {
      persistPos(pos);
    } else if (toggleOnClick) {
      setOpen((prev) => !prev);
    }
  };

  const runAsk = (qText: string) => {
    const clean = qText.trim();
    if (!clean) return;
    if (/^(apunta|crea tarea|recuerdame|recuérdame)\s+/i.test(clean)) {
      setPendingActionConfirm(
        clean.replace(/^(apunta|crea tarea|recuerdame|recuérdame)\s+/i, "")
      );
      setQuery("");
      return;
    }
    const res = answerRebtQuestion(clean);
    setHistory((prev) => [{ question: clean, response: res }, ...prev]);
    setQuery("");
  };

  const { isListening, voiceError, toggleListening } = useSpeechDictation(
    (spoken) => {
      setQuery(spoken);
      runAsk(spoken);
    }
  );

  // Calcular anclaje inteligente del panel desplegable según dónde esté el botón
  const getPopoverStyle = (): React.CSSProperties => {
    if (typeof window === "undefined") {
      return { right: 24, bottom: 84 };
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const panelMaxW = Math.min(420, vw - 24);
    const btnW = buttonRef.current?.offsetWidth || (compactPill ? 52 : 215);
    const btnH = buttonRef.current?.offsetHeight || 48;

    const openUpward = pos.y > vh * 0.48;
    const alignRightSide = pos.x + btnW / 2 > vw * 0.5;

    const left = alignRightSide
      ? Math.max(12, Math.min(vw - panelMaxW - 12, pos.x + btnW - panelMaxW))
      : Math.max(12, Math.min(vw - panelMaxW - 12, pos.x));

    if (openUpward) {
      const bottomOffset = Math.max(12, vh - pos.y + 10);
      const maxH = Math.max(260, pos.y - 20);
      return {
        left,
        bottom: bottomOffset,
        width: panelMaxW,
        maxHeight: Math.min(maxH, Math.round(vh * 0.78)),
      };
    }

    const topOffset = Math.min(vh - 260, pos.y + btnH + 10);
    const maxH = Math.max(260, vh - topOffset - 16);
    return {
      left,
      top: topOffset,
      width: panelMaxW,
      maxHeight: Math.min(maxH, Math.round(vh * 0.78)),
    };
  };

  return (
    <div className="no-print">
      {/* Botón flotante interactivo y libremente arrastrable */}
      <div
        ref={buttonRef}
        style={
          mounted
            ? {
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                touchAction: "none",
              }
            : {
                right: "24px",
                bottom: "24px",
                touchAction: "none",
              }
        }
        className={`fixed z-40 select-none flex items-center rounded-full bg-[#0f6cbd] text-white shadow-lg ring-2 ring-white transition-shadow ${
          isDragging
            ? "cursor-grabbing shadow-2xl scale-[1.03] ring-blue-200"
            : "cursor-grab hover:bg-[#115ea3] hover:shadow-xl"
        }`}
      >
        <div
          role="button"
          tabIndex={0}
          title="Arrastra para mover de posición · Haz clic para abrir el Asistente REBT"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(e) => handlePointerUp(e, true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen((prev) => !prev);
            }
          }}
          className={`inline-flex items-center gap-2 text-xs font-bold ${
            compactPill ? "p-3" : "pl-3 pr-2.5 py-2.5"
          }`}
        >
          <GripVertical className="h-3.5 w-3.5 text-blue-200 shrink-0" />
          <MessageSquareText className="h-4 w-4 shrink-0" />
          {!compactPill && (
            <span className="whitespace-nowrap">Pregunta al REBT 🎤</span>
          )}
        </div>

        {/* Botón rápido para compactar/expandir la píldora si estorba en tablas */}
        <button
          type="button"
          onClick={toggleCompactMode}
          title={
            compactPill
              ? "Expandir botón Pregunta al REBT"
              : "Compactar botón a icono"
          }
          className="mr-1.5 rounded-full p-1.5 text-blue-100 transition hover:bg-white/20 hover:text-white"
        >
          <Minimize2 className="h-3 w-3" />
        </button>
      </div>

      {/* Ventana del Asistente REBT (su cabecera también permite arrastrar todo el bloque) */}
      {open && (
        <div
          style={getPopoverStyle()}
          className="fixed z-50 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col"
        >
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={(e) => handlePointerUp(e, false)}
            style={{ touchAction: "none" }}
            title="Arrastra esta barra para mover el Asistente REBT"
            className={`flex items-center justify-between bg-[#0f6cbd] px-3.5 py-3 text-white select-none ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-blue-200 shrink-0" />
              <div>
                <div className="text-xs font-extrabold">
                  Asistente REBT Interactivo (Texto y Voz)
                </div>
                <div className="text-[10px] text-blue-100">
                  Arrastra para mover · Cita la ITC-BT aplicable
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetToDefaultCorner}
                onPointerDown={(e) => e.stopPropagation()}
                title="Restaurar posición en esquina inferior derecha"
                className="rounded-lg p-1.5 text-blue-100 hover:bg-white/20 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                onPointerDown={(e) => e.stopPropagation()}
                title="Cerrar ventana"
                className="rounded-lg p-1.5 hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="bg-amber-50 px-3 py-1.5 text-[10px] font-semibold text-amber-900 flex items-center gap-1.5 border-b border-amber-200">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
            <span>{ORIENTATIVE_DISCLAIMER}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
            {/* Sugerencias rápidas */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp}
                  type="button"
                  onClick={() => runAsk(qp)}
                  className="rounded-full border border-blue-200 bg-blue-50/70 px-2.5 py-1 text-[11px] font-medium text-[#0f6cbd] hover:bg-blue-100"
                >
                  {qp}
                </button>
              ))}
            </div>

            {/* Confirmación antes de ejecutar una acción del asistente */}
            {pendingActionConfirm && (
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 space-y-2">
                <div className="font-bold text-amber-950">
                  Confirmar acción en la app (Revísalo y guárdalo):
                </div>
                <p className="text-amber-900">
                  ¿Crear la tarea pendiente{" "}
                  <strong>«{pendingActionConfirm}»</strong>?
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingActionConfirm(null)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onQuickCreateTask(pendingActionConfirm);
                      setPendingActionConfirm(null);
                      onNavigateSection("tareas_equipo");
                      setOpen(false);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 font-semibold text-white"
                  >
                    <PlusCircle className="h-3.5 w-3.5" /> Confirmar tarea
                  </button>
                </div>
              </div>
            )}

            {history.length === 0 ? (
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Pregúntame cualquier duda rápida en obra (sección para un horno,
                diferencial, volúmenes del baño, caída de tensión o di{" "}
                <em>«Apunta comprar diferencial Clase A mañana»</em>). Puedes
                arrastrar este botón a cualquier zona de la pantalla para que
                nunca tape tus tablas.
              </p>
            ) : (
              history.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2"
                >
                  <div className="font-semibold text-slate-500 text-[11px]">
                    Tú: «{item.question}»
                  </div>
                  <div className="font-bold text-slate-900">
                    {item.response.title}
                  </div>
                  <div className="inline-block rounded bg-blue-100 px-2 py-0.5 font-mono text-[10px] font-bold text-[#0f6cbd]">
                    {item.response.itcCitation}
                  </div>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                    {item.response.answer}
                  </p>
                  <p className="rounded-lg bg-white p-2 text-[11px] text-emerald-900 border border-emerald-100">
                    💡 <strong>Consejo de obra:</strong>{" "}
                    {item.response.practicalTip}
                  </p>
                  {item.response.suggestedAction && (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateSection(
                          item.response.suggestedAction!.targetSection
                        );
                        setOpen(false);
                      }}
                      className="inline-flex items-center gap-1 font-bold text-[#0f6cbd] hover:underline"
                    >
                      {item.response.suggestedAction.label}{" "}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {voiceError && (
            <div className="px-3 py-1 text-[11px] text-rose-600 bg-rose-50">
              {voiceError}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              runAsk(query);
            }}
            className="flex items-center gap-1.5 border-t border-slate-200 bg-white p-2.5"
          >
            <button
              type="button"
              onClick={toggleListening}
              title="Dictar pregunta con el micrófono"
              className={`rounded-xl p-2 ${
                isListening
                  ? "bg-rose-600 text-white animate-pulse"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Mic className="h-4 w-4" />
            </button>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pregunta al REBT o di 'Apunta...'"
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:border-[#0f6cbd]"
            />
            <button
              type="submit"
              className="rounded-xl bg-[#0f6cbd] p-2 text-white hover:bg-[#115ea3]"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
