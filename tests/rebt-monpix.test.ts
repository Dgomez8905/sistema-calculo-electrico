import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_MTD_METADATA,
  ITC_BT_25_TEMPLATES,
  calculateRebtCircuit,
  calculateBuildingLoadForecastItc10,
  evaluateItc04Documentation,
  calculateEarthingItc18,
  resolveSpanishRebtIgaAndTariff,
} from "../src/lib/electrical-calculations.ts";
import {
  explainRebtCircuitStepByStep,
  convertPowerAndCurrent,
  calculateConduitDiameterItc21,
  balanceThreePhases,
  evaluateEnlaceCgpCpm,
  validateSpanishTaxId,
  computeVerifactuChainHash,
  answerRebtQuestion,
  parseUnifilarFromSpeechOrText,
  CCAA_TRAMITES_CATALOG,
  INSTALLATION_TYPES_28,
} from "../src/lib/monpix-engine.ts";
import {
  buildDinModulesFromProject,
  validateDinPanelInstallation,
  computePanelLiveState,
  IEC_60617_LEGEND,
} from "../src/components/monpix/dinPanelHelpers.ts";
import { buildUnifilarIec60617Svg } from "../src/lib/unifilar-iec60617.ts";

test("ITC-BT-25: circuitos básicos C1 a C5 cumplen secciones y PIAs reglamentarios", () => {
  const results = ITC_BT_25_TEMPLATES.slice(0, 5).map((c) => calculateRebtCircuit(c));
  assert.equal(results[0].code, "C1");
  assert.equal(results[0].sectionMm2, 1.5);
  assert.equal(results[0].piaAmps, 10);

  assert.equal(results[1].code, "C2");
  assert.equal(results[1].sectionMm2, 2.5);
  assert.equal(results[1].piaAmps, 16);

  assert.equal(results[2].code, "C3");
  assert.equal(results[2].sectionMm2, 6);
  assert.equal(results[2].piaAmps, 25);

  assert.equal(results[3].code, "C4");
  assert.equal(results[3].sectionMm2, 4);
  assert.equal(results[3].piaAmps, 20);

  assert.equal(results[4].code, "C5");
  assert.equal(results[4].sectionMm2, 2.5);
  assert.equal(results[4].piaAmps, 16);

  assert.ok(results.every((r) => r.isCompliant));
});

test("Paso a paso devuelve las ITC aplicadas y explicación didáctica", () => {
  const exp = explainRebtCircuitStepByStep(ITC_BT_25_TEMPLATES[2]); // C3 Cocina
  assert.ok(exp.itcReferences.some((r) => r.includes("ITC-BT-19")));
  assert.ok(exp.itcReferences.some((r) => r.includes("ITC-BT-25")));
  assert.equal(exp.steps.length, 4);
  assert.ok(exp.verdictText.includes("CUMPLE REBT"));
});

test("ITC-BT-21: diámetro de tubo empotrado vs enterrado", () => {
  const emp = calculateConduitDiameterItc21({
    sectionMm2: 2.5,
    numConductors: 3,
    mounting: "empotrado_obra",
  });
  assert.equal(emp.diameterMm, 20);

  const ent = calculateConduitDiameterItc21({
    sectionMm2: 10,
    numConductors: 4,
    mounting: "enterrado",
  });
  assert.ok(ent.diameterMm >= 40);
});

test("Conversor Potencia ↔ Intensidad monofásico, trifásico y CC", () => {
  const mono = convertPowerAndCurrent({
    mode: "p_to_i",
    system: "monofasica",
    voltage: 230,
    cosPhi: 1,
    value: 5750,
  });
  assert.equal(mono.result, 25);

  const cc = convertPowerAndCurrent({
    mode: "i_to_p",
    system: "continua",
    voltage: 48,
    cosPhi: 1,
    value: 10,
  });
  assert.equal(cc.result, 480);
});

test("Reparto equilibrado de fases R·S·T minimiza desequilibrio y corriente de neutro", () => {
  const res = balanceThreePhases(
    [
      { id: "1", code: "C1", description: "Alumbrado", powerWatts: 2300 },
      { id: "2", code: "C2", description: "Tomas", powerWatts: 3450 },
      { id: "3", code: "C3", description: "Cocina", powerWatts: 5400 },
      { id: "4", code: "C4", description: "Lavadora", powerWatts: 3450 },
      { id: "5", code: "C5", description: "Baño", powerWatts: 3450 },
      { id: "6", code: "C9", description: "Clima", powerWatts: 5750 },
    ],
    true
  );
  assert.ok(res.imbalancePct <= 25);
  assert.ok(res.phaseWatts.L1 > 0 && res.phaseWatts.L2 > 0 && res.phaseWatts.L3 > 0);
});

test("ITC-BT-10 / 14 / 15: previsión de edificio, CGP/CPM y fusibles LGA", () => {
  const building = calculateBuildingLoadForecastItc10({
    basicDwellingsCount: 10,
    elevatedDwellingsCount: 2,
    generalServicesWatts: 8000,
    commercialCount: 1,
    commercialAreaM2: 80,
    garageAreaM2: 200,
    garageForcedVentilation: false,
    parkingSpacesCount: 12,
    hasSplProtection: true,
    lgaLengthMeters: 20,
  });
  assert.equal(building.totalDwellings, 12);
  assert.equal(building.simultaneityCoefficient, 9.9);
  assert.ok(building.lgaCalculation.voltageDropPct <= 0.5);

  const enlace = evaluateEnlaceCgpCpm({
    supplyScenario: "unifamiliar_1",
    acometida: "subterranea",
    totalPowerKw: 9.2,
    diPowerWatts: 9200,
    diSectionMm2: 16,
    diMaterial: "Cu",
    diPhases: "monofasico",
    metersConcentrated: false,
  });
  assert.ok(enlace.boxRecommendation.includes("CPM"));
  assert.ok(enlace.maxDiLengthMeters > 25);
});

test("ITC-BT-04 / 05 / 18: pública concurrencia exige Proyecto + OCA y tierra cumple UL", () => {
  const doc = evaluateItc04Documentation("i_publica_concurrencia", 8, 0);
  assert.equal(doc.requiresProject, true);
  assert.equal(doc.requiresInitialOcaInspection, true);

  const earth = calculateEarthingItc18({
    soilResistivityOhmM: 120,
    rodLengthMeters: 2,
    numRods: 3,
    buriedConductorMeters: 10,
    maxContactVoltageV: 50,
    rcdSensitivityMa: 30,
  });
  assert.equal(earth.isCompliant, true);
});

test("Validación NIF/CIF/NIE y huella encadenada VeriFactu SHA-256", async () => {
  const cifOk = validateSpanishTaxId("B-38901245"); // validar algoritmo control CIF
  assert.equal(cifOk.type, "CIF");

  const nifOk = validateSpanishTaxId("00000000T");
  assert.equal(nifOk.valid, true);
  assert.equal(nifOk.type, "NIF");

  const h1 = await computeVerifactuChainHash({
    issuerCif: "B38901245",
    invoiceSeriesNumber: "F-2026-0001",
    issueDateIso: "2026-11-14",
    taxAmount: 210,
    totalAmount: 1210,
    previousHash: "",
    generatedAtIso: "2026-11-14T10:00:00+01:00",
  });
  assert.equal(h1.hashHex.length, 64);
  assert.ok(h1.qrVerificationUrl.includes("F-2026-0001"));
});

test("Catálogo 19 CCAA, 28 tipos de instalación y Pregunta al Reglamento", () => {
  assert.equal(CCAA_TRAMITES_CATALOG.length, 19);
  assert.equal(INSTALLATION_TYPES_28.length, 28);

  const qa = answerRebtQuestion("¿Qué sección para un horno de 3,5 kW?");
  assert.equal(qa.matched, true);
  assert.ok(qa.itcCitation.includes("ITC-BT-25"));

  const unknown = answerRebtQuestion("¿Cuál es la receta de la paella valenciana?");
  assert.equal(unknown.matched, false);
});

test("Simulador DIN: valida mala conexión (neutro cruzado, cable fino, sin DIF) y corta tensión al apagar IGA", () => {
  const circuits = ITC_BT_25_TEMPLATES.slice(0, 5).map((c) => calculateRebtCircuit(c));
  const mods = buildDinModulesFromProject({
    supplyType: "monofasico_230v",
    igaAmps: 40,
    rcdCount: 1,
    hasCombiSurge: true,
    meta: { diferencialClase: "AC" } as never,
    circuits,
  });

  // 1. Cuadro limpio debe validar sin errores
  const okDiag = validateDinPanelInstallation(mods, 18);
  assert.equal(okDiag[0].severity, "ok");

  // 2. Apagar IGA corta la tensión en los PIAs aguas abajo
  const modsIgaOff = mods.map((m) => (m.kind === "IGA" ? { ...m, isOn: false } : m));
  const liveOff = computePanelLiveState(modsIgaOff, null);
  const firstPia = mods.find((m) => m.kind === "PIA")!;
  assert.equal(liveOff[firstPia.id].loadLive, false);

  // 3. Inyectar cable de 1.5mm2 con PIA 25A y PIA sin DIF debe detectar ambos problemas
  const badMods = mods.map((m) =>
    m.id === firstPia.id ? { ...m, ratingAmps: 25, cableSectionMm2: 1.5, parentRcdId: "" } : m
  );
  const badDiag = validateDinPanelInstallation(badMods, 18);
  assert.ok(badDiag.some((d) => d.code === "SECCION-INSUF"));
  assert.ok(badDiag.some((d) => d.code === "PIA-SIN-DIF"));

  // 4. Leyenda internacional IEC 60617 completa
  assert.ok(IEC_60617_LEGEND.length >= 6);
});

test("Generador Unifilar Vectorial IEC 60617: produce SVG válido con leyenda, cajetín A3 y escapado XML", () => {
  const circuits = ITC_BT_25_TEMPLATES.slice(0, 5).map((c) => calculateRebtCircuit(c));
  const mods = buildDinModulesFromProject({
    supplyType: "monofasico_230v",
    igaAmps: 40,
    rcdCount: 1,
    hasCombiSurge: true,
    meta: DEFAULT_MTD_METADATA,
    circuits,
  });

  const svg = buildUnifilarIec60617Svg({
    meta: {
      ...DEFAULT_MTD_METADATA,
      titularNombre: "Empresa <Luz & Voltios>",
      empresaInstaladoraNombre: "Electro & Proyectos S.L.",
    },
    supplyType: "monofasico_230v",
    igaAmps: 40,
    diSectionMm2: 16,
    icuKa: 6,
    planNumber: "01",
    hasCombiSurge: true,
    calculatedCircuits: circuits,
    dinModules: mods,
    disclaimer: "Orientativo para revisión del instalador",
  });

  assert.ok(svg.startsWith("<?xml version=\"1.0\""));
  assert.ok(svg.includes("LEYENDA INTERNACIONAL IEC 60617"));
  assert.ok(svg.includes("IGA · In: 40 A"));
  assert.ok(svg.includes("ESQUEMA UNIFILAR"));
  assert.ok(svg.includes("Empresa &lt;Luz &amp; Voltios&gt;"));
  assert.ok(svg.includes("Electro &amp; Proyectos S.L."));
  assert.ok(svg.endsWith("</svg>"));
});

test("Flujo Foto -> Simulador DIN -> Unifilar IEC 60617: actualiza IGA, sobretensiones y número de PIAs", () => {
  const draft = parseUnifilarFromSpeechOrText(
    "Foto analizada localmente: IGA 25A sin sobretensiones, 1 diferencial de 40A 30mA, 6 automáticos"
  );
  assert.equal(draft.igaAmps, 25);
  assert.equal(draft.hasSurgeProtection, false);
  assert.equal(draft.circuits.length, 6);

  const calcCircuits = draft.circuits.map((c) => calculateRebtCircuit(c));
  const freshDin = buildDinModulesFromProject({
    supplyType: draft.supplyType,
    igaAmps: draft.igaAmps,
    rcdCount: draft.rcdCount,
    hasCombiSurge: draft.hasSurgeProtection,
    meta: DEFAULT_MTD_METADATA,
    circuits: calcCircuits,
  });

  assert.equal(freshDin.find((m) => m.kind === "IGA")?.ratingAmps, 25);
  assert.equal(freshDin.some((m) => m.kind === "DPS" || m.kind === "POP"), false);
  assert.equal(freshDin.filter((m) => m.kind === "PIA").length, 6);

  const updatedSvg = buildUnifilarIec60617Svg({
    meta: DEFAULT_MTD_METADATA,
    supplyType: draft.supplyType,
    igaAmps: draft.igaAmps,
    diSectionMm2: 10,
    icuKa: 6,
    planNumber: "02",
    hasCombiSurge: draft.hasSurgeProtection,
    calculatedCircuits: calcCircuits,
    dinModules: freshDin,
    disclaimer: "Orientativo",
  });

  assert.ok(updatedSvg.includes("IGA · In: 25 A"));
  assert.ok(!updatedSvg.includes("DPS+POP"));
  assert.ok(updatedSvg.includes("C6 · C10"));
});

test("Detección automática de formato de circuito (Monofásico 2P vs Trifásico 4P) + auto-relleno M.T.D.", () => {
  const mono = parseUnifilarFromSpeechOrText(
    "Cuadro detectado (Monofásico 230V): IGA 25A sin sobretensiones, 1 diferencial de 40A 30mA, 5 automáticos"
  );
  assert.equal(mono.supplyType, "monofasico_230v");
  assert.equal(mono.electrificationGrade, "basica");
  assert.ok(mono.formatLabel.includes("Monofásico 230 V"));
  assert.ok(mono.formatLabel.includes("Básica"));
  assert.equal(mono.circuits.length, 5);
  assert.equal(mono.circuits[0].simultaneityFactor, 1);
  assert.ok(mono.formatLabel.includes("2.0TD"));

  const tri = parseUnifilarFromSpeechOrText(
    "Cuadro detectado (Trifásico 400V 4 polos): IGA 40A con sobretensiones T2+POP, 2 diferenciales de 40A 30mA, 6 automáticos y recarga coche 32A"
  );
  assert.equal(tri.supplyType, "trifasico_400v");
  assert.equal(tri.electrificationGrade, "elevada");
  assert.equal(tri.diferencialClase, "A");
  assert.ok(tri.formatLabel.includes("Trifásico 400/230 V"));
  assert.ok(tri.circuits.some((c) => c.phaseAssigned === "L2"));

  const calcTri = tri.circuits.map((c) => calculateRebtCircuit(c));
  const dinTri = buildDinModulesFromProject({
    supplyType: tri.supplyType,
    igaAmps: tri.igaAmps,
    rcdCount: tri.rcdCount,
    hasCombiSurge: tri.hasSurgeProtection,
    meta: { ...DEFAULT_MTD_METADATA, diferencialClase: tri.diferencialClase },
    circuits: calcTri,
  });
  assert.equal(dinTri.find((m) => m.kind === "IGA")?.poles, 4);

  const svgTri = buildUnifilarIec60617Svg({
    meta: DEFAULT_MTD_METADATA,
    supplyType: tri.supplyType,
    igaAmps: tri.igaAmps,
    diSectionMm2: 10,
    icuKa: 6,
    planNumber: "03",
    hasCombiSurge: tri.hasSurgeProtection,
    calculatedCircuits: calcTri,
    dinModules: dinTri,
    disclaimer: "Orientativo",
  });
  assert.ok(svgTri.includes("4P"));
  assert.ok(svgTri.includes("C13"));
});

test("Escalones oficiales IGA REBT y Tarifas 2.0TD / 3.0TD en España (evita IGA 80A en vivienda)", () => {
  // 1. Vivienda Electrificación Básica C1..C5 (suma bruta 18.050 W -> REBT 5.750 W / IGA 25 A / Tarifa 2.0TD)
  const basicCircuits = ITC_BT_25_TEMPLATES.slice(0, 5).map((c) => calculateRebtCircuit(c));
  const basicRes = resolveSpanishRebtIgaAndTariff({
    supplyType: "monofasico_230v",
    electrificationGrade: "basica",
    circuits: basicCircuits,
    areaM2: 90,
  });
  assert.equal(basicRes.igaAmps, 25);
  assert.equal(basicRes.maxAdmissibleWatts, 5750);
  assert.equal(basicRes.accessTariff, "2.0TD");
  assert.equal(basicRes.effectiveElectrificationGrade, "basica");

  const basicDi = calculateRebtCircuit({
    code: "DI",
    description: "Derivación Individual",
    usageType: "di_concentrada",
    phaseSystem: "monofasico",
    phaseAssigned: "L1",
    voltage: 230,
    powerWatts: basicRes.maxAdmissibleWatts,
    cosPhi: 1,
    simultaneityFactor: 1,
    utilizationFactor: 1,
    lengthMeters: 18,
    installationMethod: "B1",
    insulationType: "XLPE_90",
    material: "Cu",
    minSectionMm2: 6,
    fixedPiaAmps: basicRes.igaAmps,
  });
  assert.equal(basicDi.sectionMm2, 10);

  // 2. Si viene un override heredado inválido de 80 A en monofásico, se autocorrige al escalón REBT (25 A)
  const healedBasic = resolveSpanishRebtIgaAndTariff({
    supplyType: "monofasico_230v",
    electrificationGrade: "basica",
    circuits: basicCircuits,
    overrideIgaAmps: 80,
  });
  assert.equal(healedBasic.igaAmps, 25);

  // 3. Vivienda Electrificación Elevada sin VE (C1..C5 + C9) -> 9.200 W / IGA 40 A / Tarifa 2.0TD
  const elevCircuits = [
    ...ITC_BT_25_TEMPLATES.slice(0, 5),
    ITC_BT_25_TEMPLATES.find((c) => c.code === "C9")!,
  ].map((c) => calculateRebtCircuit(c));
  const elevRes = resolveSpanishRebtIgaAndTariff({
    supplyType: "monofasico_230v",
    electrificationGrade: "elevada",
    circuits: elevCircuits,
  });
  assert.equal(elevRes.igaAmps, 40);
  assert.equal(elevRes.maxAdmissibleWatts, 9200);
  assert.equal(elevRes.accessTariff, "2.0TD");

  // 4. Plantilla completa Elevada + VE (C1..C13) -> IGA 50 A (11.500 W · Tarifa 2.0TD), nunca 80 A
  const fullElevVe = ITC_BT_25_TEMPLATES.map((c) => calculateRebtCircuit(c));
  const fullElevVeRes = resolveSpanishRebtIgaAndTariff({
    supplyType: "monofasico_230v",
    electrificationGrade: "elevada",
    circuits: fullElevVe,
  });
  assert.equal(fullElevVeRes.igaAmps, 50);
  assert.equal(fullElevVeRes.maxAdmissibleWatts, 11500);
  assert.equal(fullElevVeRes.accessTariff, "2.0TD");

  // 5. Trifásico 400 V con IGA 25 A (4P) -> 17.321 W (> 15 kW) -> Tarifa 3.0TD
  const tri30Td = resolveSpanishRebtIgaAndTariff({
    supplyType: "trifasico_400v",
    electrificationGrade: "elevada",
    circuits: fullElevVe,
    overrideIgaAmps: 25,
  });
  assert.equal(tri30Td.igaAmps, 25);
  assert.equal(tri30Td.maxAdmissibleWatts, 17321);
  assert.equal(tri30Td.accessTariff, "3.0TD");

  // 6. Validador DIN detecta IGA > 63 A en monofásico 2P como error REBT
  const dinMods = buildDinModulesFromProject({
    supplyType: "monofasico_230v",
    igaAmps: 25,
    rcdCount: 1,
    hasCombiSurge: true,
    meta: DEFAULT_MTD_METADATA,
    circuits: basicCircuits,
  });
  dinMods[0].ratingAmps = 80;
  const issues = validateDinPanelInstallation(dinMods, 18);
  assert.ok(issues.some((i) => i.code === "IGA-FUERA-REBT"));
});
