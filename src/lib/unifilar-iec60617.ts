// ============================================================================
// Generador Puro de Esquema Unifilar Vectorial IEC 60617 (Formato A3 / CAD SVG)
// ============================================================================

import type {
  MtdFormMetadata,
  RebtCalculatedCircuit,
  SystemSupplyType,
} from "./electrical-calculations.ts";
import type { DinModule } from "../components/monpix/dinPanelHelpers.ts";

export interface UnifilarSvgInput {
  meta: MtdFormMetadata;
  supplyType: SystemSupplyType;
  igaAmps: number;
  diSectionMm2: number;
  icuKa: number;
  planNumber: string;
  hasCombiSurge: boolean;
  calculatedCircuits: RebtCalculatedCircuit[];
  dinModules: DinModule[];
  disclaimer: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderIecBreakerGlyph(x: number, y: number, isClosed = true): string {
  return `
    <line x1="${x}" y1="${y}" x2="${x}" y2="${y + 12}" stroke="#0f172a" stroke-width="1.8"/>
    <line x1="${x - 4}" y1="${y + 8}" x2="${x + 4}" y2="${y + 16}" stroke="#0f172a" stroke-width="1.6"/>
    <line x1="${x + 4}" y1="${y + 8}" x2="${x - 4}" y2="${y + 16}" stroke="#0f172a" stroke-width="1.6"/>
    <line x1="${x}" y1="${y + 12}" x2="${isClosed ? x - 7 : x - 14}" y2="${y + 34}" stroke="#0f172a" stroke-width="2"/>
    <line x1="${x}" y1="${y + 34}" x2="${x}" y2="${y + 48}" stroke="#0f172a" stroke-width="1.8"/>
    <rect x="${x - 16}" y="${y + 19}" width="7" height="7" fill="none" stroke="#0f172a" stroke-width="1.2"/>
    <line x1="${x - 9}" y1="${y + 22.5}" x2="${x - 4}" y2="${y + 22.5}" stroke="#0f172a" stroke-width="1" stroke-dasharray="2,2"/>
  `;
}

function renderIecRcdGlyph(x: number, y: number): string {
  return `
    <line x1="${x}" y1="${y}" x2="${x}" y2="${y + 10}" stroke="#059669" stroke-width="1.8"/>
    <line x1="${x - 3.5}" y1="${y + 7}" x2="${x + 3.5}" y2="${y + 13}" stroke="#059669" stroke-width="1.4"/>
    <line x1="${x + 3.5}" y1="${y + 7}" x2="${x - 3.5}" y2="${y + 13}" stroke="#059669" stroke-width="1.4"/>
    <line x1="${x}" y1="${y + 10}" x2="${x - 7}" y2="${y + 30}" stroke="#059669" stroke-width="2"/>
    <line x1="${x}" y1="${y + 30}" x2="${x}" y2="${y + 52}" stroke="#059669" stroke-width="1.8"/>
    <ellipse cx="${x}" cy="${y + 40}" rx="8" ry="4" fill="none" stroke="#059669" stroke-width="1.5"/>
    <line x1="${x - 8}" y1="${y + 40}" x2="${x - 14}" y2="${y + 40}" stroke="#059669" stroke-width="1.1"/>
    <line x1="${x - 14}" y1="${y + 40}" x2="${x - 14}" y2="${y + 21}" stroke="#059669" stroke-width="1.1" stroke-dasharray="2,2"/>
    <line x1="${x - 14}" y1="${y + 21}" x2="${x - 4}" y2="${y + 21}" stroke="#059669" stroke-width="1.1" stroke-dasharray="2,2"/>
  `;
}

export function buildUnifilarIec60617Svg(input: UnifilarSvgInput): string {
  const {
    meta,
    supplyType,
    igaAmps,
    diSectionMm2,
    icuKa,
    planNumber,
    hasCombiSurge,
    calculatedCircuits,
    dinModules,
    disclaimer,
  } = input;

  const piasFromDin = dinModules.filter((m) => m.kind === "PIA");
  const useCircuits =
    piasFromDin.length > 0
      ? piasFromDin.map((p, idx) => {
          const matched = calculatedCircuits.find(
            (c) => c.code === p.label || c.code === p.circuitCode
          );
          return {
            code: p.label,
            description:
              matched?.description || p.sublabel || `Circuito ${idx + 1}`,
            powerWatts:
              matched?.powerWatts ||
              p.powerWatts ||
              Math.round(p.ratingAmps * 230 * 0.8),
            sectionMm2: p.cableSectionMm2 || matched?.sectionMm2 || 2.5,
            peSectionMm2: matched?.peSectionMm2 || p.cableSectionMm2 || 2.5,
            tubeDiameterMm: matched?.tubeDiameterMm || 20,
            piaAmps: p.ratingAmps,
            voltageDropPct: matched?.voltageDropPct || 1.2,
            conductorsSummary:
              matched?.conductorsSummary ||
              `${p.phaseAssigned === "L1-L2-L3" ? "4x" : "2x"}${
                p.cableSectionMm2 || 2.5
              } Cu`,
            rcdLabel:
              dinModules.find((r) => r.id === p.parentRcdId)?.label || "SIN DIF",
            phaseAssigned: p.phaseAssigned || "L1",
            isOn: p.isOn,
          };
        })
      : calculatedCircuits.map((c, idx) => ({
          ...c,
          rcdLabel: `DIF #${Math.floor(idx / 5) + 1}`,
          isOn: true,
        }));

  const branchCount = Math.max(1, useCircuits.length);
  const branchSpacing = 128;
  const width = Math.max(1520, branchCount * branchSpacing + 300);
  const height = 1040;
  const centerX = Math.round(width / 2);
  const busY = 360;
  const tableTopY = 675;
  const startX = Math.max(
    170,
    centerX - Math.round(((branchCount - 1) * branchSpacing) / 2)
  );
  const endX = startX + (branchCount - 1) * branchSpacing;
  const igaNode = dinModules.find(
    (m) => m.kind === "COMBI" || m.kind === "IGA"
  );
  const activeIgaAmps = igaNode?.ratingAmps || igaAmps;
  const totalPowerKw = (
    useCircuits.reduce((s, c) => s + c.powerWatts, 0) / 1000
  ).toFixed(2);

  const circuitBranchesSvg = useCircuits
    .map((c, idx) => {
      const x = startX + idx * branchSpacing;
      const slashLines =
        c.phaseAssigned === "L1-L2-L3"
          ? `<line x1="${x - 6}" y1="${busY + 136}" x2="${x + 6}" y2="${busY + 128}" stroke="#0f172a" stroke-width="1.3"/>
             <line x1="${x - 6}" y1="${busY + 141}" x2="${x + 6}" y2="${busY + 133}" stroke="#0f172a" stroke-width="1.3"/>
             <line x1="${x - 6}" y1="${busY + 146}" x2="${x + 6}" y2="${busY + 138}" stroke="#0f172a" stroke-width="1.3"/>`
          : `<line x1="${x - 6}" y1="${busY + 136}" x2="${x + 6}" y2="${busY + 128}" stroke="#0f172a" stroke-width="1.3"/>
             <line x1="${x - 6}" y1="${busY + 141}" x2="${x + 6}" y2="${busY + 133}" stroke="#0f172a" stroke-width="1.3"/>
             <circle cx="${x + 4}" cy="${busY + 142}" r="1.4" fill="#0f172a"/>`;

      return `
      <g>
        <line x1="${x}" y1="${busY}" x2="${x}" y2="${busY + 26}" stroke="#0f172a" stroke-width="1.8"/>
        ${renderIecRcdGlyph(x, busY + 26)}
        <text x="${x + 12}" y="${busY + 52}" font-family="Arial" font-size="8.5" font-weight="bold" fill="#059669">${escapeXml(c.rcdLabel)}</text>
        <text x="${x + 12}" y="${busY + 63}" font-family="Arial" font-size="8" fill="#065f46">30mA ${escapeXml(meta.diferencialClase)}</text>
        <line x1="${x}" y1="${busY + 78}" x2="${x}" y2="${busY + 95}" stroke="#0f172a" stroke-width="1.8"/>
        ${renderIecBreakerGlyph(x, busY + 95, c.isOn)}
        <text x="${x + 12}" y="${busY + 113}" font-family="Arial" font-size="9.5" font-weight="bold" fill="#0f6cbd">${escapeXml(c.code)} · C${c.piaAmps}</text>
        <text x="${x + 12}" y="${busY + 124}" font-family="Arial" font-size="8" fill="#475569">${escapeXml(c.phaseAssigned)} · ${icuKa}kA</text>
        <line x1="${x}" y1="${busY + 143}" x2="${x}" y2="${tableTopY - 38}" stroke="#0f172a" stroke-width="1.8"/>
        ${slashLines}
        <text x="${x + 10}" y="${busY + 178}" font-family="Arial" font-size="8.5" fill="#1e293b">${escapeXml(c.conductorsSummary)}</text>
        <text x="${x + 10}" y="${busY + 190}" font-family="Arial" font-size="8" fill="#475569">+PE ${c.peSectionMm2}mm² Ø${c.tubeDiameterMm}</text>
        <text x="${x + 10}" y="${busY + 202}" font-family="Arial" font-size="8" fill="#64748b">ΔU ${c.voltageDropPct}%</text>
        <circle cx="${x}" cy="${tableTopY - 24}" r="11" fill="#ffffff" stroke="#0f172a" stroke-width="1.6"/>
        <text x="${x}" y="${tableTopY - 21}" font-family="Arial" font-size="7.5" font-weight="bold" text-anchor="middle" fill="#0f172a">${escapeXml(c.code)}</text>
        <line x1="${x - 64}" y1="${tableTopY}" x2="${x - 64}" y2="${tableTopY + 108}" stroke="#0f172a" stroke-width="1"/>
        <text x="${x}" y="${tableTopY + 15}" font-family="Arial" font-size="9" font-weight="bold" text-anchor="middle" fill="#0f172a">${escapeXml(c.code)}</text>
        <text x="${x}" y="${tableTopY + 35}" font-family="Arial" font-size="8" text-anchor="middle" fill="#334155">${escapeXml(c.description.slice(0, 18))}</text>
        <text x="${x}" y="${tableTopY + 57}" font-family="Arial" font-size="9" text-anchor="middle" fill="#0f172a">${(c.powerWatts / 1000).toFixed(2)} kW</text>
        <text x="${x}" y="${tableTopY + 79}" font-family="Arial" font-size="9" text-anchor="middle" fill="#0f172a">${c.sectionMm2} mm²</text>
        <text x="${x}" y="${tableTopY + 100}" font-family="Arial" font-size="9" font-weight="bold" text-anchor="middle" fill="#0f6cbd">${c.piaAmps} A (C)</text>
      </g>`;
    })
    .join("\n");

  const tableLeft = Math.max(95, startX - 160);
  const tableRight = Math.max(
    startX + (branchCount - 1) * branchSpacing + 64,
    tableLeft + 420
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="12" y="12" width="${width - 24}" height="${height - 24}" fill="#ffffff" stroke="#0f172a" stroke-width="2.5"/>
  <rect x="20" y="20" width="${width - 40}" height="${height - 40}" fill="none" stroke="#475569" stroke-width="1"/>

  <rect x="52" y="36" width="${width - 104}" height="${tableTopY + 122}" fill="none" stroke="#94a3b8" stroke-width="1.2"/>
  <text x="72" y="64" font-family="Arial" font-size="16" font-weight="bold" fill="#c2410c">CUADRO GENERAL DE MANDO Y PROTECCIÓN · ${supplyType === "trifasico_400v" ? "3F+N+PE 400/230V" : "F+N+PE 230V"}</text>

  <polygon points="${centerX},48 ${centerX - 6},60 ${centerX + 6},60" fill="#0f172a"/>
  <line x1="${centerX}" y1="54" x2="${centerX}" y2="128" stroke="#0f172a" stroke-width="2.2"/>
  <text x="${centerX + 12}" y="78" font-family="Arial" font-size="10" font-weight="bold" fill="#0f172a">Derivación Individual (D.I.) · ${diSectionMm2} mm² Cu XLPE (RZ1-K AS)</text>
  <text x="${centerX + 12}" y="93" font-family="Arial" font-size="9" fill="#475569">P. total prevista: ${totalPowerKw} kW · ΔU ≤ 1,0 % (ITC-BT-15)</text>

  <rect x="${centerX - 36}" y="128" width="72" height="42" fill="#f8fafc" stroke="#0f172a" stroke-width="1.8"/>
  <line x1="${centerX - 36}" y1="140" x2="${centerX + 36}" y2="140" stroke="#0f172a" stroke-width="1.2"/>
  <text x="${centerX}" y="159" font-family="Arial" font-size="11" font-weight="bold" text-anchor="middle" fill="#0f172a">kWh</text>
  <line x1="${centerX}" y1="170" x2="${centerX}" y2="205" stroke="#0f172a" stroke-width="2.2"/>

  ${renderIecBreakerGlyph(centerX, 205, igaNode ? igaNode.isOn : true)}
  <text x="${centerX + 18}" y="227" font-family="Arial" font-size="11" font-weight="bold" fill="#0f172a">${igaNode?.kind === "COMBI" ? "COMBI " : ""}IGA · In: ${activeIgaAmps} A</text>
  <text x="${centerX + 18}" y="241" font-family="Arial" font-size="9.5" fill="#0f6cbd">${supplyType === "trifasico_400v" ? "4P Curva C" : "2P Curva C"} · Icu: ${icuKa} kA${igaNode?.kind === "COMBI" ? " · Combi T2+POP" : ""}</text>
  <line x1="${centerX}" y1="253" x2="${centerX}" y2="${busY}" stroke="#0f172a" stroke-width="2.4"/>

  ${
    hasCombiSurge
      ? `<line x1="${centerX}" y1="286" x2="${centerX - 115}" y2="286" stroke="#0f172a" stroke-width="1.8"/>
         <rect x="${centerX - 165}" y="274" width="50" height="24" fill="#fffbeb" stroke="#d97706" stroke-width="1.8"/>
         <text x="${centerX - 140}" y="290" font-family="Arial" font-size="9.5" font-weight="bold" text-anchor="middle" fill="#92400e">DPS+POP</text>
         <text x="${centerX - 175}" y="283" font-family="Arial" font-size="8.5" text-anchor="end" fill="#475569">Sobretensiones T2 + Perm.</text>
         <text x="${centerX - 175}" y="295" font-family="Arial" font-size="8" text-anchor="end" fill="#64748b">Up ≤ ${escapeXml(meta.sobretensionesKv)} kV (ITC-BT-23)</text>
         <line x1="${centerX - 140}" y1="298" x2="${centerX - 140}" y2="314" stroke="#0f172a" stroke-width="1.5"/>
         <line x1="${centerX - 152}" y1="314" x2="${centerX - 128}" y2="314" stroke="#059669" stroke-width="1.8"/>
         <line x1="${centerX - 148}" y1="318" x2="${centerX - 132}" y2="318" stroke="#059669" stroke-width="1.8"/>
         <line x1="${centerX - 144}" y1="322" x2="${centerX - 136}" y2="322" stroke="#059669" stroke-width="1.8"/>`
      : ""
  }

  <line x1="${Math.min(startX, centerX)}" y1="${busY}" x2="${Math.max(endX, centerX)}" y2="${busY}" stroke="#0f172a" stroke-width="3.5"/>
  <circle cx="${centerX}" cy="${busY}" r="4" fill="#0f172a"/>

  ${circuitBranchesSvg}

  <rect x="${tableLeft}" y="${tableTopY}" width="${tableRight - tableLeft}" height="108" fill="none" stroke="#0f172a" stroke-width="1.3"/>
  <line x1="${tableLeft}" y1="${tableTopY + 22}" x2="${tableRight}" y2="${tableTopY + 22}" stroke="#0f172a" stroke-width="1"/>
  <line x1="${tableLeft}" y1="${tableTopY + 44}" x2="${tableRight}" y2="${tableTopY + 44}" stroke="#0f172a" stroke-width="1"/>
  <line x1="${tableLeft}" y1="${tableTopY + 66}" x2="${tableRight}" y2="${tableTopY + 66}" stroke="#0f172a" stroke-width="1"/>
  <line x1="${tableLeft}" y1="${tableTopY + 88}" x2="${tableRight}" y2="${tableTopY + 88}" stroke="#0f172a" stroke-width="1"/>
  <text x="${tableLeft + 8}" y="${tableTopY + 15}" font-family="Arial" font-size="8.5" font-weight="bold" fill="#0f172a">CIRCUITO</text>
  <text x="${tableLeft + 8}" y="${tableTopY + 36}" font-family="Arial" font-size="8.5" font-weight="bold" fill="#0f172a">UTILIZACIÓN</text>
  <text x="${tableLeft + 8}" y="${tableTopY + 58}" font-family="Arial" font-size="8.5" font-weight="bold" fill="#0f172a">POTENCIA (kW)</text>
  <text x="${tableLeft + 8}" y="${tableTopY + 80}" font-family="Arial" font-size="8.5" font-weight="bold" fill="#0f172a">SECCIÓN (mm²)</text>
  <text x="${tableLeft + 8}" y="${tableTopY + 101}" font-family="Arial" font-size="8.5" font-weight="bold" fill="#0f172a">AUTOMÁTICO</text>

  <g transform="translate(52, 815)">
    <text x="0" y="14" font-family="Arial" font-size="11" font-weight="bold" fill="#0f172a">NOTAS, CRITERIOS REBT Y LEYENDA MUNDIAL NORMALIZADA (IEC 60617 / UNE-EN 60617)</text>
    <text x="0" y="33" font-family="Arial" font-size="9" fill="#334155">1. Intensidad: Ib = P / (U·cos φ). Protección: Ib ≤ In ≤ Iz (ITC-BT-19 Tabla 1). En alumbrado caída máx. 3 %, fuerza 5 %, DI 1,0 % (ITC-BT-15).</text>
    <text x="0" y="47" font-family="Arial" font-size="9" fill="#334155">2. Diferenciales 30 mA máx. 5 circuitos por diferencial (ITC-BT-25). Tierras individuales en bornero (ITC-BT-18). Poder de corte Icu ≥ ${icuKa} kA.</text>

    <g transform="translate(0, 62)">
      <rect x="0" y="0" width="900" height="122" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
      <text x="12" y="18" font-family="Arial" font-size="9.5" font-weight="bold" fill="#0f6cbd">LEYENDA INTERNACIONAL IEC 60617:</text>
      <text x="12" y="42" font-family="Arial" font-size="9" font-weight="bold" fill="#0f172a">[×/ ] IGA / PIA (IEC S00288):</text>
      <text x="165" y="42" font-family="Arial" font-size="8.5" fill="#475569">Interruptor automático magnetotérmico curva C</text>
      <text x="12" y="65" font-family="Arial" font-size="9" font-weight="bold" fill="#059669">[⦵] DIF / RCD:</text>
      <text x="165" y="65" font-family="Arial" font-size="8.5" fill="#475569">Interruptor diferencial con toroide residual 30 mA</text>
      <text x="12" y="88" font-family="Arial" font-size="9" font-weight="bold" fill="#d97706">[DPS/SPD] (IEC S00342):</text>
      <text x="165" y="88" font-family="Arial" font-size="8.5" fill="#475569">Sobretensiones transitorias Tipo 2 + Permanentes POP</text>
      <text x="455" y="42" font-family="Arial" font-size="9" font-weight="bold" fill="#0f172a">[kWh] (IEC S00912):</text>
      <text x="580" y="42" font-family="Arial" font-size="8.5" fill="#475569">Contador energía activa en origen de D.I.</text>
      <text x="455" y="65" font-family="Arial" font-size="9" font-weight="bold" fill="#059669">[⏚ PE] (IEC 60417-5017):</text>
      <text x="580" y="65" font-family="Arial" font-size="8.5" fill="#475569">Puesta a tierra y conductor protección</text>
      <text x="455" y="88" font-family="Arial" font-size="9" font-weight="bold" fill="#0f172a">[///] Conductores:</text>
      <text x="580" y="88" font-family="Arial" font-size="8.5" fill="#475569">Trazos oblicuos = Nº conductores (F+N+PE / 3F+N+PE)</text>
      <text x="12" y="110" font-family="Arial" font-size="8" font-style="italic" fill="#92400e">⚠️ ${escapeXml(disclaimer)}</text>
    </g>
  </g>

  <g transform="translate(${width - 540}, 830)">
    <rect x="0" y="0" width="504" height="170" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
    <line x1="205" y1="0" x2="205" y2="170" stroke="#0f172a" stroke-width="1.3"/>
    <line x1="205" y1="54" x2="504" y2="54" stroke="#0f172a" stroke-width="1.2"/>
    <line x1="205" y1="115" x2="504" y2="115" stroke="#0f172a" stroke-width="1.2"/>
    <line x1="0" y1="100" x2="205" y2="100" stroke="#0f172a" stroke-width="1"/>
    <line x1="395" y1="54" x2="395" y2="170" stroke="#0f172a" stroke-width="1"/>
    <line x1="305" y1="115" x2="305" y2="170" stroke="#0f172a" stroke-width="1"/>

    <text x="12" y="24" font-family="Arial" font-size="10" font-weight="bold" fill="#0f172a">EMPRESA INSTALADORA</text>
    <text x="12" y="42" font-family="Arial" font-size="9" fill="#334155">${escapeXml((meta.empresaInstaladoraNombre || "Empresa Instaladora").slice(0, 30))}</text>
    <text x="12" y="57" font-family="Arial" font-size="8.5" fill="#64748b">Reg. Ind.: ${escapeXml(meta.empresaInstaladoraNum || "—")}</text>
    <text x="12" y="75" font-family="Arial" font-size="8.5" fill="#334155">Titular: ${escapeXml((meta.titularNombre || "—").slice(0, 26))}</text>
    <text x="12" y="90" font-family="Arial" font-size="8" fill="#64748b">${escapeXml(meta.expedienteNum)}</text>

    <text x="12" y="118" font-family="Arial" font-size="8" font-weight="bold" fill="#475569">Firma del instalador autorizado:</text>
    <text x="12" y="136" font-family="Arial" font-size="8.5" fill="#0f172a">${escapeXml(meta.instaladorNombrePh || "—")}</text>
    <text x="12" y="152" font-family="Arial" font-size="8" fill="#64748b">CCI / Col.: ${escapeXml(meta.instaladorCciNum || "—")}</text>

    <text x="218" y="32" font-family="Arial" font-size="13" font-weight="bold" fill="#0f172a">INSTALACIÓN ELÉCTRICA B.T.</text>
    <text x="218" y="73" font-family="Arial" font-size="8.5" font-weight="bold" fill="#64748b">PLANO</text>
    <text x="218" y="96" font-family="Arial" font-size="13" font-weight="bold" fill="#0f6cbd">ESQUEMA UNIFILAR</text>
    <text x="408" y="73" font-family="Arial" font-size="8.5" font-weight="bold" fill="#64748b">PLANO Nº</text>
    <text x="408" y="100" font-family="Arial" font-size="18" font-weight="bold" fill="#0f172a">${escapeXml(planNumber)}</text>

    <text x="218" y="133" font-family="Arial" font-size="8" font-weight="bold" fill="#64748b">FECHA</text>
    <text x="218" y="154" font-family="Arial" font-size="10.5" font-weight="bold" fill="#0f172a">${new Date().toLocaleDateString("es-ES")}</text>
    <text x="318" y="133" font-family="Arial" font-size="8" font-weight="bold" fill="#64748b">ESCALA</text>
    <text x="318" y="154" font-family="Arial" font-size="10.5" font-weight="bold" fill="#0f172a">S/E</text>
    <text x="408" y="133" font-family="Arial" font-size="8" font-weight="bold" fill="#64748b">NORMA</text>
    <text x="408" y="154" font-family="Arial" font-size="10.5" font-weight="bold" fill="#0f172a">IEC 60617</text>
  </g>
</svg>`;
}

