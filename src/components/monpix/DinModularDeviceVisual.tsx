"use client";

import React from "react";
import { AlertTriangle, Trash2, ArrowLeft, ArrowRight } from "lucide-react";
import type { DinModule, ModuleLiveStatus } from "./dinPanelHelpers";

export type DinBrandId =
  | "Schneider"
  | "ABB"
  | "Hager"
  | "Siemens"
  | "Legrand"
  | "Chint";

export const DIN_BRAND_STYLES: Record<
  DinBrandId,
  {
    shortLabel: string;
    seriesName: string;
    textColorClass: string;
    accentStripeClass: string;
    svgHex: string;
  }
> = {
  Schneider: {
    shortLabel: "Schneider",
    seriesName: "Schneider Resi9 / Acti9",
    textColorClass: "text-[#009530]",
    accentStripeClass: "bg-[#009530]",
    svgHex: "#009530",
  },
  ABB: {
    shortLabel: "ABB",
    seriesName: "ABB System pro M",
    textColorClass: "text-[#e30613]",
    accentStripeClass: "bg-[#e30613]",
    svgHex: "#e30613",
  },
  Hager: {
    shortLabel: "hager",
    seriesName: "Hager Serie MU/MY",
    textColorClass: "text-[#005ca9]",
    accentStripeClass: "bg-[#005ca9]",
    svgHex: "#005ca9",
  },
  Siemens: {
    shortLabel: "SIEMENS",
    seriesName: "Siemens SENTRON 5SL",
    textColorClass: "text-[#009999]",
    accentStripeClass: "bg-[#009999]",
    svgHex: "#009999",
  },
  Legrand: {
    shortLabel: "legrand",
    seriesName: "Legrand TX³ / DX³",
    textColorClass: "text-[#ed1b24]",
    accentStripeClass: "bg-[#ed1b24]",
    svgHex: "#ed1b24",
  },
  Chint: {
    shortLabel: "CHINT",
    seriesName: "Chint NB1-63",
    textColorClass: "text-[#0055a5]",
    accentStripeClass: "bg-[#0055a5]",
    svgHex: "#0055a5",
  },
};

interface DinModularDeviceVisualProps {
  mod: DinModule;
  brand?: DinBrandId;
  liveStatus: ModuleLiveStatus;
  hasError: boolean;
  isSelected: boolean;
  showEditControls: boolean;
  is3DMode: boolean;
  onToggleSwitch: (id: string) => void;
  onTriggerRcdTest: (id: string) => void;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onMoveLeft: (id: string) => void;
  onMoveRight: (id: string) => void;
  onDragStartReorder?: (id: string) => void;
  onDropReorder?: (targetId: string) => void;
}

/**
 * Representación realista de aparato modular DIN (1P+N, 2P, 4P) con:
 * - Bornas superiores e inferiores con tornillos
 * - Ventanilla de estado (I-ON rojo / 0-OFF verde)
 * - Maneta física animada al hacer clic (enciende/apaga)
 * - Botón TEST funcional en Diferenciales
 */
export default function DinModularDeviceVisual({
  mod,
  brand = "Schneider",
  liveStatus,
  hasError,
  isSelected,
  showEditControls,
  is3DMode,
  onToggleSwitch,
  onTriggerRcdTest,
  onSelect,
  onRemove,
  onMoveLeft,
  onMoveRight,
  onDragStartReorder,
  onDropReorder,
}: DinModularDeviceVisualProps) {
  const widthPx =
    mod.modulesWidth >= 4
      ? 144
      : mod.modulesWidth === 3
      ? 112
      : mod.modulesWidth === 2
      ? 92
      : 54;

  const isEnergizedOut = liveStatus.loadLive;
  const isTripped = Boolean(mod.isTripped);
  const isDps = mod.kind === "DPS";
  const isCombi = mod.kind === "COMBI";
  const isPop = mod.kind === "POP";
  const isDif = mod.kind === "DIF";
  const isIga = mod.kind === "IGA" || mod.kind === "COMBI";
  const isSwitchable = mod.kind !== "DPS";

  // Etiqueta principal tipo aparato real (el Combi integra IGA + T2 + POP)
  const mainMarking =
    mod.kind === "IGA"
      ? `${mod.curve || "C"}${mod.ratingAmps}`
      : mod.kind === "COMBI"
      ? `${mod.curve || "C"}${mod.ratingAmps} · T2+POP`
      : mod.kind === "DIF"
      ? `${mod.ratingAmps}A · ${mod.sensitivityMa || 30}mA`
      : mod.kind === "DPS"
      ? "T2 · 15kA"
      : mod.kind === "POP"
      ? "POP"
      : mod.kind === "PIA"
      ? `${mod.curve || "C"}${mod.ratingAmps}`
      : mod.kind === "CONTACTOR"
      ? `KM ${mod.ratingAmps}A`
      : mod.kind === "TIMER"
      ? "RELOJ"
      : "kWh";

  const terminalCount = mod.modulesWidth >= 2 ? (mod.modulesWidth >= 4 ? 4 : 2) : 1;

  return (
    <div
      draggable={showEditControls}
      onDragStart={() => onDragStartReorder?.(mod.id)}
      onDragOver={(e) => {
        if (showEditControls) e.preventDefault();
      }}
      onDrop={(e) => {
        if (showEditControls) {
          e.preventDefault();
          onDropReorder?.(mod.id);
        }
      }}
      className={`group relative flex flex-col items-center select-none ${
        showEditControls ? "cursor-grab active:cursor-grabbing" : ""
      }`}
      style={{
        width: `${widthPx}px`,
        transform: is3DMode
          ? "translateZ(14px) rotateX(4deg)"
          : undefined,
        transition: "transform 0.35s ease",
      }}
    >
      {/* Regleta de rotulación superior (código + subetiqueta) */}
      <div className="mb-1.5 w-full rounded border border-slate-300 bg-white/95 px-1 py-0.5 text-center shadow-2xs">
        <div className="truncate text-[10px] font-extrabold text-slate-900">
          {mod.label}
        </div>
        <div className="truncate text-[8px] font-medium text-slate-500">
          {mod.sublabel}
        </div>
      </div>

      {/* Cuerpo modular DIN realista */}
      <div
        onClick={() => onSelect(mod.id)}
        className={`relative flex w-full flex-col justify-between rounded-md border bg-gradient-to-b from-[#ffffff] via-[#f4f6f9] to-[#e6ebf2] p-1.5 transition-all duration-200 ${
          hasError
            ? "border-2 border-rose-500 ring-2 ring-rose-300/70"
            : isSelected
            ? "border-2 border-[#0f6cbd] ring-2 ring-blue-300/60"
            : "border-slate-300 hover:border-slate-400"
        } ${
          is3DMode
            ? "shadow-[4px_8px_16px_rgba(15,23,42,0.28)]"
            : "shadow-[0_3px_8px_rgba(15,23,42,0.14)]"
        }`}
        style={{ height: "164px" }}
        title={`${mod.label} · ${liveStatus.reason}`}
      >
        {/* Alerta de fallo en el módulo */}
        {hasError && (
          <span
            className="absolute -right-1.5 -top-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white shadow animate-pulse"
            title="Error de conexión o dimensionamiento detectado"
          >
            <AlertTriangle className="h-3 w-3" />
          </span>
        )}

        {/* Bornas superiores con tornillos */}
        <div className="flex items-center justify-around border-b border-slate-200/80 pb-1">
          {Array.from({ length: terminalCount }).map((_, idx) => (
            <div key={idx} className="flex flex-col items-center gap-0.5">
              <span className="text-[7px] font-bold text-slate-500">
                {terminalCount === 2 ? (idx === 0 ? "N" : "1") : idx + 1}
              </span>
              <div className="relative flex h-4 w-4 items-center justify-center rounded-full border border-slate-400 bg-gradient-to-br from-slate-300 to-slate-500 shadow-inner">
                <div className="h-[1.5px] w-2.5 rotate-45 bg-slate-800" />
              </div>
            </div>
          ))}
        </div>

        {/* Zona central: Marca comercial real + Banda color + Calibre + Ventanilla Estado + Maneta Animada */}
        <div className="flex flex-1 flex-col items-center justify-between py-1">
          <div className="flex w-full items-center justify-between px-0.5">
            <span
              className={`truncate text-[7.5px] font-black tracking-tight ${DIN_BRAND_STYLES[brand].textColorClass}`}
            >
              {DIN_BRAND_STYLES[brand].shortLabel}
            </span>
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                isEnergizedOut
                  ? "bg-emerald-500 shadow-[0_0_6px_#10b981]"
                  : isTripped
                  ? "bg-rose-500 animate-ping"
                  : "bg-slate-300"
              }`}
            />
          </div>

          {/* Banda distintiva de fabricante o función */}
          <div
            className={`h-1 w-full rounded-full ${
              isCombi
                ? "bg-gradient-to-r from-slate-800 via-amber-500 to-emerald-600"
                : isDps || isPop
                ? "bg-amber-500"
                : isIga
                ? "bg-slate-800"
                : DIN_BRAND_STYLES[brand].accentStripeClass
            }`}
          />

          <div className="text-center font-mono text-[9.5px] font-black text-slate-900 leading-tight">
            {mainMarking}
          </div>

          {/* Si es COMBI: ventanilla integrada T2+POP encima de la maneta del IGA */}
          {isCombi && (
            <div className="flex items-center gap-1 text-[7px] font-bold text-emerald-700">
              <span
                className={`inline-block h-2 w-3 rounded-xs border border-slate-400 ${
                  liveStatus.supplyLive ? "bg-emerald-500" : "bg-slate-300"
                }`}
                title="Estado protector sobretensiones integrado"
              />
              <span>Up≤1,5kV</span>
            </div>
          )}

          {/* Si es DPS (sin maneta): cartucho indicador verde/rojo */}
          {isDps ? (
            <div className="my-1 flex w-full flex-col items-center gap-1">
              <div className="flex gap-1">
                <span
                  className={`h-2.5 w-4 rounded-xs border border-slate-400 ${
                    liveStatus.supplyLive ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                  title="Cartucho T2 OK"
                />
                {mod.modulesWidth >= 2 && (
                  <span
                    className={`h-2.5 w-4 rounded-xs border border-slate-400 ${
                      liveStatus.supplyLive ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  />
                )}
              </div>
              <span className="text-[8px] font-bold text-slate-500">
                Up ≤ 1,5 kV
              </span>
            </div>
          ) : (
            /* Maneta interactiva con clic animado + ventanilla I-ON / 0-OFF */
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isSwitchable) onToggleSwitch(mod.id);
              }}
              className="group/lever relative flex w-full flex-col items-center rounded-sm border border-slate-300 bg-slate-200/70 py-1 hover:border-[#0f6cbd] hover:bg-blue-50/40 focus:outline-none cursor-pointer"
              title="Clic para encender o apagar el interruptor"
            >
              {/* Ventanilla óptica I-ON / 0-OFF */}
              <div
                className={`mb-1 rounded-xs px-1.5 py-[1px] text-[7px] font-black tracking-wider text-white shadow-inner transition-colors duration-200 ${
                  mod.isOn && !isTripped ? "bg-rose-600" : "bg-emerald-600"
                }`}
              >
                {mod.isOn && !isTripped ? "I-ON" : isTripped ? "TRIP" : "0-OFF"}
              </div>

              {/* Carril de palanca con animación vertical arriba/abajo */}
              <div className="relative h-7 w-full flex items-center justify-center">
                <div className="h-5 w-[78%] rounded-xs bg-slate-300/90 shadow-inner" />
                <div
                  className={`absolute left-1/2 -translate-x-1/2 flex h-3.5 w-[86%] items-center justify-center rounded-xs border shadow-md transition-all duration-200 ${
                    mod.isOn && !isTripped
                      ? "-translate-y-1.5 border-slate-600 bg-gradient-to-b from-slate-800 to-slate-950"
                      : "translate-y-1.5 border-slate-400 bg-gradient-to-b from-slate-500 to-slate-700"
                  } group-hover/lever:brightness-110`}
                >
                  <span className="h-[2px] w-4 rounded-full bg-white/50" />
                </div>
              </div>
            </button>
          )}

          {/* Botón TEST funcional para Diferenciales */}
          {isDif && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTriggerRcdTest(mod.id);
              }}
              className="w-[84%] rounded-xs border border-amber-500/80 bg-amber-100 py-[1px] text-[8px] font-black text-amber-900 hover:bg-amber-200 active:scale-95 transition"
              title="Pulsar TEST para probar el disparo del diferencial"
            >
              T · TEST
            </button>
          )}
        </div>

        {/* Bornas inferiores con tornillos */}
        <div className="flex items-center justify-around border-t border-slate-200/80 pt-1">
          {Array.from({ length: terminalCount }).map((_, idx) => (
            <div key={idx} className="flex flex-col items-center gap-0.5">
              <div className="relative flex h-4 w-4 items-center justify-center rounded-full border border-slate-400 bg-gradient-to-br from-slate-300 to-slate-500 shadow-inner">
                <div className="h-[1.5px] w-2.5 -rotate-12 bg-slate-800" />
              </div>
              <span className="text-[7px] font-bold text-slate-500">
                {terminalCount === 2 ? (idx === 0 ? "N" : "2") : idx + 2}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Estado de tensión en carga abajo */}
      <div
        className={`mt-1 w-full rounded px-1 py-0.5 text-center text-[8px] font-bold ${
          mod.isTripped
            ? "bg-rose-100 text-rose-800"
            : liveStatus.loadLive
            ? "bg-emerald-100 text-emerald-800"
            : "bg-slate-200 text-slate-600"
        }`}
      >
        {mod.isTripped
          ? "DISPARO"
          : liveStatus.loadLive
          ? mod.phaseAssigned === "L1-L2-L3"
            ? "400V ON"
            : "230V ON"
          : "0V OFF"}
      </div>

      {/* Controles rápidos de edición cuando Editar cuadro está activo */}
      {showEditControls && (
        <div className="no-print mt-1 flex items-center justify-center gap-0.5">
          <button
            type="button"
            onClick={() => onMoveLeft(mod.id)}
            className="rounded border border-slate-300 bg-white p-0.5 text-slate-600 hover:bg-slate-100"
            title="Mover a la izquierda"
          >
            <ArrowLeft className="h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            onClick={() => onMoveRight(mod.id)}
            className="rounded border border-slate-300 bg-white p-0.5 text-slate-600 hover:bg-slate-100"
            title="Mover a la derecha"
          >
            <ArrowRight className="h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(mod.id)}
            className="rounded border border-rose-200 bg-rose-50 p-0.5 text-rose-600 hover:bg-rose-100"
            title="Quitar componente del cuadro"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </div>
      )}
    </div>
  );
}

