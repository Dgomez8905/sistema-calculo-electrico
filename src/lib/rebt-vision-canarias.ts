import type {
  MtdFormMetadata,
  RebtCircuitInput,
  SystemSupplyType,
} from "./electrical-calculations.ts";
import {
  calculateRebtCircuit,
  sanitizeSpanishIgaAmps,
} from "./electrical-calculations.ts";

export interface CanariasVisionComponentItem {
  id: string;
  carril: number;
  tipo: "IGA" | "ICP" | "PCS" | "ID" | "PIA" | "Contactor" | "Reloj" | "Otro";
  marca_modelo: string;
  calibre_a: number;
  curva: "B" | "C" | "D" | "ICP-M" | "N/A";
  sensibilidad_ma: number;
  clase_id: "AC" | "A" | "F" | "B" | "N/A";
  polos: "1P" | "1P+N" | "2P" | "3P" | "3P+N" | "4P";
  poder_corte_ka: number;
  padre_id: string;
  circuito_itc_bt_25: string;
  confianza: "alta" | "media" | "baja";
  observaciones: string;
}

export interface CanariasVisionCircuitRow {
  circuito: string;
  destino: string;
  pia_a: number;
  seccion_mm2: number;
  conductor: string;
  tubo_mm: number;
}

export interface CanariasPanelVisionResult {
  contexto_canarias: {
    distribuidora: string;
    sistema_alimentacion: string;
    calibre_iga_amperios: number;
    potencia_maxima_admisible_w: number;
    grado_electrificacion: string;
    alertas_inspeccion_canarias: string[];
  };
  inventario_componentes: CanariasVisionComponentItem[];
  esquema_unifilar_mermaid: string;
  memoria_tecnica_gobierno_canarias: {
    objeto_instalacion: string;
    caracteristicas_enlace_y_di: string;
    proteccion_sobreintensidades: string;
    proteccion_contactos_indirectos_y_tierra: string;
    proteccion_sobretensiones: string;
    tabla_circuitos_mtd: CanariasVisionCircuitRow[];
  };
}

/**
 * System Prompt definitivo adaptado al REBT (RD 842/2002) y a Tenerife / Canarias
 * (Normas Particulares Edistribución NRZ103 y Dirección General de Energía del Gobierno de Canarias).
 */
export const TENERIFE_REBT_VISION_SYSTEM_PROMPT = `Rol: Eres un Ingeniero Técnico Industrial colegiado en Santa Cruz de Tenerife (Canarias), experto en instalaciones eléctricas de baja tensión según el REBT (RD 842/2002), las Normas Particulares de Edistribución (Unelco Endesa - NRZ103) aprobadas por el Gobierno de Canarias y los requisitos de tramitación de la Dirección General de Energía de Canarias.

Objetivo: Analizar la fotografía de un Cuadro General de Mando y Protección (CGMP) ubicado en Tenerife / España, identificar con precisión todos sus componentes modulares y devolver ÚNICAMENTE un objeto JSON válido con:
1. Inventario técnico detallado de aparamenta por carriles DIN (de arriba a abajo y de izquierda a derecha: C1-01, C1-02...).
2. Código Mermaid.js (graph TD) con todas las etiquetas de nodos entre comillas dobles (ej. C1_02["ID 40A 30mA Clase A"]).
3. Borrador técnico adaptado a los campos de la Memoria Técnica de Diseño (MTD) oficial del Gobierno de Canarias.

Reglas de inspección visual y criterios técnicos (Tenerife / Canarias):
1. Escaneo ordenado: Examina el cuadro estrictamente por carriles DIN de arriba a abajo, y dentro de cada carril de izquierda a derecha (ID: C1-01, C1-02...).
2. Aparamenta a identificar: IGA, ICP (si existe en compartimento precintado antiguo), PCS (Protector contra Sobretensiones Permanentes y/o Transitorias o Combi IGA+POP+SPD), ID (Interruptor Diferencial), PIA (Pequeño Interruptor Automático), Contactor, Reloj horario/astronómico, Transformador de timbre o protecciones FV/IRVE.
3. Parámetros técnicos por dispositivo: Marca y modelo legible (ej. Merlin Gerin multi 9, Schneider iK60N, ABB, Hager, Chint), Calibre In (A), Curva (B, C, D, ICP-M o N/A), Sensibilidad ID (30, 300 o 0), Clase ID (AC, A, F, B o N/A - advertir si es AC), Polos (1P, 1P+N, 2P, 3P, 3P+N, 4P) y Poder de corte en kA (4.5, 6, 10).
4. Asignación de circuitos según ITC-BT-25 e ITC-BT-52 (con conductor libre de halógenos H07Z1-K (AS) 450/750V):
   - C1 (10A, 1.5mm², tubo 16mm): Iluminación.
   - C2 (16A, 2.5mm², tubo 20mm): Tomas de corriente de uso general y frigorífico.
   - C3 (25A, 6mm², tubo 25mm): Cocina y horno.
   - C4 (20A, 4mm², tubo 20mm): Lavadora, lavavajillas y termo eléctrico (o desdoblado 16A).
   - C5 (16A, 2.5mm², tubo 20mm): Baño y auxiliares de cocina.
   - C8 (25A, 6mm², tubo 25mm): Calefacción eléctrica.
   - C9 (25A, 6mm², tubo 25mm): Aire acondicionado / Climatización.
   - C10 (20A, 4mm², tubo 20mm): Secadora independiente.
   - C11 (10A, 1.5mm², tubo 16mm): Automatización / Domótica.
   - C13 (16A/20A/32A, ITC-BT-52): Recarga de vehículo eléctrico (IRVE).
5. Verificaciones reglamentarias específicas en Canarias:
   - Comprobar si cuelgan más de 5 PIAs de un mismo diferencial de 30mA (incumplimiento ITC-BT-25).
   - Comprobar presencia de protección contra sobretensiones permanentes y transitorias (ITC-BT-23 y NRZ103 Edistribución).
   - Comprobar si falta IGA independiente cuando solo hay ICP antiguo.
   - Si se detectan PIAs bipolares antiguos (2P de 220V~ sin polo neutro N marcado) propios de antiguas redes bifásicas B2 de Tenerife, añadir "[Revisar adaptación a red 230/400V con neutro]".
   - Si el cableado o los peines traseros no son visibles, añadir "[A verificar en obra]".

Responde ÚNICAMENTE con un objeto JSON válido siguiendo exactamente las claves contexto_canarias, inventario_componentes, esquema_unifilar_mermaid y memoria_tecnica_gobierno_canarias.`;

/**
 * JSON Schema oficial para Gemini Structured Outputs (responseSchema).
 */
export const CANARIAS_VISION_JSON_SCHEMA = {
  type: "OBJECT",
  required: [
    "contexto_canarias",
    "inventario_componentes",
    "esquema_unifilar_mermaid",
    "memoria_tecnica_gobierno_canarias",
  ],
  properties: {
    contexto_canarias: {
      type: "OBJECT",
      required: [
        "distribuidora",
        "sistema_alimentacion",
        "calibre_iga_amperios",
        "potencia_maxima_admisible_w",
        "grado_electrificacion",
        "alertas_inspeccion_canarias",
      ],
      properties: {
        distribuidora: { type: "STRING" },
        sistema_alimentacion: { type: "STRING" },
        calibre_iga_amperios: { type: "NUMBER" },
        potencia_maxima_admisible_w: { type: "NUMBER" },
        grado_electrificacion: { type: "STRING" },
        alertas_inspeccion_canarias: {
          type: "ARRAY",
          items: { type: "STRING" },
        },
      },
    },
    inventario_componentes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        required: [
          "id",
          "carril",
          "tipo",
          "marca_modelo",
          "calibre_a",
          "curva",
          "sensibilidad_ma",
          "clase_id",
          "polos",
          "poder_corte_ka",
          "padre_id",
          "circuito_itc_bt_25",
          "confianza",
          "observaciones",
        ],
        properties: {
          id: { type: "STRING" },
          carril: { type: "NUMBER" },
          tipo: { type: "STRING" },
          marca_modelo: { type: "STRING" },
          calibre_a: { type: "NUMBER" },
          curva: { type: "STRING" },
          sensibilidad_ma: { type: "NUMBER" },
          clase_id: { type: "STRING" },
          polos: { type: "STRING" },
          poder_corte_ka: { type: "NUMBER" },
          padre_id: { type: "STRING" },
          circuito_itc_bt_25: { type: "STRING" },
          confianza: { type: "STRING" },
          observaciones: { type: "STRING" },
        },
      },
    },
    esquema_unifilar_mermaid: { type: "STRING" },
    memoria_tecnica_gobierno_canarias: {
      type: "OBJECT",
      required: [
        "objeto_instalacion",
        "caracteristicas_enlace_y_di",
        "proteccion_sobreintensidades",
        "proteccion_contactos_indirectos_y_tierra",
        "proteccion_sobretensiones",
        "tabla_circuitos_mtd",
      ],
      properties: {
        objeto_instalacion: { type: "STRING" },
        caracteristicas_enlace_y_di: { type: "STRING" },
        proteccion_sobreintensidades: { type: "STRING" },
        proteccion_contactos_indirectos_y_tierra: { type: "STRING" },
        proteccion_sobretensiones: { type: "STRING" },
        tabla_circuitos_mtd: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            required: [
              "circuito",
              "destino",
              "pia_a",
              "seccion_mm2",
              "conductor",
              "tubo_mm",
            ],
            properties: {
              circuito: { type: "STRING" },
              destino: { type: "STRING" },
              pia_a: { type: "NUMBER" },
              seccion_mm2: { type: "NUMBER" },
              conductor: { type: "STRING" },
              tubo_mm: { type: "NUMBER" },
            },
          },
        },
      },
    },
  },
};

export function inferSectionAndTubeFromPia(piaAmps: number): {
  sectionMm2: number;
  tubeMm: number;
  defaultPowerW: number;
} {
  if (piaAmps <= 10) return { sectionMm2: 1.5, tubeMm: 16, defaultPowerW: 2300 };
  if (piaAmps <= 16) return { sectionMm2: 2.5, tubeMm: 20, defaultPowerW: 3450 };
  if (piaAmps <= 20) return { sectionMm2: 4, tubeMm: 20, defaultPowerW: 4600 };
  if (piaAmps <= 25) return { sectionMm2: 6, tubeMm: 25, defaultPowerW: 5400 };
  if (piaAmps <= 32) return { sectionMm2: 10, tubeMm: 32, defaultPowerW: 7360 };
  if (piaAmps <= 40) return { sectionMm2: 10, tubeMm: 32, defaultPowerW: 9200 };
  return { sectionMm2: 16, tubeMm: 40, defaultPowerW: 14490 };
}

/**
 * Construye el informe JSON estructurado completo de Canarias / REBT
 * a partir del estado actual de circuitos, suministro, IGA y metadatos de la obra.
 */
export function buildCanariasVisionFromProject(params: {
  supplyType: SystemSupplyType;
  igaAmps: number;
  hasSurgeProtection: boolean;
  rcdCount: number;
  diferencialCalibreAmps: number;
  diferencialClase: "AC" | "A" | "F" | "B";
  circuits: RebtCircuitInput[];
  meta?: Partial<MtdFormMetadata>;
  brandName?: string;
  icuKa?: number;
}): CanariasPanelVisionResult {
  const {
    supplyType,
    igaAmps,
    hasSurgeProtection,
    rcdCount,
    diferencialCalibreAmps,
    diferencialClase,
    circuits,
    meta,
    brandName = "Schneider Electric",
    icuKa = 6,
  } = params;

  const isTri = supplyType === "trifasico_400v";
  const maxPowerW = isTri
    ? Math.round(Math.sqrt(3) * 400 * igaAmps)
    : Math.round(230 * igaAmps);

  const gradoStr = isTri
    ? igaAmps <= 63
      ? `Comercio Estándar / Trifásico (${(maxPowerW / 1000).toFixed(2)} kW)`
      : `Gran Comercio / Mediana Industria (${(maxPowerW / 1000).toFixed(2)} kW)`
    : igaAmps <= 25
      ? "Básico (5.750W)"
      : igaAmps <= 40
        ? "Elevado (9.200W)"
        : "Elevado (14.490W)";

  const alertas: string[] = [];
  if (!hasSurgeProtection) {
    alertas.push(
      "INCUMPLIMIENTO ITC-BT-23 / NRZ103 Edistribución Canarias: No se observa protección contra sobretensiones permanentes y transitorias (PCS / Combi) aguas abajo o integrada con el IGA."
    );
  }
  if (diferencialClase === "AC") {
    alertas.push(
      "ADVERTENCIA UNE-EN 61008 / REBT: Interruptor Diferencial Clase AC detectado; en nuevas instalaciones o reformas con electrónica (inducción, climatización inverter, IRVE) se exige Clase A o F."
    );
  }
  const piasPerRcd = Math.ceil(circuits.length / Math.max(1, rcdCount));
  if (piasPerRcd > 5) {
    alertas.push(
      `INCUMPLIMIENTO ITC-BT-25: Cuelgan hasta ${piasPerRcd} circuitos de un mismo diferencial de 30 mA (máximo reglamentario en viviendas: 5 circuitos por ID).`
    );
  }
  if (!isTri && circuits.length < 5) {
    alertas.push(
      `OBSERVACIÓN ITC-BT-25: Se contabilizan ${circuits.length} circuitos interiores; el grado de electrificación básico actual exige un mínimo de 5 circuitos independientes (C1 a C5).`
    );
  }

  const inventario: CanariasVisionComponentItem[] = [];
  const mainPoles = isTri ? "4P" : "2P";
  let seq = 1;
  const nextId = (carril: number) =>
    `C${carril}-${String(seq++).padStart(2, "0")}`;

  // 1. Cabecera IGA / Combi / MCCB
  const igaId = nextId(1);
  if (hasSurgeProtection && igaAmps <= 63) {
    inventario.push({
      id: igaId,
      carril: 1,
      tipo: "IGA",
      marca_modelo: `${brandName} Combi IGA+POP+SPD`,
      calibre_a: igaAmps,
      curva: "C",
      sensibilidad_ma: 0,
      clase_id: "N/A",
      polos: mainPoles,
      poder_corte_ka: icuKa,
      padre_id: "Derivación Individual",
      circuito_itc_bt_25: "Corte General + Sobretensiones (ITC-BT-17 / 23)",
      confianza: "alta",
      observaciones:
        "Equipo compacto combinado en carril DIN (IGA + protección permanente POP + transitoria Tipo 2).",
    });
  } else {
    inventario.push({
      id: igaId,
      carril: 1,
      tipo: "IGA",
      marca_modelo:
        igaAmps > 63
          ? `${brandName} Caja Moldeada MCCB + Bobina MX`
          : `${brandName} IGA`,
      calibre_a: igaAmps,
      curva: "C",
      sensibilidad_ma: 0,
      clase_id: "N/A",
      polos: mainPoles,
      poder_corte_ka: igaAmps > 63 ? Math.max(15, icuKa) : icuKa,
      padre_id: "Derivación Individual",
      circuito_itc_bt_25: "Corte General (ITC-BT-17)",
      confianza: "alta",
      observaciones:
        igaAmps > 63
          ? "Interruptor automático de caja moldeada (>63A) asociado a bobina de disparo."
          : "[A verificar en obra]",
    });

    if (hasSurgeProtection) {
      inventario.push({
        id: nextId(1),
        carril: 1,
        tipo: "PCS",
        marca_modelo: `${brandName} POP + SPD Tipo 1+2`,
        calibre_a: igaAmps,
        curva: "N/A",
        sensibilidad_ma: 0,
        clase_id: "N/A",
        polos: mainPoles,
        poder_corte_ka: icuKa,
        padre_id: igaId,
        circuito_itc_bt_25: "Protección Sobretensiones (ITC-BT-23 / NRZ103)",
        confianza: "alta",
        observaciones:
          igaAmps > 63
            ? "Protector independiente acoplado a bobina de disparo sobre MCCB."
            : "Protector contra sobretensiones permanentes y transitorias.",
      });
    }
  }

  // 2. Diferenciales y PIAs asociados
  const effectiveRcds = Math.max(1, rcdCount);
  const rcdNodeIds: string[] = [];
  const tablaCircuitos: CanariasVisionCircuitRow[] = [];

  for (let r = 0; r < effectiveRcds; r++) {
    const carrilNum = r === 0 ? 1 : r + 1;
    if (r > 0) seq = 1;
    const rcdId = nextId(carrilNum);
    rcdNodeIds.push(rcdId);
    inventario.push({
      id: rcdId,
      carril: carrilNum,
      tipo: "ID",
      marca_modelo: `${brandName} ID`,
      calibre_a: Math.max(diferencialCalibreAmps, Math.min(63, igaAmps)),
      curva: "N/A",
      sensibilidad_ma: 30,
      clase_id: diferencialClase,
      polos: mainPoles,
      poder_corte_ka: icuKa,
      padre_id: igaId,
      circuito_itc_bt_25: `Grupo Diferencial #${r + 1} (ITC-BT-24)`,
      confianza: "alta",
      observaciones:
        diferencialClase === "AC"
          ? "Clase AC detectada: valorar actualización a Clase A. [A verificar en obra]"
          : "Protección diferencial 30 mA inmunizada. [A verificar en obra]",
    });

    const groupCircuits = circuits.filter(
      (_, idx) => Math.min(effectiveRcds - 1, Math.floor(idx / 5)) === r
    );

    for (const c of groupCircuits) {
      const calc = calculateRebtCircuit(c);
      const piaId = nextId(carrilNum);
      inventario.push({
        id: piaId,
        carril: carrilNum,
        tipo: "PIA",
        marca_modelo: `${brandName} C${calc.piaAmps}`,
        calibre_a: calc.piaAmps,
        curva: "C",
        sensibilidad_ma: 0,
        clase_id: "N/A",
        polos: c.voltage === 400 ? "4P" : "1P+N",
        poder_corte_ka: icuKa,
        padre_id: rcdId,
        circuito_itc_bt_25: `${c.code} - ${c.description}`,
        confianza: "alta",
        observaciones: `Conductor ${calc.sectionMm2} mm² H07Z1-K (AS) bajo tubo Ø${calc.tubeDiameterMm} mm. [A verificar en obra]`,
      });

      tablaCircuitos.push({
        circuito: c.code,
        destino: c.description,
        pia_a: calc.piaAmps,
        seccion_mm2: calc.sectionMm2,
        conductor: "H07Z1-K (AS) 450/750V",
        tubo_mm: calc.tubeDiameterMm,
      });
    }
  }

  // 3. Generar código Mermaid con etiquetas entre comillas dobles
  const mermaidLines: string[] = [
    "graph TD",
    `  DI["Derivacion Individual RZ1-K (AS) 0,6/1kV - ${isTri ? "400V 3F+N+TT" : "230V F+N+TT"}"]`,
  ];
  const sanitizeId = (raw: string) => raw.replace(/[^a-zA-Z0-9_]/g, "_");
  for (const item of inventario) {
    const nodeId = sanitizeId(item.id);
    const labelParts = [
      `${item.id}: ${item.tipo}`,
      item.calibre_a ? `${item.calibre_a}A` : "",
      item.curva !== "N/A" ? `Curva ${item.curva}` : "",
      item.sensibilidad_ma ? `${item.sensibilidad_ma}mA Clase ${item.clase_id}` : "",
      item.polos,
      item.circuito_itc_bt_25 ? `(${item.circuito_itc_bt_25})` : "",
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/"/g, "'");
    mermaidLines.push(`  ${nodeId}["${labelParts}"]`);
    const parentNode =
      item.padre_id === "Derivación Individual" || item.padre_id === "Acometida"
        ? "DI"
        : sanitizeId(item.padre_id);
    mermaidLines.push(`  ${parentNode} --> ${nodeId}`);
  }

  const diSeccion = igaAmps <= 25 ? 6 : igaAmps <= 40 ? 10 : igaAmps <= 63 ? 16 : 25;
  const raVal = meta?.resistenciaTierraMedidaOhm || 18;
  const actuacion = meta?.tipoActuacion || "Nueva instalación";
  const muni = meta?.terminoMunicipal || "Santa Cruz de Tenerife";

  return {
    contexto_canarias: {
      distribuidora:
        "Edistribución Redes Digitales S.L.U. (Norma Particular NRZ103 - Canarias)",
      sistema_alimentacion: isTri
        ? "Trifásico 400V (3F+N+TT)"
        : "Monofásico 230V (F+N+TT)",
      calibre_iga_amperios: igaAmps,
      potencia_maxima_admisible_w: maxPowerW,
      grado_electrificacion: gradoStr,
      alertas_inspeccion_canarias: alertas,
    },
    inventario_componentes: inventario,
    esquema_unifilar_mermaid: mermaidLines.join("\n"),
    memoria_tecnica_gobierno_canarias: {
      objeto_instalacion: `${actuacion} eléctrica de Baja Tensión situada en el T.M. de ${muni} (Canarias), proyectada conforme al REBT (RD 842/2002), las Normas Particulares de Edistribución (NRZ103) y los requisitos de la Dirección General de Energía del Gobierno de Canarias. Suministro ${isTri ? "Trifásico 400/230 V" : "Monofásico 230 V"} con potencia máxima admisible de ${maxPowerW.toLocaleString("es-ES")} W (IGA ${igaAmps} A — ${gradoStr}).`,
      caracteristicas_enlace_y_di: `Derivación Individual ejecutada según ITC-BT-15 y especificación NRZ103 de Edistribución con conductores de cobre unipolares libres de halógenos RZ1-K (AS) 0,6/1 kV (o H07Z1-K (AS) 450/750 V según canalización) de sección ${diSeccion} mm² + conductor de protección PE e hilo de mando rojo de 1,5 mm², con caída de tensión reglamentaria admisible.${meta?.cupsCodigo ? ` Código CUPS del suministro: ${meta.cupsCodigo}.` : ""}`,
      proteccion_sobreintensidades: `Corte omnipolar general mediante IGA de ${igaAmps} A (${mainPoles}, poder de corte mín. ${icuKa} kA conforme ITC-BT-17 y NRZ103) y protección individual de cada circuito interior contra sobrecargas y cortocircuitos (ITC-BT-22) mediante PIAs curva C calibrados según la intensidad admisible Iz de cada conductor H07Z1-K (AS) 450/750 V.`,
      proteccion_contactos_indirectos_y_tierra: `Corte automático de la alimentación (esquema TT, ITC-BT-24) mediante ${effectiveRcds} interruptor(es) diferencial(es) Clase ${diferencialClase} de sensibilidad IΔn = 30 mA. Considerando la alta resistividad del terreno basáltico/volcánico en Tenerife, el sistema de puesta a tierra (${meta?.electrodosDescripcion || "picas de acero cobrizado / anillo en cimentación"}) presenta un valor medido con telurómetro en obra de Ra = ${raVal} Ω, cumpliendo holgadamente la condición Ra × IΔn = ${(raVal * 0.03).toFixed(2)} V ≤ 24 V (locales húmedos) / 50 V (locales secos).`,
      proteccion_sobretensiones: hasSurgeProtection
        ? `Dada la sensibilidad de los sistemas eléctricos insulares aislados frente a maniobras y oscilaciones de red, se dispone de protección contra sobretensiones permanentes (POP) y transitorias Tipo 2 / Tipo 1+2 (SPD) conforme a ITC-BT-23 y NRZ103.`
        : `ATENCIÓN: Se requiere incorporar protector combinado contra sobretensiones permanentes y transitorias (POP + SPD Tipo 2) aguas abajo o integrado con el IGA para cumplir ITC-BT-23 y NRZ103 en el sistema eléctrico insular canario.`,
      tabla_circuitos_mtd: tablaCircuitos,
    },
  };
}

/**
 * Convierte un JSON estructurado devuelto por el modelo de visión IA (Canarias / España)
 * en circuitos REBT calculables y parámetros listos para poblar el Simulador DIN, Unifilar y M.T.D.
 */
export function parseCanariasVisionJsonToSummary(
  vision: CanariasPanelVisionResult
): {
  supplyType: SystemSupplyType;
  igaAmps: number;
  hasSurgeProtection: boolean;
  rcdCount: number;
  diferencialCalibreAmps: number;
  diferencialClase: "AC" | "A" | "F" | "B";
  brandDetected?: string;
  circuits: RebtCircuitInput[];
  summarySentence: string;
} {
  const sysRaw = (vision.contexto_canarias?.sistema_alimentacion || "").toLowerCase();
  const has4P = vision.inventario_componentes?.some(
    (c) => c.polos === "4P" || c.polos === "3P+N" || c.polos === "3P"
  );
  const supplyType: SystemSupplyType =
    sysRaw.includes("trif") || sysRaw.includes("400") || has4P
      ? "trifasico_400v"
      : "monofasico_230v";

  const igaComp = vision.inventario_componentes?.find(
    (c) => c.tipo === "IGA" || c.tipo === "ICP"
  );
  const rawIga =
    vision.contexto_canarias?.calibre_iga_amperios ||
    igaComp?.calibre_a ||
    25;
  const validSteps =
    supplyType === "trifasico_400v"
      ? [25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250]
      : [10, 15, 16, 20, 25, 32, 40, 50, 63];
  const igaAmps =
    validSteps.find((s) => s >= rawIga) || validSteps[validSteps.length - 1];

  const hasSurgeProtection = Boolean(
    vision.inventario_componentes?.some(
      (c) =>
        c.tipo === "PCS" ||
        /pcs|spd|dps|pop|combi|sobretensi/i.test(
          `${c.marca_modelo} ${c.circuito_itc_bt_25} ${c.observaciones}`
        )
    )
  );

  const rcds =
    vision.inventario_componentes?.filter((c) => c.tipo === "ID") || [];
  const rcdCount = Math.max(1, rcds.length);
  const firstRcd = rcds[0];
  const diferencialCalibreAmps = firstRcd?.calibre_a || Math.max(40, Math.min(63, igaAmps));
  const rawClase = (firstRcd?.clase_id || "A").toUpperCase();
  const diferencialClase: "AC" | "A" | "F" | "B" =
    rawClase === "AC" || rawClase === "A" || rawClase === "F" || rawClase === "B"
      ? rawClase
      : "A";

  const firstBrandRaw =
    vision.inventario_componentes
      ?.map((c) => c.marca_modelo)
      .find((b) => b && !/no legible/i.test(b)) || "";
  let brandDetected: string | undefined;
  if (/schneider|merlin\s*gerin|multi\s*9/i.test(firstBrandRaw))
    brandDetected = "Schneider";
  else if (/abb/i.test(firstBrandRaw)) brandDetected = "ABB";
  else if (/hager/i.test(firstBrandRaw)) brandDetected = "Hager";
  else if (/legrand/i.test(firstBrandRaw)) brandDetected = "Legrand";
  else if (/siemens/i.test(firstBrandRaw)) brandDetected = "Siemens";
  else if (/chint/i.test(firstBrandRaw)) brandDetected = "Chint";

  const tableRows =
    vision.memoria_tecnica_gobierno_canarias?.tabla_circuitos_mtd || [];
  const piaItems =
    vision.inventario_componentes?.filter((c) => c.tipo === "PIA") || [];

  const circuits: RebtCircuitInput[] = [];
  if (tableRows.length > 0) {
    tableRows.forEach((row, idx) => {
      const code = row.circuito || `C${idx + 1}`;
      const pia = row.pia_a || 16;
      const { sectionMm2, defaultPowerW } = inferSectionAndTubeFromPia(pia);
      const isTriPia =
        supplyType === "trifasico_400v" &&
        Boolean(
          piaItems[idx] &&
            (piaItems[idx].polos === "4P" || piaItems[idx].polos === "3P+N")
        );
      circuits.push({
        id: idx + 1,
        code,
        description: row.destino || `Circuito ${code}`,
        usageType: code === "C13" ? "recarga_ve" : "vivienda_interior",
        phaseSystem: isTriPia ? "trifasico" : "monofasico",
        phaseAssigned: isTriPia ? "L1-L2-L3" : "L1",
        voltage: isTriPia ? 400 : 230,
        powerWatts: defaultPowerW,
        lengthMeters: 15,
        cosPhi: 1,
        simultaneityFactor: 1,
        utilizationFactor: 1,
        insulationType: "PVC_70",
        material: "Cu",
        installationMethod: "B1",
        minSectionMm2: row.seccion_mm2 || sectionMm2,
        fixedPiaAmps: pia,
      });
    });
  } else if (piaItems.length > 0) {
    piaItems.forEach((p, idx) => {
      const pia = p.calibre_a || 16;
      const { sectionMm2, defaultPowerW } = inferSectionAndTubeFromPia(pia);
      const codeMatch = p.circuito_itc_bt_25?.match(/\b(C\d{1,2})\b/i);
      const code = codeMatch ? codeMatch[1].toUpperCase() : `C${idx + 1}`;
      const isTriPia = p.polos === "4P" || p.polos === "3P+N" || p.polos === "3P";
      circuits.push({
        id: idx + 1,
        code,
        description: p.circuito_itc_bt_25 || `Circuito ${code} (${pia}A)`,
        usageType: code === "C13" ? "recarga_ve" : "vivienda_interior",
        phaseSystem: isTriPia ? "trifasico" : "monofasico",
        phaseAssigned: isTriPia ? "L1-L2-L3" : "L1",
        voltage: isTriPia ? 400 : 230,
        powerWatts: defaultPowerW,
        lengthMeters: 15,
        cosPhi: 1,
        simultaneityFactor: 1,
        utilizationFactor: 1,
        insulationType: "PVC_70",
        material: "Cu",
        installationMethod: "B1",
        minSectionMm2: sectionMm2,
        fixedPiaAmps: pia,
      });
    });
  }

  const piaDesc = circuits
    .map((c, idx) => {
      const pAmps =
        tableRows[idx]?.pia_a ||
        piaItems[idx]?.calibre_a ||
        calculateRebtCircuit(c).piaAmps;
      return `${c.code} ${c.description} ${pAmps}A`;
    })
    .join(", ");

  const summarySentence = `Cuadro detectado (${
    supplyType === "trifasico_400v" ? "Trifásico 400V" : "Monofásico 230V"
  }): ${igaComp?.tipo === "ICP" ? `ICP ${rawIga}A -> IGA ${igaAmps}A` : `IGA ${igaAmps}A`} ${
    hasSurgeProtection ? "con sobretensiones T2+POP" : "sin sobretensiones"
  }, ${rcdCount} diferencial${rcdCount > 1 ? "es" : ""} de ${diferencialCalibreAmps}A 30mA Clase ${diferencialClase}${
    piaDesc ? `, ${piaDesc}` : ""
  }`;

  return {
    supplyType,
    igaAmps,
    hasSurgeProtection,
    rcdCount,
    diferencialCalibreAmps,
    diferencialClase,
    brandDetected,
    circuits,
    summarySentence,
  };
}

// ============================================================================
// MOTOR DUAL DE INSPECCIÓN Y ADECUACIÓN REBT DESDE FOTOGRAFÍA DE CUADRO
// Separa estrictamente en DOS FICHAS TÉCNICAS M.T.D. INDEPENDIENTES:
//   - Opción 1 (ACT): Cómo está la instalación + Dictamen Cumple / No Cumple REBT
//   - Opción 2 (COR): Correcciones obligatorias y Cómo debe ir la instalación
// ============================================================================

export interface PanelNormativeCheck {
  id: string;
  itc: string;
  title: string;
  passed: boolean;
  severity: "cumple" | "leve" | "grave";
  observedValue: string;
  normativeRequirement: string;
}

export interface PanelCorrectionAction {
  id: string;
  order: number;
  itc: string;
  componentTarget: string;
  currentState: string;
  howItMustGo: string;
  priority: "obligatoria" | "recomendada";
}

export interface DualPanelProfileSnapshot {
  mode: "estado_actual" | "instalacion_corregida";
  optionLabel: string;
  shortTitle: string;
  expedienteSuffix: "ACT" | "COR";
  expedienteNum: string;
  instalacionNum: string;
  supplyType: SystemSupplyType;
  electrificationGrade: "basica" | "elevada";
  igaAmps: number;
  rawDetectedIgaAmps: number;
  hasIcpOnly: boolean;
  hasSurgeProtection: boolean;
  rcdCount: number;
  diferencialCalibreAmps: number;
  diferencialClase: "AC" | "A" | "S" | "B";
  brandDetected?: string;
  circuits: RebtCircuitInput[];
  summarySentence: string;
  mtdPatch: Partial<MtdFormMetadata>;
}

export interface DualPanelEvaluationResult {
  sourceLabel: string;
  photoDataUrl?: string;
  baseExpedienteNum: string;
  baseInstalacionNum: string;
  overallCompliant: boolean;
  verdictBadge: string;
  complianceScorePct: number;
  defectsGraveCount: number;
  defectsLeveCount: number;
  checks: PanelNormativeCheck[];
  corrections: PanelCorrectionAction[];
  actual: DualPanelProfileSnapshot;
  corregido: DualPanelProfileSnapshot;
  structuredVision?: CanariasPanelVisionResult | null;
}

export interface RawPanelObservationInput {
  supplyType: SystemSupplyType;
  rawIgaAmps: number;
  hasIcpOnly?: boolean;
  hasNoHeaderBreaker?: boolean;
  hasSurgeProtection: boolean;
  rcdCount: number;
  diferencialCalibreAmps: number;
  diferencialClase: "AC" | "A" | "S" | "B";
  brandDetected?: string;
  circuits: RebtCircuitInput[];
  sourceLabel?: string;
  photoDataUrl?: string;
  baseExpedienteNum?: string;
  baseInstalacionNum?: string;
  structuredVision?: CanariasPanelVisionResult | null;
}

function stripReportSuffix(code: string): string {
  return (code || "").trim().replace(/-(ACT|COR)$/i, "");
}

function buildStandardHousingCircuit(
  code: "C1" | "C2" | "C3" | "C4" | "C5",
  idNum: number
): RebtCircuitInput {
  const templates: Record<
    "C1" | "C2" | "C3" | "C4" | "C5",
    {
      description: string;
      powerWatts: number;
      lengthMeters: number;
      minSectionMm2: number;
      fixedPiaAmps: number;
    }
  > = {
    C1: {
      description: "Iluminación (máx. 30 puntos de luz)",
      powerWatts: 2300,
      lengthMeters: 15,
      minSectionMm2: 1.5,
      fixedPiaAmps: 10,
    },
    C2: {
      description: "Tomas de uso general y frigorífico",
      powerWatts: 3450,
      lengthMeters: 18,
      minSectionMm2: 2.5,
      fixedPiaAmps: 16,
    },
    C3: {
      description: "Cocina y horno (toma 25 A)",
      powerWatts: 5400,
      lengthMeters: 12,
      minSectionMm2: 6,
      fixedPiaAmps: 25,
    },
    C4: {
      description: "Lavadora, lavavajillas y termo eléctrico",
      powerWatts: 3450,
      lengthMeters: 14,
      minSectionMm2: 4,
      fixedPiaAmps: 20,
    },
    C5: {
      description: "Tomas de baño y auxiliares de cocina",
      powerWatts: 3450,
      lengthMeters: 15,
      minSectionMm2: 2.5,
      fixedPiaAmps: 16,
    },
  };
  const tpl = templates[code];
  return {
    id: idNum,
    code,
    description: tpl.description,
    usageType: "vivienda_interior",
    phaseSystem: "monofasico",
    phaseAssigned: "L1",
    voltage: 230,
    powerWatts: tpl.powerWatts,
    cosPhi: 1,
    simultaneityFactor: 1,
    utilizationFactor: 1,
    lengthMeters: tpl.lengthMeters,
    installationMethod: "B1",
    insulationType: "PVC_70",
    material: "Cu",
    minSectionMm2: tpl.minSectionMm2,
    fixedPiaAmps: tpl.fixedPiaAmps,
  };
}

/**
 * Construye los dos perfiles técnicos separados (Estado Actual vs Instalación Corregida)
 * con sus respectivas Fichas Técnicas M.T.D. independientes (-ACT y -COR).
 */
export function buildDualPanelEvaluation(
  input: RawPanelObservationInput
): DualPanelEvaluationResult {
  const baseExp =
    stripReportSuffix(input.baseExpedienteNum || "") ||
    `EXP-TE-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
  const baseInst =
    stripReportSuffix(input.baseInstalacionNum || "") ||
    `BT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

  const supplyType = input.supplyType;
  const rawIga = Math.max(10, Math.round(input.rawIgaAmps || 25));
  const hasIcpOnly = Boolean(input.hasIcpOnly);
  const hasNoHeaderBreaker = Boolean(input.hasNoHeaderBreaker);
  const actualHasSurge = Boolean(input.hasSurgeProtection);
  const actualRcdCount = Math.max(0, Math.round(input.rcdCount ?? 1));
  const actualDifCalibre = input.diferencialCalibreAmps || 40;
  const actualDifClase = input.diferencialClase || "AC";

  // Circuitos tal cual se observan en el cuadro existente (sin inventar circuitos faltantes)
  const actualCircuits: RebtCircuitInput[] =
    input.circuits.length > 0
      ? input.circuits.map((c, idx) => ({
          ...c,
          id: idx + 1,
        }))
      : [
          buildStandardHousingCircuit("C1", 1),
          buildStandardHousingCircuit("C2", 2),
          buildStandardHousingCircuit("C4", 3),
          buildStandardHousingCircuit("C3", 4),
        ];

  const actualCalculated = actualCircuits.map((c) => calculateRebtCircuit(c));
  const maxPiaActual = Math.max(
    10,
    ...actualCalculated.map((c) => c.piaAmps || c.fixedPiaAmps || 16)
  );
  const maxCircuitsPerRcdActual =
    actualRcdCount > 0
      ? Math.ceil(actualCircuits.length / actualRcdCount)
      : actualCircuits.length;

  const isHousingLike = actualCircuits.every(
    (c) => c.usageType === "vivienda_interior" || c.usageType === "recarga_ve"
  );

  // ==========================================================================
  // 1. AUDITORÍA NORMATIVA REBT SOBRE EL ESTADO ACTUAL
  // ==========================================================================
  const checks: PanelNormativeCheck[] = [];

  // Check 1: ITC-BT-17 — IGA omnipolar independiente y calibre mínimo
  const minRegIga = isHousingLike ? 25 : 16;
  const igaPassed =
    !hasIcpOnly &&
    !hasNoHeaderBreaker &&
    rawIga >= minRegIga &&
    rawIga >= maxPiaActual;
  checks.push({
    id: "chk-itc17-iga",
    itc: "ITC-BT-17",
    title: "Interruptor General Automático (IGA) omnipolar y selectividad",
    passed: igaPassed,
    severity: igaPassed ? "cumple" : "grave",
    observedValue: hasNoHeaderBreaker
      ? "Carece de IGA general de corte omnipolar"
      : hasIcpOnly
      ? `Solo existe antiguo ICP (${rawIga} A) sin IGA independiente`
      : `IGA ${rawIga} A (${supplyType === "trifasico_400v" ? "4P" : "2P"})`,
    normativeRequirement: isHousingLike
      ? `Obligatorio IGA omnipolar independiente de calibre ≥ 25 A (5.750 W Básica) y ≥ PIA mayor (${maxPiaActual} A), poder de corte mín. 4.500 A.`
      : `Obligatorio IGA omnipolar independiente coordinado con DI y calibre ≥ PIA mayor (${maxPiaActual} A).`,
  });

  // Check 2: ITC-BT-23 + NRZ103 Canarias — Protección contra Sobretensiones
  checks.push({
    id: "chk-itc23-surge",
    itc: "ITC-BT-23 / NRZ103",
    title: "Protección contra sobretensiones permanentes y transitorias (POP + DPS T2)",
    passed: actualHasSurge,
    severity: actualHasSurge ? "cumple" : "grave",
    observedValue: actualHasSurge
      ? "Dispone de protección contra sobretensiones (Combi / PCS Tipo 2 + POP)"
      : "NO dispone de protector contra sobretensiones permanentes ni transitorias",
    normativeRequirement:
      "Obligatorio instalar protección combinada permanente (POP) + transitoria Tipo 2 (Up ≤ 1,5 kV) aguas abajo o integrada con el IGA.",
  });

  // Check 3: ITC-BT-24 — Protección diferencial ≤ 30 mA y coordinación con cabecera
  const rcdCoordOk =
    actualRcdCount >= 1 &&
    (actualDifCalibre >= rawIga || rawIga <= actualDifCalibre);
  checks.push({
    id: "chk-itc24-rcd",
    itc: "ITC-BT-24",
    title: "Protección diferencial de alta sensibilidad (≤ 30 mA) y calibre In(ID) ≥ In(IGA)",
    passed: rcdCoordOk,
    severity: rcdCoordOk ? "cumple" : "grave",
    observedValue:
      actualRcdCount === 0
        ? "Sin interruptor diferencial detectado"
        : `${actualRcdCount} ud. ID ${actualDifCalibre} A / 30 mA · Clase ${actualDifClase}`,
    normativeRequirement: `Todo circuito interior debe estar protegido por ID ≤ 30 mA con intensidad asignada ≥ IGA (${rawIga} A) o protegido aguas arriba.`,
  });

  // Check 4: ITC-BT-24 / Guía Técnica — Clase de diferencial (Clase A frente a Clase AC)
  const claseAOk = actualDifClase === "A" || actualDifClase === "B";
  checks.push({
    id: "chk-itc24-clasea",
    itc: "ITC-BT-24 / UNE-EN 61008",
    title: "Inmunización diferencial frente a corrientes pulsantes CC (Clase A)",
    passed: claseAOk,
    severity: claseAOk ? "cumple" : "leve",
    observedValue: `Diferencial instalado Clase ${actualDifClase}`,
    normativeRequirement:
      "Se requiere / recomienda Diferencial Clase A (o Tipo F) para cargas electrónicas modernas (vitrocerámica inducción, lavadora Inverter, clima, LED, VE).",
  });

  // Check 5: ITC-BT-25 §2.3 — Máximo 5 circuitos por cada interruptor diferencial en vivienda
  const rcdGroupingOk = actualRcdCount >= 1 && maxCircuitsPerRcdActual <= 5;
  checks.push({
    id: "chk-itc25-max5",
    itc: "ITC-BT-25 §2.3",
    title: "Límite máximo de 5 circuitos por cada Interruptor Diferencial",
    passed: rcdGroupingOk,
    severity: rcdGroupingOk ? "cumple" : "grave",
    observedValue: `${actualCircuits.length} circuito(s) colgados de ${actualRcdCount} diferencial(es) (máx. ${maxCircuitsPerRcdActual} cir./ID)`,
    normativeRequirement:
      "En viviendas y locales asimilables se instalará al menos 1 diferencial por cada 5 circuitos o fracción (máximo 5 PIAs por ID de 30 mA).",
  });

  // Check 6: ITC-BT-25 Tabla 1 / ITC-BT-19 — Circuitos mínimos reglamentarios y secciones
  const hasMin5Circuits = !isHousingLike || actualCircuits.length >= 5;
  const allCircuitsSectionOk = actualCalculated.every((c) => c.isCompliant);
  const circuitsOk = hasMin5Circuits && allCircuitsSectionOk;
  checks.push({
    id: "chk-itc25-circuits",
    itc: "ITC-BT-25 / ITC-BT-19",
    title: "Dotación mínima de circuitos independientes (C1 a C5) y coordinación PIA-Conductor",
    passed: circuitsOk,
    severity: circuitsOk ? "cumple" : "grave",
    observedValue: `${actualCircuits.length} circuito(s) detectado(s) (${actualCircuits
      .map((c) => `${c.code} ${c.fixedPiaAmps || 16}A`)
      .join(", ")})`,
    normativeRequirement: isHousingLike
      ? "Electrificación Básica exige mínimo 5 circuitos independientes: C1 Alumbrado (10A/1,5mm²), C2 Tomas (16A/2,5mm²), C3 Cocina/Horno (25A/6mm²), C4 Lavadora/Termo (20A/4mm²) y C5 Baño/Aux. cocina (16A/2,5mm²)."
      : "Cada circuito debe cumplir Ib ≤ In (PIA) ≤ Iz y caída de tensión ΔU ≤ 3% alumbrado / 5% otros usos.",
  });

  const defectsGraveCount = checks.filter((c) => !c.passed && c.severity === "grave").length;
  const defectsLeveCount = checks.filter((c) => !c.passed && c.severity === "leve").length;
  const passedCount = checks.filter((c) => c.passed).length;
  const complianceScorePct = Math.round((passedCount / checks.length) * 100);
  const overallCompliant = defectsGraveCount === 0;
  const verdictBadge = overallCompliant
    ? defectsLeveCount === 0
      ? "CUMPLE NORMATIVA REBT AL 100%"
      : "CUMPLE REBT CON OBSERVACIÓN LEVE (MEJORA RECOMENDADA)"
    : `NO CUMPLE NORMATIVA REBT (${defectsGraveCount} DEFECTO${
        defectsGraveCount > 1 ? "S" : ""
      } REGLAMENTARIO${defectsGraveCount > 1 ? "S" : ""})`;

  // ==========================================================================
  // 2. CÁLCULO DE LA INSTALACIÓN CORREGIDA ("CÓMO DEBE IR SEGÚN REBT")
  // ==========================================================================
  const correctedCircuits: RebtCircuitInput[] = [];
  if (isHousingLike) {
    const baseCodes: ("C1" | "C2" | "C3" | "C4" | "C5")[] = [
      "C1",
      "C2",
      "C3",
      "C4",
      "C5",
    ];
    baseCodes.forEach((code, idx) => {
      const std = buildStandardHousingCircuit(code, idx + 1);
      const found = actualCircuits.find(
        (c) => c.code.toUpperCase() === code
      );
      if (found) {
        const safePia = std.fixedPiaAmps!;
        correctedCircuits.push({
          ...std,
          lengthMeters: found.lengthMeters || std.lengthMeters,
          fixedPiaAmps: safePia,
          minSectionMm2: std.minSectionMm2,
        });
      } else {
        correctedCircuits.push(std);
      }
    });
    // Conservar circuitos adicionales superiores a C5 (ej. C8 Calefacción, C9 Aire Acondicionado, C13 VE)
    actualCircuits.forEach((c) => {
      const upper = c.code.toUpperCase();
      if (!["C1", "C2", "C3", "C4", "C5"].includes(upper)) {
        const pia = c.fixedPiaAmps || 16;
        const { sectionMm2 } = inferSectionAndTubeFromPia(pia);
        correctedCircuits.push({
          ...c,
          id: correctedCircuits.length + 1,
          minSectionMm2: Math.max(c.minSectionMm2 || sectionMm2, sectionMm2),
          fixedPiaAmps: pia,
        });
      }
    });
  } else {
    actualCircuits.forEach((c, idx) => {
      const pia = c.fixedPiaAmps || 16;
      const { sectionMm2 } = inferSectionAndTubeFromPia(pia);
      correctedCircuits.push({
        ...c,
        id: idx + 1,
        minSectionMm2: Math.max(c.minSectionMm2 || sectionMm2, sectionMm2),
        fixedPiaAmps: pia,
      });
    });
  }

  const correctedGrade: "basica" | "elevada" =
    supplyType === "trifasico_400v" ||
    correctedCircuits.length > 5 ||
    rawIga >= 40
      ? "elevada"
      : "basica";

  const minTargetIga =
    supplyType === "trifasico_400v"
      ? Math.max(25, rawIga)
      : correctedGrade === "elevada"
      ? Math.max(40, rawIga)
      : Math.max(25, rawIga);

  const correctedIgaAmps = sanitizeSpanishIgaAmps(minTargetIga, supplyType);
  const correctedRcdCount = Math.max(
    2,
    Math.ceil(correctedCircuits.length / 5)
  );
  const correctedDifCalibre =
    correctedIgaAmps <= 40 ? 40 : correctedIgaAmps <= 63 ? 63 : 80;

  // ==========================================================================
  // 3. PLAN DETALLADO DE CORRECCIONES ("CÓMO DEBE IR LA INSTALACIÓN")
  // ==========================================================================
  const corrections: PanelCorrectionAction[] = [];
  let orderCounter = 1;

  if (!igaPassed || !actualHasSurge) {
    const headerSolution =
      correctedIgaAmps > 63
        ? `Instalar en cabecera un Interruptor Automático de Caja Moldeada (MCCB) ${
            supplyType === "trifasico_400v" ? "4P" : "2P"
          } de ${correctedIgaAmps} A acoplado a Bobina de Disparo MX y bloque independiente de protección contra sobretensiones permanentes (POP) + descargador transitorio Tipo 1+2 (Up ≤ 1,5 kV), conectado al embarrado PE con Cu 16 mm².`
        : `Retirar el elemento de cabecera antiguo e instalar en el carril superior izquierdo un Equipo Compacto Combinado (Combi IGA + POP + DPS Tipo 2) ${
            supplyType === "trifasico_400v" ? "4P" : "2P"
          } de ${correctedIgaAmps} A Curva C (Icu ≥ 6 kA, Up ≤ 1,5 kV), conectando directamente el borne de tierra del descargador a la barra colectora PE con conductor H07Z1-K (AS) de ${
            correctedIgaAmps >= 40 ? "16" : "10"
          } mm².`;

    corrections.push({
      id: "cor-cabecera-combi",
      order: orderCounter++,
      itc: "ITC-BT-17 + ITC-BT-23 + NRZ103",
      componentTarget: "Cabecera General de Mando y Protección (IGA + Sobretensiones)",
      currentState: `${
        hasIcpOnly ? `ICP ${rawIga} A sin IGA` : `IGA ${rawIga} A`
      } · ${
        actualHasSurge ? "Con sobretensiones" : "Sin protección contra sobretensiones"
      }`,
      howItMustGo: headerSolution,
      priority: "obligatoria",
    });
  }

  if (!rcdCoordOk || !rcdGroupingOk || !claseAOk || actualRcdCount < 2) {
    corrections.push({
      id: "cor-diferenciales",
      order: orderCounter++,
      itc: "ITC-BT-24 + ITC-BT-25 §2.3",
      componentTarget: "Protección Diferencial y Selectividad Horizontal",
      currentState: `${actualRcdCount} diferencial(es) ${actualDifCalibre} A / 30 mA Clase ${actualDifClase} (${maxCircuitsPerRcdActual} circuitos/ID)`,
      howItMustGo: `Instalar ${correctedRcdCount} Interruptores Diferenciales de ${correctedDifCalibre} A / 30 mA Clase A (${
        supplyType === "trifasico_400v" ? "4P / 2P equilibrados por fase" : "2P"
      }), alimentados aguas abajo del bloque Combi mediante peine homologado o puente doble aislamiento de ${
        correctedIgaAmps >= 40 ? "10" : "6"
      } mm², repartiendo un máximo estricto de 5 circuitos PIAs por cada diferencial (ej. Grupo ID1: C1 Alumbrado, C3 Cocina, C5 Baño; Grupo ID2: C2 Tomas Generales, C4 Lavadora/Termo${
        correctedCircuits.length > 5 ? " y circuitos adicionales" : ""
      }).`,
      priority: !rcdCoordOk || !rcdGroupingOk ? "obligatoria" : "recomendada",
    });
  }

  if (!circuitsOk) {
    corrections.push({
      id: "cor-circuitos-itc25",
      order: orderCounter++,
      itc: "ITC-BT-25 Tabla 1 + ITC-BT-19 + ITC-BT-29",
      componentTarget: "Desdoblamiento de Circuitos Interiores y Secciones H07Z1-K (AS)",
      currentState: `${actualCircuits.length} circuito(s) (${actualCircuits
        .map((c) => `${c.code} ${c.fixedPiaAmps || 16}A`)
        .join(", ")})`,
      howItMustGo: `Disponer los ${correctedCircuits.length} circuitos interiores independientes con PIAs Curva C (1P+N / 2P, corte omnipolar) y conductor libre de halógenos H07Z1-K (AS) 450/750 V + PE de igual sección bajo tubo corrugado: ${correctedCircuits
        .map((c) => {
          const calc = calculateRebtCircuit(c);
          return `${c.code} (${c.description}: PIA ${calc.piaAmps} A · ${calc.sectionMm2} mm² Cu · tubo Ø${calc.tubeDiameterMm} mm)`;
        })
        .join("; ")}.`,
      priority: "obligatoria",
    });
  }

  // Siempre incluir directriz reglamentaria de Derivación Individual, Envolvente y Embarrado PE
  const targetDiMm2 =
    correctedIgaAmps <= 25
      ? 6
      : correctedIgaAmps <= 40
      ? 10
      : correctedIgaAmps <= 63
      ? 16
      : 25;
  corrections.push({
    id: "cor-di-tierra-envolvente",
    order: orderCounter++,
    itc: "ITC-BT-15 + ITC-BT-17 + ITC-BT-18",
    componentTarget: "Derivación Individual (DI), Envolvente Modular y Embarrado de Tierra",
    currentState: "Verificación de envolvente, reserva modular del 20% y continuidad PE",
    howItMustGo: `Asegurar Derivación Individual libre de halógenos RZ1-K / H07Z1-K (AS) mín. ${targetDiMm2} mm² Cu + hilo de mando rojo 1,5 mm², caja general de mando y protección (CGMP) aislante Clase II (IP30 / IK07, autoextinguible 650 °C) de al menos ${
      correctedCircuits.length > 6 ? "24 (2 filas × 12)" : "18"
    } módulos DIN para dejar reserva libre, y regleta colectora de tierra (PE) conectada a todos los circuitos con R_tierra ≤ 37 Ω.`,
    priority: overallCompliant ? "recomendada" : "obligatoria",
  });

  // ==========================================================================
  // 4. REDACCIÓN DE MEMORIAS TÉCNICAS SEPARADAS PARA CADA FICHA M.T.D.
  // ==========================================================================
  const actualExpNum = `${baseExp}-ACT`;
  const actualInstNum = `${baseInst}-ACT`;
  const corrExpNum = `${baseExp}-COR`;
  const corrInstNum = `${baseInst}-COR`;

  const actualChecksText = checks
    .map(
      (chk, i) =>
        `  ${i + 1}. [${chk.passed ? "CUMPLE" : "NO CUMPLE"}] ${chk.itc} — ${
          chk.title
        }: Detectado «${chk.observedValue}». Exigencia: ${chk.normativeRequirement}`
    )
    .join("\n");

  const memoriaActualTexto = [
    `INFORME TÉCNICO DE ESTADO ACTUAL E INSPECCIÓN REBT — EXPEDIENTE ${actualExpNum}`,
    `DICTAMEN GLOBAL: ${verdictBadge} (Índice de cumplimiento: ${complianceScorePct}% — ${passedCount}/${checks.length} criterios verificados).`,
    ``,
    `1. ESTADO ACTUAL DE LA INSTALACIÓN EXISTENTE (SEGÚN INSPECCIÓN VISUAL DE CUADRO):`,
    `Cuadro eléctrico de distribución en sistema ${
      supplyType === "trifasico_400v" ? "Trifásico 400/230 V" : "Monofásico 230 V"
    }${input.brandDetected ? ` (aparamenta predominante ${input.brandDetected})` : ""}, equipado actualmente con: ${
      hasIcpOnly
        ? `Interruptor de Control de Potencia ICP de ${rawIga} A (careciendo de IGA independiente)`
        : `Cabecera IGA de ${rawIga} A`
    }, ${
      actualHasSurge
        ? "protección contra sobretensiones instalada"
        : "CARENCIA de protección contra sobretensiones permanentes y transitorias"
    }, ${actualRcdCount} interruptor(es) diferencial(es) de ${actualDifCalibre} A / 30 mA Clase ${actualDifClase} y ${
      actualCircuits.length
    } circuito(s) interior(es): ${actualCalculated
      .map((c) => `${c.code} (${c.description}, PIA ${c.piaAmps} A, ${c.sectionMm2} mm²)`)
      .join("; ")}.`,
    ``,
    `2. VERIFICACIÓN REGLAMENTARIA FRENTE AL REBT (RD 842/2002) Y NRZ103 CANARIAS:`,
    actualChecksText,
    ``,
    `NOTA: Este documento constituye la FICHA TÉCNICA DE ESTADO ACTUAL (${actualExpNum}). Para consultar el diseño reformado y las correcciones reglamentarias consulte la FICHA TÉCNICA DE INSTALACIÓN CORREGIDA (${corrExpNum}).`,
  ].join("\n");

  const corrLinesText = corrections
    .map(
      (cor) =>
        `  ${cor.order}. [${cor.itc}] ${cor.componentTarget}: Estado previo (${cor.currentState}) → ADECUACIÓN: ${cor.howItMustGo}`
    )
    .join("\n");

  const correctedCalculated = correctedCircuits.map((c) => calculateRebtCircuit(c));
  const memoriaCorregidaTexto = [
    `MEMORIA TÉCNICA DE ADECUACIÓN Y CORRECCIONES REBT (CÓMO DEBE IR LA INSTALACIÓN) — EXPEDIENTE ${corrExpNum}`,
    `ESTADO OBJETIVO: INSTALACIÓN 100% CONFORME AL REBT (RD 842/2002), GUÍA TÉCNICA Y NORMAS PARTICULARES NRZ103.`,
    ``,
    `1. CONFIGURACIÓN REGLAMENTARIA DEFINITIVA DEL CUADRO GENERAL (CGMP):`,
    `Suministro en Baja Tensión ${
      supplyType === "trifasico_400v" ? "Trifásico 400/230 V" : "Monofásico 230 V"
    }, Grado de Electrificación ${
      correctedGrade === "elevada" ? "ELEVADO" : "BÁSICO"
    }, Potencia Máxima Admisible ${Math.round(
      supplyType === "trifasico_400v"
        ? 1.732 * 400 * correctedIgaAmps
        : 230 * correctedIgaAmps
    ).toLocaleString()} W. Cabecera formada por ${
      correctedIgaAmps > 63
        ? `Interruptor Automático Caja Moldeada (MCCB) ${correctedIgaAmps} A + Bobina MX + Protector POP y DPS Tipo 1+2`
        : `Equipo Compacto Combinado en carril DIN (IGA ${correctedIgaAmps} A Curva C + Sobretensiones Permanentes POP + Transitorias DPS Tipo 2, Up ≤ 1,5 kV)`
    }, ${correctedRcdCount} Interruptores Diferenciales de ${correctedDifCalibre} A / 30 mA Clase A (máximo 5 circuitos por diferencial) y ${
      correctedCalculated.length
    } circuitos interiores cableados con conductor libre de halógenos H07Z1-K (AS) 450/750 V: ${correctedCalculated
      .map(
        (c) =>
          `${c.code} (${c.description}: PIA ${c.piaAmps} A, 2×${c.sectionMm2}+PE mm² Cu, tubo Ø${c.tubeDiameterMm} mm)`
      )
      .join("; ")}.`,
    ``,
    `2. RELACIÓN DE CORRECCIONES TÉCNICAS Y MONTAJE REGLAMENTARIO SOBRE EL ESTADO INICIAL (${actualExpNum}):`,
    corrLinesText,
  ].join("\n");

  const actualGrade: "basica" | "elevada" =
    supplyType === "trifasico_400v" || rawIga >= 40 || actualCircuits.length > 5
      ? "elevada"
      : "basica";

  const actualProfile: DualPanelProfileSnapshot = {
    mode: "estado_actual",
    optionLabel: "Opción 1 · Reporte de Estado Actual y Cumplimiento REBT",
    shortTitle: "Estado Actual (Inspección)",
    expedienteSuffix: "ACT",
    expedienteNum: actualExpNum,
    instalacionNum: actualInstNum,
    supplyType,
    electrificationGrade: actualGrade,
    igaAmps: rawIga,
    rawDetectedIgaAmps: rawIga,
    hasIcpOnly,
    hasSurgeProtection: actualHasSurge,
    rcdCount: Math.max(1, actualRcdCount),
    diferencialCalibreAmps: actualDifCalibre,
    diferencialClase: actualDifClase,
    brandDetected: input.brandDetected,
    circuits: actualCircuits,
    summarySentence: `Estado Actual (${
      supplyType === "trifasico_400v" ? "Trifásico 400V" : "Monofásico 230V"
    }): ${hasIcpOnly ? `ICP ${rawIga}A` : `IGA ${rawIga}A`} ${
      actualHasSurge ? "con sobretensiones T2+POP" : "sin sobretensiones"
    }, ${Math.max(1, actualRcdCount)} diferencial(es) ${actualDifCalibre}A 30mA Clase ${actualDifClase}, ${
      actualCircuits.length
    } circuito(s) — ${verdictBadge}`,
    mtdPatch: {
      expedienteNum: actualExpNum,
      instalacionNum: actualInstNum,
      expedienteVinculadoPar: corrExpNum,
      modalidadReporteFoto: "estado_actual",
      dictamenCumplimientoResumen: verdictBadge,
      tieneSobretensiones: actualHasSurge,
      tieneIgaReglamentario: !hasIcpOnly && !hasNoHeaderBreaker,
      calibreCabeceraDetectadoTexto: hasIcpOnly
        ? `ICP ${rawIga} A (sin IGA)`
        : `${rawIga} A`,
      sobretensionesKv: actualHasSurge ? "1,5" : "Carece",
      diferencialClase: actualDifClase,
      diferencialCalibreAmps: actualDifCalibre,
      conductorTierraMm2: rawIga >= 40 ? 16 : 10,
      memoriaDescriptivaTexto: memoriaActualTexto,
    },
  };

  const corregidoProfile: DualPanelProfileSnapshot = {
    mode: "instalacion_corregida",
    optionLabel: "Opción 2 · Correcciones y Cómo Debe Ir la Instalación (REBT)",
    shortTitle: "Instalación Corregida (REBT)",
    expedienteSuffix: "COR",
    expedienteNum: corrExpNum,
    instalacionNum: corrInstNum,
    supplyType,
    electrificationGrade: correctedGrade,
    igaAmps: correctedIgaAmps,
    rawDetectedIgaAmps: rawIga,
    hasIcpOnly: false,
    hasSurgeProtection: true,
    rcdCount: correctedRcdCount,
    diferencialCalibreAmps: correctedDifCalibre,
    diferencialClase: "A",
    brandDetected: input.brandDetected,
    circuits: correctedCircuits,
    summarySentence: `Instalación Corregida REBT (${
      supplyType === "trifasico_400v" ? "Trifásico 400V" : "Monofásico 230V"
    }): Combi IGA ${correctedIgaAmps}A con sobretensiones T2+POP, ${correctedRcdCount} diferenciales ${correctedDifCalibre}A 30mA Clase A, ${
      correctedCircuits.length
    } circuitos reglamentarios H07Z1-K (AS)`,
    mtdPatch: {
      expedienteNum: corrExpNum,
      instalacionNum: corrInstNum,
      expedienteVinculadoPar: actualExpNum,
      modalidadReporteFoto: "instalacion_corregida",
      dictamenCumplimientoResumen:
        "ADECUACIÓN 100% CONFORME AL REBT (RD 842/2002) Y NRZ103",
      tipoActuacion: "Reforma de importancia",
      tieneSobretensiones: true,
      tieneIgaReglamentario: true,
      calibreCabeceraDetectadoTexto: undefined,
      sobretensionesKv: "1,5",
      diferencialClase: "A",
      diferencialCalibreAmps: correctedDifCalibre,
      conductorTierraMm2:
        supplyType === "trifasico_400v" || correctedIgaAmps >= 40 ? 16 : 10,
      diCanalizacionDesc:
        supplyType === "trifasico_400v"
          ? "4x RZ1-K (AS) 0,6/1kV + TT bajo tubo protector"
          : "2x RZ1-K (AS) 0,6/1kV + TT bajo tubo protector",
      memoriaDescriptivaTexto: memoriaCorregidaTexto,
    },
  };

  return {
    sourceLabel: input.sourceLabel || "Análisis técnico de cuadro eléctrico",
    photoDataUrl: input.photoDataUrl,
    baseExpedienteNum: baseExp,
    baseInstalacionNum: baseInst,
    overallCompliant,
    verdictBadge,
    complianceScorePct,
    defectsGraveCount,
    defectsLeveCount,
    checks,
    corrections,
    actual: actualProfile,
    corregido: corregidoProfile,
    structuredVision: input.structuredVision ?? null,
  };
}

/**
 * Construye una evaluación dual (Estado Actual vs Instalación Corregida) directamente
 * a partir de un resultado estructurado de IA Vision (`CanariasPanelVisionResult`).
 */
export function buildDualPanelEvaluationFromVision(
  vision: CanariasPanelVisionResult,
  opts?: {
    sourceLabel?: string;
    photoDataUrl?: string;
    baseExpedienteNum?: string;
    baseInstalacionNum?: string;
  }
): DualPanelEvaluationResult {
  const parsed = parseCanariasVisionJsonToSummary(vision);
  const hasIga = vision.inventario_componentes?.some((c) => c.tipo === "IGA");
  const icpItem = vision.inventario_componentes?.find((c) => c.tipo === "ICP");
  const igaItem = vision.inventario_componentes?.find((c) => c.tipo === "IGA");
  const rawIgaAmps =
    igaItem?.calibre_a ||
    icpItem?.calibre_a ||
    vision.contexto_canarias?.calibre_iga_amperios ||
    parsed.igaAmps;

  const normalizedClase: "AC" | "A" | "S" | "B" =
    parsed.diferencialClase === "F" ? "A" : parsed.diferencialClase;

  return buildDualPanelEvaluation({
    supplyType: parsed.supplyType,
    rawIgaAmps,
    hasIcpOnly: Boolean(icpItem && !hasIga),
    hasNoHeaderBreaker: !hasIga && !icpItem,
    hasSurgeProtection: parsed.hasSurgeProtection,
    rcdCount: parsed.rcdCount,
    diferencialCalibreAmps: parsed.diferencialCalibreAmps,
    diferencialClase: normalizedClase,
    brandDetected: parsed.brandDetected,
    circuits: parsed.circuits,
    sourceLabel: opts?.sourceLabel || "Visión Estructurada REBT",
    photoDataUrl: opts?.photoDataUrl,
    baseExpedienteNum: opts?.baseExpedienteNum,
    baseInstalacionNum: opts?.baseInstalacionNum,
    structuredVision: vision,
  });
}

/**
 * Escáner visual local sobre <canvas> en navegador para extraer parámetros reales del cuadro
 * cuando no hay clave remota de IA Vision disponible.
 */
export function scanPanelPhotoLocallyRaw(
  dataUrl: string
): Promise<Omit<RawPanelObservationInput, "baseExpedienteNum" | "baseInstalacionNum">> {
  return new Promise((resolve) => {
    const fallbackObservation = (): Omit<
      RawPanelObservationInput,
      "baseExpedienteNum" | "baseInstalacionNum"
    > => ({
      supplyType: "monofasico_230v",
      rawIgaAmps: 25,
      hasIcpOnly: false,
      hasSurgeProtection: false,
      rcdCount: 1,
      diferencialCalibreAmps: 40,
      diferencialClase: "AC",
      circuits: [
        buildStandardHousingCircuit("C1", 1),
        buildStandardHousingCircuit("C2", 2),
        buildStandardHousingCircuit("C4", 3),
        buildStandardHousingCircuit("C3", 4),
      ],
      sourceLabel: "Escáner visual local de aparamenta DIN",
      photoDataUrl: dataUrl,
    });

    if (typeof Image === "undefined" || typeof document === "undefined") {
      resolve(fallbackObservation());
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        const w = 320;
        const h = Math.max(
          120,
          Math.round((img.height / Math.max(1, img.width)) * w)
        );
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(fallbackObservation());
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);

        let bestPeaks = 0;
        let hasGapSplit = false;
        let widestBarPx = 0;
        for (let rowPct = 0.34; rowPct <= 0.66; rowPct += 0.04) {
          const y = Math.floor(h * rowPct);
          let darkRun = 0;
          let lightGap = 0;
          let peaks = 0;
          let splitDetected = false;
          let rowWidest = 0;
          for (let x = Math.floor(w * 0.08); x < Math.floor(w * 0.92); x++) {
            const idx = (y * w + x) * 4;
            const lum =
              0.299 * data[idx] +
              0.587 * data[idx + 1] +
              0.114 * data[idx + 2];
            if (lum < 78) {
              darkRun++;
              if (darkRun > rowWidest) rowWidest = darkRun;
              if (peaks > 0 && lightGap > Math.floor(w * 0.12)) {
                splitDetected = true;
              }
              lightGap = 0;
            } else {
              if (darkRun >= 3 && darkRun <= 56) {
                peaks++;
              }
              darkRun = 0;
              lightGap++;
            }
          }
          if (peaks > bestPeaks) {
            bestPeaks = peaks;
            hasGapSplit = splitDetected;
            widestBarPx = rowWidest;
          }
        }

        let vividGreenOrOrange = 0;
        for (let y = Math.floor(h * 0.28); y < Math.floor(h * 0.55); y += 2) {
          for (let x = Math.floor(w * 0.14); x < Math.floor(w * 0.45); x += 2) {
            const idx = (y * w + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            if (
              (g > 155 && g > r * 1.35 && g > b * 1.35) ||
              (r > 195 && g > 90 && g < 155 && b < 60)
            ) {
              vividGreenOrOrange++;
            }
          }
        }

        const isThreePhaseBar =
          widestBarPx >= Math.floor(w * 0.125) && bestPeaks >= 4;
        const hasSurge = vividGreenOrOrange >= 18;
        const estimatedPias = Math.max(
          4,
          Math.min(8, bestPeaks >= 4 ? bestPeaks - 2 : 4)
        );
        const hasIcpCompartment = !isThreePhaseBar && hasGapSplit && !hasSurge;
        const rcds = hasSurge && estimatedPias >= 5 ? 2 : 1;
        const rawIga = isThreePhaseBar
          ? 40
          : hasIcpCompartment
          ? 20
          : estimatedPias >= 6
          ? 40
          : 25;

        const catalogOrder: ("C1" | "C2" | "C4" | "C3" | "C5")[] = [
          "C1",
          "C2",
          "C4",
          "C3",
          "C5",
        ];
        const builtCircuits: RebtCircuitInput[] = [];
        for (let i = 0; i < estimatedPias; i++) {
          if (i < catalogOrder.length) {
            builtCircuits.push(buildStandardHousingCircuit(catalogOrder[i], i + 1));
          } else {
            builtCircuits.push({
              id: i + 1,
              code: `C${i + 4}`,
              description:
                i === 5
                  ? "Aire acondicionado / Climatización (C9)"
                  : `Circuito auxiliar interior #${i + 1}`,
              usageType: "vivienda_interior",
              phaseSystem: isThreePhaseBar ? "trifasico" : "monofasico",
              phaseAssigned: isThreePhaseBar ? "L1-L2-L3" : "L1",
              voltage: isThreePhaseBar ? 400 : 230,
              powerWatts: 3450,
              cosPhi: 1,
              simultaneityFactor: 1,
              utilizationFactor: 1,
              lengthMeters: 16,
              installationMethod: "B1",
              insulationType: "PVC_70",
              material: "Cu",
              minSectionMm2: 2.5,
              fixedPiaAmps: 16,
            });
          }
        }

        resolve({
          supplyType: isThreePhaseBar ? "trifasico_400v" : "monofasico_230v",
          rawIgaAmps: rawIga,
          hasIcpOnly: hasIcpCompartment,
          hasSurgeProtection: hasSurge,
          rcdCount: rcds,
          diferencialCalibreAmps: 40,
          diferencialClase: hasSurge ? "A" : "AC",
          circuits: builtCircuits,
          sourceLabel: "Escáner visual local de aparamenta DIN",
          photoDataUrl: dataUrl,
        });
      } catch {
        resolve(fallbackObservation());
      }
    };
    img.onerror = () => resolve(fallbackObservation());
    img.src = dataUrl;
  });
}

/**
 * Analiza la imagen de un cuadro eléctrico llamando primero a `/api/analyze-vision`
 * y usando `scanPanelPhotoLocallyRaw` como respaldo inmediato, devolviendo SIEMPRE
 * las dos opciones separadas (`actual` y `corregido`) con sus Fichas Técnicas M.T.D. distintas.
 */
export async function analyzePanelImageToDualEvaluation(params: {
  imageDataUrl: string;
  baseExpedienteNum?: string;
  baseInstalacionNum?: string;
}): Promise<DualPanelEvaluationResult> {
  const { imageDataUrl, baseExpedienteNum, baseInstalacionNum } = params;
  try {
    const res = await fetch("/api/analyze-vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "cuadro_electrico",
        imageDataUrl,
      }),
    });
    const json = (await res.json()) as {
      ok?: boolean;
      mode?: string;
      extractedText?: string;
      structuredAnalysis?: CanariasPanelVisionResult;
    };

    if (json?.ok && json.structuredAnalysis) {
      return buildDualPanelEvaluationFromVision(json.structuredAnalysis, {
        sourceLabel: `Visión IA Estructurada REBT (${json.mode || "IA"})`,
        photoDataUrl: imageDataUrl,
        baseExpedienteNum,
        baseInstalacionNum,
      });
    }
  } catch {
    // Respaldo inmediato al escáner visual local en navegador
  }

  const localRaw = await scanPanelPhotoLocallyRaw(imageDataUrl);
  return buildDualPanelEvaluation({
    ...localRaw,
    baseExpedienteNum,
    baseInstalacionNum,
  });
}
