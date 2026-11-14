import type { CanariasPanelVisionResult } from "./rebt-vision-canarias.ts";
import type { MtdFormMetadata } from "./electrical-calculations.ts";

function cleanAsciiDxf(text: string): string {
  return (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[º°]/g, "o")
    .replace(/²/g, "2")
    .replace(/Δ/g, "d")
    .replace(/Ω/g, "Ohm")
    .replace(/[^\x20-\x7E]/g, " ")
    .trim();
}

function dxfLine(
  layer: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): string {
  return [
    "0",
    "LINE",
    "8",
    layer,
    "10",
    x1.toFixed(2),
    "20",
    y1.toFixed(2),
    "30",
    "0.0",
    "11",
    x2.toFixed(2),
    "21",
    y2.toFixed(2),
    "31",
    "0.0",
  ].join("\n");
}

function dxfCircle(
  layer: string,
  cx: number,
  cy: number,
  r: number
): string {
  return [
    "0",
    "CIRCLE",
    "8",
    layer,
    "10",
    cx.toFixed(2),
    "20",
    cy.toFixed(2),
    "30",
    "0.0",
    "40",
    r.toFixed(2),
  ].join("\n");
}

function dxfRect(
  layer: string,
  x: number,
  y: number,
  w: number,
  h: number
): string {
  return [
    dxfLine(layer, x, y, x + w, y),
    dxfLine(layer, x + w, y, x + w, y + h),
    dxfLine(layer, x + w, y + h, x, y + h),
    dxfLine(layer, x, y + h, x, y),
  ].join("\n");
}

function dxfText(
  layer: string,
  x: number,
  y: number,
  height: number,
  text: string
): string {
  const safe = cleanAsciiDxf(text);
  if (!safe) return "";
  return [
    "0",
    "TEXT",
    "8",
    layer,
    "10",
    x.toFixed(2),
    "20",
    y.toFixed(2),
    "30",
    "0.0",
    "40",
    height.toFixed(2),
    "1",
    safe,
  ].join("\n");
}

/**
 * Símbolo normalizado IEC 60617 de interruptor magnetotérmico / diferencial en coordenadas DXF (X, Y)
 */
function dxfIecBreakerSymbol(
  layer: string,
  cx: number,
  topY: number,
  botY: number,
  isRcd: boolean
): string {
  const midTop = topY - 4;
  const midBot = botY + 4;
  const parts = [
    dxfLine(layer, cx, topY, cx, midTop),
    dxfLine(layer, cx, midBot, cx, botY),
    // Contacto inclinado IEC 60617
    dxfLine(layer, cx, midBot, cx - 4.5, midTop - 1),
    // Cruz magnetotérmica o toroide diferencial
    isRcd
      ? dxfCircle(layer, cx, (midTop + midBot) / 2, 3.2)
      : [
          dxfLine(layer, cx - 5.5, midTop + 1, cx - 2.5, midTop - 2),
          dxfLine(layer, cx - 5.5, midTop - 2, cx - 2.5, midTop + 1),
        ].join("\n"),
  ];
  return parts.join("\n");
}

/**
 * Genera un plano AutoCAD (.DXF R12 ASCII universal) en formato A3 horizontal (420 x 297 mm)
 * a partir del array inventario_componentes y tabla_circuitos_mtd del análisis REBT Canarias.
 */
export function generateUnifilarDxf(params: {
  vision: CanariasPanelVisionResult;
  meta: Partial<MtdFormMetadata>;
  sheetNumber?: string;
}): string {
  const { vision, meta, sheetNumber = "01" } = params;
  const entities: string[] = [];

  // 1. Marco formato A3 UNE-EN ISO 5457 (420 x 297 mm)
  entities.push(dxfRect("CAJETIN", 10, 10, 400, 277));
  entities.push(dxfRect("CAJETIN", 15, 15, 390, 267));

  // 2. Cajetín técnico inferior derecho (180 x 42 mm)
  const tbX = 225;
  const tbY = 15;
  entities.push(dxfRect("CAJETIN", tbX, tbY, 180, 42));
  entities.push(dxfLine("CAJETIN", tbX, tbY + 14, tbX + 180, tbY + 14));
  entities.push(dxfLine("CAJETIN", tbX, tbY + 28, tbX + 180, tbY + 28));
  entities.push(dxfLine("CAJETIN", tbX + 130, tbY, tbX + 130, tbY + 42));

  entities.push(
    dxfText(
      "TEXTOS",
      tbX + 4,
      tbY + 33,
      3.5,
      `ESQUEMA UNIFILAR IEC 60617 - REBT RD 842/2002 / NRZ103 CANARIAS`
    )
  );
  entities.push(
    dxfText(
      "TEXTOS",
      tbX + 4,
      tbY + 19,
      2.8,
      `TITULAR: ${meta.titularNombre || "Suministro B.T."} | EXP: ${meta.expedienteNum || "MTD-BT"}`
    )
  );
  entities.push(
    dxfText(
      "TEXTOS",
      tbX + 4,
      tbY + 5,
      2.6,
      `EMPLAZAMIENTO: C/ ${meta.direccionCalle || ""} ${meta.direccionNum || ""} - ${meta.terminoMunicipal || "Tenerife"} | CUPS: ${meta.cupsCodigo || "ES0031..."}`
    )
  );
  entities.push(
    dxfText("TEXTOS", tbX + 134, tbY + 33, 3.2, `PLANO No: ${sheetNumber}`)
  );
  entities.push(
    dxfText(
      "TEXTOS",
      tbX + 134,
      tbY + 19,
      2.6,
      `PH: ${meta.instaladorNombrePh || "Instalador"}`
    )
  );
  entities.push(
    dxfText(
      "TEXTOS",
      tbX + 134,
      tbY + 5,
      2.5,
      `Ra: ${meta.resistenciaTierraMedidaOhm || 18} Ohm`
    )
  );

  // 3. Cabecera Acometida / Derivación Individual + IGA + PCS
  const centerX = 205;
  entities.push(
    dxfText(
      "TEXTOS",
      24,
      272,
      4.2,
      `CUADRO GENERAL DE MANDO Y PROTECCION (CGMP) - ${vision.contexto_canarias.sistema_alimentacion}`
    )
  );
  entities.push(
    dxfText(
      "TEXTOS",
      24,
      265,
      2.8,
      `${vision.contexto_canarias.distribuidora} | Pmax: ${vision.contexto_canarias.potencia_maxima_admisible_w} W (${vision.contexto_canarias.grado_electrificacion})`
    )
  );

  // Línea de Derivación Individual
  entities.push(dxfLine("ACOMETIDA_DI", centerX, 262, centerX, 244));
  entities.push(
    dxfText(
      "TEXTOS",
      centerX + 5,
      252,
      2.6,
      `D.I. RZ1-K (AS) 0,6/1kV Libre de Halogenos`
    )
  );

  // Símbolo IGA
  const igaItem = vision.inventario_componentes.find(
    (c) => c.tipo === "IGA" || c.tipo === "ICP"
  );
  entities.push(dxfIecBreakerSymbol("APARAMENTA_IEC60617", centerX, 244, 224, false));
  entities.push(
    dxfText(
      "TEXTOS",
      centerX + 7,
      235,
      3.0,
      `${igaItem?.id || "C1-01"} ${igaItem?.tipo || "IGA"} ${igaItem?.calibre_a || vision.contexto_canarias.calibre_iga_amperios}A ${igaItem?.polos || "2P"} (${igaItem?.poder_corte_ka || 6}kA)`
    )
  );
  entities.push(
    dxfText(
      "TEXTOS",
      centerX + 7,
      230,
      2.4,
      `${igaItem?.marca_modelo || "Combi IGA+POP+SPD"}`
    )
  );

  // PCS / Sobretensiones en derivación si existe
  const pcsItem = vision.inventario_componentes.find((c) => c.tipo === "PCS");
  if (pcsItem) {
    entities.push(dxfLine("APARAMENTA_IEC60617", centerX, 220, centerX + 46, 220));
    entities.push(dxfRect("APARAMENTA_IEC60617", centerX + 46, 213, 28, 14));
    entities.push(
      dxfText(
        "TEXTOS",
        centerX + 48,
        221,
        2.5,
        `${pcsItem.id} PCS T1+T2`
      )
    );
    entities.push(
      dxfText("TEXTOS", centerX + 48, 216, 2.2, `ITC-BT-23 NRZ103`)
    );
  }

  // Embarrado principal tras IGA
  entities.push(dxfLine("ACOMETIDA_DI", centerX, 224, centerX, 206));

  // 4. Grupos Diferenciales (ID) y Circuitos Interiores (PIAs)
  const rcds = vision.inventario_componentes.filter((c) => c.tipo === "ID");
  const allPias = vision.inventario_componentes.filter((c) => c.tipo === "PIA");
  const mtdRows = vision.memoria_tecnica_gobierno_canarias.tabla_circuitos_mtd;

  const totalPias = Math.max(1, allPias.length);
  const startX = 32;
  const endX = 382;
  const stepX = totalPias > 1 ? (endX - startX) / (totalPias - 1) : 0;

  // Barra horizontal de distribución a diferenciales
  const effectiveRcds =
    rcds.length > 0
      ? rcds
      : [
          {
            id: "C1-02",
            carril: 1,
            tipo: "ID" as const,
            marca_modelo: "ID 40A",
            calibre_a: 40,
            curva: "N/A" as const,
            sensibilidad_ma: 30,
            clase_id: "A" as const,
            polos: "2P" as const,
            poder_corte_ka: 6,
            padre_id: igaItem?.id || "C1-01",
            circuito_itc_bt_25: "Diferencial 30mA",
            confianza: "alta" as const,
            observaciones: "",
          },
        ];

  let piaGlobalIdx = 0;
  const rcdCenters: number[] = [];

  effectiveRcds.forEach((rcd, rIdx) => {
    const childPias = allPias.filter((p) => p.padre_id === rcd.id);
    const groupPias =
      childPias.length > 0
        ? childPias
        : rIdx === 0 && effectiveRcds.length === 1
          ? allPias
          : [];

    const firstPiaX =
      totalPias === 1 ? centerX : startX + piaGlobalIdx * stepX;
    const lastPiaX =
      totalPias === 1
        ? centerX
        : startX + Math.max(piaGlobalIdx, piaGlobalIdx + groupPias.length - 1) * stepX;
    const rcdX = (firstPiaX + lastPiaX) / 2;
    rcdCenters.push(rcdX);

    // Bajada al Diferencial ID
    entities.push(dxfLine("APARAMENTA_IEC60617", rcdX, 206, rcdX, 198));
    entities.push(dxfIecBreakerSymbol("APARAMENTA_IEC60617", rcdX, 198, 178, true));
    entities.push(
      dxfText(
        "TEXTOS",
        rcdX + 5,
        190,
        2.6,
        `${rcd.id} ID ${rcd.calibre_a}A ${rcd.sensibilidad_ma || 30}mA Cl.${rcd.clase_id}`
      )
    );
    entities.push(dxfLine("APARAMENTA_IEC60617", rcdX, 178, rcdX, 166));

    if (groupPias.length > 1) {
      entities.push(
        dxfLine("APARAMENTA_IEC60617", firstPiaX, 166, lastPiaX, 166)
      );
    }

    groupPias.forEach((pia) => {
      const px = totalPias === 1 ? centerX : startX + piaGlobalIdx * stepX;
      const rowInfo = mtdRows[piaGlobalIdx];

      entities.push(dxfLine("CIRCUITOS_H07Z1K", px, 166, px, 156));
      entities.push(
        dxfIecBreakerSymbol("APARAMENTA_IEC60617", px, 156, 136, false)
      );
      entities.push(
        dxfText(
          "TEXTOS",
          px + 3,
          147,
          2.4,
          `${pia.id} C${pia.calibre_a}A`
        )
      );
      entities.push(
        dxfText("TEXTOS", px + 3, 142, 2.1, `${pia.polos} ${pia.poder_corte_ka}kA`)
      );

      // Línea de salida a carga + datos de cable H07Z1-K (AS) y tubo
      entities.push(dxfLine("CIRCUITOS_H07Z1K", px, 136, px, 92));
      entities.push(dxfCircle("CIRCUITOS_H07Z1K", px, 88, 4));

      const circCode = rowInfo?.circuito || `C${piaGlobalIdx + 1}`;
      const sec = rowInfo?.seccion_mm2 || 2.5;
      const tubo = rowInfo?.tubo_mm || 20;
      const dest = (rowInfo?.destino || pia.circuito_itc_bt_25 || "").slice(
        0,
        22
      );

      entities.push(dxfText("TEXTOS", px - 6, 79, 2.7, circCode));
      entities.push(dxfText("TEXTOS", px - 10, 74, 2.1, dest));
      entities.push(
        dxfText("TEXTOS", px - 10, 69, 2.0, `${sec} mm2 H07Z1-K(AS)`)
      );
      entities.push(dxfText("TEXTOS", px - 10, 64, 2.0, `Tubo d.${tubo} mm`));

      piaGlobalIdx++;
    });
  });

  if (rcdCenters.length > 0) {
    const minRx = Math.min(centerX, ...rcdCenters);
    const maxRx = Math.max(centerX, ...rcdCenters);
    if (maxRx > minRx) {
      entities.push(dxfLine("ACOMETIDA_DI", minRx, 206, maxRx, 206));
    }
  }

  // 5.Ensamblar estructura DXF R12 con capas coloreadas
  return [
    "0",
    "SECTION",
    "2",
    "HEADER",
    "9",
    "$INSUNITS",
    "70",
    "4",
    "0",
    "ENDSEC",
    "0",
    "SECTION",
    "2",
    "TABLES",
    "0",
    "TABLE",
    "2",
    "LAYER",
    "70",
    "5",
    "0",
    "LAYER",
    "2",
    "CAJETIN",
    "70",
    "0",
    "62",
    "7",
    "6",
    "CONTINUOUS",
    "0",
    "LAYER",
    "2",
    "ACOMETIDA_DI",
    "70",
    "0",
    "62",
    "1",
    "6",
    "CONTINUOUS",
    "0",
    "LAYER",
    "2",
    "APARAMENTA_IEC60617",
    "70",
    "0",
    "62",
    "5",
    "6",
    "CONTINUOUS",
    "0",
    "LAYER",
    "2",
    "CIRCUITOS_H07Z1K",
    "70",
    "0",
    "62",
    "3",
    "6",
    "CONTINUOUS",
    "0",
    "LAYER",
    "2",
    "TEXTOS",
    "70",
    "0",
    "62",
    "7",
    "6",
    "CONTINUOUS",
    "0",
    "ENDTAB",
    "0",
    "ENDSEC",
    "0",
    "SECTION",
    "2",
    "ENTITIES",
    entities.filter(Boolean).join("\n"),
    "0",
    "ENDSEC",
    "0",
    "EOF",
  ].join("\n");
}
