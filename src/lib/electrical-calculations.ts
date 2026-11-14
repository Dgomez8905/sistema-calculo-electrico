// ============================================================================
// Motor de Cálculo Eléctrico Normativo - REBT (RD 842/2002 actualizado a 2025)
// y Generador Automático de Memoria Técnica de Diseño (M.T.D. B.T. - 11 Páginas)
// ============================================================================

export type SystemSupplyType = "monofasico_230v" | "trifasico_400v";

export type InstallationMethod = "A" | "A1" | "A2" | "B" | "B1" | "B2" | "C" | "D" | "E" | "F";

export type InsulationType = "PVC_70" | "XLPE_90";

export type ConductorMaterial = "Cu" | "Al";

export type CircuitUsageType =
  | "vivienda_interior"
  | "alumbrado"
  | "fuerza_otros"
  | "motor"
  | "alumbrado_descarga"
  | "recarga_ve"
  | "di_unico"
  | "di_concentrada"
  | "lga_centralizada"
  | "lga_parcial";

export interface RebtCircuitInput {
  id?: number;
  code: string; // Ej. C1, C2, C3, C4, C5, C6..C13, A-1, F-1
  description: string;
  usageType: CircuitUsageType;
  phaseSystem: "monofasico" | "trifasico";
  phaseAssigned: "L1" | "L2" | "L3" | "L1-L2-L3";
  voltage: 230 | 400;
  powerWatts: number;
  cosPhi: number;
  simultaneityFactor: number; // Fs
  utilizationFactor: number; // Fu
  correctionFactor?: number; // Ca * Cg (temperatura / agrupamiento, por defecto 1.00)
  lengthMeters: number;
  installationMethod: InstallationMethod;
  insulationType: InsulationType;
  material: ConductorMaterial;
  minSectionMm2?: number;
  fixedPiaAmps?: number;
  fuseAmps?: number; // FUS (A) para Cuadro Resumen de Cálculo M.T.D. pág. 6/11
}

export interface RebtCalculatedCircuit extends RebtCircuitInput {
  effectivePowerWatts: number; // Potencia de cálculo (W)
  currentIbAmps: number; // Intensidad de cálculo (A)
  correctionFactorValue: number; // Factor de corrección
  correctedCurrentAmps: number; // Intensidad corregida (A)
  piaAmps: number; // PIA (A)
  fuseAmpsValue: number | null; // FUS (A)
  sectionMm2: number; // Sección fase en mm²
  neutralSectionMm2: number; // Sección neutro en mm²
  peSectionMm2: number; // Conductor de protección Sp en mm² (Tabla 2 ITC-BT-18/19)
  conductorsSummary: string; // Ej. "2x2,5 Cu" o "4x16 Cu" (nº/mm²/Cu/Al)
  insulationSummary: string; // Ej. "PVC 450/750V" o "XLPE 0,6/1kV"
  ampacityIzAmps: number; // Intensidad máxima admisible Iz a 40°C (Tabla 1 ITC-BT-19)
  voltageDropVolts: number; // Caída de tensión en V
  voltageDropPct: number; // Caída de tensión en el circuito (%)
  maxAllowedDropPct: number; // Límite reglamentario REBT (%)
  tubeDiameterMm: number; // Diámetro exterior tubo en mm (ITC-BT-21)
  shortCircuitCurrentAmps: number; // Intensidad de cortocircuito Icc (A) al final de línea
  isCompliant: boolean;
}

// Secciones normalizadas REBT (mm²)
export const REBT_SECTIONS_MM2 = [
  1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300,
] as const;

// Calibres comerciales de interruptores magnetotérmicos (UNE-EN 60898 / 60947-2)
export const REBT_PIA_RATINGS = [
  6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630,
];

// ============================================================================
// Escalones Oficiales de IGA y Tarifas de Acceso en España
// Normativa: REBT ITC-BT-10, ITC-BT-17, ITC-BT-25, ITC-BT-52 + Circular 3/2020 CNMC
// - Tarifa 2.0TD: Baja Tensión con potencia contratada ≤ 15,00 kW (3 periodos energía / 2 potencia)
// - Tarifa 3.0TD: Baja Tensión con potencia contratada > 15,00 kW (6 periodos + maxímetro)
// - Límite reglamentario monofásico 230 V en España: IGA 63 A (14.490 W / 14,49 kW)
// ============================================================================
export type SpanishAccessTariff = "2.0TD" | "3.0TD";

export interface RebtSpainIgaStep {
  igaAmps: number;
  poles: 2 | 4;
  supplyType: SystemSupplyType;
  maxPowerWatts: number;
  maxPowerKw: number;
  accessTariff: SpanishAccessTariff;
  electrificationGrade: "basica" | "elevada";
  shortLabel: string;
  label: string;
  rebtCitation: string;
}

export const REBT_SPAIN_IGA_MONO_STEPS: RebtSpainIgaStep[] = [
  {
    igaAmps: 10,
    poles: 2,
    supplyType: "monofasico_230v",
    maxPowerWatts: 2300,
    maxPowerKw: 2.3,
    accessTariff: "2.0TD",
    electrificationGrade: "basica",
    shortLabel: "IGA 10 A · 2,30 kW (2.0TD)",
    label: "IGA 10 A — 2.300 W (2,30 kW) · Auxiliar / Pequeño suministro · Tarifa 2.0TD",
    rebtCitation: "ITC-BT-17 · Circular 3/2020 CNMC (2.0TD ≤ 15 kW)",
  },
  {
    igaAmps: 16,
    poles: 2,
    supplyType: "monofasico_230v",
    maxPowerWatts: 3680,
    maxPowerKw: 3.68,
    accessTariff: "2.0TD",
    electrificationGrade: "basica",
    shortLabel: "IGA 16 A · 3,68 kW (2.0TD)",
    label: "IGA 16 A — 3.680 W (3,68 kW) · Garaje / Anexo / Suministro reducido · Tarifa 2.0TD",
    rebtCitation: "ITC-BT-17 · Circular 3/2020 CNMC (2.0TD ≤ 15 kW)",
  },
  {
    igaAmps: 20,
    poles: 2,
    supplyType: "monofasico_230v",
    maxPowerWatts: 4600,
    maxPowerKw: 4.6,
    accessTariff: "2.0TD",
    electrificationGrade: "basica",
    shortLabel: "IGA 20 A · 4,60 kW (2.0TD)",
    label: "IGA 20 A — 4.600 W (4,60 kW) · Suministro existente / Pequeño local · Tarifa 2.0TD",
    rebtCitation: "ITC-BT-17 · Circular 3/2020 CNMC (2.0TD ≤ 15 kW)",
  },
  {
    igaAmps: 25,
    poles: 2,
    supplyType: "monofasico_230v",
    maxPowerWatts: 5750,
    maxPowerKw: 5.75,
    accessTariff: "2.0TD",
    electrificationGrade: "basica",
    shortLabel: "IGA 25 A · 5,75 kW · Básica (2.0TD)",
    label: "IGA 25 A — 5.750 W (5,75 kW) · REBT Electrificación Básica · Tarifa 2.0TD",
    rebtCitation: "ITC-BT-10 §2.1 y ITC-BT-25 §2.2 · Tarifa 2.0TD (≤ 15 kW)",
  },
  {
    igaAmps: 32,
    poles: 2,
    supplyType: "monofasico_230v",
    maxPowerWatts: 7360,
    maxPowerKw: 7.36,
    accessTariff: "2.0TD",
    electrificationGrade: "basica",
    shortLabel: "IGA 32 A · 7,36 kW · Básica Ampliada (2.0TD)",
    label: "IGA 32 A — 7.360 W (7,36 kW) · REBT Electrificación Básica Ampliada · Tarifa 2.0TD",
    rebtCitation: "ITC-BT-25 §2.2 (Escalón intermedio 7.360 W) · Tarifa 2.0TD",
  },
  {
    igaAmps: 40,
    poles: 2,
    supplyType: "monofasico_230v",
    maxPowerWatts: 9200,
    maxPowerKw: 9.2,
    accessTariff: "2.0TD",
    electrificationGrade: "elevada",
    shortLabel: "IGA 40 A · 9,20 kW · Elevada (2.0TD)",
    label: "IGA 40 A — 9.200 W (9,20 kW) · REBT Electrificación Elevada · Tarifa 2.0TD",
    rebtCitation: "ITC-BT-10 §2.2 y ITC-BT-25 §2.2 · Tarifa 2.0TD (≤ 15 kW)",
  },
  {
    igaAmps: 50,
    poles: 2,
    supplyType: "monofasico_230v",
    maxPowerWatts: 11500,
    maxPowerKw: 11.5,
    accessTariff: "2.0TD",
    electrificationGrade: "elevada",
    shortLabel: "IGA 50 A · 11,50 kW · Elevada + VE (2.0TD)",
    label: "IGA 50 A — 11.500 W (11,50 kW) · REBT Elevada Superior / Recarga VE · Tarifa 2.0TD",
    rebtCitation: "ITC-BT-25 §2.2 y ITC-BT-52 · Tarifa 2.0TD (≤ 15 kW)",
  },
  {
    igaAmps: 63,
    poles: 2,
    supplyType: "monofasico_230v",
    maxPowerWatts: 14490,
    maxPowerKw: 14.49,
    accessTariff: "2.0TD",
    electrificationGrade: "elevada",
    shortLabel: "IGA 63 A · 14,49 kW · Máx. 1F (2.0TD)",
    label: "IGA 63 A — 14.490 W (14,49 kW) · Máx. Monofásico España · Tarifa 2.0TD",
    rebtCitation: "ITC-BT-25 §2.2 (Tope monofásico 63 A) · Tarifa 2.0TD (≤ 15 kW)",
  },
];

export const REBT_SPAIN_IGA_TRI_STEPS: RebtSpainIgaStep[] = [
  {
    igaAmps: 16,
    poles: 4,
    supplyType: "trifasico_400v",
    maxPowerWatts: 11085,
    maxPowerKw: 11.09,
    accessTariff: "2.0TD",
    electrificationGrade: "elevada",
    shortLabel: "IGA 16 A (4P) · 11,09 kW · Elevada (2.0TD)",
    label: "IGA 16 A (4P) — 11.085 W (11,09 kW) · Trifásico Elevada · Tarifa 2.0TD",
    rebtCitation: "ITC-BT-10 / BT-25 · Tarifa 2.0TD (≤ 15 kW)",
  },
  {
    igaAmps: 20,
    poles: 4,
    supplyType: "trifasico_400v",
    maxPowerWatts: 13856,
    maxPowerKw: 13.86,
    accessTariff: "2.0TD",
    electrificationGrade: "elevada",
    shortLabel: "IGA 20 A (4P) · 13,86 kW · Elevada (2.0TD)",
    label: "IGA 20 A (4P) — 13.856 W (13,86 kW) · Trifásico Elevada · Tarifa 2.0TD",
    rebtCitation: "ITC-BT-10 / BT-25 · Tarifa 2.0TD (≤ 15 kW)",
  },
  {
    igaAmps: 25,
    poles: 4,
    supplyType: "trifasico_400v",
    maxPowerWatts: 17321,
    maxPowerKw: 17.32,
    accessTariff: "3.0TD",
    electrificationGrade: "elevada",
    shortLabel: "IGA 25 A (4P) · 17,32 kW · Combi DIN (3.0TD)",
    label: "IGA 25 A (4P) — 17.321 W (17,32 kW) · Comercio Estándar (Combi DIN) · Tarifa 3.0TD",
    rebtCitation: "ITC-BT-17 · Comercio estándar ≤ 43 kW (Combi DIN) · Tarifa 3.0TD",
  },
  {
    igaAmps: 32,
    poles: 4,
    supplyType: "trifasico_400v",
    maxPowerWatts: 22170,
    maxPowerKw: 22.17,
    accessTariff: "3.0TD",
    electrificationGrade: "elevada",
    shortLabel: "IGA 32 A (4P) · 22,17 kW · Combi DIN (3.0TD)",
    label: "IGA 32 A (4P) — 22.170 W (22,17 kW) · Comercio Estándar (Combi DIN) · Tarifa 3.0TD",
    rebtCitation: "ITC-BT-17 · Comercio estándar ≤ 43 kW (Combi DIN) · Tarifa 3.0TD",
  },
  {
    igaAmps: 40,
    poles: 4,
    supplyType: "trifasico_400v",
    maxPowerWatts: 27713,
    maxPowerKw: 27.71,
    accessTariff: "3.0TD",
    electrificationGrade: "elevada",
    shortLabel: "IGA 40 A (4P) · 27,71 kW · Combi DIN (3.0TD)",
    label: "IGA 40 A (4P) — 27.713 W (27,71 kW) · Comercio Estándar (Combi DIN) · Tarifa 3.0TD",
    rebtCitation: "ITC-BT-17 · Comercio estándar ≤ 43 kW (Combi DIN) · Tarifa 3.0TD",
  },
  {
    igaAmps: 50,
    poles: 4,
    supplyType: "trifasico_400v",
    maxPowerWatts: 34641,
    maxPowerKw: 34.64,
    accessTariff: "3.0TD",
    electrificationGrade: "elevada",
    shortLabel: "IGA 50 A (4P) · 34,64 kW · Combi DIN (3.0TD)",
    label: "IGA 50 A (4P) — 34.641 W (34,64 kW) · Comercio Estándar (Combi DIN) · Tarifa 3.0TD",
    rebtCitation: "ITC-BT-17 · Comercio estándar ≤ 43 kW (Combi DIN) · Tarifa 3.0TD",
  },
  {
    igaAmps: 63,
    poles: 4,
    supplyType: "trifasico_400v",
    maxPowerWatts: 43648,
    maxPowerKw: 43.65,
    accessTariff: "3.0TD",
    electrificationGrade: "elevada",
    shortLabel: "IGA 63 A (4P) · 43,65 kW · Máx. Combi DIN (3.0TD)",
    label: "IGA 63 A (4P) — 43.648 W (43,65 kW) · Tope Comercio Estándar (Combi DIN) · Tarifa 3.0TD",
    rebtCitation: "ITC-BT-16 / BT-17 (Medida directa y Combi DIN ≤ 63 A) · Tarifa 3.0TD",
  },
  {
    igaAmps: 80,
    poles: 4,
    supplyType: "trifasico_400v",
    maxPowerWatts: 55426,
    maxPowerKw: 55.43,
    accessTariff: "3.0TD",
    electrificationGrade: "elevada",
    shortLabel: "IGA 80 A (4P) · 55,43 kW · Caja Moldeada + Bobina (3.0TD)",
    label: "IGA 80 A (4P) — 55.426 W (55,43 kW) · Gran Comercio (MCCB + Bobina Disparo) · Tarifa 3.0TD",
    rebtCitation: "ITC-BT-16 / BT-17 (> 63 A: Caja Moldeada + Bobina Disparo + DPS/POP indep.) · 3.0TD",
  },
  {
    igaAmps: 100,
    poles: 4,
    supplyType: "trifasico_400v",
    maxPowerWatts: 69282,
    maxPowerKw: 69.28,
    accessTariff: "3.0TD",
    electrificationGrade: "elevada",
    shortLabel: "IGA 100 A (4P) · 69,28 kW · Caja Moldeada + Bobina (3.0TD)",
    label: "IGA 100 A (4P) — 69.282 W (69,28 kW) · Gran Comercio / Industria (MCCB + Bobina) · 3.0TD",
    rebtCitation: "ITC-BT-16 / BT-17 (> 63 A: Caja Moldeada + Bobina Disparo + DPS/POP indep.) · 3.0TD",
  },
  {
    igaAmps: 125,
    poles: 4,
    supplyType: "trifasico_400v",
    maxPowerWatts: 86603,
    maxPowerKw: 86.6,
    accessTariff: "3.0TD",
    electrificationGrade: "elevada",
    shortLabel: "IGA 125 A (4P) · 86,60 kW · Caja Moldeada + Bobina (3.0TD)",
    label: "IGA 125 A (4P) — 86.603 W (86,60 kW) · Mediana Industria (MCCB + Bobina) · Tarifa 3.0TD",
    rebtCitation: "ITC-BT-16 / BT-17 (> 63 A: Caja Moldeada + Bobina Disparo + DPS/POP indep.) · 3.0TD",
  },
  {
    igaAmps: 160,
    poles: 4,
    supplyType: "trifasico_400v",
    maxPowerWatts: 110851,
    maxPowerKw: 110.85,
    accessTariff: "3.0TD",
    electrificationGrade: "elevada",
    shortLabel: "IGA 160 A (4P) · 110,85 kW · Caja Moldeada + Bobina (3.0TD)",
    label: "IGA 160 A (4P) — 110.851 W (110,85 kW) · Industria > 100 kW (MCCB + Bobina) · Tarifa 3.0TD",
    rebtCitation: "ITC-BT-04 (> 100 kW Proyecto) · Caja Moldeada + Bobina Disparo · 3.0TD",
  },
  {
    igaAmps: 200,
    poles: 4,
    supplyType: "trifasico_400v",
    maxPowerWatts: 138564,
    maxPowerKw: 138.56,
    accessTariff: "3.0TD",
    electrificationGrade: "elevada",
    shortLabel: "IGA 200 A (4P) · 138,56 kW · Caja Moldeada + Bobina (3.0TD)",
    label: "IGA 200 A (4P) — 138.564 W (138,56 kW) · Industria (MCCB + Bobina) · Tarifa 3.0TD",
    rebtCitation: "ITC-BT-04 (> 100 kW Proyecto) · Caja Moldeada + Bobina Disparo · 3.0TD",
  },
  {
    igaAmps: 250,
    poles: 4,
    supplyType: "trifasico_400v",
    maxPowerWatts: 173205,
    maxPowerKw: 173.21,
    accessTariff: "3.0TD",
    electrificationGrade: "elevada",
    shortLabel: "IGA 250 A (4P) · 173,21 kW · Caja Moldeada + Bobina (3.0TD)",
    label: "IGA 250 A (4P) — 173.205 W (173,21 kW) · Gran Industria (MCCB + Bobina) · Tarifa 3.0TD",
    rebtCitation: "ITC-BT-04 (> 100 kW Proyecto) · Caja Moldeada + Bobina Disparo · 3.0TD",
  },
];

export function getSpanishIgaStepsForSupply(
  supplyType: SystemSupplyType
): RebtSpainIgaStep[] {
  return supplyType === "trifasico_400v"
    ? REBT_SPAIN_IGA_TRI_STEPS
    : REBT_SPAIN_IGA_MONO_STEPS;
}

export function sanitizeSpanishIgaAmps(
  rawAmps: number,
  supplyType: SystemSupplyType
): number {
  const steps = getSpanishIgaStepsForSupply(supplyType);
  const exact = steps.find((s) => s.igaAmps === rawAmps);
  if (exact) return exact.igaAmps;
  if (supplyType === "monofasico_230v" && rawAmps > 63) {
    return 63;
  }
  const nextUp = steps.find((s) => s.igaAmps >= rawAmps);
  return nextUp ? nextUp.igaAmps : steps[steps.length - 1].igaAmps;
}

export type CommercialPowerTier =
  | "vivienda_comercio_mono"
  | "comercio_estandar_din"
  | "gran_comercio_mccb";

export type HeaderSurgeArchitecture =
  | "combi_din_compacto"
  | "mccb_bobina_independiente";

export interface SpanishRebtIgaResolution {
  igaAmps: number;
  autoIgaAmps: number;
  poles: 2 | 4;
  maxAdmissibleWatts: number;
  maxAdmissibleKw: number;
  effectiveDesignWatts: number;
  effectiveDesignKw: number;
  simultaneousDemandWatts: number;
  accessTariff: SpanishAccessTariff;
  tariffBadgeLabel: string;
  tariffDetail: string;
  effectiveElectrificationGrade: "basica" | "elevada";
  electrificationLabel: string;
  commercialTier: CommercialPowerTier;
  commercialTierLabel: string;
  headerArchitecture: HeaderSurgeArchitecture;
  headerProtectionSummary: string;
  rebtCitation: string;
  exceedsSinglePhaseLimit: boolean;
  step: RebtSpainIgaStep;
}

/**
 * Determina el calibre oficial del IGA, la Potencia Máxima Admisible (PMA),
 * el Grado de Electrificación REBT (ITC-BT-10 / ITC-BT-25), la Tarifa de Acceso
 * en España (2.0TD ≤ 15 kW / 3.0TD > 15 kW) y la arquitectura de cabecera comercial:
 * - ≤ 63 A (hasta ~43,65 kW en 3F): Equipo compacto combinado en carril DIN (IGA + POP + DPS T2).
 * - > 63 A (80 A, 100 A, 125 A+, > 43,65 kW): IGA de Caja Moldeada (MCCB) + Bobina de disparo
 *   acoplada a protector independiente de sobretensiones permanentes y transitorias.
 */
export function resolveSpanishRebtIgaAndTariff(params: {
  supplyType: SystemSupplyType;
  electrificationGrade: "basica" | "elevada";
  circuits: RebtCalculatedCircuit[];
  areaM2?: number;
  overrideIgaAmps?: number | null;
  customDesignPowerWatts?: number | null;
}): SpanishRebtIgaResolution {
  const {
    supplyType,
    electrificationGrade,
    circuits,
    areaM2 = 0,
    overrideIgaAmps,
    customDesignPowerWatts,
  } = params;
  const steps = getSpanishIgaStepsForSupply(supplyType);

  const isHousingProfile =
    circuits.length === 0 ||
    circuits.every(
      (c) => c.usageType === "vivienda_interior" || c.usageType === "recarga_ve"
    );

  const interiorCircuits = circuits.filter(
    (c) => c.usageType !== "recarga_ve" && c.code.toUpperCase() !== "C13"
  );
  const evCircuits = circuits.filter(
    (c) => c.usageType === "recarga_ve" || c.code.toUpperCase() === "C13"
  );
  const evPowerWatts = evCircuits.reduce((acc, c) => acc + c.effectivePowerWatts, 0);

  const elevatedCodes = new Set(["C6", "C7", "C8", "C9", "C10", "C11", "C12", "C13"]);
  const hasElevatedCircuitCode = circuits.some((c) =>
    elevatedCodes.has(c.code.trim().toUpperCase())
  );

  const effectiveGrade: "basica" | "elevada" =
    electrificationGrade === "elevada" ||
    areaM2 > 160 ||
    interiorCircuits.length > 5 ||
    evCircuits.length > 0 ||
    hasElevatedCircuitCode
      ? "elevada"
      : "basica";

  const maxSinglePiaAmps = circuits.reduce((m, c) => Math.max(m, c.piaAmps), 10);

  let simultaneousDemandWatts = 5750;
  let exceedsSinglePhaseLimit = false;

  const hasCustomPower =
    typeof customDesignPowerWatts === "number" &&
    Number.isFinite(customDesignPowerWatts) &&
    customDesignPowerWatts > 0;

  if (hasCustomPower) {
    simultaneousDemandWatts = Math.round(customDesignPowerWatts);
  } else if (isHousingProfile) {
    if (effectiveGrade === "basica") {
      // ITC-BT-10 §2.1 / ITC-BT-25 §2.2: Electrificación Básica = 5.750 W (IGA 25 A)
      // Si el usuario elevó manualmente algún PIA a 32 A, sube al escalón de 32 A (7.360 W)
      simultaneousDemandWatts = maxSinglePiaAmps > 25 ? Math.max(7360, maxSinglePiaAmps * 230) : 5750;
    } else {
      // ITC-BT-10 §2.2 / ITC-BT-25 §2.2: Electrificación Elevada = mín. 9.200 W (IGA 40 A)
      // Si existe circuito C13 de Recarga de Vehículo Eléctrico (ITC-BT-52), ponderamos
      // vivienda simultánea base (7.360 W) + potencia VE para seleccionar 50 A (11,5 kW) o 63 A (14,49 kW)
      const withEvSimultaneous = evPowerWatts > 0 ? 7360 + evPowerWatts : 9200;
      simultaneousDemandWatts = Math.max(9200, withEvSimultaneous);
    }
  } else {
    // Local comercial, oficina o industria: suma de potencias efectivas con simultaneidad de cuadro
    const rawEffectiveSum = circuits.reduce((acc, c) => acc + c.effectivePowerWatts, 0);
    const panelGroupFactor = circuits.length > 3 ? 0.8 : 1.0;
    const minCommercialWatts = effectiveGrade === "elevada" ? 9200 : 5750;
    simultaneousDemandWatts = Math.max(
      minCommercialWatts,
      Math.round(rawEffectiveSum * panelGroupFactor)
    );
  }

  if (supplyType === "monofasico_230v" && simultaneousDemandWatts > 14490) {
    exceedsSinglePhaseLimit = true;
  }

  const minIgaForGrade = hasCustomPower
    ? 10
    : supplyType === "monofasico_230v"
    ? effectiveGrade === "elevada"
      ? 40
      : 25
    : 16;

  const autoStep =
    steps.find(
      (s) =>
        s.maxPowerWatts >= simultaneousDemandWatts &&
        s.igaAmps >= minIgaForGrade &&
        s.igaAmps >= Math.min(maxSinglePiaAmps, supplyType === "monofasico_230v" ? 63 : 250)
    ) || steps[steps.length - 1];

  // Validar override manual: en monofásico 230 V nunca se admite IGA > 63 A (ej. 80 A heredado)
  const validOverrideStep =
    typeof overrideIgaAmps === "number" && overrideIgaAmps > 0
      ? steps.find((s) => s.igaAmps === overrideIgaAmps) ?? null
      : null;

  const chosenStep = validOverrideStep || autoStep;
  const effectiveDesignWatts =
    hasCustomPower && !validOverrideStep
      ? supplyType === "monofasico_230v"
        ? Math.min(14490, Math.round(customDesignPowerWatts))
        : Math.round(customDesignPowerWatts)
      : chosenStep.maxPowerWatts;
  const effectiveDesignKw = Number((effectiveDesignWatts / 1000).toFixed(2));

  const resolvedGrade: "basica" | "elevada" =
    chosenStep.electrificationGrade === "elevada" || effectiveGrade === "elevada"
      ? "elevada"
      : "basica";

  const isMccbOver63 = chosenStep.igaAmps > 63;
  const headerArchitecture: HeaderSurgeArchitecture = isMccbOver63
    ? "mccb_bobina_independiente"
    : "combi_din_compacto";
  const commercialTier: CommercialPowerTier = isMccbOver63
    ? "gran_comercio_mccb"
    : supplyType === "trifasico_400v"
    ? "comercio_estandar_din"
    : "vivienda_comercio_mono";

  const commercialTierLabel =
    commercialTier === "gran_comercio_mccb"
      ? "Gran Comercio / Mediana Industria (> 43 kW · 80–250 A)"
      : commercialTier === "comercio_estandar_din"
      ? "Comercio Estándar Trifásico (≤ 43,65 kW · 25–63 A)"
      : "Vivienda / Local Monofásico (≤ 14,49 kW · ≤ 63 A)";

  const headerProtectionSummary = isMccbOver63
    ? "Caja Moldeada (MCCB) + Bobina de Disparo MX + Protector DPS/POP independiente"
    : "Equipo compacto combinado Combi en carril DIN (IGA + POP + DPS T2)";

  const tariffBadgeLabel =
    chosenStep.accessTariff === "2.0TD"
      ? "Tarifa 2.0TD (≤ 15 kW)"
      : "Tarifa 3.0TD (> 15 kW)";
  const tariffDetail =
    chosenStep.accessTariff === "2.0TD"
      ? "Peaje 2.0TD CNMC (≤ 15 kW · 3 periodos energía P1-P3 / 2 periodos potencia)"
      : "Peaje 3.0TD CNMC (> 15 kW · 6 periodos P1-P6 + control por maxímetro)";

  return {
    igaAmps: chosenStep.igaAmps,
    autoIgaAmps: autoStep.igaAmps,
    poles: chosenStep.poles,
    maxAdmissibleWatts: chosenStep.maxPowerWatts,
    maxAdmissibleKw: chosenStep.maxPowerKw,
    effectiveDesignWatts,
    effectiveDesignKw,
    simultaneousDemandWatts: Math.round(simultaneousDemandWatts),
    accessTariff: chosenStep.accessTariff,
    tariffBadgeLabel,
    tariffDetail,
    effectiveElectrificationGrade: resolvedGrade,
    electrificationLabel:
      resolvedGrade === "elevada"
        ? "Electrificación Elevada (ITC-BT-10 / BT-25)"
        : "Electrificación Básica (ITC-BT-10 / BT-25)",
    commercialTier,
    commercialTierLabel,
    headerArchitecture,
    headerProtectionSummary,
    rebtCitation: chosenStep.rebtCitation,
    exceedsSinglePhaseLimit,
    step: chosenStep,
  };
}

interface IzRow {
  sectionMm2: number;
  pvc2xB: number;
  pvc3xB: number;
  xlpe2xB: number;
  xlpe3xB: number;
  xlpe2xE: number;
  xlpe3xE: number;
  tube2xMm: number;
  tube3xMm: number;
}

export const ITC_BT_19_TABLE: IzRow[] = [
  { sectionMm2: 1.5, pvc2xB: 15, pvc3xB: 13.5, xlpe2xB: 20, xlpe3xB: 18, xlpe2xE: 24, xlpe3xE: 21, tube2xMm: 16, tube3xMm: 20 },
  { sectionMm2: 2.5, pvc2xB: 21, pvc3xB: 18.5, xlpe2xB: 28, xlpe3xB: 25, xlpe2xE: 33, xlpe3xE: 29, tube2xMm: 20, tube3xMm: 20 },
  { sectionMm2: 4, pvc2xB: 27, pvc3xB: 24, xlpe2xB: 38, xlpe3xB: 34, xlpe2xE: 45, xlpe3xE: 38, tube2xMm: 20, tube3xMm: 25 },
  { sectionMm2: 6, pvc2xB: 36, pvc3xB: 32, xlpe2xB: 49, xlpe3xB: 44, xlpe2xE: 57, xlpe3xE: 49, tube2xMm: 25, tube3xMm: 25 },
  { sectionMm2: 10, pvc2xB: 50, pvc3xB: 44, xlpe2xB: 68, xlpe3xB: 60, xlpe2xE: 76, xlpe3xE: 68, tube2xMm: 25, tube3xMm: 32 },
  { sectionMm2: 16, pvc2xB: 66, pvc3xB: 59, xlpe2xB: 91, xlpe3xB: 80, xlpe2xE: 105, xlpe3xE: 91, tube2xMm: 32, tube3xMm: 40 },
  { sectionMm2: 25, pvc2xB: 84, pvc3xB: 77, xlpe2xB: 116, xlpe3xB: 106, xlpe2xE: 123, xlpe3xE: 116, tube2xMm: 40, tube3xMm: 50 },
  { sectionMm2: 35, pvc2xB: 104, pvc3xB: 96, xlpe2xB: 144, xlpe3xB: 131, xlpe2xE: 154, xlpe3xE: 144, tube2xMm: 40, tube3xMm: 50 },
  { sectionMm2: 50, pvc2xB: 125, pvc3xB: 117, xlpe2xB: 175, xlpe3xB: 159, xlpe2xE: 188, xlpe3xE: 175, tube2xMm: 50, tube3xMm: 63 },
  { sectionMm2: 70, pvc2xB: 160, pvc3xB: 149, xlpe2xB: 224, xlpe3xB: 202, xlpe2xE: 244, xlpe3xE: 224, tube2xMm: 63, tube3xMm: 63 },
  { sectionMm2: 95, pvc2xB: 194, pvc3xB: 180, xlpe2xB: 271, xlpe3xB: 245, xlpe2xE: 296, xlpe3xE: 271, tube2xMm: 63, tube3xMm: 75 },
  { sectionMm2: 120, pvc2xB: 225, pvc3xB: 208, xlpe2xB: 314, xlpe3xB: 284, xlpe2xE: 348, xlpe3xE: 314, tube2xMm: 75, tube3xMm: 75 },
  { sectionMm2: 150, pvc2xB: 260, pvc3xB: 236, xlpe2xB: 363, xlpe3xB: 338, xlpe2xE: 404, xlpe3xE: 363, tube2xMm: 75, tube3xMm: 90 },
  { sectionMm2: 185, pvc2xB: 297, pvc3xB: 268, xlpe2xB: 415, xlpe3xB: 386, xlpe2xE: 464, xlpe3xE: 415, tube2xMm: 90, tube3xMm: 110 },
  { sectionMm2: 240, pvc2xB: 350, pvc3xB: 315, xlpe2xB: 490, xlpe3xB: 455, xlpe2xE: 552, xlpe3xE: 490, tube2xMm: 110, tube3xMm: 125 },
  { sectionMm2: 300, pvc2xB: 404, pvc3xB: 360, xlpe2xB: 565, xlpe3xB: 524, xlpe2xE: 640, xlpe3xE: 565, tube2xMm: 125, tube3xMm: 140 },
];

// Tabla 1 ITC-BT-25: Circuitos tipificados en viviendas (230 V)
export const ITC_BT_25_TEMPLATES: RebtCircuitInput[] = [
  {
    code: "C1",
    description: "Iluminación (máx. 30 puntos de luz)",
    usageType: "vivienda_interior",
    phaseSystem: "monofasico",
    phaseAssigned: "L1",
    voltage: 230,
    powerWatts: 2300,
    cosPhi: 1.0,
    simultaneityFactor: 1.0,
    utilizationFactor: 1.0,
    correctionFactor: 1.0,
    lengthMeters: 15,
    installationMethod: "B1",
    insulationType: "PVC_70",
    material: "Cu",
    minSectionMm2: 1.5,
    fixedPiaAmps: 10,
  },
  {
    code: "C2",
    description: "Tomas de uso general y frigorífico (máx. 20 tomas)",
    usageType: "vivienda_interior",
    phaseSystem: "monofasico",
    phaseAssigned: "L1",
    voltage: 230,
    powerWatts: 3450,
    cosPhi: 1.0,
    simultaneityFactor: 1.0,
    utilizationFactor: 1.0,
    correctionFactor: 1.0,
    lengthMeters: 18,
    installationMethod: "B1",
    insulationType: "PVC_70",
    material: "Cu",
    minSectionMm2: 2.5,
    fixedPiaAmps: 16,
  },
  {
    code: "C3",
    description: "Cocina y horno (máx. 2 tomas 25A)",
    usageType: "vivienda_interior",
    phaseSystem: "monofasico",
    phaseAssigned: "L1",
    voltage: 230,
    powerWatts: 5400,
    cosPhi: 1.0,
    simultaneityFactor: 1.0,
    utilizationFactor: 1.0,
    correctionFactor: 1.0,
    lengthMeters: 12,
    installationMethod: "B1",
    insulationType: "PVC_70",
    material: "Cu",
    minSectionMm2: 6,
    fixedPiaAmps: 25,
  },
  {
    code: "C4",
    description: "Lavadora, lavavajillas y termo eléctrico (máx. 3 tomas)",
    usageType: "vivienda_interior",
    phaseSystem: "monofasico",
    phaseAssigned: "L1",
    voltage: 230,
    powerWatts: 3450,
    cosPhi: 1.0,
    simultaneityFactor: 1.0,
    utilizationFactor: 1.0,
    correctionFactor: 1.0,
    lengthMeters: 14,
    installationMethod: "B1",
    insulationType: "PVC_70",
    material: "Cu",
    minSectionMm2: 4,
    fixedPiaAmps: 20,
  },
  {
    code: "C5",
    description: "Tomas de baño y auxiliares de cocina (máx. 6 tomas)",
    usageType: "vivienda_interior",
    phaseSystem: "monofasico",
    phaseAssigned: "L1",
    voltage: 230,
    powerWatts: 3450,
    cosPhi: 1.0,
    simultaneityFactor: 1.0,
    utilizationFactor: 1.0,
    correctionFactor: 1.0,
    lengthMeters: 15,
    installationMethod: "B1",
    insulationType: "PVC_70",
    material: "Cu",
    minSectionMm2: 2.5,
    fixedPiaAmps: 16,
  },
  {
    code: "C9",
    description: "Aire acondicionado (Electrificación Elevada)",
    usageType: "vivienda_interior",
    phaseSystem: "monofasico",
    phaseAssigned: "L1",
    voltage: 230,
    powerWatts: 5750,
    cosPhi: 1.0,
    simultaneityFactor: 1.0,
    utilizationFactor: 1.0,
    correctionFactor: 1.0,
    lengthMeters: 20,
    installationMethod: "B1",
    insulationType: "PVC_70",
    material: "Cu",
    minSectionMm2: 6,
    fixedPiaAmps: 25,
  },
  {
    code: "C10",
    description: "Secadora independiente (Electrificación Elevada)",
    usageType: "vivienda_interior",
    phaseSystem: "monofasico",
    phaseAssigned: "L1",
    voltage: 230,
    powerWatts: 3450,
    cosPhi: 1.0,
    simultaneityFactor: 1.0,
    utilizationFactor: 1.0,
    correctionFactor: 1.0,
    lengthMeters: 16,
    installationMethod: "B1",
    insulationType: "PVC_70",
    material: "Cu",
    minSectionMm2: 2.5,
    fixedPiaAmps: 16,
  },
  {
    code: "C13",
    description: "Recarga de Vehículo Eléctrico (ITC-BT-52 Modo 3 - 3.680 W)",
    usageType: "recarga_ve",
    phaseSystem: "monofasico",
    phaseAssigned: "L1",
    voltage: 230,
    powerWatts: 3680,
    cosPhi: 1.0,
    simultaneityFactor: 1.0,
    utilizationFactor: 1.0,
    correctionFactor: 1.0,
    lengthMeters: 25,
    installationMethod: "B1",
    insulationType: "XLPE_90",
    material: "Cu",
    minSectionMm2: 2.5,
    fixedPiaAmps: 16,
  },
];

export function getConductivity(
  material: ConductorMaterial,
  insulation: InsulationType
): number {
  if (material === "Cu") {
    return insulation === "PVC_70" ? 48 : 44;
  }
  return insulation === "PVC_70" ? 30 : 28;
}

export function getMaxAllowedVoltageDropPct(usageType: CircuitUsageType): number {
  switch (usageType) {
    case "vivienda_interior":
    case "alumbrado":
    case "alumbrado_descarga":
      return 3.0;
    case "fuerza_otros":
    case "motor":
    case "recarga_ve":
      return 5.0;
    case "lga_centralizada":
      return 0.5;
    case "di_concentrada":
    case "lga_parcial":
      return 1.0;
    case "di_unico":
      return 1.5;
  }
}

export function getPeSectionMm2(phaseSectionMm2: number): number {
  if (phaseSectionMm2 <= 16) return phaseSectionMm2;
  if (phaseSectionMm2 <= 35) return 16;
  return phaseSectionMm2 / 2;
}

export function getIzForSection(
  row: IzRow,
  phaseSystem: "monofasico" | "trifasico",
  insulation: InsulationType,
  method: InstallationMethod,
  material: ConductorMaterial
): number {
  let baseIz = row.pvc2xB;
  const isThreePhase = phaseSystem === "trifasico";
  const isAirOrTray = method === "E" || method === "F" || method === "C";

  if (insulation === "PVC_70") {
    baseIz = isThreePhase ? row.pvc3xB : row.pvc2xB;
  } else {
    if (isAirOrTray) {
      baseIz = isThreePhase ? row.xlpe3xE : row.xlpe2xE;
    } else {
      baseIz = isThreePhase ? row.xlpe3xB : row.xlpe2xB;
    }
  }

  if (material === "Al") {
    baseIz = Math.floor(baseIz * 0.78);
  }

  return baseIz;
}

export function calculateRebtVoltageDrop(
  powerWatts: number,
  lengthMeters: number,
  voltage: 230 | 400,
  phaseSystem: "monofasico" | "trifasico",
  sectionMm2: number,
  material: ConductorMaterial,
  insulation: InsulationType
): { dropVolts: number; dropPct: number } {
  if (sectionMm2 <= 0 || voltage <= 0) {
    return { dropVolts: 0, dropPct: 0 };
  }
  const gamma = getConductivity(material, insulation);
  const factor = phaseSystem === "trifasico" ? 1 : 2;
  const dropVolts = (factor * lengthMeters * powerWatts) / (gamma * sectionMm2 * voltage);
  const dropPct = (dropVolts / voltage) * 100;

  return {
    dropVolts: Number(dropVolts.toFixed(2)),
    dropPct: Number(dropPct.toFixed(2)),
  };
}

export function calculateRebtCircuit(input: RebtCircuitInput): RebtCalculatedCircuit {
  const receptorMultiplier =
    input.usageType === "motor"
      ? 1.25
      : input.usageType === "alumbrado_descarga"
      ? 1.8
      : 1.0;

  const effectivePowerWatts = Number(
    (
      input.powerWatts *
      receptorMultiplier *
      input.simultaneityFactor *
      input.utilizationFactor
    ).toFixed(1)
  );

  const voltage = input.phaseSystem === "trifasico" ? 400 : 230;
  const denom =
    input.phaseSystem === "trifasico"
      ? Math.sqrt(3) * voltage * input.cosPhi
      : voltage * input.cosPhi;

  const currentIbAmps = denom > 0 ? Number((effectivePowerWatts / denom).toFixed(2)) : 0;
  const correctionFactorValue =
    input.correctionFactor && input.correctionFactor > 0 ? input.correctionFactor : 1.0;
  const correctedCurrentAmps = Number((currentIbAmps / correctionFactorValue).toFixed(2));

  const maxAllowedDropPct = getMaxAllowedVoltageDropPct(input.usageType);
  const minSectionRequired =
    input.minSectionMm2 ||
    (input.usageType === "lga_centralizada" || input.usageType === "lga_parcial"
      ? input.material === "Al"
        ? 16
        : 10
      : input.usageType === "di_unico" || input.usageType === "di_concentrada"
      ? 6
      : input.usageType === "recarga_ve"
      ? 2.5
      : 1.5);

  const candidatePia =
    input.fixedPiaAmps ||
    REBT_PIA_RATINGS.find((r) => r >= correctedCurrentAmps) ||
    REBT_PIA_RATINGS[REBT_PIA_RATINGS.length - 1];

  let selectedRow = ITC_BT_19_TABLE[ITC_BT_19_TABLE.length - 1];

  for (const row of ITC_BT_19_TABLE) {
    if (row.sectionMm2 < minSectionRequired) continue;

    const iz = getIzForSection(
      row,
      input.phaseSystem,
      input.insulationType,
      input.installationMethod,
      input.material
    );

    const { dropPct } = calculateRebtVoltageDrop(
      effectivePowerWatts,
      input.lengthMeters,
      voltage,
      input.phaseSystem,
      row.sectionMm2,
      input.material,
      input.insulationType
    );

    if (iz >= candidatePia && iz >= correctedCurrentAmps && dropPct <= maxAllowedDropPct) {
      selectedRow = row;
      break;
    }
  }

  const ampacityIzAmps = getIzForSection(
    selectedRow,
    input.phaseSystem,
    input.insulationType,
    input.installationMethod,
    input.material
  );

  const { dropVolts, dropPct } = calculateRebtVoltageDrop(
    effectivePowerWatts,
    input.lengthMeters,
    voltage,
    input.phaseSystem,
    selectedRow.sectionMm2,
    input.material,
    input.insulationType
  );

  let neutralSectionMm2 = selectedRow.sectionMm2;
  if (
    (input.usageType === "lga_centralizada" || input.usageType === "lga_parcial") &&
    selectedRow.sectionMm2 > 16
  ) {
    neutralSectionMm2 = Math.max(16, selectedRow.sectionMm2 / 2);
  }

  const peSectionMm2 = getPeSectionMm2(selectedRow.sectionMm2);
  const tubeDiameterMm =
    input.phaseSystem === "trifasico"
      ? selectedRow.tube3xMm
      : selectedRow.tube2xMm;

  // Intensidad de cortocircuito en el extremo del tramo (fórmula simplificada Guía-BT-Anexo 3: Icc = 0.8 * U_fase / R_bucle)
  const gamma20C = input.material === "Cu" ? 56 : 35;
  const rLoopOhm = (2 * Math.max(1, input.lengthMeters)) / (gamma20C * selectedRow.sectionMm2);
  const shortCircuitCurrentAmps = Math.round((0.8 * 230) / rLoopOhm);

  const numActiveCond = input.phaseSystem === "trifasico" ? 4 : 2;
  const conductorsSummary = `${numActiveCond}×${selectedRow.sectionMm2} ${input.material}`;
  const insulationSummary =
    input.insulationType === "XLPE_90" ? "XLPE 0,6/1kV" : "PVC 450/750V";

  return {
    ...input,
    voltage,
    effectivePowerWatts,
    currentIbAmps,
    correctionFactorValue,
    correctedCurrentAmps,
    piaAmps: candidatePia,
    fuseAmpsValue: input.fuseAmps ?? null,
    sectionMm2: selectedRow.sectionMm2,
    neutralSectionMm2,
    peSectionMm2,
    conductorsSummary,
    insulationSummary,
    ampacityIzAmps,
    voltageDropVolts: dropVolts,
    voltageDropPct: dropPct,
    maxAllowedDropPct,
    tubeDiameterMm:
      input.usageType === "di_unico" || input.usageType === "di_concentrada"
        ? Math.max(32, tubeDiameterMm)
        : tubeDiameterMm,
    shortCircuitCurrentAmps,
    isCompliant:
      correctedCurrentAmps <= candidatePia &&
      candidatePia <= ampacityIzAmps &&
      dropPct <= maxAllowedDropPct,
  };
}

// ============================================================================
// ITC-BT-10 + ITC-BT-52: Previsión de Cargas de un Edificio (Página 2/11 M.T.D.)
// ============================================================================

export function getSimultaneityCoefficientItc10(
  numDwellings: number,
  hasNightTariff = false
): number {
  if (numDwellings <= 0) return 0;
  if (hasNightTariff) return numDwellings;

  const table: Record<number, number> = {
    1: 1,
    2: 2,
    3: 3,
    4: 3.8,
    5: 4.6,
    6: 5.4,
    7: 6.2,
    8: 7.0,
    9: 7.8,
    10: 8.5,
    11: 9.2,
    12: 9.9,
    13: 10.6,
    14: 11.3,
    15: 11.9,
    16: 12.5,
    17: 13.1,
    18: 13.7,
    19: 14.3,
    20: 14.8,
    21: 15.3,
  };

  if (numDwellings <= 21) {
    return table[numDwellings];
  }
  return Number((15.3 + (numDwellings - 21) * 0.5).toFixed(2));
}

export interface BuildingLoadForecastInput {
  basicDwellingsCount: number;
  basicDwellingAreaM2?: number;
  basicDwellingPowerW?: number;
  elevatedDwellingsCount: number;
  elevatedDwellingAreaM2?: number;
  elevatedDwellingPowerW?: number;
  commonLightingWatts?: number;
  hydroWatts?: number;
  otherServicesWatts?: number;
  generalServicesWatts: number;
  commercialCount: number;
  commercialAreaM2: number;
  commercialSpecificWPerM2?: number;
  garageAreaM2: number;
  garageForcedVentilation: boolean;
  parkingSpacesCount: number;
  hasSplProtection: boolean;
  lgaLengthMeters: number;
}

export function calculateBuildingLoadForecastItc10(
  input: BuildingLoadForecastInput
) {
  const basicUnitW = input.basicDwellingPowerW || 5750;
  const elevatedUnitW = input.elevatedDwellingPowerW || 9200;

  const totalDwellings =
    input.basicDwellingsCount + input.elevatedDwellingsCount;
  const cs = getSimultaneityCoefficientItc10(totalDwellings, false);

  const avgDwellingPowerWatts =
    totalDwellings > 0
      ? (input.basicDwellingsCount * basicUnitW +
          input.elevatedDwellingsCount * elevatedUnitW) /
        totalDwellings
      : 0;

  const p1DwellingsWatts = Math.round(avgDwellingPowerWatts * cs);

  const p2GeneralServicesWatts = Math.round(input.generalServicesWatts);

  const specificW = input.commercialSpecificWPerM2 || 100;
  const p3CommercialWatts =
    input.commercialCount > 0 || input.commercialAreaM2 > 0
      ? Math.max(
          input.commercialAreaM2 * specificW,
          input.commercialCount * 3450
        )
      : 0;

  const garageRate = input.garageForcedVentilation ? 20 : 10;
  const p4GarageWatts =
    input.garageAreaM2 > 0
      ? Math.max(input.garageAreaM2 * garageRate, 3450)
      : 0;

  const evChargingStations = Math.ceil(input.parkingSpacesCount * 0.1);
  const p5RawEvWatts = evChargingStations * 3680;
  const splFactor = input.hasSplProtection ? 0.3 : 1.0;
  const p5EffectiveEvWatts = Math.round(p5RawEvWatts * splFactor);

  const totalBuildingPowerWatts =
    p1DwellingsWatts +
    p2GeneralServicesWatts +
    p3CommercialWatts +
    p4GarageWatts +
    p5EffectiveEvWatts;

  const lgaCalculation = calculateRebtCircuit({
    code: "LGA",
    description: "Línea General de Alimentación",
    usageType: "lga_centralizada",
    phaseSystem: "trifasico",
    phaseAssigned: "L1-L2-L3",
    voltage: 400,
    powerWatts: totalBuildingPowerWatts || 5750,
    cosPhi: 0.9,
    simultaneityFactor: 1.0,
    utilizationFactor: 1.0,
    lengthMeters: input.lgaLengthMeters,
    installationMethod: "B1",
    insulationType: "XLPE_90",
    material: "Cu",
    minSectionMm2: 10,
    fuseAmps: totalBuildingPowerWatts <= 90000 ? 160 : 250,
  });

  const igmAmps =
    totalBuildingPowerWatts <= 90000
      ? 160
      : totalBuildingPowerWatts <= 150000
      ? 250
      : 400;

  return {
    totalDwellings,
    simultaneityCoefficient: cs,
    avgDwellingPowerWatts: Math.round(avgDwellingPowerWatts),
    p1DwellingsWatts,
    p2GeneralServicesWatts,
    p3CommercialWatts,
    p4GarageWatts,
    evChargingStations,
    p5RawEvWatts,
    p5EffectiveEvWatts,
    totalBuildingPowerWatts,
    totalBuildingPowerKw: Number((totalBuildingPowerWatts / 1000).toFixed(2)),
    igmAmps,
    lgaCalculation,
  };
}

// ============================================================================
// ITC-BT-04 e ITC-BT-05: Clasificador de Documentación (Proyecto vs MTD) e Inspección OCA
// ============================================================================

export type Itc04GroupCode =
  | "a_industria"
  | "b_humedos_polvorientos"
  | "c_mojados_generadores"
  | "d_obras_temporales"
  | "e_edificio_viviendas"
  | "f_vivienda_unifamiliar"
  | "g_garaje_forzada"
  | "h_garaje_natural"
  | "i_publica_concurrencia"
  | "k_alumbrado_exterior"
  | "l_riesgo_incendio_explosion"
  | "m_quirofanos"
  | "n_piscinas"
  | "z_recarga_ve_interior"
  | "z_recarga_ve_exterior_modo4";

export function evaluateItc04Documentation(
  group: Itc04GroupCode,
  powerKw: number,
  parkingSpaces = 0
): {
  requiresProject: boolean;
  documentType: "Proyecto Técnico (Ingeniería)" | "Memoria Técnica de Diseño (MTD)";
  requiresInitialOcaInspection: boolean;
  normativeRule: string;
} {
  let requiresProject = false;
  let requiresInitialOcaInspection = false;
  let normativeRule = "";

  switch (group) {
    case "a_industria":
      requiresProject = powerKw > 20;
      requiresInitialOcaInspection = powerKw > 100;
      normativeRule = "ITC-BT-04 Grupo a: Industrias precisan Proyecto si P > 20 kW (OCA si P > 100 kW).";
      break;
    case "b_humedos_polvorientos":
      requiresProject = powerKw > 10;
      normativeRule = "ITC-BT-04 Grupo b: Locales húmedos, polvorientos o con riesgo de corrosión si P > 10 kW.";
      break;
    case "c_mojados_generadores":
      requiresProject = powerKw > 10;
      requiresInitialOcaInspection = powerKw > 25;
      normativeRule = "ITC-BT-04 Grupo c: Locales mojados o generadores si P > 10 kW (OCA en mojados > 25 kW).";
      break;
    case "d_obras_temporales":
      requiresProject = powerKw > 50;
      normativeRule = "ITC-BT-04 Grupo d: Instalaciones temporales de obras si P > 50 kW.";
      break;
    case "e_edificio_viviendas":
      requiresProject = powerKw > 100;
      normativeRule = "ITC-BT-04 Grupo e: Edificios de viviendas/comerciales si P > 100 kW por CGP (Inspección periódica cada 10 años si > 100 kW).";
      break;
    case "f_vivienda_unifamiliar":
      requiresProject = powerKw > 50;
      normativeRule = "ITC-BT-04 Grupo f: Viviendas unifamiliares precisan Proyecto si P > 50 kW.";
      break;
    case "g_garaje_forzada":
      requiresProject = true;
      requiresInitialOcaInspection = parkingSpaces >= 25;
      normativeRule = "ITC-BT-04 Grupo g: Garajes con ventilación forzada requieren Proyecto siempre (cualquiera que sea su ocupación).";
      break;
    case "h_garaje_natural":
      requiresProject = parkingSpaces > 5;
      normativeRule = "ITC-BT-04 Grupo h: Garajes con ventilación natural requieren Proyecto si tienen más de 5 plazas.";
      break;
    case "i_publica_concurrencia":
      requiresProject = true;
      requiresInitialOcaInspection = true;
      normativeRule = "ITC-BT-04 Grupo i / ITC-BT-05: Locales de pública concurrencia requieren Proyecto e Inspección Inicial OCA sin límite de potencia.";
      break;
    case "k_alumbrado_exterior":
      requiresProject = powerKw > 5;
      requiresInitialOcaInspection = powerKw > 5;
      normativeRule = "ITC-BT-04 Grupo k / ITC-BT-05: Alumbrado exterior precisa Proyecto e Inspección Inicial OCA si P > 5 kW.";
      break;
    case "l_riesgo_incendio_explosion":
      requiresProject = true;
      requiresInitialOcaInspection = true;
      normativeRule = "ITC-BT-04 Grupo l / ITC-BT-29: Locales con riesgo de incendio o explosión precisan Proyecto e Inspección OCA sin límite.";
      break;
    case "m_quirofanos":
      requiresProject = true;
      requiresInitialOcaInspection = true;
      normativeRule = "ITC-BT-04 Grupo m / ITC-BT-38: Quirófanos y salas de intervención precisan Proyecto e Inspección OCA sin límite.";
      break;
    case "n_piscinas":
      requiresProject = powerKw > 5;
      requiresInitialOcaInspection = powerKw > 10;
      normativeRule = "ITC-BT-04 Grupo n: Piscinas y fuentes precisan Proyecto si P > 5 kW (Inspección OCA si P > 10 kW).";
      break;
    case "z_recarga_ve_interior":
      requiresProject = powerKw > 50;
      requiresInitialOcaInspection = powerKw > 50;
      normativeRule = "ITC-BT-04 Grupo z: Infraestructura de recarga de VE precisa Proyecto e Inspección OCA si P > 50 kW.";
      break;
    case "z_recarga_ve_exterior_modo4":
      requiresProject = true;
      requiresInitialOcaInspection = true;
      normativeRule = "ITC-BT-04 Grupo z: Recarga VE en exterior (P > 10 kW) o con Modo de carga 4 requiere Proyecto e Inspección OCA.";
      break;
  }

  return {
    requiresProject,
    documentType: requiresProject
      ? "Proyecto Técnico (Ingeniería)"
      : "Memoria Técnica de Diseño (MTD)",
    requiresInitialOcaInspection,
    normativeRule,
  };
}

// ============================================================================
// ITC-BT-18 e ITC-BT-24: Cálculo de Puesta a Tierra (Esquema TT)
// ============================================================================
export function calculateEarthingItc18(params: {
  soilResistivityOhmM: number;
  rodLengthMeters: number;
  numRods: number;
  buriedConductorMeters: number;
  maxContactVoltageV: 50 | 24;
  rcdSensitivityMa: 30 | 100 | 300 | 500;
}) {
  const rRods =
    params.numRods > 0 && params.rodLengthMeters > 0
      ? params.soilResistivityOhmM / (params.rodLengthMeters * params.numRods)
      : Infinity;

  const rConductor =
    params.buriedConductorMeters > 0
      ? (2 * params.soilResistivityOhmM) / params.buriedConductorMeters
      : Infinity;

  const totalResistanceOhm =
    rRods === Infinity && rConductor === Infinity
      ? 0
      : rRods === Infinity
      ? rConductor
      : rConductor === Infinity
      ? rRods
      : (rRods * rConductor) / (rRods + rConductor);

  const iaAmps = params.rcdSensitivityMa / 1000;
  const maxAllowedRaOhm = Number((params.maxContactVoltageV / iaAmps).toFixed(1));
  const roundedResistanceOhm = Number(totalResistanceOhm.toFixed(2));

  return {
    estimatedResistanceOhm: roundedResistanceOhm,
    maxAllowedRaOhm,
    isCompliant:
      roundedResistanceOhm > 0 && roundedResistanceOhm <= maxAllowedRaOhm,
  };
}

// ============================================================================
// Modelo de Datos Completo de la Ficha Oficial M.T.D. B.T. (Gobierno de Canarias)
// ============================================================================
export interface ReceptorRow {
  description: string;
  powerWatts: number;
}

export interface MtdFormMetadata {
  // Cabecera oficial (Todas las páginas)
  instalacionNum: string;
  expedienteNum: string;

  // Página 1: Datos del Titular y Ubicación
  titularNombre: string;
  titularNif: string;
  direccionCalle: string;
  direccionNum: string;
  portalPlanta: string;
  terminoMunicipal: string;
  isla: string;
  telefono: string;
  codigoPostal: string;
  superficieUtilM2: number;
  usoDestino: string;
  numPlantas: number;

  // Página 1: Acometida, Canalización, Protecciones, Medida, Puesta a Tierra, Cuadros, Presupuesto
  acometidaTipo: "Aerea" | "Subterranea" | "Aereo-Subterranea";
  acometidaMaterial: "Cu" | "Al";
  acometidaSeccionMm2: number;
  acometidaCanalizacionDesc: string;
  acometidaCanalizacionDim: string;
  acometidaModoRef: string;
  acometidaModoTipo: string;

  lgaCanalizacionDesc: string;
  diCanalizacionDesc: string;
  interiorCanalizacionDesc: string;

  sobretensionesKv: string;
  diferencialClase: "AC" | "A" | "S" | "B";
  diferencialCalibreAmps: number;
  numContadoresTotal: number;

  electrodosDescripcion: string;
  conductorTierraMm2: number;
  disponeRedEquipotencial: boolean;
  redEquipotencialMm2: number;

  numCuadrosPrincipales: number;
  numCuadrosSecundarios: number;
  numRestoCuadros: number;
  tensionSeguridad: 50 | 24 | 12;

  suministroEmergencia: "Ninguno" | "Reserva" | "Socorro" | "Duplicado";
  tipoInstalacion:
    | "Normal"
    | "L.P.C."
    | "R.I. o Exp."
    | "Local especial"
    | "Instalación especial"
    | "Domótica"
    | "Otras";
  presupuestoTotalEuros: number;

  // Página 2: Receptores Otros Servicios
  otrosServiciosReceptores: ReceptorRow[];

  // Página 3: Locales comerciales / Industrias (cuando se conocen receptores)
  industriasCount: number;
  industriasAreaM2: number;
  receptoresAlumbrado: ReceptorRow[];
  receptoresFuerza: ReceptorRow[];

  // Página 4: Almacenes (Circular BT05/04) y Suministros Singulares
  almacenesSinUsoCount: number;
  almacenesSinUsoAreaM2: number;
  almacenesConUsoDestino: string;
  almacenesConUsoAreaM2: number;
  receptoresSingularesAlumbrado: ReceptorRow[];
  receptoresSingularesFuerza: ReceptorRow[];

  // Página 5: Memoria Descriptiva (si está vacío se autogenera)
  memoriaDescriptivaTexto: string;

  // Página 9: Coordenadas Geográficas / UTM, Catastro, Croquis 1B Manual y Fotografía de Fachada
  coordenadasLat?: string;
  coordenadasLng?: string;
  coordenadasUtm?: string;
  referenciaCatastral?: string;
  fachadaFotoDataUrl?: string;
  fachadaNotaPuntoSuministro?: string;
  fachadaPinX?: number;
  fachadaPinY?: number;
  croquisMapaQuery?: string;
  croquisCallePrincipal?: string;
  croquisCalleCruce?: string;
  croquisRefNoroeste?: string;
  croquisRefNoreste?: string;
  croquisRefSuroeste?: string;
  croquisParcelaTitulo?: string;
  croquisParcelaSubtitulo?: string;
  croquisNotaAcometida?: string;
  croquisMostrarAcometida?: boolean;
  croquisParcelaX?: number;
  croquisParcelaY?: number;
  croquisPinX?: number;
  croquisPinY?: number;
  croquisRedX?: number;
  croquisRedY?: number;
  croquisNorteGrados?: number;
  croquisDibujoJson?: string;
  croquisImagenDataUrl?: string;
  croquisFotoPinX?: number;
  croquisFotoPinY?: number;

  // Campos clave Sede Electrónica Gobierno de Canarias / Edistribución NRZ103 (Tenerife)
  cupsCodigo?: string;
  resistenciaTierraMedidaOhm?: number;
  tipoActuacion?:
    | "Nueva instalación"
    | "Ampliación / Modificación"
    | "Reforma de importancia";

  // Página 11: Autor de la M.T.D. (Instalador Autorizado PH / Técnico Competente)
  autorTipo: "instalador_ph" | "tecnico_competente";
  instaladorNombrePh: string;
  instaladorCciNum: string;
  instaladorCategoria: "Basica" | "Especialista";
  instaladorEspecialidades: string[]; // E1, E6, E7, E8, E9
  empresaInstaladoraNombre: string;
  empresaInstaladoraNum: string;
  instaladorDoi: string;
  instaladorDomicilio: string;
  instaladorNumeroCalle: string;
  instaladorLocalidad: string;
  instaladorCp: string;
  instaladorTelefono: string;

  tecnicoNombre: string;
  tecnicoColegiadoNum: string;
  tecnicoDomicilio: string;
  tecnicoNumeroCalle: string;
  tecnicoLocalidad: string;
  tecnicoCp: string;
  tecnicoTelefono: string;
  tecnicoColegioOficial: string;

  numDocumentosMtd: number;
  ciudadFirma: string;
  diaFirma: string;
  mesFirma: string;
  anioFirma: string;
}

export const DEFAULT_MTD_METADATA: MtdFormMetadata = {
  instalacionNum: "BT-2026-00418",
  expedienteNum: "EXP-TF-2026-0892",

  titularNombre: "Promociones Residenciales Canarias S.L.",
  titularNif: "B-38901245",
  direccionCalle: "Avda. Tres de Mayo",
  direccionNum: "42",
  portalPlanta: "Portal 1 - Baja a 4ª",
  terminoMunicipal: "Santa Cruz de Tenerife",
  isla: "Tenerife",
  telefono: "922 24 58 90",
  codigoPostal: "38005",
  superficieUtilM2: 95,
  usoDestino: "Vivienda / Edificio Residencial",
  numPlantas: 4,

  acometidaTipo: "Subterranea",
  acometidaMaterial: "Al",
  acometidaSeccionMm2: 50,
  acometidaCanalizacionDesc: "Tubo enterrado bajo acera",
  acometidaCanalizacionDim: "Ø 110 mm",
  acometidaModoRef: "D",
  acometidaModoTipo: "Subterránea",

  lgaCanalizacionDesc: "Tubo en conducto de obra",
  diCanalizacionDesc: "Tubo empotrado en hueco de obra",
  interiorCanalizacionDesc: "Tubo flexible empotrado en obra",

  sobretensionesKv: "1,5",
  diferencialClase: "A",
  diferencialCalibreAmps: 40,
  numContadoresTotal: 1,

  electrodosDescripcion: "Picas cilíndricas Cu 2m + anillo Cu 35 mm²",
  conductorTierraMm2: 16,
  disponeRedEquipotencial: true,
  redEquipotencialMm2: 4,

  numCuadrosPrincipales: 1,
  numCuadrosSecundarios: 0,
  numRestoCuadros: 0,
  tensionSeguridad: 50,

  suministroEmergencia: "Ninguno",
  tipoInstalacion: "Normal",
  presupuestoTotalEuros: 6450,

  otrosServiciosReceptores: [
    { description: "Ascensor eléctrico 1 velocidad (ITC-BT-47)", powerWatts: 4500 },
    { description: "Grupo de presión de agua potable", powerWatts: 2200 },
    { description: "Alumbrado de escalera y portal LED", powerWatts: 1200 },
    { description: "Equipo ICT y telecomunicaciones", powerWatts: 1100 },
    { description: "Ventilación y extracción garaje", powerWatts: 2500 },
    { description: "", powerWatts: 0 },
  ],

  industriasCount: 0,
  industriasAreaM2: 0,
  receptoresAlumbrado: [
    { description: "Luminarias LED empotradas 40W", powerWatts: 1200 },
    { description: "Alumbrado de emergencia autónomo LED", powerWatts: 180 },
    { description: "Proyectores escaparate / fachada", powerWatts: 450 },
  ],
  receptoresFuerza: [
    { description: "Tomas de corriente de uso general 16A", powerWatts: 3450 },
    { description: "Equipo climatización inverter Split/Conductos", powerWatts: 4200 },
    { description: "Termo eléctrico ACS", powerWatts: 1500 },
  ],

  almacenesSinUsoCount: 0,
  almacenesSinUsoAreaM2: 0,
  almacenesConUsoDestino: "",
  almacenesConUsoAreaM2: 0,
  receptoresSingularesAlumbrado: [],
  receptoresSingularesFuerza: [],

  memoriaDescriptivaTexto: "",
  coordenadasLat: "28.458920",
  coordenadasLng: "-16.254680",
  coordenadasUtm: "28R · X: 377.145 m · Y: 3.148.920 m",
  referenciaCatastral: "9402801CS7490S0001WX",
  fachadaFotoDataUrl: "",
  fachadaNotaPuntoSuministro: "CGP / CPM en fachada principal accesible desde vía pública",
  fachadaPinX: 50,
  fachadaPinY: 62,
  croquisMapaQuery: "",
  croquisCallePrincipal: "",
  croquisCalleCruce: "",
  croquisRefNoroeste: "",
  croquisRefNoreste: "",
  croquisRefSuroeste: "",
  croquisParcelaTitulo: "EMPLAZAMIENTO B.T.",
  croquisParcelaSubtitulo: "",
  croquisNotaAcometida: "Red B.T. → CGP",
  croquisMostrarAcometida: true,
  croquisParcelaX: 345,
  croquisParcelaY: 218,
  croquisPinX: 430,
  croquisPinY: 218,
  croquisRedX: 295,
  croquisRedY: 185,
  croquisNorteGrados: 0,
  croquisDibujoJson: "[]",
  croquisImagenDataUrl: "",
  croquisFotoPinX: 50,
  croquisFotoPinY: 62,
  cupsCodigo: "ES0031600000000001AB",
  resistenciaTierraMedidaOhm: 18,
  tipoActuacion: "Nueva instalación",

  autorTipo: "instalador_ph",
  instaladorNombrePh: "Daniel Gómez Rojas",
  instaladorCciNum: "CCI-TF-4821",
  instaladorCategoria: "Especialista",
  instaladorEspecialidades: ["E1", "E6", "E7", "E8", "E9"],
  empresaInstaladoraNombre: "Ingeniería e Instalaciones Eléctricas Gómez S.L.",
  empresaInstaladoraNum: "EI-38-02941",
  instaladorDoi: "43.829.104-Z",
  instaladorDomicilio: "C/ Castillo",
  instaladorNumeroCalle: "18",
  instaladorLocalidad: "Santa Cruz de Tenerife",
  instaladorCp: "38002",
  instaladorTelefono: "629 48 12 30",

  tecnicoNombre: "Daniel Gómez Rojas",
  tecnicoColegiadoNum: "COIITF-3109",
  tecnicoDomicilio: "C/ Castillo",
  tecnicoNumeroCalle: "18",
  tecnicoLocalidad: "Santa Cruz de Tenerife",
  tecnicoCp: "38002",
  tecnicoTelefono: "629 48 12 30",
  tecnicoColegioOficial: "Colegio Oficial de Ingenieros Técnicos Industriales de S/C de Tenerife",

  numDocumentosMtd: 11,
  ciudadFirma: "Las Palmas / S/C de Tenerife",
  diaFirma: "01",
  mesFirma: "Noviembre",
  anioFirma: "26",
};

/**
 * Convierte coordenadas geográficas (WGS84 / ETRS89 / REGCAN95) a cadena UTM oficial
 * con huso y banda (ej. 28R en Canarias, 29T/30T/30S/31T en Península y Baleares).
 */
export function latLonToUtmSpain(
  lat: number,
  lon: number
): {
  zone: number;
  band: string;
  easting: number;
  northing: number;
  formatted: string;
} {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { zone: 30, band: "T", easting: 0, northing: 0, formatted: "" };
  }
  const a = 6378137.0;
  const f = 1 / 298.257223563;
  const k0 = 0.9996;
  const e2 = f * (2 - f);
  const ep2 = e2 / (1 - e2);

  const zone = Math.max(1, Math.min(60, Math.floor((lon + 180) / 6) + 1));
  const bands = "CDEFGHJKLMNPQRSTUVWXX";
  const bandIdx = Math.max(0, Math.min(bands.length - 1, Math.floor((lat + 80) / 8)));
  const band = bands[bandIdx] || "R";

  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const lon0Rad = (((zone - 1) * 6 - 180 + 3) * Math.PI) / 180;

  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const tanLat = Math.tan(latRad);

  const N = a / Math.sqrt(1 - e2 * sinLat * sinLat);
  const T = tanLat * tanLat;
  const C = ep2 * cosLat * cosLat;
  const A = cosLat * (lonRad - lon0Rad);

  const M =
    a *
    ((1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256) * latRad -
      ((3 * e2) / 8 + (3 * e2 * e2) / 32 + (45 * e2 * e2 * e2) / 1024) *
        Math.sin(2 * latRad) +
      ((15 * e2 * e2) / 256 + (45 * e2 * e2 * e2) / 1024) *
        Math.sin(4 * latRad) -
      ((35 * e2 * e2 * e2) / 3072) * Math.sin(6 * latRad));

  const easting = Math.round(
    500000 +
      k0 *
        N *
        (A +
          ((1 - T + C) * Math.pow(A, 3)) / 6 +
          ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * Math.pow(A, 5)) / 120)
  );
  let northing = Math.round(
    k0 *
      (M +
        N *
          tanLat *
          ((A * A) / 2 +
            ((5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4)) / 24 +
            ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * Math.pow(A, 6)) /
              720))
  );
  if (lat < 0) northing += 10000000;

  const formatted = `${zone}${band} · X: ${easting} m · Y: ${northing} m`;
  return { zone, band, easting, northing, formatted };
}
