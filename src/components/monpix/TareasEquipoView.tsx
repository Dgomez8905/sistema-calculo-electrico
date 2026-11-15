"use client";

import React, { useState, useRef } from "react";
import {
  CheckSquare,
  Users,
  Clock,
  ClipboardList,
  Mic,
  Bell,
  Share2,
  Download,
  CheckCircle2,
  Plus,
  History,
  Calendar,
  HardHat,
  Folder,
  Phone,
  Package,
  FileCheck2,
} from "lucide-react";
import { parseTaskFromWhatsApp } from "@/lib/monpix-engine";
import {
  useSpeechDictation,
  downloadTextFile,
  type MonpixWorkspaceData,
  type WorkTask,
  type TeamWorker,
} from "@/lib/monpix-store";

interface TareasEquipoViewProps {
  currentUserName: string;
  activeProjectRef: string;
  workspace: MonpixWorkspaceData;
  onUpdateWorkspace: (
    updater: (prev: MonpixWorkspaceData) => MonpixWorkspaceData
  ) => void;
}

export default function TareasEquipoView({
  currentUserName,
  activeProjectRef,
  workspace,
  onUpdateWorkspace,
}: TareasEquipoViewProps) {
  const [tab, setTab] = useState<"tareas" | "equipo_trabajos" | "fichajes" | "partes">(
    "tareas"
  );

  // --- 1. Tareas (Voz + Desde WhatsApp + Push) ---
  const [waRawText, setWaRawText] = useState("");
  const [pendingTaskDraft, setPendingTaskDraft] = useState<Omit<
    WorkTask,
    "id" | "completed"
  > | null>(null);
  const [pushMessage, setPushMessage] = useState("");

  const { isListening, toggleListening } = useSpeechDictation((spoken) => {
    const parsed = parseTaskFromWhatsApp(spoken);
    setPendingTaskDraft({
      title: parsed.title,
      whenDate: new Date().toISOString().slice(0, 10),
      assignedTo: workspace.workers[0]?.name || currentUserName,
      projectRef: activeProjectRef,
      phone: parsed.phone,
      email: "",
      notes: spoken,
      origin: "voz",
      priority: parsed.priority,
    });
  });

  const handleTestBrowserPush = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPushMessage("Este navegador no soporta notificaciones nativas.");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      new Notification("Aviso de Obra — REBT Suite", {
        body: "Recordatorio activo: tienes tareas y partes pendientes de revisar hoy.",
      });
      setPushMessage("Aviso de prueba enviado a tu pantalla.");
    } else {
      setPushMessage("Activa el permiso de notificaciones en la barra del navegador.");
    }
  };

  // --- 2. Equipo y Mandar Trabajo ---
  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerPhone, setNewWorkerPhone] = useState("");
  const [jobWorkerId, setJobWorkerId] = useState(workspace.workers[0]?.id || "wk-1");
  const [jobAddress, setJobAddress] = useState("Avda. Tres de Mayo 42");
  const [jobInstructions, setJobInstructions] = useState("");
  const [jobMaterials, setJobMaterials] = useState("");

  // --- 3. Fichajes Inmodificables + Corrección con Motivo Auditado ---
  const [clockWorkerId, setClockWorkerId] = useState(workspace.workers[0]?.id || "wk-1");
  const [clockIn, setClockIn] = useState("08:00");
  const [clockOut, setClockOut] = useState("16:00");
  const [correctingLogId, setCorrectingLogId] = useState<string | null>(null);
  const [corrIn, setCorrIn] = useState("08:00");
  const [corrOut, setCorrOut] = useState("16:30");
  const [corrReason, setCorrReason] = useState("");

  // --- 4. Partes de trabajo con Firma en Canvas ---
  const [repSummary, setRepSummary] = useState("");
  const [repMaterials, setRepMaterials] = useState("");
  const [repHours, setRepHours] = useState(4);
  const [repSignedBy, setRepSignedBy] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const calcHoursDiff = (start: string, end: string) => {
    const [h1, m1] = start.split(":").map(Number);
    const [h2, m2] = end.split(":").map(Number);
    const diff = h2 + m2 / 60 - (h1 + m1 / 60);
    return Math.max(0, Number(diff.toFixed(2)));
  };

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Tareas, Avisos, Mi Equipo, Fichajes y Partes de Obra
          </h2>
          <p className="text-xs text-slate-500">
            Apunta tareas por voz o desde WhatsApp, organiza dónde está cada operario hoy y lleva el registro horario inmodificable.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: "tareas", label: `Tareas (${workspace.tasks.filter((t) => !t.completed).length})`, icon: <CheckSquare className="h-3.5 w-3.5" /> },
              { id: "equipo_trabajos", label: `Mi Equipo (${workspace.workers.length})`, icon: <Users className="h-3.5 w-3.5" /> },
              { id: "fichajes", label: "Fichajes (Jornada)", icon: <Clock className="h-3.5 w-3.5" /> },
              { id: "partes", label: `Partes (${workspace.workReports.length})`, icon: <ClipboardList className="h-3.5 w-3.5" /> },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold ${
                tab === t.id
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

      {/* 1. TAREAS Y AVISOS (VOZ + WHATSAPP + PUSH) */}
      {tab === "tareas" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 text-xs">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Apuntar sin tocar el teclado o desde WhatsApp
              </h3>
              <button
                type="button"
                onClick={toggleListening}
                className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 font-semibold ${
                  isListening
                    ? "bg-rose-600 text-white animate-pulse"
                    : "bg-[#0f6cbd] text-white"
                }`}
              >
                <Mic className="h-3.5 w-3.5" />
                {isListening ? "Escuchando..." : "Apuntar por voz"}
              </button>
            </div>

            <div className="space-y-2">
              <label className="font-semibold text-slate-700">
                Pega aquí un mensaje de WhatsApp de un cliente o escribe la tarea
              </label>
              <textarea
                rows={3}
                placeholder="Ej: Hola soy Marta del 654 321 987, urgente se nos salta el diferencial en Calle Mayor 14 bajo"
                value={waRawText}
                onChange={(e) => setWaRawText(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-3"
              />
              <button
                type="button"
                onClick={() => {
                  if (!waRawText.trim()) return;
                  const parsed = parseTaskFromWhatsApp(waRawText);
                  setPendingTaskDraft({
                    title: parsed.title,
                    whenDate: new Date().toISOString().slice(0, 10),
                    assignedTo: workspace.workers[0]?.name || currentUserName,
                    projectRef: activeProjectRef,
                    phone: parsed.phone,
                    email: "",
                    notes: `${parsed.address ? `Dirección: ${parsed.address} — ` : ""}${parsed.notes}`,
                    origin: "whatsapp",
                    priority: parsed.priority,
                  });
                }}
                className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white"
              >
                Preparar tarea para revisar
              </button>
            </div>

            {/* Paso obligatorio: Revísalo y guárdalo */}
            {pendingTaskDraft && (
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 space-y-2.5">
                <div className="font-bold text-amber-950">
                  Revísalo y guárdalo antes de apuntarlo
                </div>
                <input
                  type="text"
                  value={pendingTaskDraft.title}
                  onChange={(e) =>
                    setPendingTaskDraft({ ...pendingTaskDraft, title: e.target.value })
                  }
                  className="w-full rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 font-semibold"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={pendingTaskDraft.whenDate}
                    onChange={(e) =>
                      setPendingTaskDraft({ ...pendingTaskDraft, whenDate: e.target.value })
                    }
                    className="rounded-lg border border-amber-300 bg-white px-2.5 py-1.5"
                  />
                  <input
                    type="text"
                    placeholder="Teléfono"
                    value={pendingTaskDraft.phone}
                    onChange={(e) =>
                      setPendingTaskDraft({ ...pendingTaskDraft, phone: e.target.value })
                    }
                    className="rounded-lg border border-amber-300 bg-white px-2.5 py-1.5"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingTaskDraft(null)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1 font-semibold"
                  >
                    Descartar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateWorkspace((prev) => ({
                        ...prev,
                        tasks: [
                          {
                            ...pendingTaskDraft,
                            id: `tsk-${Date.now()}`,
                            completed: false,
                          },
                          ...prev.tasks,
                        ],
                      }));
                      setPendingTaskDraft(null);
                      setWaRawText("");
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 font-semibold text-white"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar y guardar
                  </button>
                </div>
              </div>
            )}

            {/* Avisos push navegador */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-center justify-between gap-2">
              <div>
                <div className="font-bold text-slate-900">Avisos push en este dispositivo</div>
                <div className="text-[11px] text-slate-500">
                  {pushMessage || "Horario de resumen: Mañana (08:00) y Tarde (18:00)."}
                </div>
              </div>
              <button
                type="button"
                onClick={handleTestBrowserPush}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-800"
              >
                <Bell className="h-3.5 w-3.5 text-[#0f6cbd]" /> Probar aviso
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-7 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Pendientes de obra y oficina</h3>
            <div className="space-y-2.5">
              {workspace.tasks.map((t) => (
                <div
                  key={t.id}
                  className={`flex items-start justify-between gap-3 rounded-xl border p-3.5 ${
                    t.completed
                      ? "border-slate-200 bg-slate-50 opacity-60"
                      : t.priority === "alta"
                      ? "border-rose-200 bg-rose-50/40"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={t.completed}
                      onChange={() =>
                        onUpdateWorkspace((prev) => ({
                          ...prev,
                          tasks: prev.tasks.map((x) =>
                            x.id === t.id ? { ...x, completed: !x.completed } : x
                          ),
                        }))
                      }
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0f6cbd]"
                    />
                    <div>
                      <div className="font-bold text-slate-900">{t.title}</div>
                      <div className="text-[11px] text-slate-600">{t.notes}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2.5 text-[10px] font-semibold text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {t.whenDate}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <HardHat className="h-3 w-3 text-slate-400" />
                          {t.assignedTo}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Folder className="h-3 w-3 text-slate-400" />
                          {t.projectRef}
                        </span>
                        {t.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {t.phone}
                          </span>
                        )}
                        <span className="uppercase text-[#0f6cbd]">({t.origin})</span>
                      </div>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. MI EQUIPO HOY Y ASIGNAR TRABAJO */}
      {tab === "equipo_trabajos" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 text-xs">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Mi equipo ahora mismo (Estado del día)
            </h3>
            <div className="space-y-2.5">
              {workspace.workers.map((w) => (
                <div
                  key={w.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex flex-wrap items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-slate-900">
                      {w.name} <span className="text-slate-500 font-normal">({w.category})</span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Obra hoy: <strong>{w.currentProjectRef}</strong> · Enlace operario:{" "}
                      <code>?op={w.shareToken}</code>
                    </div>
                  </div>
                  <select
                    value={w.statusToday}
                    onChange={(e) => {
                      const st = e.target.value as TeamWorker["statusToday"];
                      onUpdateWorkspace((prev) => ({
                        ...prev,
                        workers: prev.workers.map((x) =>
                          x.id === w.id ? { ...x, statusToday: st } : x
                        ),
                      }));
                    }}
                    className="px-2.5 py-1 text-xs"
                  >
                    <option value="trabajando">Trabajando</option>
                    <option value="en_pausa">En pausa / bocadillo</option>
                    <option value="terminado">Ha terminado</option>
                    <option value="sin_fichar">Sin fichar</option>
                    <option value="ausencia">Ausencia aprobada</option>
                  </select>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-200">
              <input
                type="text"
                placeholder="Nombre nuevo operario"
                value={newWorkerName}
                onChange={(e) => setNewWorkerName(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5"
              />
              <input
                type="text"
                placeholder="Móvil"
                value={newWorkerPhone}
                onChange={(e) => setNewWorkerPhone(e.target.value)}
                className="w-32 rounded-lg border border-slate-300 px-2.5 py-1.5"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newWorkerName.trim()) return;
                  onUpdateWorkspace((prev) => ({
                    ...prev,
                    workers: [
                      ...prev.workers,
                      {
                        id: `wk-${Date.now()}`,
                        name: newWorkerName.trim(),
                        category: "Oficial 1ª",
                        phone: newWorkerPhone.trim(),
                        statusToday: "sin_fichar",
                        currentProjectRef: activeProjectRef,
                        shareToken: `op-${Math.floor(1000 + Math.random() * 9000)}`,
                      },
                    ],
                  }));
                  setNewWorkerName("");
                  setNewWorkerPhone("");
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 font-semibold text-white"
              >
                <Plus className="h-3.5 w-3.5" /> Operario
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-6 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Mandar un trabajo y material que hay que mover
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <select
                value={jobWorkerId}
                onChange={(e) => setJobWorkerId(e.target.value)}
                className="px-2.5 py-1.5 text-xs"
              >
                {workspace.workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={jobAddress}
                onChange={(e) => setJobAddress(e.target.value)}
                placeholder="Dirección de la obra"
                className="rounded-lg border border-slate-300 px-2.5 py-1.5"
              />
            </div>
            <input
              type="text"
              placeholder="¿Qué hay que hacer hoy?"
              value={jobInstructions}
              onChange={(e) => setJobInstructions(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
            />
            <input
              type="text"
              placeholder="¿Qué material o herramienta hay que llevar?"
              value={jobMaterials}
              onChange={(e) => setJobMaterials(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
            />
            <button
              type="button"
              onClick={() => {
                const w = workspace.workers.find((x) => x.id === jobWorkerId) || workspace.workers[0];
                if (!w || !jobInstructions.trim()) return;
                onUpdateWorkspace((prev) => ({
                  ...prev,
                  jobs: [
                    {
                      id: `jb-${Date.now()}`,
                      workerId: w.id,
                      workerName: w.name,
                      projectRef: activeProjectRef,
                      address: jobAddress,
                      dateIso: new Date().toISOString().slice(0, 10),
                      timeStr: "08:00",
                      instructions: jobInstructions.trim(),
                      materialsToBring: jobMaterials.trim(),
                      notified: true,
                    },
                    ...prev.jobs,
                  ],
                }));
                setJobInstructions("");
                setJobMaterials("");
              }}
              className="rounded-xl bg-[#0f6cbd] px-4 py-2 font-semibold text-white"
            >
              Guardar y avisar al operario
            </button>

            <div className="space-y-2 pt-2">
              {workspace.jobs.map((j) => (
                <div key={j.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900">
                      {j.workerName} → {j.address}
                    </div>
                    <div className="text-slate-700">{j.instructions}</div>
                    {j.materialsToBring && (
                      <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-amber-800">
                        <Package className="h-3 w-3 shrink-0 text-amber-700" />
                        <span>Llevar: {j.materialsToBring}</span>
                      </div>
                    )}
                  </div>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Trabajo hoy (${j.address}): ${j.instructions}. Llevar: ${j.materialsToBring}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 self-start inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 font-semibold text-white"
                  >
                    <Share2 className="h-3 w-3" /> WhatsApp
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. REGISTRO DE JORNADA / FICHAJES INMODIFICABLES CON HISTORIAL AUDITADO */}
      {tab === "fichajes" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Registro horario inmodificable con historial de correcciones (RDL 8/2019)
              </h3>
              <p className="text-slate-500">
                La hora fichada original nunca se borra. Si rectificas un olvido queda registrado quién, cuándo y por qué motivo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const csv = [
                  "Fecha;Operario;Obra;Entrada_Original;Salida_Original;Entrada_Efectiva;Salida_Efectiva;Horas;Correcciones_Auditadas",
                  ...workspace.timeLogs.map(
                    (l) =>
                      `${l.dateIso};"${l.workerName}";${l.projectRef};${l.originalCheckIn};${l.originalCheckOut};${l.effectiveCheckIn};${l.effectiveCheckOut};${l.hoursWorked};"${l.correctionHistory
                        .map((c) => `${c.correctedBy} (${c.reason})`)
                        .join(" | ")}"`
                  ),
                ].join("\n");
                downloadTextFile("Fichajes_Mes.csv", csv, "text/csv;charset=utf-8");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 font-semibold text-white"
            >
              <Download className="h-4 w-4" /> Descargar el mes (CSV)
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-3.5 border border-slate-200">
            <div>
              <label className="font-semibold text-slate-700">Operario</label>
              <select
                value={clockWorkerId}
                onChange={(e) => setClockWorkerId(e.target.value)}
                className="mt-1 block px-3 py-1.5 text-xs"
              >
                {workspace.workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700">Entrada</label>
              <input
                type="time"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                className="mt-1 block rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Salida</label>
              <input
                type="time"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
                className="mt-1 block rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const w = workspace.workers.find((x) => x.id === clockWorkerId) || workspace.workers[0];
                if (!w) return;
                onUpdateWorkspace((prev) => ({
                  ...prev,
                  timeLogs: [
                    {
                      id: `tl-${Date.now()}`,
                      workerId: w.id,
                      workerName: w.name,
                      projectRef: activeProjectRef,
                      dateIso: new Date().toISOString().slice(0, 10),
                      originalCheckIn: clockIn,
                      originalCheckOut: clockOut,
                      effectiveCheckIn: clockIn,
                      effectiveCheckOut: clockOut,
                      hoursWorked: calcHoursDiff(clockIn, clockOut),
                      correctionHistory: [],
                    },
                    ...prev.timeLogs,
                  ],
                }));
              }}
              className="rounded-xl bg-[#0f6cbd] px-4 py-2 font-semibold text-white"
            >
              Registrar fichaje sellado
            </button>
          </div>

          <div className="space-y-2.5">
            {workspace.timeLogs.map((log) => (
              <div key={log.id} className="rounded-xl border border-slate-200 p-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900">{log.workerName}</span> ·{" "}
                    <span className="font-mono">{log.dateIso}</span> · Obra{" "}
                    <strong className="text-[#0f6cbd]">{log.projectRef}</strong>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">
                      Original sellado: <code className="font-bold">{log.originalCheckIn}–{log.originalCheckOut}</code>
                    </span>
                    <span className="rounded bg-blue-50 px-2 py-0.5 font-mono font-bold text-[#0f6cbd]">
                      Vigente: {log.effectiveCheckIn}–{log.effectiveCheckOut} ({log.hoursWorked} h)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCorrectingLogId(log.id);
                        setCorrIn(log.effectiveCheckIn);
                        setCorrOut(log.effectiveCheckOut);
                        setCorrReason("");
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 font-semibold text-slate-700"
                    >
                      <History className="h-3 w-3" /> Rectificar con motivo
                    </button>
                  </div>
                </div>

                {correctingLogId === log.id && (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-2.5 border border-amber-200">
                    <input
                      type="time"
                      value={corrIn}
                      onChange={(e) => setCorrIn(e.target.value)}
                      className="rounded border border-slate-300 bg-white px-2 py-1 font-mono"
                    />
                    <input
                      type="time"
                      value={corrOut}
                      onChange={(e) => setCorrOut(e.target.value)}
                      className="rounded border border-slate-300 bg-white px-2 py-1 font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Motivo obligatorio (ej. olvidó fichar al salir de obra)"
                      value={corrReason}
                      onChange={(e) => setCorrReason(e.target.value)}
                      className="flex-1 rounded border border-slate-300 bg-white px-2.5 py-1"
                    />
                    <button
                      type="button"
                      disabled={!corrReason.trim()}
                      onClick={() => {
                        onUpdateWorkspace((prev) => ({
                          ...prev,
                          timeLogs: prev.timeLogs.map((x) =>
                            x.id !== log.id
                              ? x
                              : {
                                  ...x,
                                  effectiveCheckIn: corrIn,
                                  effectiveCheckOut: corrOut,
                                  hoursWorked: calcHoursDiff(corrIn, corrOut),
                                  correctionHistory: [
                                    ...x.correctionHistory,
                                    {
                                      correctedAtIso: new Date().toISOString(),
                                      correctedBy: currentUserName,
                                      previousCheckIn: x.effectiveCheckIn,
                                      previousCheckOut: x.effectiveCheckOut,
                                      newCheckIn: corrIn,
                                      newCheckOut: corrOut,
                                      reason: corrReason.trim(),
                                    },
                                  ],
                                }
                          ),
                        }));
                        setCorrectingLogId(null);
                      }}
                      className="rounded-lg bg-amber-600 px-3 py-1 font-semibold text-white disabled:opacity-40"
                    >
                      Guardar rectificación auditada
                    </button>
                  </div>
                )}

                {log.correctionHistory.length > 0 && (
                  <div className="rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600 space-y-0.5">
                    {log.correctionHistory.map((c, i) => (
                      <div key={i} className="inline-flex items-start gap-1.5">
                        <FileCheck2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                        <span>
                          Auditado ({new Date(c.correctedAtIso).toLocaleString("es-ES")}) por{" "}
                          <strong>{c.correctedBy}</strong>: pasó de {c.previousCheckIn}–{c.previousCheckOut} a{" "}
                          {c.newCheckIn}–{c.newCheckOut} — Motivo: <em>{c.reason}</em>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. PARTES DE TRABAJO CON FIRMA EN PANTALLA */}
      {tab === "partes" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 text-xs">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Nuevo Parte de Trabajo con Firma</h3>
            <textarea
              rows={2}
              placeholder="Trabajos realizados hoy en la obra..."
              value={repSummary}
              onChange={(e) => setRepSummary(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5"
            />
            <input
              type="text"
              placeholder="Materiales gastados (ej. 25m manguera 3G2.5, 1 diferencial 40A)"
              value={repMaterials}
              onChange={(e) => setRepMaterials(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={repHours}
                onChange={(e) => setRepHours(Number(e.target.value) || 1)}
                placeholder="Horas"
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono"
              />
              <input
                type="text"
                placeholder="Nombre y DNI quien firma"
                value={repSignedBy}
                onChange={(e) => setRepSignedBy(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-semibold text-slate-700">Firma del cliente en pantalla:</span>
                <button
                  type="button"
                  onClick={() => {
                    const ctx = canvasRef.current?.getContext("2d");
                    if (ctx && canvasRef.current) {
                      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    }
                  }}
                  className="text-slate-500 underline"
                >
                  Limpiar firma
                </button>
              </div>
              <canvas
                ref={canvasRef}
                width={380}
                height={110}
                onPointerDown={(e) => {
                  drawingRef.current = true;
                  const ctx = canvasRef.current?.getContext("2d");
                  const rect = e.currentTarget.getBoundingClientRect();
                  ctx?.beginPath();
                  ctx?.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                }}
                onPointerMove={(e) => {
                  if (!drawingRef.current) return;
                  const ctx = canvasRef.current?.getContext("2d");
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (ctx) {
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = "#0f172a";
                    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                    ctx.stroke();
                  }
                }}
                onPointerUp={() => {
                  drawingRef.current = false;
                }}
                className="w-full touch-none rounded-xl border border-slate-300 bg-slate-50 cursor-crosshair"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                if (!repSummary.trim()) return;
                const sig = canvasRef.current?.toDataURL("image/png") || "";
                onUpdateWorkspace((prev) => ({
                  ...prev,
                  workReports: [
                    {
                      id: `rep-${Date.now()}`,
                      dateIso: new Date().toISOString().slice(0, 10),
                      workerName: currentUserName,
                      projectRef: activeProjectRef,
                      summary: repSummary.trim(),
                      materialsUsed: repMaterials.trim(),
                      hours: repHours,
                      clientSignedBy: repSignedBy.trim() || "Cliente en obra",
                      signatureDataUrl: sig,
                    },
                    ...prev.workReports,
                  ],
                }));
                setRepSummary("");
                setRepMaterials("");
              }}
              className="rounded-xl bg-[#0f6cbd] px-4 py-2 font-semibold text-white"
            >
              Guardar Parte Firmado
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Últimos partes firmados</h3>
            {workspace.workReports.length === 0 ? (
              <p className="text-slate-500">Aún no hay partes firmados en esta obra.</p>
            ) : (
              workspace.workReports.map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>
                      {r.dateIso} · {r.projectRef} ({r.hours} h)
                    </span>
                    <span className="text-emerald-700">Firmado: {r.clientSignedBy}</span>
                  </div>
                  <p className="text-slate-700">{r.summary}</p>
                  {r.materialsUsed && (
                    <p className="text-[11px] text-slate-500">Material: {r.materialsUsed}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

