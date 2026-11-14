"use client";

import React, { useState } from "react";
import {
  MessageSquareText,
  Mic,
  Send,
  X,
  ArrowRight,
  PlusCircle,
  ShieldAlert,
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

const QUICK_PROMPTS = [
  "¿Qué sección para un horno de 3,5 kW?",
  "¿Cómo hago una toma de tierra?",
  "¿Este local necesita proyecto o MTD?",
  "Volúmenes de enchufes en el baño",
  "Punto de recarga coche eléctrico",
];

export default function AsistenteMonpixFloating({
  onNavigateSection,
  onQuickCreateTask,
}: AsistenteMonpixFloatingProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<
    { question: string; response: RebtQaResponse }[]
  >([]);
  const [pendingActionConfirm, setPendingActionConfirm] = useState<string | null>(
    null
  );

  const runAsk = (qText: string) => {
    const clean = qText.trim();
    if (!clean) return;
    // Detectar si el usuario pide crear una tarea como acción del asistente
    if (/^(apunta|crea tarea|recuerdame|recuérdame)\s+/i.test(clean)) {
      setPendingActionConfirm(clean.replace(/^(apunta|crea tarea|recuerdame|recuérdame)\s+/i, ""));
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

  return (
    <div className="no-print">
      {/* Botón flotante siempre accesible */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-16 right-4 lg:bottom-6 lg:right-6 z-40 inline-flex items-center gap-2 rounded-full bg-[#0f6cbd] px-4 py-3 text-xs font-bold text-white shadow-lg ring-2 ring-white transition hover:bg-[#115ea3]"
      >
        <MessageSquareText className="h-4 w-4" />
        <span>Pregunta al REBT 🎤</span>
      </button>

      {open && (
        <div className="fixed bottom-32 right-3 sm:right-6 lg:bottom-20 z-50 w-[calc(100vw-1.5rem)] max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[78vh]">
          <div className="flex items-center justify-between bg-[#0f6cbd] px-4 py-3 text-white">
            <div>
              <div className="text-xs font-extrabold">
                Asistente REBT (Texto y Voz)
              </div>
              <div className="text-[10px] text-blue-100">
                Responde citando la ITC-BT aplicable
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
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
                  ¿Crear la tarea pendiente <strong>«{pendingActionConfirm}»</strong>?
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
                Pregúntame cualquier duda rápida en obra (sección para un horno, diferencial, volúmenes del baño, caída de tensión o di{" "}
                <em>«Apunta comprar diferencial Clase A mañana»</em>).
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
                    💡 <strong>Consejo de obra:</strong> {item.response.practicalTip}
                  </p>
                  {item.response.suggestedAction && (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateSection(item.response.suggestedAction!.targetSection);
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

