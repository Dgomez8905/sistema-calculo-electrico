"use client";

import React, { useMemo, useState } from "react";
import {
  Zap,
  Plus,
  Trash2,
  Database,
  CheckCircle2,
  AlertTriangle,
  Gauge,
  Cable,
  ShieldCheck,
  Calculator,
  Save,
} from "lucide-react";
import {
  calculateCircuit,
  calculatePanelSummary,
  CircuitInput,
  ConductorMaterial,
  LoadCategory,
  SystemType,
} from "@/lib/electrical-calculations";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const INITIAL_CIRCUITS: CircuitInput[] = [
  {
    circuitNumber: 1,
    description: "Iluminación General Planta Baja",
    loadCategory: "iluminacion",
    phaseAssignment: "A",
    phases: 1,
    voltage: 120,
    powerVa: 1440,
    powerFactor: 0.95,
    isContinuous: true,
    lengthMeters: 18,
    conductorMaterial: "Cu",
  },
  {
    circuitNumber: 2,
    description: "Tomacorrientes Generales Cocina y Área Social",
    loadCategory: "tomacorrientes",
    phaseAssignment: "B",
    phases: 1,
    voltage: 120,
    powerVa: 1800,
    powerFactor: 0.9,
    isContinuous: false,
    lengthMeters: 22,
    conductorMaterial: "Cu",
  },
  {
    circuitNumber: 3,
    description: "Aire Acondicionado Inverter 24,000 BTU",
    loadCategory: "climatizacion",
    phaseAssignment: "AB",
    phases: 2,
    voltage: 240,
    powerVa: 2800,
    powerFactor: 0.92,
    isContinuous: true,
    lengthMeters: 28,
    conductorMaterial: "Cu",
  },
  {
    circuitNumber: 4,
    description: "Bomba Hidroneumática 2 HP",
    loadCategory: "motores",
    phaseAssignment: "AB",
    phases: 2,
    voltage: 240,
    powerVa: 2200,
    powerFactor: 0.85,
    isContinuous: true,
    lengthMeters: 35,
    conductorMaterial: "Cu",
  },
];

export default function ElectricalCalculatorPage() {
  const [projectName, setProjectName] = useState("Residencial / Comercial Tablero TGP-01");
  const [clientName, setClientName] = useState("Ingeniería Eléctrica");
  const [systemType, setSystemType] = useState<SystemType>("bifasico_120_240v");
  const [demandFactor, setDemandFactor] = useState<number>(0.8);
  const [circuits, setCircuits] = useState<CircuitInput[]>(INITIAL_CIRCUITS);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const [newCircuit, setNewCircuit] = useState<CircuitInput>({
    circuitNumber: 5,
    description: "",
    loadCategory: "tomacorrientes",
    phaseAssignment: "A",
    phases: 1,
    voltage: 120,
    powerVa: 1500,
    powerFactor: 0.9,
    isContinuous: true,
    lengthMeters: 15,
    conductorMaterial: "Cu",
  });

  const calculatedCircuits = useMemo(
    () => circuits.map((c) => calculateCircuit(c)),
    [circuits]
  );

  const summary = useMemo(
    () => calculatePanelSummary(calculatedCircuits, systemType, demandFactor),
    [calculatedCircuits, systemType, demandFactor]
  );

  const handleAddCircuit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCircuit.description.trim()) return;
    const nextNum =
      circuits.length > 0
        ? Math.max(...circuits.map((c) => c.circuitNumber)) + 1
        : 1;
    const added: CircuitInput = {
      ...newCircuit,
      circuitNumber: nextNum,
    };
    setCircuits((prev) => [...prev, added]);
    setNewCircuit((prev) => ({
      ...prev,
      circuitNumber: nextNum + 1,
      description: "",
    }));
  };

  const handleRemoveCircuit = (circuitNumber: number) => {
    setCircuits((prev) =>
      prev.filter((c) => c.circuitNumber !== circuitNumber)
    );
  };

  const handleSaveToSupabase = async () => {
    if (!supabase || !isSupabaseConfigured) {
      setSaveStatus(
        "Configura NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local o Vercel para guardar en Supabase (bercfavycekkkqwlwmap)."
      );
      return;
    }

    setSaving(true);
    setSaveStatus(null);
    try {
      const { data: project, error: projectError } = await supabase
        .from("electrical_projects")
        .insert({
          name: projectName,
          client_name: clientName,
          system_type: systemType,
          demand_factor: demandFactor,
          total_connected_va: summary.totalConnectedVa,
          total_demand_va: summary.totalDemandVa,
          main_breaker_amps: summary.mainBreakerAmps,
          main_feeder_awg: summary.mainFeederAwg,
        })
        .select("id")
        .single();

      if (projectError) throw projectError;

      const circuitRows = calculatedCircuits.map((c) => ({
        project_id: project.id,
        circuit_number: c.circuitNumber,
        description: c.description,
        load_category: c.loadCategory,
        phase_assignment: c.phaseAssignment,
        phases: c.phases,
        voltage: c.voltage,
        power_va: c.powerVa,
        power_factor: c.powerFactor,
        is_continuous: c.isContinuous,
        length_meters: c.lengthMeters,
        conductor_material: c.conductorMaterial,
        calculated_current_amps: c.calculatedCurrentAmps,
        design_current_amps: c.designCurrentAmps,
        recommended_awg: c.recommendedAwg,
        breaker_amps: c.breakerAmps,
        voltage_drop_pct: c.voltageDropPct,
      }));

      const { error: circuitsError } = await supabase
        .from("electrical_circuits")
        .insert(circuitRows);

      if (circuitsError) throw circuitsError;

      setSaveStatus(
        `Proyecto #${project.id} guardado exitosamente en Supabase (bercfavycekkkqwlwmap).`
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al guardar en Supabase";
      setSaveStatus(`Error: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Sistema de Cálculo Eléctrico NEC
              </h1>
              <p className="text-xs text-slate-400">
                Cuadro de Cargas • Conductores AWG (Tabla 310.16) • Caída de Tensión • Supabase DB:{" "}
                <span className="font-mono text-emerald-400">bercfavycekkkqwlwmap</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                isSupabaseConfigured
                  ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30"
                  : "bg-amber-500/10 text-amber-300 ring-amber-500/30"
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              {isSupabaseConfigured ? "Supabase Conectado" : "Supabase Listo (Falta Anon Key)"}
            </span>

            <button
              onClick={handleSaveToSupabase}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Guardando..." : "Guardar en Supabase"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        {saveStatus && (
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-200">
            {saveStatus}
          </div>
        )}

        {/* Configuración del Proyecto y Tarjetas Resumen */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 lg:col-span-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
              <Calculator className="h-5 w-5 text-amber-400" />
              Parámetros Generales del Tablero
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400">
                  Nombre del Proyecto / Tablero
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-400">
                    Cliente / Ubicación
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400">
                    Factor de Demanda Global
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="1.0"
                    value={demandFactor}
                    onChange={(e) =>
                      setDemandFactor(Math.min(1, Math.max(0.1, Number(e.target.value))))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400">
                  Sistema de Alimentación
                </label>
                <select
                  value={systemType}
                  onChange={(e) => setSystemType(e.target.value as SystemType)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="monofasico_120v">Monofásico 120V (1F + N + T)</option>
                  <option value="bifasico_120_240v">Bifásico 120/240V (2F + N + T)</option>
                  <option value="trifasico_208v">Trifásico 120/208V (3F + N + T)</option>
                  <option value="trifasico_480v">Trifásico 277/480V Industrial (3F + N + T)</option>
                </select>
              </div>
            </div>
          </div>

          {/* KPIs de Ingeniería */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Carga Conectada / Demanda
                </span>
                <Gauge className="h-5 w-5 text-amber-400" />
              </div>
              <p className="mt-3 text-2xl font-bold text-white">
                {(summary.totalConnectedVa / 1000).toFixed(2)} kVA
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Demanda neta ({Math.round(demandFactor * 100)}%):{" "}
                <span className="font-semibold text-amber-300">
                  {(summary.totalDemandVa / 1000).toFixed(2)} kVA
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Corriente Alimentador Principal
                </span>
                <Zap className="h-5 w-5 text-sky-400" />
              </div>
              <p className="mt-3 text-2xl font-bold text-white">
                {summary.feederCurrentAmps} A
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Corriente de diseño (125% NEC):{" "}
                <span className="font-semibold text-sky-300">
                  {summary.feederDesignAmps} A
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Alimentador y Canalización
                </span>
                <Cable className="h-5 w-5 text-emerald-400" />
              </div>
              <p className="mt-3 text-2xl font-bold text-white">
                {summary.mainFeederAwg} THHN/THWN
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Tubería recomendada:{" "}
                <span className="font-semibold text-emerald-300">
                  Ø {summary.mainConduitInch} EMT/PVC
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Breaker Principal y Balance
                </span>
                <ShieldCheck className="h-5 w-5 text-purple-400" />
              </div>
              <p className="mt-3 text-2xl font-bold text-white">
                {summary.mainBreakerAmps} A Principal
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Desbalance entre fases:{" "}
                <span
                  className={`font-semibold ${
                    summary.phaseImbalancePct <= 5
                      ? "text-emerald-400"
                      : "text-amber-400"
                  }`}
                >
                  {summary.phaseImbalancePct}%
                </span>{" "}
                (A: {Math.round(summary.phaseLoads.A)} VA | B:{" "}
                {Math.round(summary.phaseLoads.B)} VA
                {systemType.startsWith("trifasico")
                  ? ` | C: ${Math.round(summary.phaseLoads.C)} VA`
                  : ""}
                )
              </p>
            </div>
          </div>
        </section>

        {/* Formulario para Agregar Circuito */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
            <Plus className="h-5 w-5 text-amber-400" />
            Agregar Circuito Ramal al Tablero
          </h2>
          <form
            onSubmit={handleAddCircuit}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8"
          >
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400">Descripción del Circuito</label>
              <input
                type="text"
                required
                placeholder="Ej. Iluminación Oficinas Piso 2"
                value={newCircuit.description}
                onChange={(e) =>
                  setNewCircuit({ ...newCircuit, description: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400">Categoría</label>
              <select
                value={newCircuit.loadCategory}
                onChange={(e) =>
                  setNewCircuit({
                    ...newCircuit,
                    loadCategory: e.target.value as LoadCategory,
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              >
                <option value="iluminacion">Iluminación</option>
                <option value="tomacorrientes">Tomacorrientes</option>
                <option value="climatizacion">Climatización</option>
                <option value="motores">Motores</option>
                <option value="especial">Carga Especial</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400">Fase / Polos</label>
              <select
                value={newCircuit.phaseAssignment}
                onChange={(e) => {
                  const val = e.target.value as CircuitInput["phaseAssignment"];
                  const phases = val.length === 3 ? 3 : val.length === 2 ? 2 : 1;
                  const defaultVoltage = phases === 1 ? 120 : phases === 2 ? 240 : 208;
                  setNewCircuit({
                    ...newCircuit,
                    phaseAssignment: val,
                    phases,
                    voltage: defaultVoltage,
                  });
                }}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              >
                <option value="A">Fase A (1P - 120V)</option>
                <option value="B">Fase B (1P - 120V)</option>
                <option value="C">Fase C (1P - 120V)</option>
                <option value="AB">Fases AB (2P - 240V/208V)</option>
                <option value="BC">Fases BC (2P - 240V/208V)</option>
                <option value="ABC">Trifásico ABC (3P)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400">Potencia (VA)</label>
              <input
                type="number"
                min="50"
                step="50"
                value={newCircuit.powerVa}
                onChange={(e) =>
                  setNewCircuit({ ...newCircuit, powerVa: Number(e.target.value) })
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400">Longitud (m)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={newCircuit.lengthMeters}
                onChange={(e) =>
                  setNewCircuit({
                    ...newCircuit,
                    lengthMeters: Number(e.target.value),
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400">Material</label>
              <select
                value={newCircuit.conductorMaterial}
                onChange={(e) =>
                  setNewCircuit({
                    ...newCircuit,
                    conductorMaterial: e.target.value as ConductorMaterial,
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              >
                <option value="Cu">Cobre (Cu)</option>
                <option value="Al">Aluminio (Al)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                + Añadir
              </button>
            </div>
          </form>
        </section>

        {/* Tabla del Cuadro de Cargas */}
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="text-base font-semibold text-white">
              Cuadro de Cargas y Dimensionamiento de Conductores (NEC)
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Cto</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3">Fase</th>
                  <th className="px-4 py-3">Tensión</th>
                  <th className="px-4 py-3">Carga (VA)</th>
                  <th className="px-4 py-3">I Nom (A)</th>
                  <th className="px-4 py-3">I Diseño (A)</th>
                  <th className="px-4 py-3">Long. (m)</th>
                  <th className="px-4 py-3">Calibre</th>
                  <th className="px-4 py-3">Breaker</th>
                  <th className="px-4 py-3">% ΔV</th>
                  <th className="px-4 py-3">Norma</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {calculatedCircuits.map((c) => (
                  <tr key={c.circuitNumber} className="hover:bg-slate-900">
                    <td className="px-4 py-3 font-mono font-semibold text-amber-400">
                      C-{c.circuitNumber}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">
                      {c.description}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">
                      {c.phaseAssignment} ({c.phases}P)
                    </td>
                    <td className="px-4 py-3 text-slate-300">{c.voltage}V</td>
                    <td className="px-4 py-3 font-mono text-slate-200">
                      {c.powerVa.toLocaleString()} VA
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">
                      {c.calculatedCurrentAmps} A
                    </td>
                    <td className="px-4 py-3 font-mono text-sky-300">
                      {c.designCurrentAmps} A
                    </td>
                    <td className="px-4 py-3 text-slate-300">{c.lengthMeters} m</td>
                    <td className="px-4 py-3 font-mono font-semibold text-emerald-400">
                      {c.recommendedAwg} ({c.conductorMaterial})
                    </td>
                    <td className="px-4 py-3 font-mono text-purple-300">
                      {c.phases}P × {c.breakerAmps}A
                    </td>
                    <td className="px-4 py-3 font-mono">
                      <span
                        className={
                          c.voltageDropPct <= 3
                            ? "text-emerald-400"
                            : "text-rose-400 font-bold"
                        }
                      >
                        {c.voltageDropPct}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.isCompliant ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          ≤ 3% OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-medium text-rose-400">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          &gt; 3%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemoveCircuit(c.circuitNumber)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-400"
                        title="Eliminar circuito"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
