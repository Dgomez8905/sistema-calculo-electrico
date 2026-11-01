export type SystemType =
  | "monofasico_120v"
  | "bifasico_120_240v"
  | "trifasico_208v"
  | "trifasico_480v";

export type LoadCategory =
  | "iluminacion"
  | "tomacorrientes"
  | "climatizacion"
  | "motores"
  | "especial";

export type ConductorMaterial = "Cu" | "Al";

export interface CircuitInput {
  id?: number;
  circuitNumber: number;
  description: string;
  loadCategory: LoadCategory;
  phaseAssignment: "A" | "B" | "C" | "AB" | "BC" | "CA" | "ABC";
  phases: 1 | 2 | 3;
  voltage: number;
  powerVa: number;
  powerFactor: number;
  isContinuous: boolean;
  lengthMeters: number;
  conductorMaterial: ConductorMaterial;
}

export interface CalculatedCircuit extends CircuitInput {
  calculatedCurrentAmps: number;
  designCurrentAmps: number;
  recommendedAwg: string;
  breakerAmps: number;
  voltageDropPct: number;
  conduitInch: string;
  isCompliant: boolean;
}

interface AwgSpec {
  label: string;
  areaMm2: number;
  ampacityCu75C: number;
  ampacityAl75C: number;
  conduitInch: string;
}

// Tabla NEC 310.16 (Columna 75°C THWN / THHN)
export const AWG_TABLE: AwgSpec[] = [
  { label: "14 AWG", areaMm2: 2.08, ampacityCu75C: 20, ampacityAl75C: 15, conduitInch: '1/2"' },
  { label: "12 AWG", areaMm2: 3.31, ampacityCu75C: 25, ampacityAl75C: 20, conduitInch: '1/2"' },
  { label: "10 AWG", areaMm2: 5.26, ampacityCu75C: 35, ampacityAl75C: 30, conduitInch: '1/2"' },
  { label: "8 AWG", areaMm2: 8.37, ampacityCu75C: 50, ampacityAl75C: 40, conduitInch: '3/4"' },
  { label: "6 AWG", areaMm2: 13.3, ampacityCu75C: 65, ampacityAl75C: 50, conduitInch: '3/4"' },
  { label: "4 AWG", areaMm2: 21.15, ampacityCu75C: 85, ampacityAl75C: 65, conduitInch: '1"' },
  { label: "2 AWG", areaMm2: 33.62, ampacityCu75C: 115, ampacityAl75C: 90, conduitInch: '1 1/4"' },
  { label: "1/0 AWG", areaMm2: 53.49, ampacityCu75C: 150, ampacityAl75C: 120, conduitInch: '1 1/2"' },
  { label: "2/0 AWG", areaMm2: 67.43, ampacityCu75C: 175, ampacityAl75C: 135, conduitInch: '2"' },
  { label: "3/0 AWG", areaMm2: 85.01, ampacityCu75C: 200, ampacityAl75C: 155, conduitInch: '2"' },
  { label: "4/0 AWG", areaMm2: 107.2, ampacityCu75C: 230, ampacityAl75C: 180, conduitInch: '2 1/2"' },
  { label: "250 kcmil", areaMm2: 126.7, ampacityCu75C: 255, ampacityAl75C: 205, conduitInch: '2 1/2"' },
  { label: "350 kcmil", areaMm2: 177.3, ampacityCu75C: 310, ampacityAl75C: 250, conduitInch: '3"' },
  { label: "500 kcmil", areaMm2: 253.4, ampacityCu75C: 380, ampacityAl75C: 310, conduitInch: '3 1/2"' },
];

const STANDARD_BREAKERS = [
  15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200,
  225, 250, 300, 350, 400,
];

// Resistividad aproximada a 75°C (Ohm·mm²/m)
const RESISTIVITY = {
  Cu: 0.0214,
  Al: 0.0352,
};

export function calculateVoltageDropPct(
  currentAmps: number,
  lengthMeters: number,
  voltage: number,
  phases: 1 | 2 | 3,
  areaMm2: number,
  material: ConductorMaterial
): number {
  if (voltage <= 0 || areaMm2 <= 0) return 0;
  const rho = RESISTIVITY[material];
  // Factor: 2 para monofásico/bifásico, √3 para trifásico
  const phaseFactor = phases === 3 ? Math.sqrt(3) : 2;
  const deltaV = (phaseFactor * rho * lengthMeters * currentAmps) / areaMm2;
  return Number(((deltaV / voltage) * 100).toFixed(2));
}

export function calculateCircuit(input: CircuitInput): CalculatedCircuit {
  const denominator =
    input.phases === 3
      ? Math.sqrt(3) * input.voltage * input.powerFactor
      : input.voltage * input.powerFactor;

  const calculatedCurrentAmps =
    denominator > 0 ? Number((input.powerVa / denominator).toFixed(2)) : 0;

  // NEC 210.20(A): 125% para cargas continuas
  const designCurrentAmps = Number(
    (calculatedCurrentAmps * (input.isContinuous ? 1.25 : 1.0)).toFixed(2)
  );

  // Calibre mínimo #12 AWG para tomacorrientes/fuerza, #14 AWG para iluminación ligera
  const minIndex = input.loadCategory === "iluminacion" ? 0 : 1;

  let selectedSpec = AWG_TABLE[AWG_TABLE.length - 1];
  for (let i = minIndex; i < AWG_TABLE.length; i++) {
    const spec = AWG_TABLE[i];
    const ampacity =
      input.conductorMaterial === "Cu" ? spec.ampacityCu75C : spec.ampacityAl75C;
    const vDrop = calculateVoltageDropPct(
      calculatedCurrentAmps,
      input.lengthMeters,
      input.voltage,
      input.phases,
      spec.areaMm2,
      input.conductorMaterial
    );

    if (ampacity >= designCurrentAmps && vDrop <= 3.0) {
      selectedSpec = spec;
      break;
    }
  }

  const voltageDropPct = calculateVoltageDropPct(
    calculatedCurrentAmps,
    input.lengthMeters,
    input.voltage,
    input.phases,
    selectedSpec.areaMm2,
    input.conductorMaterial
  );

  const breakerAmps =
    STANDARD_BREAKERS.find((b) => b >= designCurrentAmps) ||
    STANDARD_BREAKERS[STANDARD_BREAKERS.length - 1];

  return {
    ...input,
    calculatedCurrentAmps,
    designCurrentAmps,
    recommendedAwg: selectedSpec.label,
    breakerAmps: Math.max(breakerAmps, input.loadCategory === "iluminacion" ? 15 : 20),
    voltageDropPct,
    conduitInch: selectedSpec.conduitInch,
    isCompliant: voltageDropPct <= 3.0,
  };
}

export function calculatePanelSummary(
  circuits: CalculatedCircuit[],
  systemType: SystemType,
  demandFactor: number
) {
  const totalConnectedVa = circuits.reduce((acc, c) => acc + c.powerVa, 0);
  const totalDemandVa = Number((totalConnectedVa * demandFactor).toFixed(2));

  // Balance por fases (VA por fase A, B, C)
  const phaseLoads = { A: 0, B: 0, C: 0 };
  for (const c of circuits) {
    if (c.phaseAssignment === "A") phaseLoads.A += c.powerVa;
    else if (c.phaseAssignment === "B") phaseLoads.B += c.powerVa;
    else if (c.phaseAssignment === "C") phaseLoads.C += c.powerVa;
    else if (c.phaseAssignment === "AB") {
      phaseLoads.A += c.powerVa / 2;
      phaseLoads.B += c.powerVa / 2;
    } else if (c.phaseAssignment === "BC") {
      phaseLoads.B += c.powerVa / 2;
      phaseLoads.C += c.powerVa / 2;
    } else if (c.phaseAssignment === "CA") {
      phaseLoads.C += c.powerVa / 2;
      phaseLoads.A += c.powerVa / 2;
    } else if (c.phaseAssignment === "ABC") {
      phaseLoads.A += c.powerVa / 3;
      phaseLoads.B += c.powerVa / 3;
      phaseLoads.C += c.powerVa / 3;
    }
  }

  const activePhases =
    systemType === "monofasico_120v"
      ? [phaseLoads.A]
      : systemType === "bifasico_120_240v"
      ? [phaseLoads.A, phaseLoads.B]
      : [phaseLoads.A, phaseLoads.B, phaseLoads.C];

  const maxPhase = Math.max(...activePhases, 0);
  const minPhase = Math.min(...activePhases, 0);
  const phaseImbalancePct =
    maxPhase > 0 ? Number((((maxPhase - minPhase) / maxPhase) * 100).toFixed(1)) : 0;

  const systemVoltage =
    systemType === "monofasico_120v"
      ? 120
      : systemType === "bifasico_120_240v"
      ? 240
      : systemType === "trifasico_208v"
      ? 208
      : 480;

  const isThreePhase =
    systemType === "trifasico_208v" || systemType === "trifasico_480v";

  const feederCurrentAmps =
    systemVoltage > 0
      ? Number(
          (
            totalDemandVa /
            ((isThreePhase ? Math.sqrt(3) : 1) * systemVoltage * 0.9)
          ).toFixed(2)
        )
      : 0;

  const feederDesignAmps = Number((feederCurrentAmps * 1.25).toFixed(2));
  const mainBreakerAmps =
    STANDARD_BREAKERS.find((b) => b >= feederDesignAmps) || 400;
  const mainFeederSpec =
    AWG_TABLE.find((s) => s.ampacityCu75C >= feederDesignAmps) ||
    AWG_TABLE[AWG_TABLE.length - 1];

  return {
    totalConnectedVa,
    totalDemandVa,
    phaseLoads,
    phaseImbalancePct,
    feederCurrentAmps,
    feederDesignAmps,
    mainBreakerAmps,
    mainFeederAwg: mainFeederSpec.label,
    mainConduitInch: mainFeederSpec.conduitInch,
  };
}
