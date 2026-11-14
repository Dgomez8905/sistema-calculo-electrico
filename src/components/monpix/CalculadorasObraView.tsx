"use client";

import React, { useState, useMemo } from "react";
import {
  Calculator,
  Zap,
  GitMerge,
  ShieldAlert,
  Car,
  Home,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Plus,
  RotateCcw,
} from "lucide-react";
import type {
  RebtCircuitInput,
  CircuitUsageType,
  InstallationMethod,
  InsulationType,
  ConductorMaterial,
} from "@/lib/electrical-calculations";
import { evaluateItc04Documentation, calculateRebtCircuit } from "@/lib/electrical-calculations";
import {
  ORIENTATIVE_DISCLAIMER,
  explainRebtCircuitStepByStep,
  convertPowerAndCurrent,
  calculateConduitDiameterItc21,
  balanceThreePhases,
  evaluateEnlaceCgpCpm,
  calculateHomeConsumption,
  REBT_SECTIONS_MM2,
  type PhaseBalanceItem,
} from "@/lib/monpix-engine";

interface CalculadorasObraViewProps {
  activeCircuits: RebtCircuitInput[];
  onApplyPhaseBalanceToProject: (
    assignments: Record<number, "L1" | "L2" | "L3" | "L1-L2-L3">
  ) => void;
  onAddEvCircuitToProject: (evCircuit: RebtCircuitInput) => void;
  defaultIsCanarias: boolean;
}

type CalcTab =
  | "cable_iz"
  | "ip_tubos"
  | "fases_rst"
  | "enlace_cgp"
  | "recarga_ve"
  | "consumo_casa";

export default function CalculadorasObraView({
  activeCircuits,
  onApplyPhaseBalanceToProject,
  onAddEvCircuitToProject,
  defaultIsCanarias,
}: CalculadorasObraViewProps) {
  const [tab, setTab] = useState<CalcTab>("cable_iz");

  // --- 1. Calculadora de sección y ¿Aguanta el cable? ---
  const [cablePowerW, setCablePowerW] = useState(5400);
  const [cableLengthM, setCableLengthM] = useState(22);
  const [cablePhases, setCablePhases] = useState<"monofasico" | "trifasico">("monofasico");
  const [cableUsage, setCableUsage] = useState<CircuitUsageType>("vivienda_interior");
  const [cableMaterial, setCableMaterial] = useState<ConductorMaterial>("Cu");
  const [cableInsulation, setCableInsulation] = useState<InsulationType>("XLPE_90");
  const [cableMethod, setCableMethod] = useState<InstallationMethod>("B1");
  const [cableFixedPia, setCableFixedPia] = useState<number>(0);

  const cableExplanation = useMemo(
    () =>
      explainRebtCircuitStepByStep({
        code: "LÍNEA",
        description: "Línea comprobada en obra",
        usageType: cableUsage,
        phaseSystem: cablePhases,
        phaseAssigned: cablePhases === "trifasico" ? "L1-L2-L3" : "L1",
        voltage: cablePhases === "trifasico" ? 400 : 230,
        powerWatts: cablePowerW,
        cosPhi: cableUsage === "motor" ? 0.85 : 1.0,
        simultaneityFactor: 1.0,
        utilizationFactor: 1.0,
        lengthMeters: cableLengthM,
        installationMethod: cableMethod,
        insulationType: cableInsulation,
        material: cableMaterial,
        fixedPiaAmps: cableFixedPia > 0 ? cableFixedPia : undefined,
      }),
    [
      cableUsage,
      cablePhases,
      cablePowerW,
      cableLengthM,
      cableMethod,
      cableInsulation,
      cableMaterial,
      cableFixedPia,
    ]
  );

  // --- 2. Conversor I <-> P + Tubo ITC-BT-21 ---
  const [convMode, setConvMode] = useState<"p_to_i" | "i_to_p">("p_to_i");
  const [convSys, setConvSys] = useState<"monofasica" | "trifasica" | "continua">("monofasica");
  const [convVolt, setConvVolt] = useState(230);
  const [convCosPhi, setConvCosPhi] = useState(0.95);
  const [convVal, setConvVal] = useState(3680);

  const convResult = useMemo(
    () =>
      convertPowerAndCurrent({
        mode: convMode,
        system: convSys,
        voltage: convVolt,
        cosPhi: convCosPhi,
        value: convVal,
      }),
    [convMode, convSys, convVolt, convCosPhi, convVal]
  );

  const [tubeSec, setTubeSec] = useState<number>(2.5);
  const [tubeNumCond, setTubeNumCond] = useState<2 | 3 | 4 | 5>(3);
  const [tubeMount, setTubeMount] = useState<"empotrado_obra" | "superficie_fijo" | "enterrado">("empotrado_obra");
  const tubeResult = useMemo(
    () =>
      calculateConduitDiameterItc21({
        sectionMm2: tubeSec,
        numConductors: tubeNumCond,
        mounting: tubeMount,
      }),
    [tubeSec, tubeNumCond, tubeMount]
  );

  // --- 3. Reparto equilibrado R·S·T ---
  const [phaseItems, setPhaseItems] = useState<PhaseBalanceItem[]>(() =>
    activeCircuits.map((c, idx) => ({
      id: String(idx),
      code: c.code,
      description: c.description,
      powerWatts: c.powerWatts,
      isThreePhase: c.phaseSystem === "trifasico",
      assignedPhase: c.phaseAssigned,
    }))
  );
  const [autoBalanceRst, setAutoBalanceRst] = useState(true);
  const [appliedBanner, setAppliedBanner] = useState(false);

  const phaseResult = useMemo(
    () => balanceThreePhases(phaseItems, autoBalanceRst),
    [phaseItems, autoBalanceRst]
  );

  // --- 4. Enlace CGP / CPM / Fusibles ---
  const [enlScenario, setEnlScenario] = useState<
    "unifamiliar_1" | "pareado_2" | "local_unico" | "edificio_centralizado"
  >("unifamiliar_1");
  const [enlAcometida, setEnlAcometida] = useState<"subterranea" | "aerea">("subterranea");
  const [enlBuildingKw, setEnlBuildingKw] = useState(85);
  const [enlDiWatts, setEnlDiWatts] = useState(9200);
  const [enlDiSec, setEnlDiSec] = useState(10);
  const [enlDiMat, setEnlDiMat] = useState<ConductorMaterial>("Cu");
  const [enlDiPhases, setEnlDiPhases] = useState<"monofasico" | "trifasico">("monofasico");
  const [enlConcentrated, setEnlConcentrated] = useState(false);

  const enlaceResult = useMemo(
    () =>
      evaluateEnlaceCgpCpm({
        supplyScenario: enlScenario,
        acometida: enlAcometida,
        totalPowerKw: enlBuildingKw,
        diPowerWatts: enlDiWatts,
        diSectionMm2: enlDiSec,
        diMaterial: enlDiMat,
        diPhases: enlDiPhases,
        metersConcentrated: enlConcentrated,
      }),
    [
      enlScenario,
      enlAcometida,
      enlBuildingKw,
      enlDiWatts,
      enlDiSec,
      enlDiMat,
      enlDiPhases,
      enlConcentrated,
    ]
  );

  // --- 5. Punto de Recarga VE (ITC-BT-52) ---
  const [evScheme, setEvScheme] = useState<"1a" | "2" | "3a" | "4a">("2");
  const [evPowerKw, setEvPowerKw] = useState<3.68 | 7.36 | 11 | 22>(7.36);
  const [evLengthM, setEvLengthM] = useState(28);
  const [evOutdoor, setEvOutdoor] = useState(false);
  const [evHasSpl, setEvHasSpl] = useState(true);

  const evCalc = useMemo(() => {
    const isThree = evPowerKw >= 11;
    const circuit = calculateRebtCircuit({
      code: "C13",
      description: `Punto Recarga VE ${evPowerKw} kW (Esquema ${evScheme} ITC-BT-52)`,
      usageType: "recarga_ve",
      phaseSystem: isThree ? "trifasico" : "monofasico",
      phaseAssigned: isThree ? "L1-L2-L3" : "L1",
      voltage: isThree ? 400 : 230,
      powerWatts: Math.round(evPowerKw * 1000),
      cosPhi: 1,
      simultaneityFactor: 1,
      utilizationFactor: 1,
      lengthMeters: evLengthM,
      installationMethod: "B1",
      insulationType: "XLPE_90",
      material: "Cu",
      minSectionMm2: 2.5,
    });
    const doc = evaluateItc04Documentation(
      evOutdoor && evPowerKw > 10 ? "z_recarga_ve_exterior_modo4" : "z_recarga_ve_interior",
      evPowerKw,
      1
    );
    return { circuit, doc };
  }, [evScheme, evPowerKw, evLengthM, evOutdoor]);

  // --- 6. ¿Cuánto gasta mi casa? ---
  const [homeKw, setHomeKw] = useState(4.6);
  const [homeKwh, setHomeKwh] = useState(260);
  const [homePowerPrice, setHomePowerPrice] = useState(0.092);
  const [homeEnergyPrice, setHomeEnergyPrice] = useState(0.142);
  const [homeTaxPct, setHomeTaxPct] = useState(defaultIsCanarias ? 7 : 21);

  const homeBill = useMemo(
    () =>
      calculateHomeConsumption({
        contractedKw: homeKw,
        monthlyKwh: homeKwh,
        powerTermEuroKwDay: homePowerPrice,
        energyPriceEuroKwh: homeEnergyPrice,
        taxPct: homeTaxPct,
      }),
    [homeKw, homeKwh, homePowerPrice, homeEnergyPrice, homeTaxPct]
  );

  return (
    <div className="space-y-5">
      {/* Cabecera coloquial + aviso fijo reglamentario */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-300/60">
            <ShieldAlert className="h-3.5 w-3.5" />
            {ORIENTATIVE_DISCLAIMER}
          </span>
          <h2 className="mt-2 text-lg font-bold text-slate-900">
            Calculadoras de Obra, Enlace CGP/CPM y Reparto de Fases
          </h2>
          <p className="text-xs text-slate-500">
            Cada resultado te explica paso a paso de dónde sale y qué ITC del REBT aplica.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: "cable_iz", label: "¿Aguanta el cable?", icon: <Zap className="h-3.5 w-3.5" /> },
              { id: "ip_tubos", label: "I ↔ P y Tubo", icon: <Calculator className="h-3.5 w-3.5" /> },
              { id: "fases_rst", label: "Fases R·S·T", icon: <GitMerge className="h-3.5 w-3.5" /> },
              { id: "enlace_cgp", label: "CGP / CPM y Fusibles", icon: <Sparkles className="h-3.5 w-3.5" /> },
              { id: "recarga_ve", label: "Recarga VE (BT-52)", icon: <Car className="h-3.5 w-3.5" /> },
              { id: "consumo_casa", label: "¿Cuánto gasta mi casa?", icon: <Home className="h-3.5 w-3.5" /> },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                tab === t.id
                  ? "bg-[#0f6cbd] text-white shadow-xs"
                  : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 1. SECCIÓN DE CABLE Y ¿AGUANTA EL CABLE? PASO A PASO */}
      {tab === "cable_iz" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Sección de cable y comprobación de Iz / Automático
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Potencia (W)</label>
                <input
                  type="number"
                  min={100}
                  value={cablePowerW}
                  onChange={(e) => setCablePowerW(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Longitud tirada (m)</label>
                <input
                  type="number"
                  min={1}
                  value={cableLengthM}
                  onChange={(e) => setCableLengthM(Number(e.target.value) || 1)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Suministro</label>
                <select
                  value={cablePhases}
                  onChange={(e) => setCablePhases(e.target.value as "monofasico" | "trifasico")}
                  className="mt-1 w-full px-3 py-2 text-xs"
                >
                  <option value="monofasico">Monofásico 230 V</option>
                  <option value="trifasico">Trifásico 400 V</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700">Uso de la línea</label>
                <select
                  value={cableUsage}
                  onChange={(e) => setCableUsage(e.target.value as CircuitUsageType)}
                  className="mt-1 w-full px-3 py-2 text-xs"
                >
                  <option value="vivienda_interior">Vivienda / Alumbrado (ΔU 3%)</option>
                  <option value="fuerza_otros">Fuerza / Tomas local (ΔU 5%)</option>
                  <option value="motor">Motor eléctrico ×1,25 (ITC-BT-47)</option>
                  <option value="recarga_ve">Recarga VE (ITC-BT-52)</option>
                  <option value="di_concentrada">Derivación Individual centralizada (1%)</option>
                  <option value="di_unico">Derivación Individual único usuario (1,5%)</option>
                  <option value="lga_centralizada">LGA Edificio (0,5%)</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700">Metal conductor</label>
                <select
                  value={cableMaterial}
                  onChange={(e) => setCableMaterial(e.target.value as ConductorMaterial)}
                  className="mt-1 w-full px-3 py-2 text-xs"
                >
                  <option value="Cu">Cobre (Cu)</option>
                  <option value="Al">Aluminio (Al)</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700">Aislamiento / Cable</label>
                <select
                  value={cableInsulation}
                  onChange={(e) => setCableInsulation(e.target.value as InsulationType)}
                  className="mt-1 w-full px-3 py-2 text-xs"
                >
                  <option value="XLPE_90">Manguera RV-K / RZ1-K (XLPE 90 °C)</option>
                  <option value="PVC_70">Unipolar H07Z1-K / H07V-K (70 °C)</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700">Por dónde va (Método)</label>
                <select
                  value={cableMethod}
                  onChange={(e) => setCableMethod(e.target.value as InstallationMethod)}
                  className="mt-1 w-full px-3 py-2 text-xs"
                >
                  <option value="B1">B1 — Unipolares bajo tubo empotrado</option>
                  <option value="B2">B2 — Manguera bajo tubo superficial/obra</option>
                  <option value="E">E / F — Al aire o bandeja perforada</option>
                  <option value="D">D — Enterrado bajo tubo</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700">Forzar PIA (0 = auto)</label>
                <input
                  type="number"
                  min={0}
                  value={cableFixedPia}
                  onChange={(e) => setCableFixedPia(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-7 space-y-4">
            <div
              className={`flex items-start gap-3 rounded-xl border p-4 ${
                cableExplanation.calculated.isCompliant
                  ? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
                  : "border-rose-200 bg-rose-50 text-rose-950"
              }`}
            >
              {cableExplanation.calculated.isCompliant ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              )}
              <div className="text-xs">
                <p className="font-bold text-sm">{cableExplanation.verdictText}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {cableExplanation.itcReferences.map((ref) => (
                    <span
                      key={ref}
                      className="rounded-md bg-white/90 px-2 py-0.5 font-mono text-[11px] font-bold text-[#0f6cbd] ring-1 ring-slate-200"
                    >
                      {ref}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] text-slate-500">Sección mínima</div>
                <div className="mt-0.5 text-lg font-extrabold text-[#0f6cbd]">
                  {cableExplanation.calculated.sectionMm2} mm²
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] text-slate-500">Aguanta (Iz)</div>
                <div className="mt-0.5 text-lg font-extrabold text-slate-900">
                  {cableExplanation.calculated.ampacityIzAmps} A
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] text-slate-500">Automático PIA</div>
                <div className="mt-0.5 text-lg font-extrabold text-slate-900">
                  {cableExplanation.calculated.piaAmps} A
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] text-slate-500">Caída ΔU%</div>
                <div className="mt-0.5 text-lg font-extrabold text-emerald-700">
                  {cableExplanation.calculated.voltageDropPct}%
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Cómo se ha calculado paso a paso
              </h4>
              {cableExplanation.steps.map((st, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">{st.title}</span>
                    <code className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-[#0f6cbd] ring-1 ring-slate-200">
                      {st.formula}
                    </code>
                  </div>
                  <p className="mt-1 text-slate-600">{st.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. CONVERSOR I <-> P + DIÁMETRO DE TUBO ITC-BT-21 */}
      {tab === "ip_tubos" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Conversor rápido Intensidad ↔ Potencia
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Qué quieres sacar</label>
                <select
                  value={convMode}
                  onChange={(e) => setConvMode(e.target.value as "p_to_i" | "i_to_p")}
                  className="mt-1 w-full px-3 py-2 text-xs"
                >
                  <option value="p_to_i">Tengo W → sacar Amperios (A)</option>
                  <option value="i_to_p">Tengo Amperios → sacar Vatios (W)</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700">Tipo de corriente</label>
                <select
                  value={convSys}
                  onChange={(e) => {
                    const next = e.target.value as "monofasica" | "trifasica" | "continua";
                    setConvSys(next);
                    setConvVolt(next === "trifasica" ? 400 : next === "continua" ? 24 : 230);
                  }}
                  className="mt-1 w-full px-3 py-2 text-xs"
                >
                  <option value="monofasica">Monofásica CA (230 V)</option>
                  <option value="trifasica">Trifásica CA (400 V)</option>
                  <option value="continua">Continua CC (Baterías / FV / LED)</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700">Tensión U (V)</label>
                <input
                  type="number"
                  value={convVolt}
                  onChange={(e) => setConvVolt(Number(e.target.value) || 1)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Factor potencia cos φ</label>
                <input
                  type="number"
                  step="0.05"
                  min={0.3}
                  max={1}
                  disabled={convSys === "continua"}
                  value={convCosPhi}
                  onChange={(e) => setConvCosPhi(Number(e.target.value) || 1)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono disabled:bg-slate-100"
                />
              </div>
              <div className="col-span-2">
                <label className="font-semibold text-slate-700">
                  {convMode === "p_to_i" ? "Potencia conocida (W)" : "Intensidad conocida (A)"}
                </label>
                <input
                  type="number"
                  value={convVal}
                  onChange={(e) => setConvVal(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                />
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
              <div className="text-xs text-slate-600">Resultado inmediato</div>
              <div className="mt-1 text-2xl font-extrabold text-[#0f6cbd]">
                {convResult.result.toLocaleString()} {convResult.unit}
              </div>
              <p className="mt-1 font-mono text-[11px] text-slate-600">
                {convResult.formulaUsed}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Diámetro exterior de tubo protector (ITC-BT-21)
            </h3>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Sección (mm²)</label>
                <select
                  value={tubeSec}
                  onChange={(e) => setTubeSec(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 text-xs"
                >
                  {REBT_SECTIONS_MM2.map((s) => (
                    <option key={s} value={s}>
                      {s} mm²
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700">Nº conductores</label>
                <select
                  value={tubeNumCond}
                  onChange={(e) => setTubeNumCond(Number(e.target.value) as 2 | 3 | 4 | 5)}
                  className="mt-1 w-full px-3 py-2 text-xs"
                >
                  <option value={2}>2 hilos</option>
                  <option value={3}>3 hilos (F+N+PE)</option>
                  <option value={4}>4 hilos</option>
                  <option value={5}>5 hilos (3F+N+PE)</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700">Montaje</label>
                <select
                  value={tubeMount}
                  onChange={(e) =>
                    setTubeMount(
                      e.target.value as "empotrado_obra" | "superficie_fijo" | "enterrado"
                    )
                  }
                  className="mt-1 w-full px-3 py-2 text-xs"
                >
                  <option value="empotrado_obra">Empotrado en roza/obra</option>
                  <option value="superficie_fijo">Superficial fijo</option>
                  <option value="enterrado">Enterrado en zanja</option>
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
              <div className="text-xs font-semibold text-emerald-900">
                {tubeResult.tableReference}
              </div>
              <div className="mt-1 text-2xl font-extrabold text-emerald-800">
                Tubo mínimo Ø {tubeResult.diameterMm} mm
              </div>
              <p className="mt-1 text-xs text-emerald-900/80">{tubeResult.note}</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. REPARTO EQUILIBRADO DE FASES R · S · T */}
      {tab === "fases_rst" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Reparto equilibrado de fases R · S · T (L1 · L2 · L3 a 400/230 V)
              </h3>
              <p className="text-xs text-slate-500">
                Reparte los circuitos monofásicos para que ninguna fase vaya sobrecargada y el neutro trabaje descansado (ITC-BT-19).
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setPhaseItems(
                    activeCircuits.map((c, idx) => ({
                      id: String(idx),
                      code: c.code,
                      description: c.description,
                      powerWatts: c.powerWatts,
                      isThreePhase: c.phaseSystem === "trifasico",
                      assignedPhase: c.phaseAssigned,
                    }))
                  );
                  setAutoBalanceRst(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Traer del cuadro activo
              </button>
              <button
                type="button"
                onClick={() =>
                  setPhaseItems((prev) => [
                    ...prev,
                    {
                      id: String(Date.now()),
                      code: `C${prev.length + 1}`,
                      description: "Circuito adicional",
                      powerWatts: 3450,
                    },
                  ])
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Añadir circuito
              </button>
              <button
                type="button"
                onClick={() => {
                  const map: Record<number, "L1" | "L2" | "L3" | "L1-L2-L3"> = {};
                  phaseResult.items.forEach((it, idx) => {
                    map[idx] = it.assignedPhase;
                  });
                  onApplyPhaseBalanceToProject(map);
                  setAppliedBanner(true);
                  setTimeout(() => setAppliedBanner(false), 3500);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f6cbd] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#115ea3]"
              >
                Aplicar reparto al Cuadro Activo
              </button>
            </div>
          </div>

          {appliedBanner && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
              Reparto R·S·T volcado al Cuadro de Circuitos del expediente (suministro pasado a Trifásico 400 V).
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            {(["L1", "L2", "L3"] as const).map((ph, idx) => {
              const label = ["Fase R (L1 - Marrón)", "Fase S (L2 - Negro)", "Fase T (L3 - Gris)"][idx];
              return (
                <div key={ph} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-700">{label}</div>
                  <div className="mt-1 text-xl font-extrabold text-[#0f6cbd]">
                    {phaseResult.phaseAmps[ph]} A
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {phaseResult.phaseWatts[ph].toLocaleString()} W
                  </div>
                </div>
              );
            })}
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
              <div className="text-xs font-bold text-slate-800">Neutro y Equilibrio</div>
              <div className="mt-1 text-xl font-extrabold text-slate-900">
                In ≈ {phaseResult.neutralAmps} A
              </div>
              <div className="text-[11px] font-semibold text-emerald-700">
                Desequilibrio: {phaseResult.imbalancePct}%{" "}
                {phaseResult.isWellBalanced ? "(Óptimo ≤15%)" : "(Mejorable)"}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Código</th>
                  <th className="px-3 py-2">Circuito</th>
                  <th className="px-3 py-2">Potencia (W)</th>
                  <th className="px-3 py-2">Fase asignada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {phaseResult.items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 font-mono font-bold">{item.code}</td>
                    <td className="px-3 py-2">{item.description}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={item.powerWatts}
                        onChange={(e) => {
                          const w = Number(e.target.value) || 0;
                          setPhaseItems((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, powerWatts: w } : p))
                          );
                        }}
                        className="w-24 rounded border border-slate-300 px-2 py-1 font-mono"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={item.assignedPhase}
                        onChange={(e) => {
                          const nextPh = e.target.value as "L1" | "L2" | "L3" | "L1-L2-L3";
                          setAutoBalanceRst(false);
                          setPhaseItems((prev) =>
                            prev.map((p, i) =>
                              i === idx
                                ? {
                                    ...p,
                                    assignedPhase: nextPh,
                                    isThreePhase: nextPh === "L1-L2-L3",
                                  }
                                : p
                            )
                          );
                        }}
                        className="px-2.5 py-1 text-xs"
                      >
                        <option value="L1">Fase R (L1)</option>
                        <option value="L2">Fase S (L2)</option>
                        <option value="L3">Fase T (L3)</option>
                        <option value="L1-L2-L3">Trifásico R·S·T</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. ENLACE CGP, CPM Y FUSIBLES */}
      {tab === "enlace_cgp" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              1. ¿Qué caja va (CGP o CPM) y qué fusibles lleva la LGA?
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Tipo de finca</label>
                <select
                  value={enlScenario}
                  onChange={(e) =>
                    setEnlScenario(
                      e.target.value as
                        | "unifamiliar_1"
                        | "pareado_2"
                        | "local_unico"
                        | "edificio_centralizado"
                    )
                  }
                  className="mt-1 w-full px-3 py-2 text-xs"
                >
                  <option value="unifamiliar_1">1 usuario (Chalet / Unifamiliar)</option>
                  <option value="pareado_2">2 usuarios (Pareado / 2 suministros)</option>
                  <option value="local_unico">Local único independiente</option>
                  <option value="edificio_centralizado">Edificio con centralización contadores</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700">Acometida distribuidora</label>
                <select
                  value={enlAcometida}
                  onChange={(e) => setEnlAcometida(e.target.value as "subterranea" | "aerea")}
                  className="mt-1 w-full px-3 py-2 text-xs"
                >
                  <option value="subterranea">Subterránea</option>
                  <option value="aerea">Aérea posada / tensada</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="font-semibold text-slate-700">
                  Potencia total prevista CGP / CPM (kW)
                </label>
                <input
                  type="number"
                  value={enlBuildingKw}
                  onChange={(e) => setEnlBuildingKw(Number(e.target.value) || 1)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                />
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 space-y-2 text-xs">
              <div className="font-bold text-[#0f6cbd]">{enlaceResult.schemeCode}</div>
              <p className="font-semibold text-slate-900">{enlaceResult.boxRecommendation}</p>
              <div className="border-t border-blue-200/70 pt-2 text-slate-700">
                Intensidad LGA prevista: <strong>{enlaceResult.lgaDesignAmps} A</strong> → Pon
                base CGP de <strong>{enlaceResult.cgpBaseAmps} A</strong> con cartuchos fusibles
                NH gG de <strong>{enlaceResult.recommendedFuseAmps} A</strong>.
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              2. Derivación Individual: ¿hasta cuántos metros puede llegar? (ITC-BT-15)
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Potencia DI (W)</label>
                <input
                  type="number"
                  value={enlDiWatts}
                  onChange={(e) => setEnlDiWatts(Number(e.target.value) || 1000)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Sección DI (mm²)</label>
                <select
                  value={enlDiSec}
                  onChange={(e) => setEnlDiSec(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 text-xs"
                >
                  {[6, 10, 16, 25, 35, 50, 70, 95].map((s) => (
                    <option key={s} value={s}>
                      {s} mm² AS+ (XLPE 90 °C)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700">Fases / Material</label>
                <select
                  value={enlDiPhases}
                  onChange={(e) => setEnlDiPhases(e.target.value as "monofasico" | "trifasico")}
                  className="mt-1 w-full px-3 py-2 text-xs"
                >
                  <option value="monofasico">Monofásica 230 V</option>
                  <option value="trifasico">Trifásica 400 V</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700">Ubicación contador</label>
                <select
                  value={enlConcentrated ? "concentrada" : "unico"}
                  onChange={(e) => setEnlConcentrated(e.target.value === "concentrada")}
                  className="mt-1 w-full px-3 py-2 text-xs"
                >
                  <option value="unico">Contador único / CPM (ΔU máx 1,5%)</option>
                  <option value="concentrada">Centralización edificio (ΔU máx 1,0%)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold text-slate-700">Conductor:</span>
              <button
                type="button"
                onClick={() => setEnlDiMat("Cu")}
                className={`rounded-lg px-3 py-1 font-semibold ${
                  enlDiMat === "Cu" ? "bg-[#0f6cbd] text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                Cobre (Cu)
              </button>
              <button
                type="button"
                onClick={() => setEnlDiMat("Al")}
                className={`rounded-lg px-3 py-1 font-semibold ${
                  enlDiMat === "Al" ? "bg-[#0f6cbd] text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                Aluminio (Al)
              </button>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs">
              <div className="font-semibold text-emerald-900">
                Longitud máxima reglamentaria sin pasar del {enlaceResult.maxDiDropPct}% de caída
              </div>
              <div className="mt-1 text-2xl font-extrabold text-emerald-800">
                Hasta {enlaceResult.maxDiLengthMeters} metros
              </div>
              <p className="mt-1 text-emerald-900/80">
                Cálculo con cable RZ1-K / DZ1-K (AS+) 0,6/1 kV a 90 °C y tubo mínimo Ø 32 mm (ITC-BT-15).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5. PUNTO DE RECARGA VE (ITC-BT-52) */}
      {tab === "recarga_ve" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Asistente Punto de Recarga de Vehículo Eléctrico (ITC-BT-52)
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Esquema de conexión ITC-BT-52</label>
                <select
                  value={evScheme}
                  onChange={(e) => setEvScheme(e.target.value as "1a" | "2" | "3a" | "4a")}
                  className="mt-1 w-full px-3 py-2 text-xs"
                >
                  <option value="2">Esquema 2 — Contador común con la vivienda (el más habitual en garaje comunitario)</option>
                  <option value="1a">Esquema 1a/1b — Troncal colectiva con contadores secundarios</option>
                  <option value="3a">Esquema 3a/3b — Contador individual nuevo para plaza de garaje</option>
                  <option value="4a">Esquema 4a — Circuito C13 desde el propio cuadro de vivienda unifamiliar</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Potencia Wallbox</label>
                  <select
                    value={evPowerKw}
                    onChange={(e) => setEvPowerKw(Number(e.target.value) as 3.68 | 7.36 | 11 | 22)}
                    className="mt-1 w-full px-3 py-2 text-xs"
                  >
                    <option value={3.68}>3,68 kW (16 A Monof.)</option>
                    <option value={7.36}>7,36 kW (32 A Monof.)</option>
                    <option value={11}>11 kW (16 A Trifásico)</option>
                    <option value={22}>22 kW (32 A Trifásico)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Distancia (m)</label>
                  <input
                    type="number"
                    min={1}
                    value={evLengthM}
                    onChange={(e) => setEvLengthM(Number(e.target.value) || 5)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="inline-flex items-center gap-2 font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={evHasSpl}
                    onChange={(e) => setEvHasSpl(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#0f6cbd]"
                  />
                  Lleva control dinámico SPL (toroidal)
                </label>
                <label className="inline-flex items-center gap-2 font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={evOutdoor}
                    onChange={(e) => setEvOutdoor(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#0f6cbd]"
                  />
                  Plaza a la intemperie / exterior
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-7 space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] text-slate-500">Cable RZ1-K (AS)</div>
                <div className="mt-0.5 text-base font-extrabold text-[#0f6cbd]">
                  {evCalc.circuit.conductorsSummary} + PE {evCalc.circuit.peSectionMm2}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] text-slate-500">PIA Curva C</div>
                <div className="mt-0.5 text-base font-extrabold text-slate-900">
                  {evCalc.circuit.piaAmps} A
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] text-slate-500">Tubo rígido IK08</div>
                <div className="mt-0.5 text-base font-extrabold text-slate-900">
                  Ø {Math.max(25, evCalc.circuit.tubeDiameterMm)} mm
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] text-slate-500">Caída ΔU%</div>
                <div className="mt-0.5 text-base font-extrabold text-emerald-700">
                  {evCalc.circuit.voltageDropPct}% (≤5%)
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-1.5">
              <div className="font-bold text-slate-900">Protecciones y Papeles Obligatorios (ITC-BT-52 / BT-04)</div>
              <p>
                • <strong>Diferencial exclusivo:</strong> 30 mA Clase A (si el cargador incluye sensor de fugas CC &gt; 6 mA RDC-DD) o Clase B.
              </p>
              <p>
                • <strong>Sobretensiones:</strong> Permanentes + Transitorias Tipo 2 obligatorio para proteger el cargador.
              </p>
              <p>
                • <strong>Papeles:</strong> {evCalc.doc.documentType} · OCA inicial:{" "}
                <strong>{evCalc.doc.requiresInitialOcaInspection ? "SÍ (Requerida)" : "NO (Basta CIE + MTD + comunicación previa a comunidad de propietarios)"}</strong>.
              </p>
              {evHasSpl && (
                <p className="text-emerald-800 font-medium">
                  • Con SPL activo (factor 0,3 en previsión ITC-BT-10) evitas subir la potencia contratada de la vivienda.
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onAddEvCircuitToProject(evCalc.circuit)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f6cbd] px-4 py-2 text-xs font-semibold text-white hover:bg-[#115ea3]"
              >
                <Plus className="h-4 w-4" />
                Añadir este C13 al Cuadro de Circuitos del Expediente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. ¿CUÁNTO GASTA MI CASA? */}
      {tab === "consumo_casa" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              ¿Cuánto gasta mi casa? y Potencia máxima según IGA
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700">Potencia contratada (kW)</label>
                <input
                  type="number"
                  step="0.1"
                  value={homeKw}
                  onChange={(e) => setHomeKw(Number(e.target.value) || 1)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Consumo mensual (kWh)</label>
                <input
                  type="number"
                  value={homeKwh}
                  onChange={(e) => setHomeKwh(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Precio potencia (€/kW·día)</label>
                <input
                  type="number"
                  step="0.005"
                  value={homePowerPrice}
                  onChange={(e) => setHomePowerPrice(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Precio energía (€/kWh)</label>
                <input
                  type="number"
                  step="0.005"
                  value={homeEnergyPrice}
                  onChange={(e) => setHomeEnergyPrice(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                />
              </div>
              <div className="col-span-2">
                <label className="font-semibold text-slate-700">Impuesto aplicable</label>
                <select
                  value={homeTaxPct}
                  onChange={(e) => setHomeTaxPct(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 text-xs"
                >
                  <option value={21}>Península / Baleares — IVA 21%</option>
                  <option value={10}>IVA reducido 10%</option>
                  <option value={7}>Canarias — IGIC general 7%</option>
                  <option value={0}>Canarias doméstico vivienda habitual ≤10 kW — IGIC 0%</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 text-xs">
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
              <div className="text-slate-600">Recibo mensual estimado (30 días)</div>
              <div className="mt-1 text-3xl font-extrabold text-[#0f6cbd]">
                {homeBill.totalMonthlyEuro.toFixed(2)} € / mes
              </div>
              <div className="mt-3 space-y-1 text-slate-700">
                <div className="flex justify-between">
                  <span>Término fijo de potencia:</span>
                  <strong>{homeBill.powerCost.toFixed(2)} €</strong>
                </div>
                <div className="flex justify-between">
                  <span>Energía consumida ({homeKwh} kWh):</span>
                  <strong>{homeBill.energyCost.toFixed(2)} €</strong>
                </div>
                <div className="flex justify-between">
                  <span>Impuesto eléctrico (5,11%) + contador:</span>
                  <strong>{(homeBill.electricitySpecialTax + homeBill.meterRental).toFixed(2)} €</strong>
                </div>
                <div className="flex justify-between">
                  <span>Impuestos ({homeTaxPct}%):</span>
                  <strong>{homeBill.vatOrIgic.toFixed(2)} €</strong>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="font-bold text-slate-900">IGA mínimo necesario en el cuadro</div>
              <p className="mt-1 text-slate-600">
                Para contratar <strong>{homeKw} kW</strong> en monofásico 230 V, el cuadro y el
                boletín deben llevar al menos un <strong>IGA de {homeBill.minimumIgaAmps} A</strong>{" "}
                (admite contratar hasta <strong>{homeBill.maxPowerForIgaKw} kW</strong>).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

