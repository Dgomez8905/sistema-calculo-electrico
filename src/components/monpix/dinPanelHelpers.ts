// ============================================================================
// Motor interactivo del Simulador de Cuadro Eléctrico DIN y Validación REBT
// + Catálogo de Símbolos Internacionales IEC 60617 para Esquema Unifilar
// ============================================================================

import type {
  MtdFormMetadata,
  RebtCalculatedCircuit,
  SystemSupplyType,
} from "@/lib/electrical-calculations";

export type DinModuleKind =
  | "IGA"
  | "DPS"
  | "POP"
  | "COMBI"
  | "DIF"
  | "PIA"
  | "CONTACTOR"
  | "TIMER"
  | "METER";

export interface DinModule {
  id: string;
  kind: DinModuleKind;
  label: string;
  sublabel: string;
  ratingAmps: number;
  curve?: "B" | "C" | "D";
  sensitivityMa?: number;
  rcdClass?: "AC" | "A" | "S" | "F" | "B";
  poles: 1 | 2 | 3 | 4;
  modulesWidth: number;
  isOn: boolean;
  isTripped?: boolean;
  parentRcdId?: string;
  neutralSourceRcdId?: string;
  cableSectionMm2?: number;
  hasEarthConnected?: boolean;
  powerWatts?: number;
  phaseAssigned?: "L1" | "L2" | "L3" | "L1-L2-L3";
  circuitCode?: string;
}

export interface PanelDiagnostic {
  id: string;
  severity: "error" | "warning" | "ok";
  code: string;
  title: string;
  detail: string;
  itc: string;
  solution: string;
  moduleId?: string;
  autoFixType?:
    | "add_iga"
    | "add_rcd"
    | "assign_rcd"
    | "split_rcd"
    | "upsize_wire"
    | "add_surge"
    | "fix_neutral"
    | "fix_pe"
    | "upsize_iga";
}

export interface FaultChallengeScenario {
  id: string;
  title: string;
  symptomHint: string;
  correctOptionIndex: number;
  options: string[];
  explanation: string;
}

export const FAULT_CHALLENGES: FaultChallengeScenario[] = [
  {
    id: "fault_undersized_wire",
    title: "Avería #1: Calentamiento en línea de fuerza",
    symptomHint:
      "Activa 'Ver cables' y revisa los calibres de PIA frente a la sección de conductor instalada.",
    correctOptionIndex: 1,
    options: [
      "Falta el IGA general en cabecera del cuadro.",
      "Cable infradimensionado (1,5 mm² bajo PIA de 25 A): peligro de incendio por sobreintensidad.",
      "Hay dos diferenciales conectados en cascada inversa.",
    ],
    explanation:
      "Según ITC-BT-19 Tabla 1 e ITC-BT-25, un conductor de 1,5 mm² soporta como máximo ~13,5-15 A empotrado y debe protegerse como máximo con PIA de 10 A (nunca 25 A).",
  },
  {
    id: "fault_no_rcd",
    title: "Avería #2: Circuito de enchufes sin protección diferencial",
    symptomHint:
      "Prueba 'Provocar una fuga' o revisa el cableado entre los diferenciales y los PIAs.",
    correctOptionIndex: 0,
    options: [
      "Un PIA de tomas está conectado directo tras el IGA saltándose el Diferencial de 30 mA.",
      "El IGA es de curva C en vez de curva B.",
      "Faltan bornas libres en el embarrado de tierra.",
    ],
    explanation:
      "ITC-BT-24 e ITC-BT-25 obligan a proteger todos los circuitos de tomas de corriente y alumbrado con interruptor diferencial ≤ 30 mA.",
  },
  {
    id: "fault_crossed_neutral",
    title: "Avería #3: El diferencial salta nada más dar tensión al circuito",
    symptomHint:
      "Sube todos los interruptores o mira el modo 'Ver cables': un neutro retorna por el diferencial equivocado.",
    correctOptionIndex: 2,
    options: [
      "El descargador DPS está cortocircuitado.",
      "La sección del conductor neutro es mayor que la fase.",
      "Neutro cruzado entre DIF #1 y DIF #2: la corriente sale por un diferencial y vuelve por otro.",
    ],
    explanation:
      "Cuando un circuito toma fase de DIF #1 pero su neutro va al bornero de DIF #2, ambos toroides detectan desequilibrio (I_fase ≠ I_neutro) y disparan al instante.",
  },
  {
    id: "fault_missing_pe",
    title: "Avería #4: Masa metálica con riesgo de contacto indirecto",
    symptomHint:
      "Comprueba las conexiones al bornero de tierra verde-amarillo inferior con 'Ver cables'.",
    correctOptionIndex: 1,
    options: [
      "Sobretensión permanente superior a 275 V en acometida.",
      "Circuito sin conductor de protección (PE) conectado al bornero de tierra.",
      "Demasiados módulos de reserva en la envolvente.",
    ],
    explanation:
      "ITC-BT-18 e ITC-BT-24: todo circuito terminal debe llevar su conductor de protección verde-amarillo individual a una borna propia del bornero de tierra.",
  },
];

// ============================================================================
// Construye módulos DIN iniciales a partir del expediente activo
// ============================================================================
export function buildDinModulesFromProject(params: {
  supplyType: SystemSupplyType;
  igaAmps: number;
  rcdCount: number;
  hasCombiSurge: boolean;
  meta: MtdFormMetadata;
  circuits: RebtCalculatedCircuit[];
}): DinModule[] {
  const { supplyType, igaAmps, rcdCount, hasCombiSurge, meta, circuits } = params;
  const isThreePhase = supplyType === "trifasico_400v";
  const modules: DinModule[] = [];

  modules.push({
    id: "mod-iga",
    kind: "IGA",
    label: "IGA",
    sublabel: isThreePhase ? "4P" : "2P",
    ratingAmps: igaAmps,
    curve: "C",
    poles: isThreePhase ? 4 : 2,
    modulesWidth: isThreePhase ? 4 : 2,
    isOn: true,
  });

  if (hasCombiSurge) {
    modules.push({
      id: "mod-dps",
      kind: "DPS",
      label: "DPS",
      sublabel: "Transitorias",
      ratingAmps: 15,
      poles: isThreePhase ? 4 : 2,
      modulesWidth: 2,
      isOn: true,
    });
    modules.push({
      id: "mod-pop",
      kind: "POP",
      label: "POP",
      sublabel: "Permanentes",
      ratingAmps: igaAmps,
      poles: 1,
      modulesWidth: 1,
      isOn: true,
    });
  }

  const totalRcds = Math.max(1, rcdCount);
  const rcdIds: string[] = [];

  for (let g = 0; g < totalRcds; g++) {
    const rcdId = `mod-dif-${g + 1}`;
    rcdIds.push(rcdId);
    modules.push({
      id: rcdId,
      kind: "DIF",
      label: `DIF #${g + 1}`,
      sublabel: `30mA · ${meta.diferencialClase}`,
      ratingAmps: Math.max(40, igaAmps),
      sensitivityMa: 30,
      rcdClass: meta.diferencialClase,
      poles: isThreePhase ? 4 : 2,
      modulesWidth: isThreePhase ? 4 : 2,
      isOn: true,
      isTripped: false,
    });

    const groupCircuits = circuits.slice(g * 5, (g + 1) * 5);
    groupCircuits.forEach((c, idx) => {
      modules.push({
        id: `mod-pia-${c.code}-${g}-${idx}`,
        kind: "PIA",
        label: c.code,
        sublabel: c.description.split("(")[0].trim().slice(0, 16),
        ratingAmps: c.piaAmps,
        curve: "C",
        poles: c.phaseSystem === "trifasico" ? 4 : 2,
        modulesWidth: c.phaseSystem === "trifasico" ? 3 : 1,
        isOn: true,
        parentRcdId: rcdId,
        neutralSourceRcdId: rcdId,
        cableSectionMm2: c.sectionMm2,
        hasEarthConnected: true,
        powerWatts: c.powerWatts,
        phaseAssigned: c.phaseAssigned,
        circuitCode: c.code,
      });
    });
  }

  return modules;
}

// Máxima intensidad admisible orientativa cobre empotrado tubo B1 (ITC-BT-19)
export function getMaxSafePiaForSection(sectionMm2: number): number {
  if (sectionMm2 <= 1.5) return 10;
  if (sectionMm2 <= 2.5) return 16;
  if (sectionMm2 <= 4) return 25;
  if (sectionMm2 <= 6) return 32;
  if (sectionMm2 <= 10) return 50;
  if (sectionMm2 <= 16) return 63;
  return 100;
}

export function suggestBoxCapacityModules(usedModules: number): {
  boxModules: number;
  rows: number;
  perRow: number;
  freeModules: number;
  reservePct: number;
} {
  const targetWithReserve = Math.ceil(usedModules * 1.3);
  const standardSizes = [12, 18, 24, 36, 48, 72];
  const boxModules =
    standardSizes.find((s) => s >= targetWithReserve && s >= usedModules) ||
    Math.ceil((targetWithReserve + 6) / 12) * 12;

  const perRow = boxModules <= 12 ? 12 : boxModules <= 18 ? 18 : 12;
  const rows = boxModules <= 18 ? 1 : Math.ceil(boxModules / perRow);
  const freeModules = Math.max(0, boxModules - usedModules);
  const reservePct = boxModules > 0 ? Math.round((freeModules / boxModules) * 100) : 0;
  return { boxModules, rows, perRow, freeModules, reservePct };
}

// ============================================================================
// Validador en tiempo real del cuadro montado + Diagnóstico + Soluciones
// ============================================================================
export function validateDinPanelInstallation(
  modules: DinModule[],
  boxModules: number
): PanelDiagnostic[] {
  const issues: PanelDiagnostic[] = [];

  const igas = modules.filter((m) => m.kind === "IGA");
  const rcds = modules.filter((m) => m.kind === "DIF");
  const pias = modules.filter((m) => m.kind === "PIA");
  const hasDps = modules.some((m) => m.kind === "DPS" || m.kind === "COMBI");
  const hasPop = modules.some((m) => m.kind === "POP" || m.kind === "COMBI");

  // 1. Verificar existencia de IGA
  if (igas.length === 0) {
    issues.push({
      id: "err-no-iga",
      severity: "error",
      code: "SIN-IGA",
      title: "Falta Interruptor General Automático (IGA)",
      detail:
        "No hay corte general omnipolar en la cabecera del cuadro para proteger la Derivación Individual.",
      itc: "ITC-BT-17 / ITC-BT-25",
      solution:
        "Agrega un IGA 2P o 4P en la primera posición del carril DIN (mínimo 25 A en vivienda básica).",
      autoFixType: "add_iga",
    });
  } else {
    const iga = igas[0];
    const oversizedPia = pias.find((p) => p.ratingAmps > iga.ratingAmps);
    if (oversizedPia) {
      issues.push({
        id: "err-iga-small",
        severity: "error",
        code: "SELECTIVIDAD-IGA",
        title: `IGA (${iga.ratingAmps} A) menor que PIA ${oversizedPia.label} (${oversizedPia.ratingAmps} A)`,
        detail: `El circuito ${oversizedPia.label} tiene calibre ${oversizedPia.ratingAmps} A superior al corte general de ${iga.ratingAmps} A.`,
        itc: "ITC-BT-17 apdo. 1.2 / ITC-BT-22",
        solution: `Sube el calibre del IGA al menos a ${oversizedPia.ratingAmps} A (si la D.I. lo admite) o reduce el PIA de ${oversizedPia.label}.`,
        moduleId: iga.id,
        autoFixType: "upsize_iga",
      });
    }
  }

  // 2. Verificar existencia de Diferenciales
  if (rcds.length === 0 && pias.length > 0) {
    issues.push({
      id: "err-no-rcd",
      severity: "error",
      code: "SIN-DIF",
      title: "Falta Interruptor Diferencial de 30 mA",
      detail:
        "Los circuitos están conectados sin protección diferencial contra contactos indirectos ni fugas a tierra.",
      itc: "ITC-BT-24 / ITC-BT-25",
      solution: "Añade al menos un Diferencial 40A / 30mA Clase A o AC antes de los PIAs.",
      autoFixType: "add_rcd",
    });
  }

  // 3. Comprobar cada PIA: diferencial padre, neutro cruzado, sección vs calibre, tierra PE
  pias.forEach((pia) => {
    const parentRcd = rcds.find((r) => r.id === pia.parentRcdId);
    if (!parentRcd) {
      issues.push({
        id: `err-unprotected-${pia.id}`,
        severity: "error",
        code: "PIA-SIN-DIF",
        title: `Circuito ${pia.label} (${pia.ratingAmps} A) sin Diferencial asignado`,
        detail: `El magnetotérmico ${pia.label} está conectado aguas arriba sin pasar por un diferencial de 30 mA.`,
        itc: "ITC-BT-24 apdo. 4.1",
        solution: `Conecta la alimentación de ${pia.label} a la salida de un Diferencial de 30 mA.`,
        moduleId: pia.id,
        autoFixType: "assign_rcd",
      });
    }

    if (
      pia.parentRcdId &&
      pia.neutralSourceRcdId &&
      pia.neutralSourceRcdId !== pia.parentRcdId
    ) {
      issues.push({
        id: `err-neutral-${pia.id}`,
        severity: "error",
        code: "NEUTRO-CRUZADO",
        title: `Neutro cruzado en circuito ${pia.label}`,
        detail: `La fase de ${pia.label} sale de un diferencial pero su neutro retorna por otro distinto. Al conectar cualquier carga, ambos diferenciales dispararán inmediatamente.`,
        itc: "ITC-BT-24 / Cableado de cuadro",
        solution: `Conecta el cable azul de neutro de ${pia.label} al bornero del mismo diferencial que su fase.`,
        moduleId: pia.id,
        autoFixType: "fix_neutral",
      });
    }

    const sec = pia.cableSectionMm2 ?? 2.5;
    const maxSafe = getMaxSafePiaForSection(sec);
    if (pia.ratingAmps > maxSafe) {
      issues.push({
        id: `err-wire-${pia.id}`,
        severity: "error",
        code: "SECCION-INSUF",
        title: `Peligro en ${pia.label}: PIA ${pia.ratingAmps} A sobre cable de ${sec} mm²`,
        detail: `La intensidad nominal del PIA (${pia.ratingAmps} A) supera la admisible del conductor de ${sec} mm² (máx. recomendado PIA ${maxSafe} A en ITC-BT-19/25). El cable puede sobrecalentarse antes de que dispare el automático.`,
        itc: "ITC-BT-19 Tabla 1 / ITC-BT-22",
        solution: `Aumenta la sección de ${pia.label} al calibre necesario o reduce el PIA a ≤ ${maxSafe} A.`,
        moduleId: pia.id,
        autoFixType: "upsize_wire",
      });
    }

    if (pia.hasEarthConnected === false) {
      issues.push({
        id: `err-pe-${pia.id}`,
        severity: "error",
        code: "SIN-TIERRA-PE",
        title: `Falta conductor de tierra (PE) en ${pia.label}`,
        detail: `El circuito ${pia.label} no llega al bornero de tierra inferior. En caso de fallo de aislamiento las carcasas quedarán bajo tensión peligrosa.`,
        itc: "ITC-BT-18 / ITC-BT-26",
        solution: `Lleva un conductor verde-amarillo de sección reglamentaria desde ${pia.label} hasta una borna libre del bornero de tierra.`,
        moduleId: pia.id,
        autoFixType: "fix_pe",
      });
    }
  });

  // 4. Máximo 5 circuitos por diferencial (ITC-BT-25)
  rcds.forEach((rcd) => {
    const children = pias.filter((p) => p.parentRcdId === rcd.id);
    if (children.length > 5) {
      issues.push({
        id: `warn-5pias-${rcd.id}`,
        severity: "error",
        code: "MAX-5-CIRCUITOS",
        title: `${rcd.label} alimenta ${children.length} circuitos (máx. 5 por diferencial)`,
        detail: `Hay ${children.length} PIAs colgando de ${rcd.label}. Una fuga pequeña o suma de corrientes de fuga dejaría toda la instalación sin servicio.`,
        itc: "ITC-BT-25 apdo. 2.3.1",
        solution: "Añade otro Diferencial de 30 mA y reparte los circuitos en grupos de máximo 5.",
        moduleId: rcd.id,
        autoFixType: "split_rcd",
      });
    }
  });

  // 5. Sobretensiones DPS / POP
  if (!hasDps || !hasPop) {
    issues.push({
      id: "warn-surge",
      severity: "warning",
      code: "FALTA-SOBRETENSIONES",
      title: "Recomendado instalar protección contra sobretensiones (DPS + POP)",
      detail: `Falta ${!hasDps ? "descargador transitorio DPS T2" : ""}${
        !hasDps && !hasPop ? " y " : ""
      }${!hasPop ? "corte por sobretensión permanente POP" : ""}. Exigido por ITC-BT-23 y distribuidoras en suministros nuevos o reformas.`,
      itc: "ITC-BT-23",
      solution: "Añade DPS T2 + POP junto al IGA y conéctalo a la borna principal de tierra.",
      autoFixType: "add_surge",
    });
  }

  // 6. Espacio libre en envolvente
  const usedModules = modules.reduce((acc, m) => acc + m.modulesWidth, 0);
  if (usedModules > boxModules) {
    issues.push({
      id: "err-box-full",
      severity: "error",
      code: "CUADRO-LLENO",
      title: `Los módulos ocupan ${usedModules} huecos y la caja es de ${boxModules}`,
      detail:
        "No caben físicamente los aparatos en la envolvente actual ni queda reserva de ampliación.",
      itc: "ITC-BT-17 (Reserva ≥ 20-30%)",
      solution: "Selecciona una envolvente mayor (18, 24 o 36 módulos).",
    });
  }

  if (issues.length === 0) {
    issues.push({
      id: "ok-all",
      severity: "ok",
      code: "CUADRO-CONFORME",
      title: "Cuadro verificado: esquema, protecciones, secciones y tierras conformes al REBT",
      detail:
        "El IGA, los diferenciales (≤ 5 circuitos/DIF), los calibres de PIA respecto a secciones y el bornero de tierra cumplen las comprobaciones básicas.",
      itc: "ITC-BT-17 / 18 / 19 / 23 / 24 / 25",
      solution:
        "Puedes interactuar con los interruptores, probar la fuga de diferencial o descargar el unifilar A3 / SVG.",
    });
  }

  return issues;
}

// ============================================================================
// Propagación de tensión y estado de disparo en el simulador DIN
// ============================================================================
export interface ModuleLiveStatus {
  supplyLive: boolean;
  loadLive: boolean;
  reason: string;
}

export function computePanelLiveState(
  modules: DinModule[],
  earthFaultModuleId: string | null
): Record<string, ModuleLiveStatus> {
  const iga = modules.find((m) => m.kind === "IGA");
  const pop = modules.find((m) => m.kind === "POP" || m.kind === "COMBI");
  const rcds = modules.filter((m) => m.kind === "DIF");

  const gridSupply = true;
  const afterIga = gridSupply && Boolean(iga && iga.isOn && !iga.isTripped);
  const afterPop = pop ? afterIga && pop.isOn && !pop.isTripped : afterIga;

  const statusMap: Record<string, ModuleLiveStatus> = {};

  modules.forEach((m) => {
    if (m.kind === "IGA") {
      statusMap[m.id] = {
        supplyLive: gridSupply,
        loadLive: afterIga,
        reason: m.isOn ? "Alimentando cabecera" : "Corte general abierto (0 V)",
      };
      return;
    }

    if (m.kind === "DPS" || m.kind === "COMBI") {
      statusMap[m.id] = {
        supplyLive: afterIga,
        loadLive: afterIga && m.isOn,
        reason: afterIga ? "Vigilando picos de red" : "Sin tensión aguas arriba",
      };
      return;
    }

    if (m.kind === "POP") {
      statusMap[m.id] = {
        supplyLive: afterIga,
        loadLive: afterPop,
        reason: m.isOn ? "230 V estable (corte >275 V)" : "POP abierto — corta bobina",
      };
      return;
    }

    if (m.kind === "DIF") {
      const difOut = afterPop && m.isOn && !m.isTripped;
      statusMap[m.id] = {
        supplyLive: afterPop,
        loadLive: difOut,
        reason: m.isTripped
          ? "DISPARADO por fuga / botón TEST"
          : !afterPop
          ? "Sin tensión desde cabecera"
          : m.isOn
          ? "Protección activa (30 mA)"
          : "Diferencial bajado manualmente",
      };
      return;
    }

    if (m.kind === "PIA") {
      const parentRcd = rcds.find((r) => r.id === m.parentRcdId);
      const rcdLive = parentRcd
        ? afterPop && parentRcd.isOn && !parentRcd.isTripped
        : afterPop; // Si está mal cableado sin DIF, recibe de afterPop directamente
      const loadLive = rcdLive && m.isOn && !m.isTripped;
      const isFaultTarget = earthFaultModuleId === m.id;
      statusMap[m.id] = {
        supplyLive: rcdLive,
        loadLive,
        reason: isFaultTarget
          ? parentRcd
            ? "Fuga detectada → DIF disparado"
            : "⚠️ FUGA SIN DIFERENCIAL"
          : !rcdLive
          ? parentRcd?.isTripped
            ? `Cortado por disparo de ${parentRcd.label}`
            : "Sin tensión en embarrado"
          : m.isOn
          ? `${m.phaseAssigned === "L1-L2-L3" ? "400 V" : "230 V"} en salida`
          : "Circuito desconectado (OFF)",
      };
      return;
    }

    // Otros módulos auxiliares (Contactor, Reloj, Medidor)
    statusMap[m.id] = {
      supplyLive: afterPop,
      loadLive: afterPop && m.isOn,
      reason: afterPop && m.isOn ? "Activo" : "En espera / Apagado",
    };
  });

  return statusMap;
}

// ============================================================================
// Leyenda Internacional Normalizada IEC 60617 / UNE-EN 60617 para Unifilar
// ============================================================================
export interface IecSymbolLegendItem {
  code: string;
  standard: string;
  name: string;
  meaning: string;
}

export const IEC_60617_LEGEND: IecSymbolLegendItem[] = [
  {
    code: "Q0 / QF",
    standard: "IEC 60617 S00288",
    name: "Interruptor automático (IGA / PIA)",
    meaning:
      "Corte omnipolar con disparo térmico (sobrecarga) y magnético (cortocircuito). Indica In (A), curva C y Icu (kA).",
  },
  {
    code: "F1 / ID",
    standard: "IEC 60617 S00288 + Toroide",
    name: "Interruptor diferencial (RCD)",
    meaning:
      "Detección toroidal de corriente residual de fuga (IΔn = 30 mA). Clase A/AC para protección contra contactos indirectos.",
  },
  {
    code: "DPS / SPD",
    standard: "IEC 60617 S00342",
    name: "Protector sobretensiones (T2 / POP)",
    meaning:
      "Descargador de picos transitorios hacia tierra (PE) y/o corte por sobretensión permanente (>275 V).",
  },
  {
    code: "kWh",
    standard: "IEC 60617 S00912",
    name: "Equipo de medida / Contador",
    meaning:
      "Contador de energía activa en origen de Derivación Individual (DI) según ITC-BT-16.",
  },
  {
    code: "PE ⏚",
    standard: "IEC 60417-5017",
    name: "Puesta a tierra y equipotencial",
    meaning:
      "Conexión al bornero general de tierra y red equipotencial según ITC-BT-18.",
  },
  {
    code: "///",
    standard: "IEC 60617 Conductores",
    name: "Número de conductores por línea",
    meaning:
      "Trazos oblicuos sobre la línea unifilar: 3 trazos = F+N+PE (230V) · 5 trazos = 3F+N+PE (400V).",
  },
];
