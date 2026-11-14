"use client";

import React, { useState, useMemo } from "react";
import {
  FileCheck2,
  ClipboardCheck,
  MapPin,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  ShieldAlert,
} from "lucide-react";
import {
  evaluateItc04Documentation,
  type Itc04GroupCode,
} from "@/lib/electrical-calculations";
import {
  ORIENTATIVE_DISCLAIMER,
  CCAA_TRAMITES_CATALOG,
  INSTALLATION_TYPES_28,
  isProcedureReviewOutdated,
} from "@/lib/monpix-engine";

interface TramitesOcaCatastroViewProps {
  defaultIsla: string;
  onApplyLocationToMtd: (params: {
    calle: string;
    municipio: string;
    refCatastralNote: string;
  }) => void;
}

interface OcaCheckItem {
  id: string;
  label: string;
  itc: string;
  status: "ok" | "leve" | "grave" | "muy_grave";
}

const INITIAL_OCA_CHECKLIST: OcaCheckItem[] = [
  { id: "o1", label: "Continuidad de conductores de protección PE y equipotencial de baños", itc: "ITC-BT-18 / BT-27", status: "ok" },
  { id: "o2", label: "Medida de resistencia de puesta a tierra (RA · IΔn ≤ UL 50V/24V)", itc: "ITC-BT-18 / BT-24", status: "ok" },
  { id: "o3", label: "Disparo en tiempo y corriente de todos los diferenciales con analizador", itc: "ITC-BT-24", status: "ok" },
  { id: "o4", label: "Resistencia de aislamiento entre conductores activos y tierra (≥ 0,5 MΩ)", itc: "ITC-BT-19 Tabla 3", status: "ok" },
  { id: "o5", label: "Cables libres de halógenos AS / Cca-s1b,d1,a1 en enlace y pública concurrencia", itc: "ITC-BT-14 / 15 / 28", status: "ok" },
  { id: "o6", label: "Alumbrado de emergencia y antipánico funcionando al cortar el general", itc: "ITC-BT-28", status: "ok" },
  { id: "o7", label: "Cuadro cerrado, envolvente sin huecos accesibles al dedo (IP2X / IPXXB) y rotulado", itc: "ITC-BT-17 / BT-24", status: "ok" },
];

export default function TramitesOcaCatastroView({
  defaultIsla,
  onApplyLocationToMtd,
}: TramitesOcaCatastroViewProps) {
  const [tab, setTab] = useState<"tramites_ccaa" | "inspeccion_oca" | "catastro">(
    "tramites_ccaa"
  );

  // 1. CCAA (19) + Tipo de instalación (28)
  const [selectedCcaaCode, setSelectedCcaaCode] = useState(
    defaultIsla ? "CN" : "MD"
  );
  const [selectedInstId, setSelectedInstId] = useState(INSTALLATION_TYPES_28[0].id);
  const [powerKw, setPowerKw] = useState(9.2);
  const [parkingCount, setParkingCount] = useState(0);

  const ccaa = useMemo(
    () =>
      CCAA_TRAMITES_CATALOG.find((c) => c.code === selectedCcaaCode) ||
      CCAA_TRAMITES_CATALOG[0],
    [selectedCcaaCode]
  );
  const instType = useMemo(
    () =>
      INSTALLATION_TYPES_28.find((t) => t.id === selectedInstId) ||
      INSTALLATION_TYPES_28[0],
    [selectedInstId]
  );

  const docEval = useMemo(
    () =>
      evaluateItc04Documentation(
        instType.defaultItc04Group as Itc04GroupCode,
        powerKw,
        parkingCount
      ),
    [instType, powerKw, parkingCount]
  );

  const outdatedWarning = isProcedureReviewOutdated(ccaa.lastReviewedIso, 6);

  // 2. Inspección OCA + Checklist
  const [lastOcaDate, setLastOcaDate] = useState("2022-05-15");
  const [ocaPeriodYears, setOcaPeriodYears] = useState<5 | 10>(5);
  const [checklist, setChecklist] = useState<OcaCheckItem[]>(INITIAL_OCA_CHECKLIST);

  const ocaVerdict = useMemo(() => {
    const muyGraves = checklist.filter((c) => c.status === "muy_grave").length;
    const graves = checklist.filter((c) => c.status === "grave").length;
    const leves = checklist.filter((c) => c.status === "leve").length;

    const nextDate = new Date(lastOcaDate);
    nextDate.setFullYear(nextDate.getFullYear() + ocaPeriodYears);

    if (muyGraves > 0) {
      return {
        badge: "DESFAVORABLE / NEGATIVA",
        color: "border-rose-300 bg-rose-50 text-rose-950",
        detail: `${muyGraves} defecto(s) Muy Grave(s): riesgo inminente de accidente. No se puede dar o mantener servicio hasta subsanar.`,
        nextDateStr: nextDate.toLocaleDateString("es-ES"),
        leves,
      };
    }
    if (graves > 0) {
      return {
        badge: "CONDICIONADA (Plazo 6 meses)",
        color: "border-amber-300 bg-amber-50 text-amber-950",
        detail: `${graves} defecto(s) Grave(s) y ${leves} Leve(s): instalación nueva no puede ponerse en servicio; si es periódica, tienes 6 meses máximo para corregir.`,
        nextDateStr: nextDate.toLocaleDateString("es-ES"),
        leves,
      };
    }
    return {
      badge: "FAVORABLE",
      color: "border-emerald-300 bg-emerald-50 text-emerald-950",
      detail:
        leves > 0
          ? `Favorable con ${leves} defecto(s) Leve(s): anótalos para corregir antes de la próxima revisión.`
          : "Todo correcto sin defectos detectados.",
      nextDateStr: nextDate.toLocaleDateString("es-ES"),
      leves,
    };
  }, [checklist, lastOcaDate, ocaPeriodYears]);

  // 3. Catastro y Geolocalización
  const [catastroRef, setCatastroRef] = useState("9402801CS7490S0001WX");
  const [catastroStreet, setCatastroStreet] = useState("Avda. Tres de Mayo 42");
  const [catastroMunicipio, setCatastroMunicipio] = useState("Santa Cruz de Tenerife");
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState("");
  const [appliedCatastroToast, setAppliedCatastroToast] = useState(false);

  const cleanRef = catastroRef.toUpperCase().replace(/\s+/g, "");
  const isValidRefFormat = /^[0-9A-Z]{14}([0-9A-Z]{6})?$/.test(cleanRef);

  const handleGetHereGps = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsStatus("Tu navegador no tiene geolocalización disponible.");
      return;
    }
    setGpsStatus("Buscando posición GPS...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lon: Number(pos.coords.longitude.toFixed(6)),
        });
        setGpsStatus("Ubicación GPS capturada en obra.");
      },
      () => {
        setGpsStatus("Permiso de ubicación denegado o sin señal GPS.");
      }
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-300/60">
            <ShieldAlert className="h-3.5 w-3.5" />
            {ORIENTATIVE_DISCLAIMER}
          </span>
          <h2 className="mt-2 text-lg font-bold text-slate-900">
            Boletín CIE/MTD por Comunidad (19 CCAA), Inspecciones OCA y Catastro
          </h2>
          <p className="text-xs text-slate-500">
            Consulta qué papeles te piden en Industria en cada comunidad, repasa la OCA antes de que vaya el inspector y saca la referencia catastral.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setTab("tramites_ccaa")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold ${
              tab === "tramites_ccaa"
                ? "bg-[#0f6cbd] text-white"
                : "border border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            Trámites 19 CCAA (28 tipos)
          </button>
          <button
            type="button"
            onClick={() => setTab("inspeccion_oca")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold ${
              tab === "inspeccion_oca"
                ? "bg-[#0f6cbd] text-white"
                : "border border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            Revisión e Inspecciones OCA
          </button>
          <button
            type="button"
            onClick={() => setTab("catastro")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold ${
              tab === "catastro"
                ? "bg-[#0f6cbd] text-white"
                : "border border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            Referencia Catastral
          </button>
        </div>
      </div>

      {/* 1. TRÁMITES DE INDUSTRIA POR COMUNIDAD Y TIPO DE INSTALACIÓN */}
      {tab === "tramites_ccaa" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Elige Comunidad Autónoma y Tipo de Instalación
            </h3>
            <div>
              <label className="font-semibold text-slate-700">
                1. Comunidad / Ciudad Autónoma (19)
              </label>
              <select
                value={selectedCcaaCode}
                onChange={(e) => setSelectedCcaaCode(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-xs"
              >
                {CCAA_TRAMITES_CATALOG.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700">
                2. Tipo de instalación (28 categorías REBT)
              </label>
              <select
                value={selectedInstId}
                onChange={(e) => setSelectedInstId(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-xs"
              >
                {INSTALLATION_TYPES_28.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({t.itc})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700">Potencia prevista (kW)</label>
                <input
                  type="number"
                  step="0.5"
                  value={powerKw}
                  onChange={(e) => setPowerKw(Number(e.target.value) || 1)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Plazas garaje (si aplica)</label>
                <input
                  type="number"
                  min={0}
                  value={parkingCount}
                  onChange={(e) => setParkingCount(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-7 space-y-4 text-xs">
            {(outdatedWarning || ccaa.confirmedStatus === "revisar_cambios") && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  Aviso de vigencia: la ficha de <strong>{ccaa.name}</strong> se revisó el{" "}
                  <strong>{ccaa.lastReviewedIso}</strong> (más de 6 meses o pendiente de confirmar cambios de impresos/tasas). Compruébalo en la sede oficial antes de presentar.
                </span>
              </div>
            )}

            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-[#0f6cbd]">
                  {ccaa.name} — {ccaa.industryPortalName}
                </span>
                <a
                  href={ccaa.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-[#0f6cbd] px-3 py-1 font-semibold text-white hover:bg-[#115ea3]"
                >
                  Ir a Sede Oficial <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <p className="text-slate-700">{ccaa.specificNotes}</p>
              <div className="flex flex-wrap gap-3 text-[11px] text-slate-600 pt-1">
                <span>
                  Distribuidora habitual: <strong>{ccaa.mainDistributors.join(", ")}</strong>
                </span>
                <span>·</span>
                <span>
                  Última revisión: <strong>{ccaa.lastReviewedIso}</strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] text-slate-500">Documentación técnica exigida (ITC-BT-04)</div>
                <div className="mt-1 text-base font-extrabold text-slate-900">
                  {docEval.documentType}
                </div>
                <p className="mt-1 text-[11px] text-slate-600">{docEval.normativeRule}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] text-slate-500">Inspección Inicial por OCA (ITC-BT-05)</div>
                <div
                  className={`mt-1 text-base font-extrabold ${
                    docEval.requiresInitialOcaInspection ? "text-amber-700" : "text-emerald-700"
                  }`}
                >
                  {docEval.requiresInitialOcaInspection
                    ? "SÍ — Hace falta acta favorable OCA"
                    : "NO — Basta CIE del instalador"}
                </div>
                <p className="mt-1 text-[11px] text-slate-600">
                  + Entregar Anexo de Información al Usuario (Art. 19 REBT) y tramitación electrónica (Ley 39/2015).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. INSPECCIONES OCA Y CHECKLIST PRE-INSPECCIÓN */}
      {tab === "inspeccion_oca" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-7 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Revisión tipo OCA antes de llamar al inspector (ITC-BT-05)
            </h3>
            <div className="divide-y divide-slate-100">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                >
                  <div className="max-w-md">
                    <div className="font-semibold text-slate-800">{item.label}</div>
                    <div className="text-[11px] text-slate-500">{item.itc}</div>
                  </div>
                  <select
                    value={item.status}
                    onChange={(e) => {
                      const st = e.target.value as OcaCheckItem["status"];
                      setChecklist((prev) =>
                        prev.map((x) => (x.id === item.id ? { ...x, status: st } : x))
                      );
                    }}
                    className="px-2.5 py-1 text-xs"
                  >
                    <option value="ok">✅ Bien (Sin defecto)</option>
                    <option value="leve">🟡 Defecto Leve</option>
                    <option value="grave">🟠 Defecto Grave (6 meses)</option>
                    <option value="muy_grave">🔴 Defecto Muy Grave (Corte)</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5 space-y-4 text-xs">
            <div className={`rounded-xl border-2 p-4 ${ocaVerdict.color}`}>
              <div className="text-[11px] font-bold uppercase">Resultado previsto del acta OCA</div>
              <div className="mt-1 text-lg font-extrabold">{ocaVerdict.badge}</div>
              <p className="mt-1">{ocaVerdict.detail}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="font-bold text-slate-900">¿Cuándo le toca la próxima OCA periódica?</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Última inspección / Alta</label>
                  <input
                    type="date"
                    value={lastOcaDate}
                    onChange={(e) => setLastOcaDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Periodicidad</label>
                  <select
                    value={ocaPeriodYears}
                    onChange={(e) => setOcaPeriodYears(Number(e.target.value) as 5 | 10)}
                    className="mt-1 w-full px-2.5 py-1.5 text-xs"
                  >
                    <option value={5}>Cada 5 años (LPC, garajes, piscinas, ind.)</option>
                    <option value={10}>Cada 10 años (Comunes edificio &gt;100 kW)</option>
                  </select>
                </div>
              </div>
              <div className="rounded-lg bg-white p-3 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600">Próxima fecha límite OCA:</span>
                <strong className="font-mono text-sm text-[#0f6cbd]">
                  {ocaVerdict.nextDateStr}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. REFERENCIA CATASTRAL Y GEOLOCALIZACIÓN EN OBRA */}
      {tab === "catastro" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 text-xs">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Referencia Catastral y Situación del Inmueble
              </h3>
              <button
                type="button"
                onClick={handleGetHereGps}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700"
              >
                <Navigation className="h-3.5 w-3.5" />
                📍 Estoy aquí
              </button>
            </div>

            {gpsStatus && <p className="text-slate-600 font-medium">{gpsStatus}</p>}
            {gpsCoords && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 font-mono text-emerald-900">
                Coordenadas GPS capturadas: Lat {gpsCoords.lat}, Lon {gpsCoords.lon}
              </div>
            )}

            <div>
              <label className="font-semibold text-slate-700">
                Referencia Catastral (20 caracteres para inmueble / 14 para parcela)
              </label>
              <input
                type="text"
                maxLength={22}
                value={catastroRef}
                onChange={(e) => setCatastroRef(e.target.value.toUpperCase())}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono uppercase"
              />
              <p
                className={`mt-1 text-[11px] font-semibold ${
                  isValidRefFormat ? "text-emerald-700" : "text-rose-600"
                }`}
              >
                {isValidRefFormat
                  ? `Formato válido (${cleanRef.length} caracteres).`
                  : "Introduce 14 o 20 caracteres alfanuméricos sin guiones."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700">Calle y número</label>
                <input
                  type="text"
                  value={catastroStreet}
                  onChange={(e) => setCatastroStreet(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Municipio</label>
                <input
                  type="text"
                  value={catastroMunicipio}
                  onChange={(e) => setCatastroMunicipio(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href={`https://www1.sedecatastro.gob.es/CYCBienInmueble/OVCBusqueda.aspx?RefC=${encodeURIComponent(
                  cleanRef
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-semibold text-slate-800 hover:bg-slate-50"
              >
                Abrir ficha oficial en Sede Catastro <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                onClick={() => {
                  onApplyLocationToMtd({
                    calle: catastroStreet,
                    municipio: catastroMunicipio,
                    refCatastralNote: cleanRef,
                  });
                  setAppliedCatastroToast(true);
                  setTimeout(() => setAppliedCatastroToast(false), 3000);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f6cbd] px-4 py-2 font-semibold text-white hover:bg-[#115ea3]"
              >
                <CheckCircle2 className="h-4 w-4" />
                Pasar datos al Boletín / M.T.D.
              </button>
            </div>

            {appliedCatastroToast && (
              <p className="font-semibold text-emerald-700">
                Dirección y referencia catastral copiadas al expediente activo.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Croquis rápido de situación y emplazamiento
            </h3>
            <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
              <div className="font-mono text-[11px] text-[#0f6cbd] font-bold">
                REF. CATASTRAL: {cleanRef || "—"}
              </div>
              <div className="font-semibold text-slate-900">
                {catastroStreet} — {catastroMunicipio}
              </div>
              {gpsCoords && (
                <a
                  href={`https://www.openstreetmap.org/?mlat=${gpsCoords.lat}&mlon=${gpsCoords.lon}#map=18/${gpsCoords.lat}/${gpsCoords.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#0f6cbd] font-semibold underline"
                >
                  Ver plano exacto en OpenStreetMap ({gpsCoords.lat}, {gpsCoords.lon})
                </a>
              )}
              <p className="text-slate-500 pt-2">
                Recuerda: en muchas comunidades (Canarias pág. 9 M.T.D., Madrid, Andalucía, Galicia) la referencia catastral de 20 dígitos es obligatoria para registrar el CIE y contratar con la distribuidora (CUPS).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

