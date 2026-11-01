"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Zap,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  Database,
  Activity,
  Building2,
  FileCheck2,
  Sparkles,
  BookOpen,
  FileSpreadsheet,
  Printer,
  FolderOpen,
} from "lucide-react";
import {
  RebtCircuitInput,
  SystemSupplyType,
  CircuitUsageType,
  InstallationMethod,
  InsulationType,
  Itc04GroupCode,
  MtdFormMetadata,
  DEFAULT_MTD_METADATA,
  ITC_BT_25_TEMPLATES,
  REBT_PIA_RATINGS,
  calculateRebtCircuit,
  calculateBuildingLoadForecastItc10,
  evaluateItc04Documentation,
  calculateEarthingItc18,
} from "@/lib/electrical-calculations";
import MtdCanariasOfficialForm from "@/components/MtdCanariasOfficialForm";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

type ActiveTab =
  | "ficha_mtd"
  | "circuitos"
  | "edificio_itc10"
  | "tierras_legalizacion";

interface SavedProjectRow {
  id: number;
  name: string;
  client_name: string;
  location: string;
  system_type: SystemSupplyType;
  electrification_grade: "basica" | "elevada";
  mtd_metadata_json?: MtdFormMetadata;
  created_at: string;
}

export default function SistemaCalculoRebtPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("ficha_mtd");

  // Metadatos completos de la Ficha Técnica Oficial M.T.D. B.T. (Gobierno de Canarias - 11 páginas)
  const [mtdMeta, setMtdMeta] = useState<MtdFormMetadata>(DEFAULT_MTD_METADATA);

  // Configuración Eléctrica REBT
  const [supplyType, setSupplyType] = useState<SystemSupplyType>("monofasico_230v");
  const [electrificationGrade, setElectrificationGrade] = useState<"basica" | "elevada">("basica");
  const [diLengthMeters, setDiLengthMeters] = useState<number>(18);
  const [diType, setDiType] = useState<"di_concentrada" | "di_unico">("di_concentrada");

  // Circuitos interiores (inicializados con los 5 circuitos básicos C1-C5 de ITC-BT-25)
  const [circuits, setCircuits] = useState<RebtCircuitInput[]>(() =>
    ITC_BT_25_TEMPLATES.slice(0, 5)
  );

  // Estado para Previsión de Cargas de Edificios (ITC-BT-10 + ITC-BT-52 + ITC-BT-14)
  const [basicDwellings, setBasicDwellings] = useState(12);
  const [elevatedDwellings, setElevatedDwellings] = useState(4);
  const [commonLightingW, setCommonLightingW] = useState(1800);
  const [hydroW, setHydroW] = useState(2200);
  const [otherServicesW, setOtherServicesW] = useState(7500);
  const [commercialCount, setCommercialCount] = useState(2);
  const [commercialAreaM2, setCommercialAreaM2] = useState(140);
  const [garageAreaM2, setGarageAreaM2] = useState(450);
  const [garageForcedVent, setGarageForcedVent] = useState(true);
  const [parkingSpaces, setParkingSpaces] = useState(20);
  const [hasSpl, setHasSpl] = useState(false);
  const [lgaLengthMeters, setLgaLengthMeters] = useState(25);

  // Estado para Clasificador ITC-BT-04 / ITC-BT-05 (Proyecto vs MTD + OCA)
  const [itc04Group, setItc04Group] = useState<Itc04GroupCode>("e_edificio_viviendas");
  const [itc04CustomPowerKw, setItc04CustomPowerKw] = useState<number>(115);
  const [itc04ParkingSpaces, setItc04ParkingSpaces] = useState<number>(20);

  // Estado para Puesta a Tierra (ITC-BT-18 + ITC-BT-24)
  const [soilResistivity, setSoilResistivity] = useState<number>(150);
  const [rodLengthMeters, setRodLengthMeters] = useState<number>(2);
  const [numRods, setNumRods] = useState<number>(4);
  const [buriedConductorMeters, setBuriedConductorMeters] = useState<number>(15);
  const [maxContactVoltageV, setMaxContactVoltageV] = useState<50 | 24>(50);
  const [rcdSensitivityMa, setRcdSensitivityMa] = useState<30 | 100 | 300 | 500>(30);

  // Estado de guardado y carga en Supabase
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [savedProjects, setSavedProjects] = useState<SavedProjectRow[]>([]);

  const generalServicesW = commonLightingW + hydroW + otherServicesW;

  // Cálculos de cada circuito interior (ITC-BT-19 / 21 / 22 / 25)
  const calculatedCircuits = useMemo(
    () => circuits.map((c) => calculateRebtCircuit(c)),
    [circuits]
  );

  // Resumen del Cuadro General de Mando y Protección (CGMP - ITC-BT-17 / 25) y Derivación Individual (ITC-BT-15)
  const cgmpSummary = useMemo(() => {
    const totalInstalledWatts = calculatedCircuits.reduce(
      (acc, c) => acc + c.powerWatts,
      0
    );
    const totalDesignWatts = calculatedCircuits.reduce(
      (acc, c) => acc + c.effectivePowerWatts,
      0
    );

    const minNormativeWatts = electrificationGrade === "elevada" ? 9200 : 5750;
    const contractDesignWatts = Math.max(totalDesignWatts, minNormativeWatts);

    const supplyVoltage = supplyType === "trifasico_400v" ? 400 : 230;
    const denom =
      supplyType === "trifasico_400v" ? Math.sqrt(3) * 400 : 230;
    const designCurrentAmps = Number((contractDesignWatts / denom).toFixed(2));

    const igaAmps =
      REBT_PIA_RATINGS.find((r) => r >= designCurrentAmps && r >= 25) || 63;

    const hasEvCircuitC13 = calculatedCircuits.some(
      (c) => c.usageType === "recarga_ve" || c.code.toUpperCase() === "C13"
    );
    const interiorCount = calculatedCircuits.filter(
      (c) => c.usageType !== "recarga_ve" && c.code.toUpperCase() !== "C13"
    ).length;
    const rcd30mACount =
      Math.max(1, Math.ceil(interiorCount / 5)) + (hasEvCircuitC13 ? 1 : 0);

    const diCalculation = calculateRebtCircuit({
      code: "DI",
      description: "Derivación Individual (Contador → CGMP)",
      usageType: diType,
      phaseSystem: supplyType === "trifasico_400v" ? "trifasico" : "monofasico",
      phaseAssigned: supplyType === "trifasico_400v" ? "L1-L2-L3" : "L1",
      voltage: supplyVoltage,
      powerWatts: contractDesignWatts,
      cosPhi: 1.0,
      simultaneityFactor: 1.0,
      utilizationFactor: 1.0,
      lengthMeters: diLengthMeters,
      installationMethod: "B1",
      insulationType: "XLPE_90",
      material: "Cu",
      minSectionMm2: 6,
      fixedPiaAmps: igaAmps,
    });

    const nonCompliantCircuits = calculatedCircuits.filter(
      (c) => !c.isCompliant
    ).length;

    return {
      totalInstalledWatts,
      totalDesignWatts: Math.round(totalDesignWatts),
      contractDesignWatts: Math.round(contractDesignWatts),
      designCurrentAmps,
      igaAmps,
      rcd30mACount,
      hasEvCircuitC13,
      diCalculation,
      nonCompliantCircuits,
    };
  }, [calculatedCircuits, electrificationGrade, supplyType, diLengthMeters, diType]);

  // Cálculo de Previsión de Cargas del Edificio (ITC-BT-10 + ITC-BT-52 + ITC-BT-14)
  const buildingForecast = useMemo(
    () =>
      calculateBuildingLoadForecastItc10({
        basicDwellingsCount: basicDwellings,
        elevatedDwellingsCount: elevatedDwellings,
        commonLightingWatts: commonLightingW,
        hydroWatts: hydroW,
        otherServicesWatts: otherServicesW,
        generalServicesWatts: generalServicesW,
        commercialCount,
        commercialAreaM2,
        garageAreaM2,
        garageForcedVentilation: garageForcedVent,
        parkingSpacesCount: parkingSpaces,
        hasSplProtection: hasSpl,
        lgaLengthMeters,
      }),
    [
      basicDwellings,
      elevatedDwellings,
      commonLightingW,
      hydroW,
      otherServicesW,
      generalServicesW,
      commercialCount,
      commercialAreaM2,
      garageAreaM2,
      garageForcedVent,
      parkingSpaces,
      hasSpl,
      lgaLengthMeters,
    ]
  );

  // Evaluación Documental ITC-BT-04 e Inspección OCA ITC-BT-05
  const itc04Evaluation = useMemo(
    () =>
      evaluateItc04Documentation(
        itc04Group,
        itc04CustomPowerKw,
        itc04ParkingSpaces
      ),
    [itc04Group, itc04CustomPowerKw, itc04ParkingSpaces]
  );

  // Cálculo de Puesta a Tierra ITC-BT-18 / ITC-BT-24
  const earthingResult = useMemo(
    () =>
      calculateEarthingItc18({
        soilResistivityOhmM: soilResistivity,
        rodLengthMeters,
        numRods,
        buriedConductorMeters,
        maxContactVoltageV,
        rcdSensitivityMa,
      }),
    [
      soilResistivity,
      rodLengthMeters,
      numRods,
      buriedConductorMeters,
      maxContactVoltageV,
      rcdSensitivityMa,
    ]
  );

  // Consultar expedientes guardados en Supabase al iniciar
  const fetchSavedProjects = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("electrical_projects")
      .select(
        "id, name, client_name, location, system_type, electrification_grade, mtd_metadata_json, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) {
      setSavedProjects(data as SavedProjectRow[]);
    }
  };

  useEffect(() => {
    fetchSavedProjects();
  }, []);

  const handleLoadProject = async (projectId: number) => {
    if (!supabase) return;
    const proj = savedProjects.find((p) => p.id === projectId);
    if (proj) {
      if (proj.mtd_metadata_json && Object.keys(proj.mtd_metadata_json).length > 0) {
        setMtdMeta({ ...DEFAULT_MTD_METADATA, ...proj.mtd_metadata_json });
      }
      if (proj.system_type === "monofasico_230v" || proj.system_type === "trifasico_400v") {
        setSupplyType(proj.system_type);
      }
      if (proj.electrification_grade === "basica" || proj.electrification_grade === "elevada") {
        setElectrificationGrade(proj.electrification_grade);
      }
    }

    const { data: dbCircuits } = await supabase
      .from("electrical_circuits")
      .select("*")
      .eq("project_id", projectId)
      .order("circuit_number", { ascending: true });

    if (dbCircuits && dbCircuits.length > 0) {
      setCircuits(
        dbCircuits.map((row) => ({
          code: row.circuit_code || `C${row.circuit_number}`,
          description: row.description,
          usageType: (row.usage_type as CircuitUsageType) || "vivienda_interior",
          phaseSystem: row.phases === 3 ? "trifasico" : "monofasico",
          phaseAssigned: row.phases === 3 ? "L1-L2-L3" : "L1",
          voltage: row.phases === 3 ? 400 : 230,
          powerWatts: Number(row.power_va) || 2300,
          cosPhi: Number(row.power_factor) || 1.0,
          simultaneityFactor: Number(row.simultaneity_factor) || 1.0,
          utilizationFactor: Number(row.utilization_factor) || 1.0,
          lengthMeters: Number(row.length_meters) || 15,
          installationMethod: (row.installation_method as InstallationMethod) || "B1",
          insulationType: (row.insulation_type as InsulationType) || "PVC_70",
          material: row.conductor_material === "Al" ? "Al" : "Cu",
          fixedPiaAmps: Number(row.breaker_amps) || undefined,
        }))
      );
      setSaveStatus(`Expediente #${projectId} cargado desde Supabase.`);
    }
  };

  const loadPresetDwellings = (preset: "basica" | "elevada_ve") => {
    if (preset === "basica") {
      setElectrificationGrade("basica");
      setCircuits(ITC_BT_25_TEMPLATES.slice(0, 5));
    } else {
      setElectrificationGrade("elevada");
      setCircuits(ITC_BT_25_TEMPLATES);
    }
  };

  const addCircuit = () => {
    const nextIdx = circuits.length + 1;
    setCircuits((prev) => [
      ...prev,
      {
        code: `C${nextIdx}`,
        description: `Circuito interior ${nextIdx}`,
        usageType: "fuerza_otros",
        phaseSystem: supplyType === "trifasico_400v" ? "trifasico" : "monofasico",
        phaseAssigned: supplyType === "trifasico_400v" ? "L1-L2-L3" : "L1",
        voltage: supplyType === "trifasico_400v" ? 400 : 230,
        powerWatts: 3450,
        cosPhi: 0.9,
        simultaneityFactor: 1.0,
        utilizationFactor: 1.0,
        correctionFactor: 1.0,
        lengthMeters: 20,
        installationMethod: "B1",
        insulationType: "PVC_70",
        material: "Cu",
      },
    ]);
  };

  const removeCircuit = (index: number) => {
    setCircuits((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCircuit = <K extends keyof RebtCircuitInput>(
    index: number,
    field: K,
    value: RebtCircuitInput[K]
  ) => {
    setCircuits((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        const updated = { ...c, [field]: value };
        if (field === "phaseSystem") {
          updated.voltage = value === "trifasico" ? 400 : 230;
          updated.phaseAssigned = value === "trifasico" ? "L1-L2-L3" : "L1";
        }
        return updated;
      })
    );
  };

  const handleSaveToSupabase = async () => {
    if (!supabase) {
      setSaveStatus(
        "Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY para guardar en Supabase."
      );
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);

    try {
      const { data: project, error: projectErr } = await supabase
        .from("electrical_projects")
        .insert({
          name: `M.T.D. ${mtdMeta.expedienteNum} - ${mtdMeta.usoDestino}`,
          client_name: mtdMeta.titularNombre,
          location: `${mtdMeta.direccionCalle} ${mtdMeta.direccionNum}, ${mtdMeta.terminoMunicipal} (${mtdMeta.isla})`,
          system_type: supplyType,
          electrification_grade: electrificationGrade,
          itc04_group: itc04Group,
          document_type: itc04Evaluation.documentType,
          requires_oca: itc04Evaluation.requiresInitialOcaInspection,
          demand_factor: 1.0,
          ambient_temp_c: 40,
          total_connected_va: cgmpSummary.totalInstalledWatts,
          total_demand_va: cgmpSummary.contractDesignWatts,
          main_breaker_amps: cgmpSummary.igaAmps,
          iga_amps: cgmpSummary.igaAmps,
          di_section_mm2: cgmpSummary.diCalculation.sectionMm2,
          rcd_count: cgmpSummary.rcd30mACount,
          main_feeder_awg: `${cgmpSummary.diCalculation.sectionMm2} mm² Cu XLPE`,
          building_forecast_json: buildingForecast,
          earthing_json: earthingResult,
          mtd_metadata_json: mtdMeta,
        })
        .select("id")
        .single();

      if (projectErr || !project) {
        throw new Error(projectErr?.message || "No se pudo insertar el expediente M.T.D.");
      }

      const circuitRows = calculatedCircuits.map((c, idx) => ({
        project_id: project.id,
        circuit_number: idx + 1,
        circuit_code: c.code,
        description: c.description,
        load_category: "especial",
        usage_type: c.usageType,
        phase_assignment: c.phaseAssigned,
        phases: c.phaseSystem === "trifasico" ? 3 : 1,
        voltage: c.voltage,
        power_va: c.powerWatts,
        power_factor: c.cosPhi,
        simultaneity_factor: c.simultaneityFactor,
        utilization_factor: c.utilizationFactor,
        is_continuous: true,
        length_meters: c.lengthMeters,
        conductor_material: c.material,
        installation_method: c.installationMethod,
        insulation_type: c.insulationType,
        calculated_current_amps: c.currentIbAmps,
        design_current_amps: c.correctedCurrentAmps,
        ampacity_iz_amps: c.ampacityIzAmps,
        recommended_awg: `${c.sectionMm2} mm²`,
        section_mm2: c.sectionMm2,
        neutral_section_mm2: c.neutralSectionMm2,
        pe_section_mm2: c.peSectionMm2,
        tube_diameter_mm: c.tubeDiameterMm,
        breaker_amps: c.piaAmps,
        voltage_drop_pct: c.voltageDropPct,
        max_allowed_drop_pct: c.maxAllowedDropPct,
      }));

      const { error: circuitsErr } = await supabase
        .from("electrical_circuits")
        .insert(circuitRows);

      if (circuitsErr) {
        throw new Error(circuitsErr.message);
      }

      await fetchSavedProjects();
      setSaveStatus(
        `✓ Expediente M.T.D. #${project.id} (${mtdMeta.expedienteNum}) y sus ${calculatedCircuits.length} circuitos guardados en Supabase (bercfavycekkkqwlwmap).`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setSaveStatus(`Error al guardar en Supabase: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Cabecera de la Aplicación (No se imprime cuando se exporta la Ficha M.T.D.) */}
      <header className="no-print mb-6 flex flex-col justify-between gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/30">
              <Zap className="h-3.5 w-3.5" /> REBT RD 842/2002 (ITC-BT-01 a BT-52)
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-400 ring-1 ring-sky-500/30">
              <BookOpen className="h-3.5 w-3.5" /> Ficha Oficial M.T.D. B.T. (Gobierno de Canarias · 11 Págs)
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                isSupabaseConfigured
                  ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30"
                  : "bg-slate-800 text-slate-400 ring-slate-700"
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              {isSupabaseConfigured
                ? `Supabase Conectado (${savedProjects.length} expedientes)`
                : "Modo Local"}
            </span>
          </div>
          <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Sistema de Cálculo Eléctrico REBT y Generador Automático de M.T.D. B.T.
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Registra los datos del titular, circuitos y edificio, calcula automáticamente secciones (mm²), PIAs, caídas de tensión, LGA/DI y puesta a tierra, y rellena las 11 páginas de la Memoria Técnica de Diseño.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {savedProjects.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5">
              <FolderOpen className="h-4 w-4 text-sky-400" />
              <select
                onChange={(e) => {
                  const id = Number(e.target.value);
                  if (id) handleLoadProject(id);
                }}
                defaultValue=""
                className="bg-transparent text-xs text-slate-200 focus:outline-none"
              >
                <option value="" disabled className="bg-slate-900">
                  Cargar Expediente Guardado...
                </option>
                {savedProjects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900">
                    #{p.id} · {p.client_name} ({p.name})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setActiveTab("ficha_mtd");
              setTimeout(() => window.print(), 150);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20"
          >
            <Printer className="h-4 w-4" />
            Imprimir / PDF (11 Págs)
          </button>

          <button
            type="button"
            onClick={handleSaveToSupabase}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-amber-400 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Guardando..." : "Guardar en Supabase"}
          </button>
        </div>
      </header>

      {saveStatus && (
        <div className="no-print mb-5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-4 py-2.5 text-xs font-medium text-emerald-200">
          {saveStatus}
        </div>
      )}

      {/* Panel Rápido de Datos del Titular, Emplazamiento y Suministro (No se imprime) */}
      <section className="no-print mb-6 grid grid-cols-1 gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:grid-cols-2 md:grid-cols-6">
        <div className="md:col-span-2">
          <label className="block text-[11px] font-medium text-slate-400">
            Titular / Razón Social (Pág. 1/11)
          </label>
          <input
            type="text"
            value={mtdMeta.titularNombre}
            onChange={(e) =>
              setMtdMeta((prev) => ({ ...prev, titularNombre: e.target.value }))
            }
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-400">
            D.O.I. / C.I.F.
          </label>
          <input
            type="text"
            value={mtdMeta.titularNif}
            onChange={(e) =>
              setMtdMeta((prev) => ({ ...prev, titularNif: e.target.value }))
            }
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-400">
            Municipio / Isla
          </label>
          <input
            type="text"
            value={mtdMeta.terminoMunicipal}
            onChange={(e) =>
              setMtdMeta((prev) => ({
                ...prev,
                terminoMunicipal: e.target.value,
              }))
            }
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-400">
            Tensión Suministro
          </label>
          <select
            value={supplyType}
            onChange={(e) => setSupplyType(e.target.value as SystemSupplyType)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
          >
            <option value="monofasico_230v">Monofásico 230 V</option>
            <option value="trifasico_400v">Trifásico 400 V</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-400">
            Electrificación Vivienda
          </label>
          <select
            value={electrificationGrade}
            onChange={(e) =>
              setElectrificationGrade(e.target.value as "basica" | "elevada")
            }
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
          >
            <option value="basica">Básica (5.750 W)</option>
            <option value="elevada">Elevada (9.200 W)</option>
          </select>
        </div>
      </section>

      {/* Navegación por Pestañas de Módulos (No se imprime) */}
      <div className="no-print mb-6 flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("ficha_mtd")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
            activeTab === "ficha_mtd"
              ? "bg-amber-500 text-slate-950 shadow"
              : "bg-slate-900 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          1. Ficha Técnica Oficial M.T.D. B.T. (11 Páginas Autollenadas)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("circuitos")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
            activeTab === "circuitos"
              ? "bg-amber-500 text-slate-950 shadow"
              : "bg-slate-900 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <Activity className="h-4 w-4" />
          2. Cálculo de Circuitos y D.I. (ITC-BT-15 / 19 / 25)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("edificio_itc10")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
            activeTab === "edificio_itc10"
              ? "bg-amber-500 text-slate-950 shadow"
              : "bg-slate-900 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <Building2 className="h-4 w-4" />
          3. Previsión de Cargas Edificio y LGA (ITC-BT-10 / 14 / 52)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("tierras_legalizacion")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
            activeTab === "tierras_legalizacion"
              ? "bg-amber-500 text-slate-950 shadow"
              : "bg-slate-900 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <FileCheck2 className="h-4 w-4" />
          4. Puesta a Tierra y Legalización (ITC-BT-04 / 05 / 18 / 24)
        </button>
      </div>

      {/* =====================================================================
          PESTAÑA 1: FICHA TÉCNICA OFICIAL M.T.D. B.T. (11 PÁGINAS)
         ===================================================================== */}
      {activeTab === "ficha_mtd" && (
        <MtdCanariasOfficialForm
          meta={mtdMeta}
          setMeta={setMtdMeta}
          supplyType={supplyType}
          electrificationGrade={electrificationGrade}
          calculatedCircuits={calculatedCircuits}
          cgmpSummary={cgmpSummary}
          buildingForecast={buildingForecast}
          buildingInputs={{
            basicDwellings,
            elevatedDwellings,
            commonLightingW,
            hydroW,
            otherServicesW,
            commercialCount,
            commercialAreaM2,
            garageAreaM2,
            garageForcedVent,
            parkingSpaces,
          }}
          earthingResult={earthingResult}
          rcdSensitivityMa={rcdSensitivityMa}
        />
      )}

      {/* =====================================================================
          PESTAÑA 2: REGISTRO Y CÁLCULO DE CIRCUITOS INTERIORES Y D.I.
         ===================================================================== */}
      {activeTab === "circuitos" && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <span className="text-xs text-slate-400">
                Potencia Prevista / Instalada (Pág. 1 M.T.D.)
              </span>
              <p className="mt-1 text-2xl font-bold text-white">
                {cgmpSummary.contractDesignWatts.toLocaleString()} W
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Instalada: {cgmpSummary.totalInstalledWatts.toLocaleString()} W · Simultánea:{" "}
                {cgmpSummary.totalDesignWatts.toLocaleString()} W
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <span className="text-xs text-slate-400">
                I.G.A. y Diferenciales (Pág. 1 y 8 M.T.D.)
              </span>
              <p className="mt-1 text-2xl font-bold text-amber-400">
                IGA {cgmpSummary.igaAmps} A
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Diferenciales {rcdSensitivityMa} mA:{" "}
                <strong className="text-white">{cgmpSummary.rcd30mACount} ud.</strong>
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Derivación Individual (ITC-BT-15)
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    value={diLengthMeters}
                    onChange={(e) => setDiLengthMeters(Number(e.target.value) || 1)}
                    className="w-14 rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-right text-xs text-white"
                  />
                  <span className="text-xs text-slate-500">m</span>
                </div>
              </div>
              <p className="mt-1 text-xl font-bold text-sky-400">
                {cgmpSummary.diCalculation.conductorsSummary} + PE{" "}
                {cgmpSummary.diCalculation.peSectionMm2} mm²
              </p>
              <p className="mt-1 text-xs text-slate-400">
                ΔU = {cgmpSummary.diCalculation.voltageDropPct}% · Tubo Ø{" "}
                {cgmpSummary.diCalculation.tubeDiameterMm} mm · Icc ={" "}
                {cgmpSummary.diCalculation.shortCircuitCurrentAmps} A
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <span className="text-xs text-slate-400">
                Estado Reglamentario (Pág. 6 M.T.D.)
              </span>
              <div className="mt-1 flex items-center gap-2">
                {cgmpSummary.nonCompliantCircuits === 0 ? (
                  <>
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                    <span className="text-lg font-bold text-emerald-400">
                      Cumple REBT
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-6 w-6 text-amber-400" />
                    <span className="text-lg font-bold text-amber-400">
                      {cgmpSummary.nonCompliantCircuits} alerta(s)
                    </span>
                  </>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Vuelca directo al Cuadro Resumen Pág. 6/11
              </p>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Plantillas ITC-BT-25:
              </span>
              <button
                type="button"
                onClick={() => loadPresetDwellings("basica")}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
              >
                Cargar Electrificación Básica (C1 a C5)
              </button>
              <button
                type="button"
                onClick={() => loadPresetDwellings("elevada_ve")}
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20"
              >
                Cargar Electrificación Elevada + Recarga VE (C1 a C13)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={diType}
                onChange={(e) =>
                  setDiType(e.target.value as "di_concentrada" | "di_unico")
                }
                className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200"
              >
                <option value="di_concentrada">DI Contadores Concentrados (ΔU 1,0%)</option>
                <option value="di_unico">DI Único Usuario (ΔU 1,5%)</option>
              </select>
              <button
                type="button"
                onClick={addCircuit}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400"
              >
                <Plus className="h-3.5 w-3.5" />
                Añadir Circuito
              </button>
            </div>
          </div>

          <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] uppercase text-slate-400">
                  <tr>
                    <th className="px-2.5 py-3">Cód.</th>
                    <th className="px-2.5 py-3">Descripción del Circuito</th>
                    <th className="px-2.5 py-3">Uso / ITC</th>
                    <th className="px-2.5 py-3">Sistema</th>
                    <th className="px-2.5 py-3">Potencia (W)</th>
                    <th className="px-2.5 py-3">Long. (m)</th>
                    <th className="px-2.5 py-3">Aisl. / Mét.</th>
                    <th className="px-2.5 py-3 text-right">Ib (A)</th>
                    <th className="px-2.5 py-3 text-right">PIA (A)</th>
                    <th className="px-2.5 py-3 text-right">Iz (A)</th>
                    <th className="px-2.5 py-3">Sección (mm²)</th>
                    <th className="px-2.5 py-3 text-right">ΔU (%)</th>
                    <th className="px-2.5 py-3 text-right">Icc (A)</th>
                    <th className="px-2.5 py-3 text-right">Tubo Ø</th>
                    <th className="px-2.5 py-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {calculatedCircuits.map((c, index) => (
                    <tr key={index} className="hover:bg-slate-800/30">
                      <td className="px-2.5 py-2">
                        <input
                          type="text"
                          value={c.code}
                          onChange={(e) =>
                            updateCircuit(index, "code", e.target.value)
                          }
                          className="w-12 rounded border border-slate-700 bg-slate-950 px-1.5 py-1 font-semibold text-amber-400"
                        />
                      </td>
                      <td className="px-2.5 py-2">
                        <input
                          type="text"
                          value={c.description}
                          onChange={(e) =>
                            updateCircuit(index, "description", e.target.value)
                          }
                          className="w-48 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                        />
                      </td>
                      <td className="px-2.5 py-2">
                        <select
                          value={c.usageType}
                          onChange={(e) =>
                            updateCircuit(
                              index,
                              "usageType",
                              e.target.value as CircuitUsageType
                            )
                          }
                          className="rounded border border-slate-700 bg-slate-950 px-1.5 py-1 text-white"
                        >
                          <option value="vivienda_interior">Vivienda (3%)</option>
                          <option value="alumbrado">Alumbrado (3%)</option>
                          <option value="alumbrado_descarga">Descarga x1,8 (3%)</option>
                          <option value="fuerza_otros">Fuerza / Otros (5%)</option>
                          <option value="motor">Motor x1,25 (5%)</option>
                          <option value="recarga_ve">Recarga VE (5%)</option>
                        </select>
                      </td>
                      <td className="px-2.5 py-2">
                        <select
                          value={c.phaseSystem}
                          onChange={(e) =>
                            updateCircuit(
                              index,
                              "phaseSystem",
                              e.target.value as "monofasico" | "trifasico"
                            )
                          }
                          className="rounded border border-slate-700 bg-slate-950 px-1.5 py-1 text-white"
                        >
                          <option value="monofasico">230V 1F</option>
                          <option value="trifasico">400V 3F</option>
                        </select>
                      </td>
                      <td className="px-2.5 py-2">
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={c.powerWatts}
                          onChange={(e) =>
                            updateCircuit(
                              index,
                              "powerWatts",
                              Number(e.target.value) || 0
                            )
                          }
                          className="w-20 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-right text-white"
                        />
                      </td>
                      <td className="px-2.5 py-2">
                        <input
                          type="number"
                          min={1}
                          value={c.lengthMeters}
                          onChange={(e) =>
                            updateCircuit(
                              index,
                              "lengthMeters",
                              Number(e.target.value) || 1
                            )
                          }
                          className="w-14 rounded border border-slate-700 bg-slate-950 px-1.5 py-1 text-right text-white"
                        />
                      </td>
                      <td className="px-2.5 py-2">
                        <div className="flex items-center gap-1">
                          <select
                            value={c.insulationType}
                            onChange={(e) =>
                              updateCircuit(
                                index,
                                "insulationType",
                                e.target.value as InsulationType
                              )
                            }
                            className="rounded border border-slate-700 bg-slate-950 px-1 py-1 text-white"
                          >
                            <option value="PVC_70">PVC 70°C</option>
                            <option value="XLPE_90">XLPE 90°C</option>
                          </select>
                          <select
                            value={c.installationMethod}
                            onChange={(e) =>
                              updateCircuit(
                                index,
                                "installationMethod",
                                e.target.value as InstallationMethod
                              )
                            }
                            className="rounded border border-slate-700 bg-slate-950 px-1 py-1 text-white"
                          >
                            <option value="B1">B1</option>
                            <option value="E">E/F</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-2.5 py-2 text-right font-mono text-slate-200">
                        {c.currentIbAmps} A
                      </td>
                      <td className="px-2.5 py-2 text-right font-mono font-bold text-amber-400">
                        {c.piaAmps} A
                      </td>
                      <td className="px-2.5 py-2 text-right font-mono text-slate-300">
                        {c.ampacityIzAmps} A
                      </td>
                      <td className="px-2.5 py-2 font-mono font-semibold text-sky-400">
                        {c.conductorsSummary} + PE {c.peSectionMm2} mm²
                      </td>
                      <td className="px-2.5 py-2 text-right font-mono">
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold ${
                            c.voltageDropPct <= c.maxAllowedDropPct
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          {c.voltageDropPct}%
                        </span>
                      </td>
                      <td className="px-2.5 py-2 text-right font-mono text-slate-300">
                        {c.shortCircuitCurrentAmps} A
                      </td>
                      <td className="px-2.5 py-2 text-right font-mono text-slate-300">
                        Ø {c.tubeDiameterMm} mm
                      </td>
                      <td className="px-2.5 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeCircuit(index)}
                          className="rounded p-1 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
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
        </div>
      )}

      {/* =====================================================================
          PESTAÑA 3: PREVISIÓN DE CARGAS DEL EDIFICIO (PÁGINA 2/11 M.T.D.)
         ===================================================================== */}
      {activeTab === "edificio_itc10" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-2">
            <h2 className="text-lg font-semibold text-white">
              Datos del Edificio para la Página 2/11 de la M.T.D. (ITC-BT-10 + ITC-BT-52)
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-400">
                  Nº Viviendas Electrificación Básica (5.750 W)
                </label>
                <input
                  type="number"
                  min={0}
                  value={basicDwellings}
                  onChange={(e) => setBasicDwellings(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400">
                  Nº Viviendas Electrificación Elevada (9.200 W)
                </label>
                <input
                  type="number"
                  min={0}
                  value={elevatedDwellings}
                  onChange={(e) => setElevatedDwellings(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400">
                  Servicios Generales: Alumbrado Zonas Comunes [W]
                </label>
                <input
                  type="number"
                  min={0}
                  value={commonLightingW}
                  onChange={(e) => setCommonLightingW(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400">
                  Servicios Generales: Hidros / Grupo Presión [W]
                </label>
                <input
                  type="number"
                  min={0}
                  value={hydroW}
                  onChange={(e) => setHydroW(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400">
                  Servicios Generales: Otros Servicios (Ascensores, ICT) [W]
                </label>
                <input
                  type="number"
                  min={0}
                  value={otherServicesW}
                  onChange={(e) => setOtherServicesW(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400">
                  Locales Comerciales: Nº Locales y Superficie [m²]
                </label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={0}
                    value={commercialCount}
                    onChange={(e) => setCommercialCount(Number(e.target.value) || 0)}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                    placeholder="Nº locales"
                  />
                  <input
                    type="number"
                    min={0}
                    value={commercialAreaM2}
                    onChange={(e) =>
                      setCommercialAreaM2(Number(e.target.value) || 0)
                    }
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                    placeholder="m²"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400">
                  Garaje: Superficie [m²] y Tipo de Ventilación
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={garageAreaM2}
                    onChange={(e) => setGarageAreaM2(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                  <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={garageForcedVent}
                      onChange={(e) => setGarageForcedVent(e.target.checked)}
                    />
                    Forzada (20 W/m²)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400">
                  Plazas de Aparcamiento (ITC-BT-52) y Longitud LGA [m]
                </label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={0}
                    value={parkingSpaces}
                    onChange={(e) => setParkingSpaces(Number(e.target.value) || 0)}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                    title="Nº plazas aparcamiento"
                  />
                  <input
                    type="number"
                    min={1}
                    value={lgaLengthMeters}
                    onChange={(e) => setLgaLengthMeters(Number(e.target.value) || 1)}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                    title="Longitud LGA (m)"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/80 p-5">
            <h3 className="text-base font-bold text-amber-400">
              Totales Volcados a Página 2/11 y 6/11 M.T.D.
            </h3>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Potencia Media Viviendas:</span>
                <span className="font-mono font-semibold text-white">
                  {buildingForecast.avgDwellingPowerWatts} W
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">
                  Coef. Simultaneidad ({buildingForecast.totalDwellings} viv.):
                </span>
                <span className="font-mono font-semibold text-white">
                  {buildingForecast.simultaneityCoefficient}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Potencia Total Simultánea Viv.:</span>
                <span className="font-mono font-semibold text-white">
                  {buildingForecast.p1DwellingsWatts.toLocaleString()} W
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Total Servicios Generales:</span>
                <span className="font-mono font-semibold text-white">
                  {buildingForecast.p2GeneralServicesWatts.toLocaleString()} W
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Total Locales Comerciales:</span>
                <span className="font-mono font-semibold text-white">
                  {buildingForecast.p3CommercialWatts.toLocaleString()} W
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Potencia de Garaje:</span>
                <span className="font-mono font-semibold text-white">
                  {buildingForecast.p4GarageWatts.toLocaleString()} W
                </span>
              </div>
              <div className="flex justify-between pt-2 text-base font-bold">
                <span className="text-amber-400">POTENCIA TOTAL EDIFICIO:</span>
                <span className="font-mono text-amber-400">
                  {buildingForecast.totalBuildingPowerWatts.toLocaleString()} W
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          PESTAÑA 4: PUESTA A TIERRA Y LEGALIZACIÓN (ITC-BT-04 / 05 / 18 / 24)
         ===================================================================== */}
      {activeTab === "tierras_legalizacion" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Puesta a tierra */}
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold text-white">
              Puesta a Tierra (ITC-BT-18 / 24) → Pág. 1/11 M.T.D.
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-400">
                  Resistividad del Terreno ρ [Ω·m]
                </label>
                <input
                  type="number"
                  min={5}
                  value={soilResistivity}
                  onChange={(e) =>
                    setSoilResistivity(Number(e.target.value) || 10)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400">
                  Nº de Picas Verticales (n)
                </label>
                <input
                  type="number"
                  min={0}
                  value={numRods}
                  onChange={(e) => setNumRods(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400">
                  Longitud de cada Pica [m]
                </label>
                <input
                  type="number"
                  min={1}
                  step={0.5}
                  value={rodLengthMeters}
                  onChange={(e) =>
                    setRodLengthMeters(Number(e.target.value) || 1)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400">
                  Conductor Horizontal Enterrado [m] (Cu ≥ 35 mm²)
                </label>
                <input
                  type="number"
                  min={0}
                  value={buriedConductorMeters}
                  onChange={(e) =>
                    setBuriedConductorMeters(Number(e.target.value) || 0)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400">
                  Sensibilidad Diferencial IΔn [mA]
                </label>
                <select
                  value={rcdSensitivityMa}
                  onChange={(e) =>
                    setRcdSensitivityMa(
                      Number(e.target.value) as 30 | 100 | 300 | 500
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                >
                  <option value={30}>30 mA</option>
                  <option value={100}>100 mA</option>
                  <option value={300}>300 mA</option>
                  <option value={500}>500 mA</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400">
                  Tensión de Seguridad UL
                </label>
                <select
                  value={maxContactVoltageV}
                  onChange={(e) => {
                    const v = Number(e.target.value) as 50 | 24;
                    setMaxContactVoltageV(v);
                    setMtdMeta((prev) => ({ ...prev, tensionSeguridad: v }));
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                >
                  <option value={50}>50 V (Seco)</option>
                  <option value={24}>24 V (Húmedo)</option>
                </select>
              </div>
            </div>

            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              Resistencia Óhmica Prevista (volcada a Pág. 1/11 M.T.D.):{" "}
              <strong className="font-mono text-lg text-amber-400">
                {earthingResult.estimatedResistanceOhm} Ω
              </strong>{" "}
              (Máx. admisible: {earthingResult.maxAllowedRaOhm} Ω)
            </div>
          </div>

          {/* Clasificación ITC-BT-04 / 05 */}
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold text-white">
              Verificación ITC-BT-04 (Proyecto vs M.T.D.) e Inspección OCA (ITC-BT-05)
            </h2>

            <div>
              <label className="block text-xs font-medium text-slate-400">
                Grupo de Instalación según ITC-BT-04
              </label>
              <select
                value={itc04Group}
                onChange={(e) => setItc04Group(e.target.value as Itc04GroupCode)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              >
                <option value="f_vivienda_unifamiliar">
                  Grupo f) Vivienda unifamiliar (MTD hasta 50 kW)
                </option>
                <option value="e_edificio_viviendas">
                  Grupo e) Edificio de viviendas / locales (MTD hasta 100 kW)
                </option>
                <option value="a_industria">
                  Grupo a) Industrias (MTD hasta 20 kW)
                </option>
                <option value="i_publica_concurrencia">
                  Grupo i) Locales de Pública Concurrencia (Proyecto siempre)
                </option>
                <option value="g_garaje_forzada">
                  Grupo g) Garajes con ventilación forzada (Proyecto siempre)
                </option>
                <option value="h_garaje_natural">
                  Grupo h) Garajes con ventilación natural (MTD hasta 5 plazas)
                </option>
                <option value="k_alumbrado_exterior">
                  Grupo k) Alumbrado Exterior (MTD hasta 5 kW)
                </option>
                <option value="z_recarga_ve_interior">
                  Grupo z) Recarga de Vehículo Eléctrico (MTD hasta 50 kW)
                </option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400">
                  Potencia a Legalizar [kW]
                </label>
                <input
                  type="number"
                  value={itc04CustomPowerKw}
                  onChange={(e) =>
                    setItc04CustomPowerKw(Number(e.target.value) || 0)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400">
                  Plazas Garaje
                </label>
                <input
                  type="number"
                  value={itc04ParkingSpaces}
                  onChange={(e) =>
                    setItc04ParkingSpaces(Number(e.target.value) || 0)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-xs uppercase text-amber-300">
                Documentación Exigida (ITC-BT-04):
              </p>
              <p className="mt-1 text-lg font-bold text-white">
                {itc04Evaluation.documentType}
              </p>
              <p className="mt-1 text-xs text-slate-300">
                {itc04Evaluation.normativeRule}
              </p>
              <p className="mt-2 text-xs font-semibold text-sky-300">
                Inspección Inicial OCA (ITC-BT-05):{" "}
                {itc04Evaluation.requiresInitialOcaInspection
                  ? "SÍ REQUERIDA"
                  : "NO REQUERIDA"}
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
