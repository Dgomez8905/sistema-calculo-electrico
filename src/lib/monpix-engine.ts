// ============================================================================
// Motor Extendido MONPIX — Cálculos Paso a Paso REBT, Reparto R·S·T, Enlace
// CGP/CPM, Asistente Normativo ITC-BT, Parsers de Obra y Cumplimiento VeriFactu
// ============================================================================

import type {
  RebtCircuitInput,
  RebtCalculatedCircuit,
  ConductorMaterial,
} from "./electrical-calculations.ts";
import {
  calculateRebtCircuit,
  getConductivity,
  REBT_SECTIONS_MM2,
  REBT_SPAIN_IGA_MONO_STEPS,
  sanitizeSpanishIgaAmps,
  resolveSpanishRebtIgaAndTariff,
} from "./electrical-calculations.ts";

export const ORIENTATIVE_DISCLAIMER =
  "Orientativo: lo revisa y lo firma el instalador autorizado.";

// ============================================================================
// 1. Explicación Paso a Paso de Cálculo de Línea / Cable con ITC Aplicada
// ============================================================================
export interface StepByStepExplanation {
  calculated: RebtCalculatedCircuit;
  itcReferences: string[];
  steps: { title: string; formula: string; detail: string }[];
  verdictText: string;
}

export function explainRebtCircuitStepByStep(
  input: RebtCircuitInput
): StepByStepExplanation {
  const calc = calculateRebtCircuit(input);
  const gamma = getConductivity(input.material, input.insulationType);
  const kFactor =
    input.usageType === "motor"
      ? "× 1,25 (motor mayor, ITC-BT-47 apdo. 3)"
      : input.usageType === "alumbrado_descarga"
      ? "× 1,80 (descarga, ITC-BT-09 / ITC-BT-44)"
      : "× 1,00 (carga resistiva / general)";

  const itcs: string[] = ["ITC-BT-19 (Tabla 1)", "ITC-BT-22 (§1.1)", "ITC-BT-21"];
  if (input.usageType === "vivienda_interior") itcs.push("ITC-BT-25 (Tabla 1)");
  if (input.usageType === "recarga_ve") itcs.push("ITC-BT-52");
  if (input.usageType === "di_concentrada" || input.usageType === "di_unico")
    itcs.push("ITC-BT-15");
  if (input.usageType === "lga_centralizada" || input.usageType === "lga_parcial")
    itcs.push("ITC-BT-14");
  if (input.usageType === "motor") itcs.push("ITC-BT-47");

  const steps = [
    {
      title: "1. Potencia e intensidad de empleo (Ib)",
      formula:
        input.phaseSystem === "trifasico"
          ? "Ib = P_cálc / (√3 · 400 V · cos φ)"
          : "Ib = P_cálc / (230 V · cos φ)",
      detail: `Potencia efectiva = ${input.powerWatts} W ${kFactor} · Fs(${input.simultaneityFactor}) · Fu(${input.utilizationFactor}) = ${calc.effectivePowerWatts} W → Ib = ${calc.currentIbAmps} A (corregida por agrupamiento/temp = ${calc.correctedCurrentAmps} A).`,
    },
    {
      title: "2. Protección contra sobrecargas (ITC-BT-22 §1.1)",
      formula: "Ib ≤ In (PIA) ≤ Iz (cable)",
      detail: `Se comprueba ${calc.correctedCurrentAmps} A ≤ ${calc.piaAmps} A (automático) ≤ ${calc.ampacityIzAmps} A (máx. que aguanta el cable de ${calc.sectionMm2} mm² ${input.material} en método ${input.installationMethod}, ITC-BT-19 Tabla 1).`,
    },
    {
      title: "3. Caída de tensión reglamentaria (ΔU%)",
      formula:
        input.phaseSystem === "trifasico"
          ? "ΔU = (L · P) / (γ · S · 400)"
          : "ΔU = (2 · L · P) / (γ · S · 230)",
      detail: `Con γ = ${gamma} m/(Ω·mm²) (${input.material} ${input.insulationType === "XLPE_90" ? "XLPE 90 °C" : "PVC 70 °C"}) y L = ${input.lengthMeters} m → ΔU = ${calc.voltageDropVolts} V (${calc.voltageDropPct}%), límite máximo REBT = ${calc.maxAllowedDropPct}%.`,
    },
    {
      title: "4. Tierra (Sp) y diámetro de tubo (ITC-BT-18 / ITC-BT-21)",
      formula: "Sp según Tabla 2 ITC-BT-19 · Ø tubo según ITC-BT-21",
      detail: `Conductor de protección PE = ${calc.peSectionMm2} mm² Cu. Tubo protector recomendado = Ø ${calc.tubeDiameterMm} mm. Cortocircuito estimado al final de línea Icc ≈ ${calc.shortCircuitCurrentAmps} A.`,
    },
  ];

  const verdictText = calc.isCompliant
    ? `CUMPLE REBT: pon cable ${calc.conductorsSummary} + PE ${calc.peSectionMm2} mm² (${calc.insulationSummary}), automático de ${calc.piaAmps} A y tubo Ø ${calc.tubeDiameterMm} mm.`
    : `ATENCIÓN — NO CUMPLE: revisa el calibre del automático (${calc.piaAmps} A vs Iz ${calc.ampacityIzAmps} A) o sube sección para bajar la caída de tensión (${calc.voltageDropPct}% > ${calc.maxAllowedDropPct}%).`;

  return {
    calculated: calc,
    itcReferences: itcs,
    steps,
    verdictText,
  };
}

// ============================================================================
// 2. Conversor Intensidad ↔ Potencia (Monofásica, Trifásica, Continua CC)
// ============================================================================
export function convertPowerAndCurrent(params: {
  mode: "p_to_i" | "i_to_p";
  system: "monofasica" | "trifasica" | "continua";
  voltage: number;
  cosPhi: number;
  value: number; // W si p_to_i, A si i_to_p
}): { result: number; unit: "A" | "W"; formulaUsed: string } {
  const v = Math.max(1, params.voltage);
  const pf = Math.min(1, Math.max(0.1, params.cosPhi));

  if (params.system === "continua") {
    if (params.mode === "p_to_i") {
      return {
        result: Number((params.value / v).toFixed(2)),
        unit: "A",
        formulaUsed: `I = P / U = ${params.value} / ${v} V (Corriente continua CC)`,
      };
    }
    return {
      result: Number((v * params.value).toFixed(1)),
      unit: "W",
      formulaUsed: `P = U · I = ${v} V · ${params.value} A (Corriente continua CC)`,
    };
  }

  const rootFactor = params.system === "trifasica" ? Math.sqrt(3) : 1;
  const labelSys =
    params.system === "trifasica" ? "√3 · U · cos φ" : "U · cos φ";

  if (params.mode === "p_to_i") {
    const amps = params.value / (rootFactor * v * pf);
    return {
      result: Number(amps.toFixed(2)),
      unit: "A",
      formulaUsed: `I = P / (${labelSys}) = ${params.value} W / (${params.system === "trifasica" ? "1,732 · " : ""}${v} V · ${pf})`,
    };
  }

  const watts = rootFactor * v * params.value * pf;
  return {
    result: Number(watts.toFixed(1)),
    unit: "W",
    formulaUsed: `P = ${params.system === "trifasica" ? "√3 · " : ""}U · I · cos φ = ${v} V · ${params.value} A · ${pf}`,
  };
}

// ============================================================================
// 3. Calculadora Independiente de Diámetro de Tubo (ITC-BT-21 Tablas 1, 2 y 5)
// ============================================================================
export function calculateConduitDiameterItc21(params: {
  sectionMm2: number;
  numConductors: 2 | 3 | 4 | 5;
  mounting: "empotrado_obra" | "superficie_fijo" | "enterrado";
}): { diameterMm: number; tableReference: string; note: string } {
  // Diámetros exteriores comerciales ITC-BT-21 (mm): 12, 16, 20, 25, 32, 40, 50, 63, 75, 90, 110, 125, 140, 160
  const baseTable5: Record<number, [number, number, number, number]> = {
    1.5: [12, 16, 16, 16],
    2.5: [16, 16, 20, 20],
    4: [16, 20, 20, 20],
    6: [20, 20, 25, 25],
    10: [25, 25, 32, 32],
    16: [25, 32, 32, 40],
    25: [32, 40, 40, 50],
    35: [40, 40, 50, 50],
    50: [50, 50, 63, 63],
    70: [50, 63, 63, 75],
    95: [63, 63, 75, 75],
    120: [63, 75, 75, 90],
    150: [75, 75, 90, 90],
    185: [75, 90, 90, 110],
    240: [90, 110, 110, 125],
    300: [110, 110, 125, 140],
  };

  const row = baseTable5[params.sectionMm2] || [25, 25, 32, 32];
  const idx = params.numConductors - 2; // 0..3
  let diameter = row[idx];

  const commercialSizes = [12, 16, 20, 25, 32, 40, 50, 63, 75, 90, 110, 125, 140, 160];
  const currentPos = commercialSizes.indexOf(diameter);

  if (params.mounting === "empotrado_obra") {
    // Tabla 2 ITC-BT-21 exige holgura superior respecto a montaje superficial fijo
    diameter = commercialSizes[Math.min(commercialSizes.length - 1, currentPos + 1)];
    if (diameter < 16) diameter = 16;
    return {
      diameterMm: diameter,
      tableReference: "ITC-BT-21 Tabla 2 (Tubos empotrados en obra)",
      note: "Sección interior ≥ 3 veces la ocupada por los conductores para facilitar el tendido en curvas.",
    };
  }

  if (params.mounting === "enterrado") {
    diameter = Math.max(40, commercialSizes[Math.min(commercialSizes.length - 1, currentPos + 2)]);
    return {
      diameterMm: diameter,
      tableReference: "ITC-BT-21 Tabla 9 / ITC-BT-07 (Tubos en canalización enterrada)",
      note: "En zanja enterrada se recomienda mínimo Ø 40–50 mm con grado de resistencia al impacto normal/fuerte (450 N).",
    };
  }

  return {
    diameterMm: diameter,
    tableReference: "ITC-BT-21 Tabla 1 (Tubos fijos en montaje superficial)",
    note: "Válido para tramos rectos fijos en superficie con conductores unipolares H07Z1-K / H07V-K.",
  };
}

// ============================================================================
// 4. Reparto Equilibrado de Fases R · S · T (L1 · L2 · L3)
// ============================================================================
export interface PhaseBalanceItem {
  id: string;
  code: string;
  description: string;
  powerWatts: number;
  isThreePhase?: boolean;
  assignedPhase?: "L1" | "L2" | "L3" | "L1-L2-L3";
}

export interface PhaseBalanceResult {
  items: Required<PhaseBalanceItem>[];
  phaseWatts: { L1: number; L2: number; L3: number };
  phaseAmps: { L1: number; L2: number; L3: number };
  neutralAmps: number;
  imbalancePct: number;
  isWellBalanced: boolean;
}

export function balanceThreePhases(
  rawItems: PhaseBalanceItem[],
  autoAssign = true
): PhaseBalanceResult {
  const totals = { L1: 0, L2: 0, L3: 0 };

  // Ordenar de mayor a menor potencia monofásica (algoritmo LPT greedy)
  const indexed = rawItems.map((it, idx) => ({ ...it, _origIdx: idx }));

  if (autoAssign) {
    const threePhase = indexed.filter((x) => x.isThreePhase);
    const singlePhase = indexed
      .filter((x) => !x.isThreePhase)
      .sort((a, b) => b.powerWatts - a.powerWatts);

    for (const tp of threePhase) {
      const share = tp.powerWatts / 3;
      totals.L1 += share;
      totals.L2 += share;
      totals.L3 += share;
      tp.assignedPhase = "L1-L2-L3";
    }

    for (const sp of singlePhase) {
      const minPhase = (["L1", "L2", "L3"] as const).reduce((best, p) =>
        totals[p] < totals[best] ? p : best
      , "L1" as "L1" | "L2" | "L3");
      totals[minPhase] += sp.powerWatts;
      sp.assignedPhase = minPhase;
    }
  } else {
    for (const item of indexed) {
      if (item.isThreePhase || item.assignedPhase === "L1-L2-L3") {
        const share = item.powerWatts / 3;
        totals.L1 += share;
        totals.L2 += share;
        totals.L3 += share;
        item.assignedPhase = "L1-L2-L3";
      } else {
        const p = item.assignedPhase || "L1";
        totals[p] += item.powerWatts;
        item.assignedPhase = p;
      }
    }
  }

  const ordered = indexed
    .sort((a, b) => a._origIdx - b._origIdx)
    .map((x) => ({
      id: x.id,
      code: x.code,
      description: x.description,
      powerWatts: x.powerWatts,
      isThreePhase: Boolean(x.isThreePhase),
      assignedPhase: x.assignedPhase || "L1",
    }));

  const iL1 = totals.L1 / 230;
  const iL2 = totals.L2 / 230;
  const iL3 = totals.L3 / 230;

  // Corriente por el neutro en sistema trifásico equilibrado a 120° (cos φ ≈ 1):
  // In = sqrt(I1² + I2² + I3² - I1·I2 - I2·I3 - I3·I1)
  const neutralSq = Math.max(
    0,
    iL1 * iL1 + iL2 * iL2 + iL3 * iL3 - iL1 * iL2 - iL2 * iL3 - iL3 * iL1
  );
  const neutralAmps = Number(Math.sqrt(neutralSq).toFixed(2));

  const maxW = Math.max(totals.L1, totals.L2, totals.L3);
  const minW = Math.min(totals.L1, totals.L2, totals.L3);
  const avgW = (totals.L1 + totals.L2 + totals.L3) / 3;
  const imbalancePct =
    avgW > 0 ? Number((((maxW - minW) / avgW) * 100).toFixed(1)) : 0;

  return {
    items: ordered,
    phaseWatts: {
      L1: Math.round(totals.L1),
      L2: Math.round(totals.L2),
      L3: Math.round(totals.L3),
    },
    phaseAmps: {
      L1: Number(iL1.toFixed(2)),
      L2: Number(iL2.toFixed(2)),
      L3: Number(iL3.toFixed(2)),
    },
    neutralAmps,
    imbalancePct,
    isWellBalanced: imbalancePct <= 15,
  };
}

// ============================================================================
// 5. Enlace CGP, CPM y Fusibles (ITC-BT-13 / 14 / 15 y normas i-DE / Endesa)
// ============================================================================
export function evaluateEnlaceCgpCpm(params: {
  supplyScenario: "unifamiliar_1" | "pareado_2" | "local_unico" | "edificio_centralizado";
  acometida: "subterranea" | "aerea";
  totalPowerKw: number;
  diPowerWatts: number;
  diSectionMm2: number;
  diMaterial: ConductorMaterial;
  diPhases: "monofasico" | "trifasico";
  metersConcentrated: boolean;
}) {
  // 1. ¿Qué caja va? (CPM vs CGP)
  let boxRecommendation = "";
  let schemeCode = "";
  if (params.supplyScenario === "unifamiliar_1" || params.supplyScenario === "local_unico") {
    boxRecommendation =
      params.totalPowerKw <= 15
        ? "CPM1-D2 / CPM1-E (Caja de Protección y Medida individual en hornacina de fachada con bases BUC tamaño 00 hasta 80/100 A)"
        : "CPM Trifásica de medida directa hasta 43 kW (bases NH-00 / 100 A) o módulo TMF si supera 43,6 kW";
    schemeCode = "ITC-BT-13 apdo. 2 (CPM sin LGA — integra fusibles + contador)";
  } else if (params.supplyScenario === "pareado_2") {
    boxRecommendation =
      "CPM2-D / CPM doble para dos suministros independientes en fachada/valla (alimentados desde la misma acometida sin LGA)";
    schemeCode = "ITC-BT-13 apdo. 2.1 (CPM para 2 usuarios)";
  } else {
    boxRecommendation =
      params.acometida === "subterranea"
        ? "CGP Esquema 10 o Esquema 11 (entrada y salida inferior subterránea en nicho mural con puerta metálica IK10)"
        : "CGP Esquema 7 o Esquema 9 (entrada superior/inferior para acometida aérea posada en fachada)";
    schemeCode = "ITC-BT-13 apdo. 1 + normas particulares distribuidora (i-DE MT 2.80.12 / e-distribución NRZ103)";
  }

  // 2. CGP y Fusible gG de la LGA (edificio)
  const powerW = params.totalPowerKw * 1000;
  const lgaIb = powerW / (Math.sqrt(3) * 400 * 0.9);
  const gGFuseRatings = [63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630];
  const recommendedFuseAmps =
    gGFuseRatings.find((f) => f >= lgaIb && f >= 63) || 630;
  const cgpBaseAmps =
    recommendedFuseAmps <= 100
      ? 100
      : recommendedFuseAmps <= 160
      ? 160
      : recommendedFuseAmps <= 250
      ? 250
      : recommendedFuseAmps <= 400
      ? 400
      : 630;

  // 3. ¿Hasta qué largo puede ir la Derivación Individual? (ITC-BT-15)
  const maxDropPct = params.metersConcentrated ? 1.0 : 1.5;
  const uNom = params.diPhases === "trifasico" ? 400 : 230;
  const maxDropVolts = (maxDropPct / 100) * uNom;
  const gamma = getConductivity(params.diMaterial, "XLPE_90"); // DI siempre AS+ XLPE 90°C
  const factor = params.diPhases === "trifasico" ? 1 : 2;
  const maxDiLengthMeters =
    params.diPowerWatts > 0
      ? Number(
          (
            (maxDropVolts * gamma * params.diSectionMm2 * uNom) /
            (factor * params.diPowerWatts)
          ).toFixed(1)
        )
      : 0;

  return {
    boxRecommendation,
    schemeCode,
    lgaDesignAmps: Number(lgaIb.toFixed(1)),
    recommendedFuseAmps,
    cgpBaseAmps,
    maxDiDropPct: maxDropPct,
    maxDiLengthMeters,
  };
}

// ============================================================================
// 6. "¿Cuánto gasta mi casa?" y Potencia a Contratar según IGA
// ============================================================================
export function calculateHomeConsumption(params: {
  contractedKw: number;
  monthlyKwh: number;
  powerTermEuroKwDay: number; // ej. 0.095 €/kW·día
  energyPriceEuroKwh: number; // ej. 0.145 €/kWh
  taxPct: number; // 21% IVA península o 7% IGIC Canarias
}) {
  const days = 30;
  const powerCost = params.contractedKw * params.powerTermEuroKwDay * days;
  const energyCost = params.monthlyKwh * params.energyPriceEuroKwh;
  const electricitySpecialTax = (powerCost + energyCost) * 0.0511269632; // IEE 5,1127%
  const meterRental = 0.81; // alquiler contador mensual orientativo
  const subtotal = powerCost + energyCost + electricitySpecialTax + meterRental;
  const vatOrIgic = subtotal * (params.taxPct / 100);
  const totalMonthlyEuro = subtotal + vatOrIgic;

  // Escalones oficiales REBT de IGA monofásico 230 V en España (Tarifa 2.0TD ≤ 15 kW)
  const igaSteps = REBT_SPAIN_IGA_MONO_STEPS.map((s) => ({
    iga: s.igaAmps,
    kw: s.maxPowerKw,
    tariff: s.accessTariff,
  }));
  const minimumIga =
    igaSteps.find((s) => s.kw >= params.contractedKw) || igaSteps[igaSteps.length - 1];
  const accessTariff = params.contractedKw <= 15 ? "2.0TD" : "3.0TD";

  return {
    powerCost: Number(powerCost.toFixed(2)),
    energyCost: Number(energyCost.toFixed(2)),
    electricitySpecialTax: Number(electricitySpecialTax.toFixed(2)),
    meterRental,
    subtotal: Number(subtotal.toFixed(2)),
    vatOrIgic: Number(vatOrIgic.toFixed(2)),
    totalMonthlyEuro: Number(totalMonthlyEuro.toFixed(2)),
    minimumIgaAmps: minimumIga.iga,
    maxPowerForIgaKw: minimumIga.kw,
    accessTariff,
  };
}

// ============================================================================
// 7. Base Normativa "Pregunta al Reglamento" (REBT + ITC-BT-01 a BT-52)
// ============================================================================
export interface RebtQaResponse {
  matched: boolean;
  title: string;
  itcCitation: string;
  answer: string;
  practicalTip: string;
  suggestedAction?: {
    label: string;
    targetSection: string;
  };
}

interface RebtKnowledgeEntry {
  keywords: string[];
  title: string;
  itcCitation: string;
  answer: string;
  practicalTip: string;
  suggestedAction?: { label: string; targetSection: string };
}

const REBT_KNOWLEDGE_BASE: RebtKnowledgeEntry[] = [
  {
    keywords: ["horno", "vitro", "cocina", "inducción", "induccion", "3,5", "3.5", "c3"],
    title: "Circuito de cocina y horno en vivienda (C3)",
    itcCitation: "ITC-BT-25, apartado 2.2 y Tabla 1 (Circuito C3)",
    answer:
      "En vivienda el circuito C3 (cocina y horno) lleva conductor mínimo de 6 mm² Cu con automático PIA de 25 A, tubo mínimo de Ø 25 mm empotrado y máximo 2 tomas o cajas de conexión de 25 A. Aunque un horno suelto sea de 3,5 kW (≈ 15,2 A, que por sección aislada aguantaría con 2,5 mm² y PIA 16 A si va en circuito dedicado C4/independiente), si cuelga del circuito C3 de cocina/vitro debes respetar los 6 mm² y PIA 25 A.",
    practicalTip:
      "Si el horno va separado de la placa en mueble columna con enchufe schuko de 16 A propio, protégelo aguas arriba con un PIA de 16 A (nunca dejes una base de 16 A colgada directamente de un PIA de 25 A sin reducir protección).",
    suggestedAction: { label: "Abrir Cuadro de Circuitos", targetSection: "circuitos" },
  },
  {
    keywords: ["tierra", "pica", "electrodo", "resistencia", "diferencial", "ra", "contacto"],
    title: "Ejecución y resistencia máxima de la toma de tierra",
    itcCitation: "ITC-BT-18 (apdos. 3, 4 y 9) e ITC-BT-24 (apdo. 4.1 — Esquema TT)",
    answer:
      "En esquema TT debe cumplirse siempre RA · IΔn ≤ UL, donde UL = 50 V en locales secos y 24 V en locales húmedos/exteriores. Con diferencial de 30 mA (0,03 A) el límite teórico es 1.666 Ω en seco (800 Ω en húmedo), pero por buena práctica y Guías Técnicas se busca Rt < 37 Ω (o < 15 Ω en edificios con pararrayos/ascensor). El conductor enterrado desnudo mínimo es de 35 mm² Cu y la línea de enlace con tierra mínima de 16 mm² Cu.",
    practicalTip:
      "Deja siempre arqueta registrable con puente de comprobación seccionable para poder medir con el telurómetro sin soltar cables a ciegas.",
    suggestedAction: { label: "Calcular Toma de Tierra", targetSection: "tierras_legalizacion" },
  },
  {
    keywords: ["proyecto", "memoria", "mtd", "local", "nave", "garaje", "publica", "pública", "concurrencia", "bar", "restaurante", "tienda"],
    title: "¿Cuándo hace falta Proyecto Técnico y cuándo basta con MTD?",
    itcCitation: "ITC-BT-04 (apdo. 3.1 — Grupos a–z) e ITC-BT-28",
    answer:
      "Necesitan Proyecto de Ingeniería siempre (sin mínimo de potencia): locales de Pública Concurrencia (bares, restaurantes, clínicas, tiendas > 50 personas de ocupación según ITC-BT-28), garajes con ventilación forzada, quirófanos y riesgo de incendio/explosión. Necesitan Proyecto por potencia/tamaño: industrias > 20 kW, locales húmedos/mojados > 10 kW, garajes ventilación natural > 5 plazas, piscinas > 5 kW, alumbrado exterior > 5 kW y recarga VE > 50 kW (o exterior > 10 kW / Modo 4). En el resto de casos vale Memoria Técnica de Diseño (MTD) firmada por instalador autorizado.",
    practicalTip:
      "Ojo en locales comerciales: calcula antes la ocupación teórica (1 persona por cada 0,8 m² de zona de público descontando pasillos/mostradores); si pasa de 50 personas es Pública Concurrencia sí o sí.",
    suggestedAction: { label: "Comprobar Proyecto / MTD y OCA", targetSection: "tramites_oca" },
  },
  {
    keywords: ["baño", "bano", "ducha", "volumen", "bañera", "aseo", "humedo"],
    title: "Volúmenes de protección en cuartos de baño y aseo",
    itcCitation: "ITC-BT-27, apartados 2.1 a 2.4 y Tabla 1",
    answer:
      "Volumen 0 (interior de bañera o plato de ducha): IPX7, solo MBTS ≤ 12 V CA / 30 V CC con fuente fuera de volúmenes 0, 1 y 2. Volumen 1 (vertical sobre bañera/ducha hasta 2,25 m de altura): IPX4, sin mecanismos salvo interruptores MBTS ≤ 12 V; admite termos eléctricos fijos Clase I/II protegidos con diferencial ≤ 30 mA. Volumen 2 (0,60 m alrededor del Vol. 1 hasta 2,25 m): IPX4, sin bases de enchufe salvo toma para afeitadora con transformador de separación (UNE-EN 61558-2-5). Fuera de Volumen 2 (a más de 0,60 m del borde de ducha/bañera): ya se permiten enchufes de 16 A (circuito C5) con diferencial ≤ 30 mA + red equipotencial suplementaria (4 mm² Cu si va protegida).",
    practicalTip:
      "Mide siempre el metro desde el borde exterior del plato de ducha al marco del enchufe: mínimo 60 cm libres.",
    suggestedAction: { label: "Ver Guías de Obra", targetSection: "aprender" },
  },
  {
    keywords: ["coche", "vehiculo", "vehículo", "cargador", "wallbox", "recarga", "spl", "itc-bt-52", "bt-52", "bt52"],
    title: "Punto de recarga de Vehículo Eléctrico (Wallbox)",
    itcCitation: "ITC-BT-52 (apdos. 3, 4, 5 y 6) e ITC-BT-10",
    answer:
      "En garaje comunitario puedes tirar línea desde el propio contador de la vivienda (Esquema 2, conectando antes del IGA de la vivienda o desde módulo en centralización). Exige circuito exclusivo (mínimo 2,5 mm² Cu H07Z1-K / RV-K), diferencial exclusivo Clase A de 30 mA (o Clase B / Clase A + detector de fugas CC > 6 mA si el cargador no lo lleva integrado), PIA propio y protección contra sobretensiones transitorias y permanentes lo más cerca posible del punto o en el cuadro de origen. Con SPL (control dinámico de potencia) el factor de simultaneidad baja a 0,3.",
    practicalTip:
      "Si el tubo cruza el garaje comunitario en superficie, pon tubo rígido libre de halógenos con grado de impacto mínimo IK08 (ITC-BT-29 / ITC-BT-52).",
    suggestedAction: { label: "Ir a Calculadora VE / Obra", targetSection: "calculadoras_obra" },
  },
  {
    keywords: ["diferencial", "cuantos", "cuántos", "circuitos por diferencial", "selectivo", "30ma", "30 ma"],
    title: "Número máximo de circuitos por diferencial en vivienda",
    itcCitation: "ITC-BT-25, apartado 2.3.1",
    answer:
      "En viviendas debe instalarse como mínimo 1 interruptor diferencial de 30 mA por cada 5 circuitos instalados (por ejemplo: 5 circuitos → 1 diferencial; de 6 a 10 circuitos → mínimo 2 diferenciales; de 11 a 15 → 3 diferenciales). Además, su calibre nominal In debe ser mayor o igual al del IGA aguas arriba, o bien estar protegido por la suma de los PIAs aguas abajo.",
    practicalTip:
      "Reparte el alumbrado (C1) y los enchufes (C2) en diferenciales distintos cuando haya 2 o más diferenciales para que un disparo no deje toda la casa a oscuras y sin frigorífico a la vez.",
    suggestedAction: { label: "Montar Esquema Unifilar", targetSection: "unifilar_cuadro" },
  },
  {
    keywords: ["caida", "caída", "tension", "tensión", "derivacion", "derivación", "lga", "porcentaje", "limite", "límite"],
    title: "Límites de caída de tensión admisibles en el REBT",
    itcCitation: "ITC-BT-14 (§3), ITC-BT-15 (§3) e ITC-BT-19 (§2.2.2)",
    answer:
      "Límites reglamentarios: • Edificio con contadores totalmente centralizados: LGA máx. 0,5% y Derivación Individual (DI) máx. 1,0%. • Contadores parcialmente centralizados: LGA máx. 1,0% y DI máx. 0,5%. • Suministro para un único usuario sin LGA (ej. chalet con CPM): DI máx. 1,5%. • Circuitos interiores: 3% en vivienda y en cualquier circuito de alumbrado; 5% en los demás usos (fuerza, motores, recarga VE). En industrias con transformador propio: 4,5% en alumbrado y 6,5% en fuerza desde el origen.",
    practicalTip:
      "El REBT permite compensar caída entre DI e interior en viviendas siempre que la suma total (LGA + DI + interior) no supere el 4,5%.",
    suggestedAction: { label: "Calcular Caída de Tensión", targetSection: "calculadoras_obra" },
  },
  {
    keywords: ["oca", "inspeccion", "inspección", "periodica", "periódica", "5 años", "10 años"],
    title: "Inspecciones iniciales y periódicas por OCA",
    itcCitation: "ITC-BT-05, apartados 4.1 y 4.2",
    answer:
      "Pasan OCA inicial y periódica cada 5 años: industrias > 100 kW, locales de pública concurrencia, locales con riesgo de incendio o explosión (clase I salvo garajes < 25 plazas), locales mojados > 25 kW, piscinas > 10 kW, quirófanos, alumbrado exterior > 5 kW y recarga VE que requirió proyecto (> 50 kW o exterior > 10 kW / Modo 4). Pasan OCA periódica cada 10 años: zonas comunes de edificios de viviendas con potencia total instalada > 100 kW.",
    practicalTip:
      "Un solo defecto Muy Grave significa resultado NEGATIVO inmediato; un defecto Grave da 6 meses de plazo para corregir (Condicionado).",
    suggestedAction: { label: "Abrir Revisión OCA", targetSection: "tramites_oca" },
  },
  {
    keywords: ["solar", "fotovoltaica", "autoconsumo", "inversor", "placas", "bt-40", "itc-bt-40"],
    title: "Autoconsumo fotovoltaico conectado en baja tensión",
    itcCitation: "ITC-BT-40 y RD 244/2019",
    answer:
      "La línea de CA desde el inversor hasta el cuadro de conexión se dimensiona para una caída de tensión máxima del 1,5% a la potencia nominal del inversor (ITC-BT-40 §5) y protección magnetotérmica + diferencial propio (Clase A o Clase B según requiera el fabricante del inversor sin transformador). Hasta 100 kW en BT suele bastar CIE + MTD salvo que el inmueble base exija proyecto por su clasificación ITC-BT-04.",
    practicalTip:
      "Conecta el circuito FV aguas arriba de los diferenciales de consumo de la vivienda (con su propio PIA + diferencial) para no falsear la protección de sobrecorriente de las barras de consumo.",
  },
  {
    keywords: ["sobretensiones", "dps", "permanentes", "transitorias", "combi", "bt-23", "itc-bt-23"],
    title: "Protección contra sobretensiones transitorias y permanentes",
    itcCitation: "ITC-BT-23 (apdo. 3) + Normas Particulares de Distribuidoras",
    answer:
      "Según ITC-BT-23 es obligatoria la protección contra sobretensiones transitorias (Tipo 2, Up ≤ 1,5 kV para equipos sensibles Cat. II) cuando exista línea aérea o riesgo de rayo/equipos electrónicos críticos. Además, las normas particulares de Endesa (e-distribución), i-DE y UFD en casi todas las CCAA exigen instalar combi de sobretensiones permanentes + transitorias junto al IGA en todo suministro nuevo o reforma con nuevo boletín.",
    practicalTip:
      "Cablea el borne de tierra del descargador DPS lo más corto y recto posible (< 50 cm) a la barra colectora de tierra del cuadro.",
    suggestedAction: { label: "Montar Cuadro / Unifilar", targetSection: "unifilar_cuadro" },
  },
];

export function answerRebtQuestion(rawQuestion: string): RebtQaResponse {
  const normalized = rawQuestion
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Caso especial: cálculo directo si preguntan por potencia en kW o W
  const kwMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*kw/);
  const wMatch = normalized.match(/(\d{3,5})\s*w\b/);

  let bestEntry: RebtKnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of REBT_KNOWLEDGE_BASE) {
    let score = 0;
    for (const kw of entry.keywords) {
      const cleanKw = kw
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      if (normalized.includes(cleanKw)) {
        score += cleanKw.length > 4 ? 2 : 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  if (kwMatch || wMatch) {
    const watts = kwMatch
      ? parseFloat(kwMatch[1].replace(",", ".")) * 1000
      : parseInt(wMatch![1], 10);
    const isThree = normalized.includes("trifasic");
    const calc = calculateRebtCircuit({
      code: "CONSULTA",
      description: "Línea consultada",
      usageType: normalized.includes("alumbrado") ? "alumbrado" : "fuerza_otros",
      phaseSystem: isThree ? "trifasico" : "monofasico",
      phaseAssigned: isThree ? "L1-L2-L3" : "L1",
      voltage: isThree ? 400 : 230,
      powerWatts: watts,
      cosPhi: 1,
      simultaneityFactor: 1,
      utilizationFactor: 1,
      lengthMeters: 18,
      installationMethod: "B1",
      insulationType: "PVC_70",
      material: "Cu",
    });

    const baseExtra = bestEntry ? `\n\nAdemás (${bestEntry.itcCitation}): ${bestEntry.answer}` : "";
    return {
      matched: true,
      title: `Cálculo orientativo para ${(watts / 1000).toFixed(2)} kW (${isThree ? "Trifásico 400 V" : "Monofásico 230 V"})`,
      itcCitation: bestEntry
        ? `${bestEntry.itcCitation} · ITC-BT-19 Tabla 1 · ITC-BT-22`
        : "ITC-BT-19 (Tabla 1) · ITC-BT-21 · ITC-BT-22 (§1.1)",
      answer: `Para ${watts.toLocaleString()} W (Ib = ${calc.currentIbAmps} A, suponiendo 18 m bajo tubo empotrado B1 en Cu PVC): necesitas como mínimo sección de ${calc.sectionMm2} mm² Cu (Iz = ${calc.ampacityIzAmps} A), automático PIA de ${calc.piaAmps} A y tubo Ø ${calc.tubeDiameterMm} mm (ΔU = ${calc.voltageDropPct}%).${baseExtra}`,
      practicalTip:
        bestEntry?.practicalTip ||
        "Si la tirada supera los 25–30 metros o va agrupada con más líneas por el mismo tubo/bandeja, comprueba la caída de tensión en la Calculadora de Cable.",
      suggestedAction: {
        label: "Ajustar metros en Calculadora de Cable",
        targetSection: "calculadoras_obra",
      },
    };
  }

  if (bestEntry && bestScore > 0) {
    return {
      matched: true,
      title: bestEntry.title,
      itcCitation: bestEntry.itcCitation,
      answer: bestEntry.answer,
      practicalTip: bestEntry.practicalTip,
      suggestedAction: bestEntry.suggestedAction,
    };
  }

  return {
    matched: false,
    title: "Consulta fuera de los supuestos verificados",
    itcCitation: "REBT RD 842/2002 (ITC-BT-01 a ITC-BT-52)",
    answer:
      "No lo sé con certeza a partir de las reglas verificadas cargadas para esa pregunta concreta, y prefiero no inventar un criterio normativo. Prueba a indicar el uso (vivienda, local, garaje, baño, tierra, VE, proyecto/OCA) o los kW y metros de la línea, o consulta el texto consolidado de la ITC-BT aplicable.",
    practicalTip:
      "Puedes decirme por ejemplo: «¿Qué sección para un horno de 3,5 kW?», «¿Cómo hago una toma de tierra?» o «¿Este local de 120 m² necesita proyecto?».",
    suggestedAction: {
      label: "Abrir Calculadoras REBT",
      targetSection: "calculadoras_obra",
    },
  };
}

// ============================================================================
// 8. Parsers "Cuéntamelo" (Texto / Voz → Unifilar, Presupuesto y Tareas)
// ============================================================================
export interface ParsedPanelDraft {
  igaAmps: number;
  hasSurgeProtection: boolean;
  rcdCount: number;
  supplyType: "monofasico_230v" | "trifasico_400v";
  electrificationGrade: "basica" | "elevada";
  diferencialCalibreAmps: number;
  diferencialClase: "AC" | "A";
  formatLabel: string;
  circuits: RebtCircuitInput[];
  summaryNotes: string[];
}

export function parseUnifilarFromSpeechOrText(text: string): ParsedPanelDraft {
  const lower = text.toLowerCase();
  const isThreePhase =
    lower.includes("trifasic") ||
    lower.includes("trifásic") ||
    lower.includes("400v") ||
    lower.includes("400 v") ||
    lower.includes("4 polos") ||
    lower.includes("4p") ||
    lower.includes("3f+n");
  const supplyType = isThreePhase ? "trifasico_400v" : "monofasico_230v";

  const igaMatch = lower.match(/(?:iga|icp|general)\s*(?:de\s*)?(\d{2,3})\s*a?/);
  const explicitlyNoSurge =
    lower.includes("sin sobretension") || lower.includes("no lleva sobretension");
  const hasSurgeProtection =
    !explicitlyNoSurge &&
    (lower.includes("sobretension") ||
      lower.includes("dps") ||
      lower.includes("combi"));

  const rcdMatch = lower.match(/(\d)\s*diferencial/);
  const rcdCount = rcdMatch ? Math.max(1, Number(rcdMatch[1])) : 1;

  const circuits: RebtCircuitInput[] = [];
  const phasesCycle: ("L1" | "L2" | "L3")[] = ["L1", "L2", "L3"];
  const pushCircuit = (
    code: string,
    description: string,
    pia: number,
    sec: number,
    watts: number,
    usage: RebtCircuitInput["usageType"] = "vivienda_interior"
  ) => {
    const upperCode = code.toUpperCase();
    const isCircuitThreePhase = isThreePhase && watts >= 7000;
    const assignedPhase = isCircuitThreePhase
      ? "L1-L2-L3"
      : isThreePhase
      ? phasesCycle[circuits.length % 3]
      : "L1";

    // En ITC-BT-25 Tabla 1 los valores de watts (2300, 3450, 5400...) ya incluyen Fs × Fu
    // para el dimensionado individual de cada circuito; el IGA se calcula por escalón REBT.
    circuits.push({
      code: upperCode,
      description,
      usageType: usage,
      phaseSystem: isCircuitThreePhase ? "trifasico" : "monofasico",
      phaseAssigned: assignedPhase,
      voltage: isCircuitThreePhase ? 400 : 230,
      powerWatts: watts,
      cosPhi: 1,
      simultaneityFactor: 1.0,
      utilizationFactor: 1.0,
      lengthMeters: 15,
      installationMethod: "B1",
      insulationType: usage === "recarga_ve" ? "XLPE_90" : "PVC_70",
      material: "Cu",
      minSectionMm2: sec,
      fixedPiaAmps: pia,
    });
  };

  if (lower.includes("alumbrado") || lower.includes("luces") || lower.includes("c1")) {
    pushCircuit("C1", "Iluminación", 10, 1.5, 2300);
  }
  if (lower.includes("enchufe") || lower.includes("tomas") || lower.includes("c2")) {
    pushCircuit("C2", "Tomas de uso general y frigorífico", 16, 2.5, 3450);
  }
  if (lower.includes("cocina") || lower.includes("horno") || lower.includes("vitro") || lower.includes("c3")) {
    pushCircuit("C3", "Cocina y horno", 25, 6, 5400);
  }
  if (lower.includes("lavadora") || lower.includes("termo") || lower.includes("lavavajillas") || lower.includes("c4")) {
    pushCircuit("C4", "Lavadora, lavavajillas y termo", 20, 4, 3450);
  }
  if (lower.includes("baño") || lower.includes("bano") || lower.includes("auxiliar") || lower.includes("c5")) {
    pushCircuit("C5", "Tomas de baño y auxiliares de cocina", 16, 2.5, 3450);
  }
  if (lower.includes("aire") || lower.includes("clima") || lower.includes("aerotermia") || lower.includes("c9")) {
    pushCircuit("C9", "Climatización / Aire acondicionado", 25, 6, 5750);
  }
  if (lower.includes("secadora") || lower.includes("c10")) {
    pushCircuit("C10", "Secadora independiente", 16, 2.5, 3450);
  }
  if (lower.includes("coche") || lower.includes("wallbox") || lower.includes("recarga") || lower.includes("ve") || lower.includes("c13")) {
    const is32 = lower.includes("32a") || lower.includes("32 a") || lower.includes("7,4") || lower.includes("7.4");
    pushCircuit(
      "C13",
      is32 ? "Recarga Vehículo Eléctrico 7,4 kW (32 A)" : "Recarga Vehículo Eléctrico 3,68 kW (16 A)",
      is32 ? 32 : 16,
      is32 ? 6 : 2.5,
      is32 ? 7360 : 3680,
      "recarga_ve"
    );
  }

  // Detectar también PIAs explícitos adicionales p.ej. "PIA 16A", "automático 20A" o "C6 16A"
  const explicitPiaMatches = Array.from(
    lower.matchAll(/(?:pia|autom[aá]tico|magnetot[eé]rmico|c([678]|11|12|14|15))\s*(?:de\s*)?(\d{2})\s*a/g)
  );
  explicitPiaMatches.forEach((m, idx) => {
    const amps = Number(m[2]) || 16;
    const codeNum = m[1] ? `C${m[1]}` : `C${circuits.length + 1 + idx}`;
    if (!circuits.some((c) => c.code.toLowerCase() === codeNum.toLowerCase())) {
      const sec = amps <= 10 ? 1.5 : amps <= 16 ? 2.5 : amps <= 20 ? 4 : amps <= 25 ? 6 : 10;
      const watts = amps <= 10 ? 2300 : amps <= 16 ? 3450 : amps <= 20 ? 3680 : 5400;
      pushCircuit(codeNum.toUpperCase(), `Circuito fuerza / auxiliar (${amps} A)`, amps, sec, watts);
    }
  });

  // O si indica un número total de PIAs / circuitos p.ej. "7 automáticos" o "6 pias"
  const countPiasMatch = lower.match(/(\d{1,2})\s*(?:pias|autom[aá]ticos|circuitos)/);
  if (countPiasMatch) {
    const targetCount = Math.min(12, Math.max(1, Number(countPiasMatch[1])));
    const defaultsPool: [string, string, number, number, number][] = [
      ["C1", "Iluminación", 10, 1.5, 2300],
      ["C2", "Tomas de uso general", 16, 2.5, 3450],
      ["C3", "Cocina y horno", 25, 6, 5400],
      ["C4", "Lavadora y termo", 20, 4, 3450],
      ["C5", "Tomas baño y cocina", 16, 2.5, 3450],
      ["C6", "Alumbrado adicional / exterior", 10, 1.5, 2300],
      ["C7", "Tomas adicionales dormitorios/salón", 16, 2.5, 3450],
      ["C8", "Calefacción eléctrica", 25, 6, 5750],
      ["C9", "Aire acondicionado", 25, 6, 5750],
      ["C10", "Secadora", 16, 2.5, 3450],
      ["C11", "Domótica / Automatización", 10, 1.5, 2300],
      ["C12", "Circuito auxiliar", 16, 2.5, 3450],
    ];
    let poolIdx = 0;
    while (circuits.length < targetCount && poolIdx < defaultsPool.length) {
      const [code, desc, pia, sec, watts] = defaultsPool[poolIdx++];
      if (!circuits.some((c) => c.code === code)) {
        pushCircuit(code, desc, pia, sec, watts);
      }
    }
  }

  // Si no detectó ninguno concreto, proponemos los 5 básicos para que el instalador edite
  if (circuits.length === 0) {
    pushCircuit("C1", "Iluminación", 10, 1.5, 2300);
    pushCircuit("C2", "Tomas de uso general", 16, 2.5, 3450);
    pushCircuit("C3", "Cocina y horno", 25, 6, 5400);
    pushCircuit("C4", "Lavadora, lavavajillas y termo", 20, 4, 3450);
    pushCircuit("C5", "Baño y auxiliares de cocina", 16, 2.5, 3450);
  }

  const calcCircuits = circuits.map((c) => calculateRebtCircuit(c));
  const preliminaryGrade: "basica" | "elevada" =
    lower.includes("elevada") || circuits.length > 5 ? "elevada" : "basica";
  const explicitSanitizedIga = igaMatch
    ? sanitizeSpanishIgaAmps(Number(igaMatch[1]), supplyType)
    : null;
  const rebtResolution = resolveSpanishRebtIgaAndTariff({
    supplyType,
    electrificationGrade: preliminaryGrade,
    circuits: calcCircuits,
    overrideIgaAmps: explicitSanitizedIga,
  });
  const igaAmps = rebtResolution.igaAmps;
  const electrificationGrade = rebtResolution.effectiveElectrificationGrade;

  const resolvedRcdCount = Math.max(rcdCount, Math.ceil(circuits.length / 5));
  const hasElectronicLoads = circuits.some(
    (c) => c.usageType === "recarga_ve" || c.code === "C9" || c.code === "C11"
  );
  const diferencialClase: "AC" | "A" =
    hasElectronicLoads || lower.includes("clase a") ? "A" : "AC";
  const diferencialCalibreAmps = igaAmps > 40 ? 63 : 40;
  const formatLabel = `${
    isThreePhase ? "Trifásico 400/230 V (3F+N+PE)" : "Monofásico 230 V (1F+N+PE)"
  } · Electrificación ${electrificationGrade === "elevada" ? "Elevada" : "Básica"} · ${
    rebtResolution.tariffBadgeLabel
  }`;

  return {
    igaAmps,
    hasSurgeProtection,
    rcdCount: resolvedRcdCount,
    supplyType,
    electrificationGrade,
    diferencialCalibreAmps,
    diferencialClase,
    formatLabel,
    circuits,
    summaryNotes: [
      `Formato detectado: ${formatLabel} · IGA ${igaAmps} A (${rebtResolution.maxAdmissibleKw.toFixed(
        2
      )} kW)`,
      `Diferenciales: ${resolvedRcdCount} × ${diferencialCalibreAmps} A / 30 mA (Clase ${diferencialClase}) · DPS: ${
        hasSurgeProtection ? "Sí (Combi T2+POP)" : "No instalado"
      }`,
      `${circuits.length} circuitos generados automáticamente en Simulador DIN, Unifilar IEC 60617 y Ficha Técnica M.T.D.`,
    ],
  };
}

export function parseDwellingQuoteFromText(text: string) {
  const lower = text.toLowerCase();
  const extractNum = (regex: RegExp, fallback: number) => {
    const m = lower.match(regex);
    return m ? Number(m[1]) : fallback;
  };

  return {
    areaM2: extractNum(/(\d{2,4})\s*m2|(\d{2,4})\s*metros/, 85),
    dwellingType: lower.includes("chalet") || lower.includes("unifamiliar") ? ("chalet" as const) : ("piso" as const),
    scope: lower.includes("parcial")
      ? ("parcial" as const)
      : lower.includes("peque") || lower.includes("averia")
      ? ("pequeno" as const)
      : ("completa" as const),
    enchufes: extractNum(/(\d{1,3})\s*enchufe/, 22),
    puntosLuz: extractNum(/(\d{1,3})\s*(?:puntos?\s*de\s*luz|luces|focos)/, 14),
    interruptores: extractNum(/(\d{1,3})\s*interruptor/, 9),
    conmutadores: extractNum(/(\d{1,3})\s*conmutador/, 6),
    cruzamientos: extractNum(/(\d{1,3})\s*cruzamiento/, 2),
    tomasTv: extractNum(/(\d{1,2})\s*(?:tv|tele)/, 3),
    tomasRj45: extractNum(/(\d{1,2})\s*(?:rj45|red|datos|internet)/, 3),
    circuitosEspeciales:
      (lower.includes("horno") || lower.includes("vitro") ? 1 : 0) +
      (lower.includes("aire") || lower.includes("clima") ? 1 : 0) +
      (lower.includes("coche") || lower.includes("wallbox") ? 1 : 0) || 2,
  };
}

export function parseTaskFromWhatsApp(rawMessage: string) {
  const phoneMatch = rawMessage.match(/(?:\+34\s?)?([6789]\d{2}[\s.-]?\d{3}[\s.-]?\d{3})/);
  const streetMatch = rawMessage.match(/(?:calle|c\/|avda\.?|avenida|plaza|paseo)\s+([^\n,.]+(?:,\s*\d+)?)/i);
  const urgent = /urgente|sin luz|salta el diferencial|quemado|chispazo|hoy/i.test(rawMessage);

  const cleanLines = rawMessage
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    title: urgent
      ? `URGENTE: ${cleanLines[0]?.slice(0, 55) || "Aviso de avería eléctrica"}`
      : cleanLines[0]?.slice(0, 60) || "Revisión / trabajo eléctrico",
    phone: phoneMatch ? phoneMatch[1].replace(/\s+/g, " ") : "",
    address: streetMatch ? streetMatch[0].trim() : "",
    priority: urgent ? ("alta" as const) : ("normal" as const),
    notes: rawMessage.trim(),
  };
}

// ============================================================================
// 9. Validación Oficial de NIF / NIE / CIF Español (Facturas y Tickets)
// ============================================================================
export function validateSpanishTaxId(raw: string): {
  valid: boolean;
  type: "NIF" | "NIE" | "CIF" | "DESCONOCIDO";
  normalized: string;
  reason?: string;
} {
  const clean = raw.toUpperCase().replace(/[\s.-]/g, "");
  if (clean.length !== 9) {
    return {
      valid: false,
      type: "DESCONOCIDO",
      normalized: clean,
      reason: "Debe tener exactamente 9 caracteres alfanuméricos.",
    };
  }

  const dniLetters = "TRWAGMYFPDXBNJZSQVHLCKE";

  // DNI: 8 dígitos + letra
  if (/^\d{8}[A-Z]$/.test(clean)) {
    const num = parseInt(clean.slice(0, 8), 10);
    const expected = dniLetters[num % 23];
    return {
      valid: clean[8] === expected,
      type: "NIF",
      normalized: clean,
      reason: clean[8] === expected ? undefined : `Letra de control incorrecta (corresponde '${expected}').`,
    };
  }

  // NIE: X/Y/Z + 7 dígitos + letra
  if (/^[XYZ]\d{7}[A-Z]$/.test(clean)) {
    const prefix = clean[0] === "X" ? "0" : clean[0] === "Y" ? "1" : "2";
    const num = parseInt(prefix + clean.slice(1, 8), 10);
    const expected = dniLetters[num % 23];
    return {
      valid: clean[8] === expected,
      type: "NIE",
      normalized: clean,
      reason: clean[8] === expected ? undefined : `Letra de control NIE incorrecta (corresponde '${expected}').`,
    };
  }

  // CIF: Letra sociedad + 7 dígitos + control
  if (/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(clean)) {
    const digits = clean.slice(1, 8).split("").map(Number);
    const evenSum = digits[1] + digits[3] + digits[5];
    const oddSum = [digits[0], digits[2], digits[4], digits[6]].reduce((acc, d) => {
      const dbl = d * 2;
      return acc + Math.floor(dbl / 10) + (dbl % 10);
    }, 0);
    const total = evenSum + oddSum;
    const unitDigit = (10 - (total % 10)) % 10;
    const controlLetter = "JABCDEFGHI"[unitDigit];
    const last = clean[8];
    const ok = last === String(unitDigit) || last === controlLetter;
    return {
      valid: ok,
      type: "CIF",
      normalized: clean,
      reason: ok ? undefined : `Dígito/letra de control CIF inválido (esperado ${unitDigit} o ${controlLetter}).`,
    };
  }

  return {
    valid: false,
    type: "DESCONOCIDO",
    normalized: clean,
    reason: "Formato no reconocido como NIF, NIE o CIF español.",
  };
}

// ============================================================================
// 10. Huella Encadenada VeriFactu (RD 1007/2023) — SHA-256 Determinista
// ============================================================================
export async function computeVerifactuChainHash(params: {
  issuerCif: string;
  invoiceSeriesNumber: string;
  issueDateIso: string; // YYYY-MM-DD
  taxAmount: number;
  totalAmount: number;
  previousHash: string;
  generatedAtIso: string;
}): Promise<{ canonicalPayload: string; hashHex: string; qrVerificationUrl: string }> {
  const canonicalPayload = [
    `IDEmisorFactura=${params.issuerCif.trim().toUpperCase()}`,
    `NumSerieFactura=${params.invoiceSeriesNumber.trim()}`,
    `FechaExpedicionFactura=${params.issueDateIso}`,
    `TipoFactura=F1`,
    `CuotaTotal=${params.taxAmount.toFixed(2)}`,
    `ImporteTotal=${params.totalAmount.toFixed(2)}`,
    `Huella=${params.previousHash}`,
    `FechaHoraHusoGenRegistro=${params.generatedAtIso}`,
  ].join("&");

  let hashHex = "";
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle) {
    const encoded = new TextEncoder().encode(canonicalPayload);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", encoded);
    hashHex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  } else {
    // Fallback determinista para entornos sin SubtleCrypto
    let h = 2166136261;
    for (let i = 0; i < canonicalPayload.length; i++) {
      h ^= canonicalPayload.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    hashHex = (h >>> 0).toString(16).toUpperCase().padStart(64, "0");
  }

  const qrVerificationUrl = `https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR?nif=${encodeURIComponent(
    params.issuerCif
  )}&numserie=${encodeURIComponent(params.invoiceSeriesNumber)}&fecha=${encodeURIComponent(
    params.issueDateIso
  )}&importe=${params.totalAmount.toFixed(2)}&huella=${hashHex.slice(0, 16)}`;

  return { canonicalPayload, hashHex, qrVerificationUrl };
}

// ============================================================================
// 11. Catálogo Estructurado de las 19 CCAA y 28 Tipos de Instalación (Fase 6)
// ============================================================================
export interface CcaaProcedureInfo {
  code: string;
  name: string;
  industryPortalName: string;
  officialUrl: string;
  mainDistributors: string[];
  taxRegime: "IVA_21" | "IGIC_7" | "IPSI_10";
  lastReviewedIso: string; // YYYY-MM-DD
  confirmedStatus: "confirmado" | "revisar_cambios";
  specificNotes: string;
}

export const CCAA_TRAMITES_CATALOG: CcaaProcedureInfo[] = [
  {
    code: "CN",
    name: "Canarias",
    industryPortalName: "Sede GobCan — Puesta en Servicio Instalaciones BT (Decreto 141/2009)",
    officialUrl: "https://sede.gobiernodecanarias.org/sede/tramites/2864",
    mainDistributors: ["e-distribución (Endesa)"],
    taxRegime: "IGIC_7",
    lastReviewedIso: "2026-10-15",
    confirmedStatus: "confirmado",
    specificNotes: "Modelo oficial M.T.D. B.T. de 11 páginas + Certificado de Instalación (CIE) telemático con declaración responsable.",
  },
  {
    code: "MD",
    name: "Comunidad de Madrid",
    industryPortalName: "ASEICAM / EICI — Tramitación por Entidades de Inspección y Control Industrial",
    officialUrl: "https://www.comunidad.madrid/servicios/industria",
    mainDistributors: ["i-DE (Iberdrola)", "UFD (Naturgy)"],
    taxRegime: "IVA_21",
    lastReviewedIso: "2026-09-20",
    confirmedStatus: "confirmado",
    specificNotes: "Registro telemático a través de EICI habilitada; entrega inmediata de CIE diligenciado con código QR.",
  },
  {
    code: "CT",
    name: "Cataluña",
    industryPortalName: "Canal Empresa (Generalitat de Catalunya) — RITSIC / OGE",
    officialUrl: "https://canalempresa.gencat.cat",
    mainDistributors: ["e-distribución (Endesa)"],
    taxRegime: "IVA_21",
    lastReviewedIso: "2026-09-10",
    confirmedStatus: "confirmado",
    specificNotes: "Declaración responsable vía Canal Empresa + pago de tasa modelo; incluye memoria simplificada y esquema unifilar.",
  },
  {
    code: "AN",
    name: "Andalucía",
    industryPortalName: "PUESC / Tramitador HAPR — Junta de Andalucía",
    officialUrl: "https://ws050.juntadeandalucia.es/vea/",
    mainDistributors: ["e-distribución (Endesa)"],
    taxRegime: "IVA_21",
    lastReviewedIso: "2026-10-01",
    confirmedStatus: "confirmado",
    specificNotes: "Puesta en funcionamiento inmediata por declaración responsable en plataforma PUESC sin tasas administrativas previas.",
  },
  {
    code: "VC",
    name: "Comunitat Valenciana",
    industryPortalName: "GVA Telemática — Trámite Automatizado Instalaciones BT",
    officialUrl: "https://www.gva.es/es/inicio/procedimientos",
    mainDistributors: ["i-DE (Iberdrola)"],
    taxRegime: "IVA_21",
    lastReviewedIso: "2026-08-25",
    confirmedStatus: "confirmado",
    specificNotes: "Normas particulares i-DE (CPM en nicho de fachada y combi de sobretensiones permanentes + transitorias obligatorio).",
  },
  {
    code: "PV",
    name: "País Vasco / Euskadi",
    industryPortalName: "Euskadi.eus — Industria / Tramitagune",
    officialUrl: "https://www.euskadi.eus/industria",
    mainDistributors: ["i-DE (Iberdrola)"],
    taxRegime: "IVA_21",
    lastReviewedIso: "2026-07-14",
    confirmedStatus: "confirmado",
    specificNotes: "Presentación telemática por empresa instaladora autorizada con certificado digital BakQ / Izenpe.",
  },
  {
    code: "GA",
    name: "Galicia",
    industryPortalName: "Oficina Virtual de Industria (OVI) — Xunta de Galicia (IN614C)",
    officialUrl: "https://sede.xunta.gal",
    mainDistributors: ["UFD (Naturgy)"],
    taxRegime: "IVA_21",
    lastReviewedIso: "2026-08-18",
    confirmedStatus: "confirmado",
    specificNotes: "Aplicación OVI genera el CIE y adjunta MTD/Proyecto + justificante tasa código 31.07.00.",
  },
  {
    code: "CL",
    name: "Castilla y León",
    industryPortalName: "Oficina Virtual de Industria — Junta de Castilla y León",
    officialUrl: "https://www.tramitacastillayleon.jcyl.es",
    mainDistributors: ["i-DE (Iberdrola)", "UFD (Naturgy)"],
    taxRegime: "IVA_21",
    lastReviewedIso: "2026-06-30",
    confirmedStatus: "confirmado",
    specificNotes: "Modelos normalizados de CIE y MTD autonómicos con liquidación modelo 046.",
  },
  {
    code: "CM",
    name: "Castilla-La Mancha",
    industryPortalName: "Plataforma JCCM — Registro Telemático Industrial",
    officialUrl: "https://www.jccm.es/sede/tramite",
    mainDistributors: ["i-DE (Iberdrola)", "UFD (Naturgy)"],
    taxRegime: "IVA_21",
    lastReviewedIso: "2026-04-02",
    confirmedStatus: "revisar_cambios",
    specificNotes: "Verificar versión vigente de formulario web de MTD autonómico antes de presentar.",
  },
  {
    code: "AR",
    name: "Aragón",
    industryPortalName: "PEGASO / DIGITA — Gobierno de Aragón",
    officialUrl: "https://www.aragon.es/tramites",
    mainDistributors: ["e-distribución (Endesa)"],
    taxRegime: "IVA_21",
    lastReviewedIso: "2026-08-05",
    confirmedStatus: "confirmado",
    specificNotes: "Tramitación vía OCAS / plataforma DIGITA para instalaciones nuevas, modificaciones y ampliaciones.",
  },
  {
    code: "MU",
    name: "Región de Murcia",
    industryPortalName: "Sede CARM — Procedimiento 0009 Instalaciones BT",
    officialUrl: "https://sede.carm.es",
    mainDistributors: ["i-DE (Iberdrola)"],
    taxRegime: "IVA_21",
    lastReviewedIso: "2026-07-22",
    confirmedStatus: "confirmado",
    specificNotes: "Declaración responsable telemática con emisión automática de nº de registro industrial.",
  },
  {
    code: "IB",
    name: "Illes Balears",
    industryPortalName: "Portal UDIT / Direcció General d'Indústria CAIB",
    officialUrl: "https://www.caib.es/sites/industria",
    mainDistributors: ["e-distribución (Endesa)"],
    taxRegime: "IVA_21",
    lastReviewedIso: "2026-09-03",
    confirmedStatus: "confirmado",
    specificNotes: "Tramitación telemática UDIT; aporta CIE, MTD/Proyecto y anexo de información al usuario.",
  },
  {
    code: "EX",
    name: "Extremadura",
    industryPortalName: "Sede Junta de Extremadura — ARADO / Industria",
    officialUrl: "https://sede.gobex.es",
    mainDistributors: ["e-distribución (Endesa)", "i-DE (Iberdrola)"],
    taxRegime: "IVA_21",
    lastReviewedIso: "2026-03-15",
    confirmedStatus: "revisar_cambios",
    specificNotes: "Comprobar tasas vigentes modelo 050 antes de registrar el boletín.",
  },
  {
    code: "AS",
    name: "Principado de Asturias",
    industryPortalName: "Sede Electrónica Principado de Asturias — Industria",
    officialUrl: "https://sede.asturias.es",
    mainDistributors: ["E-REDES (EDP)", "Viesgo / Redes"],
    taxRegime: "IVA_21",
    lastReviewedIso: "2026-07-10",
    confirmedStatus: "confirmado",
    specificNotes: "Revisión particular de normas E-REDES para CGP y medida directa.",
  },
  {
    code: "NC",
    name: "Comunidad Foral de Navarra",
    industryPortalName: "Navarra.es — Registro Industrial y Certificados BT",
    officialUrl: "https://www.navarra.es/es/tramites",
    mainDistributors: ["i-DE (Iberdrola)"],
    taxRegime: "IVA_21",
    lastReviewedIso: "2026-08-11",
    confirmedStatus: "confirmado",
    specificNotes: "Registro telemático de certificados de instalación de baja tensión.",
  },
  {
    code: "CB",
    name: "Cantabria",
    industryPortalName: "Sede Electrónica Gobierno de Cantabria — DG Industria",
    officialUrl: "https://sede.cantabria.es",
    mainDistributors: ["Viesgo Distribución (Redes)"],
    taxRegime: "IVA_21",
    lastReviewedIso: "2026-06-19",
    confirmedStatus: "confirmado",
    specificNotes: "Presentación electrónica con anexos unifilar y protocolo de pruebas de aislamiento/diferencial.",
  },
  {
    code: "RI",
    name: "La Rioja",
    industryPortalName: "Oficina Electrónica Gobierno de La Rioja — Industria",
    officialUrl: "https://www.larioja.org/oficina-electronica",
    mainDistributors: ["i-DE (Iberdrola)"],
    taxRegime: "IVA_21",
    lastReviewedIso: "2026-07-01",
    confirmedStatus: "confirmado",
    specificNotes: "Registro electrónico de CIE + MTD/Proyecto y entrega de manual de uso y mantenimiento al titular.",
  },
  {
    code: "CE",
    name: "Ceuta",
    industryPortalName: "Sede Electrónica Ciudad Autónoma de Ceuta — Industria y Energía",
    officialUrl: "https://sede.ceuta.es",
    mainDistributors: ["Empresa de Alumbrado Eléctrico de Ceuta"],
    taxRegime: "IPSI_10",
    lastReviewedIso: "2026-04-10",
    confirmedStatus: "revisar_cambios",
    specificNotes: "Régimen fiscal IPSI; confirmar impresos locales de la distribuidora antes de dar de alta.",
  },
  {
    code: "ML",
    name: "Melilla",
    industryPortalName: "Sede Electrónica Ciudad Autónoma de Melilla — Industria",
    officialUrl: "https://sede.melilla.es",
    mainDistributors: ["Gaselec Diversificación / Endesa"],
    taxRegime: "IPSI_10",
    lastReviewedIso: "2026-04-10",
    confirmedStatus: "revisar_cambios",
    specificNotes: "Régimen fiscal IPSI; presentación telemática en sede electrónica autonómica.",
  },
];

export const INSTALLATION_TYPES_28: {
  id: string;
  label: string;
  itc: string;
  defaultItc04Group: string;
}[] = [
  { id: "viv_unifamiliar", label: "1. Vivienda unifamiliar", itc: "ITC-BT-25", defaultItc04Group: "f_vivienda_unifamiliar" },
  { id: "viv_piso_di", label: "2. Vivienda en edificio (con Derivación Individual)", itc: "ITC-BT-15 / BT-25", defaultItc04Group: "e_edificio_viviendas" },
  { id: "servicios_comunes", label: "3. Servicios comunes de edificio", itc: "ITC-BT-10 / BT-14", defaultItc04Group: "e_edificio_viviendas" },
  { id: "edificio_completo", label: "4. Edificio completo de viviendas y locales", itc: "ITC-BT-10 / BT-14 / BT-16", defaultItc04Group: "e_edificio_viviendas" },
  { id: "local_comercial", label: "5. Local comercial u oficina (sin pública concurrencia)", itc: "ITC-BT-19 / BT-20", defaultItc04Group: "e_edificio_viviendas" },
  { id: "publica_concurrencia", label: "6. Local de pública concurrencia (bares, tiendas >50 pers., aulas)", itc: "ITC-BT-28", defaultItc04Group: "i_publica_concurrencia" },
  { id: "sanitario_consultas", label: "7. Establecimiento sanitario / consultas médicas", itc: "ITC-BT-28 / BT-38", defaultItc04Group: "i_publica_concurrencia" },
  { id: "quirofanos", label: "8. Quirófanos y salas de intervención", itc: "ITC-BT-38", defaultItc04Group: "m_quirofanos" },
  { id: "industria_nave", label: "9. Nave industrial o taller", itc: "ITC-BT-19 / BT-47", defaultItc04Group: "a_industria" },
  { id: "local_humedo", label: "10. Local húmedo, polvoriento o con riesgo de corrosión", itc: "ITC-BT-30", defaultItc04Group: "b_humedos_polvorientos" },
  { id: "local_mojado_bombas", label: "11. Local mojado / grupo de bombeo", itc: "ITC-BT-30 / BT-47", defaultItc04Group: "c_mojados_generadores" },
  { id: "garaje_natural", label: "12. Garaje con ventilación natural", itc: "ITC-BT-29", defaultItc04Group: "h_garaje_natural" },
  { id: "garaje_forzada", label: "13. Garaje desclasificado / ventilación forzada", itc: "ITC-BT-29", defaultItc04Group: "g_garaje_forzada" },
  { id: "alumbrado_exterior", label: "14. Alumbrado exterior / vial / fachadas", itc: "ITC-BT-09", defaultItc04Group: "k_alumbrado_exterior" },
  { id: "piscinas_fuentes", label: "15. Piscinas, pediluvios y fuentes ornamentales", itc: "ITC-BT-31", defaultItc04Group: "n_piscinas" },
  { id: "obras_construccion", label: "16. Instalación provisional de obras", itc: "ITC-BT-33", defaultItc04Group: "d_obras_temporales" },
  { id: "ferias_temporales", label: "17. Ferias, stands e instalaciones temporales", itc: "ITC-BT-34", defaultItc04Group: "d_obras_temporales" },
  { id: "recarga_ve_interior", label: "18. Punto de recarga de Vehículo Eléctrico (interior)", itc: "ITC-BT-52", defaultItc04Group: "z_recarga_ve_interior" },
  { id: "recarga_ve_exterior", label: "19. Estación de recarga VE en exterior o Modo 4 CC", itc: "ITC-BT-52", defaultItc04Group: "z_recarga_ve_exterior_modo4" },
  { id: "riesgo_incendio", label: "20. Local con riesgo de incendio o explosión (ATEX)", itc: "ITC-BT-29", defaultItc04Group: "l_riesgo_incendio_explosion" },
  { id: "rotulos_luminosos", label: "21. Rótulos luminosos y descarga de alta tensión", itc: "ITC-BT-44", defaultItc04Group: "b_humedos_polvorientos" },
  { id: "autoconsumo_fv", label: "22. Instalación generadora / Autoconsumo fotovoltaico", itc: "ITC-BT-40", defaultItc04Group: "c_mojados_generadores" },
  { id: "ascensores_gruas", label: "23. Ascensores, montacargas y aparatos de elevación", itc: "ITC-BT-32", defaultItc04Group: "a_industria" },
  { id: "suelo_radiante", label: "24. Cables y folios radiantes en viviendas/locales", itc: "ITC-BT-46", defaultItc04Group: "f_vivienda_unifamiliar" },
  { id: "cercas_ganado", label: "25. Cercas eléctricas para ganado / agrícolas", itc: "ITC-BT-39 / BT-35", defaultItc04Group: "b_humedos_polvorientos" },
  { id: "caravanas_puertos", label: "26. Camping, caravanas y puertos deportivos", itc: "ITC-BT-41 / BT-42", defaultItc04Group: "c_mojados_generadores" },
  { id: "redes_distribucion", label: "27. Redes aéreas o subterráneas de distribución BT", itc: "ITC-BT-06 / BT-07", defaultItc04Group: "a_industria" },
  { id: "domotica_otros", label: "28. Sistemas de automatización, domótica (KNX) y otros", itc: "ITC-BT-51", defaultItc04Group: "f_vivienda_unifamiliar" },
];

export function isProcedureReviewOutdated(lastReviewedIso: string, maxMonths = 6): boolean {
  const revDate = new Date(lastReviewedIso);
  const now = new Date("2026-11-14T00:00:00Z");
  const diffMonths =
    (now.getUTCFullYear() - revDate.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - revDate.getUTCMonth());
  return diffMonths >= maxMonths;
}

export { REBT_SECTIONS_MM2 };
