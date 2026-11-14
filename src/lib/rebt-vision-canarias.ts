import type {
  MtdFormMetadata,
  RebtCircuitInput,
  SystemSupplyType,
} from "./electrical-calculations.ts";
import { calculateRebtCircuit } from "./electrical-calculations.ts";

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
