"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Printer,
  Sparkles,
  Eye,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  User,
  Building2,
  Factory,
  Zap,
  Calculator,
  Sliders,
  GitBranch,
  MapPin,
  LayoutGrid,
  PenTool,
  Shield,
  Check,
  Camera,
  Upload,
  ExternalLink,
  Navigation,
  Trash2,
  Crosshair,
  Pencil,
  RotateCcw,
  Type,
  Move,
} from "lucide-react";

const MTD_SHEETS_CATALOG: {
  page: number;
  title: string;
  collectedInfo: string;
  icon: React.ReactNode;
}[] = [
  {
    page: 1,
    title: "Datos del Titular, Ubicación, Canalizaciones, Protecciones y Tierra",
    collectedInfo:
      "Recolecta NIF/CIF del titular, dirección, uso, potencias, acometida, LGA, D.I., IGA, diferenciales y puesta a tierra.",
    icon: <User className="h-4 w-4" />,
  },
  {
    page: 2,
    title: "Previsión de Potencia de Viviendas y Servicios Generales (ITC-BT-10)",
    collectedInfo:
      "Recolecta nº de viviendas (básica/elevada), coeficiente de simultaneidad, ascensores, grupo de presión y alumbrado común.",
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    page: 3,
    title: "Previsión de Potencia en Oficinas, Locales, Garajes e Industrias",
    collectedInfo:
      "Recolecta superficies y potencias previstas de locales comerciales, oficinas, garajes (ventilación natural/forzada) y naves.",
    icon: <Factory className="h-4 w-4" />,
  },
  {
    page: 4,
    title: "Cuadro de Receptores de Alumbrado, Fuerza y Presupuesto",
    collectedInfo:
      "Recolecta el desglose de lámparas/luminarias, motores, tomas de fuerza, factor de potencia y presupuesto total de la obra.",
    icon: <Zap className="h-4 w-4" />,
  },
  {
    page: 5,
    title: "Memoria Descriptiva Reglamentaria (REBT e ITC-BT)",
    collectedInfo:
      "Recolecta la descripción técnica del objeto, suministro, instalaciones de enlace, cuadro de mando y puesta a tierra.",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    page: 6,
    title: "Tabla de Cálculos Eléctricos: LGA, D.I. y Circuitos C1 a C5",
    collectedInfo:
      "Recolecta potencia de cálculo, tensión, intensidad Ib, sección (mm²), PIA, caída de tensión ΔU% y diámetro de tubo.",
    icon: <Calculator className="h-4 w-4" />,
  },
  {
    page: 7,
    title: "Tabla de Cálculos Eléctricos: Circuitos Adicionales y Recarga VE",
    collectedInfo:
      "Recolecta el cálculo de circuitos de electrificación elevada (C6 a C12), recarga de vehículo eléctrico (C13) y subcuadros.",
    icon: <Sliders className="h-4 w-4" />,
  },
  {
    page: 8,
    title: "Esquema Unifilar de Protecciones (CGMP, IGA, Diferenciales y PIAs)",
    collectedInfo:
      "Recolecta el diagrama unifilar reglamentario desde acometida/contador hasta cada circuito interior y sus calibres.",
    icon: <GitBranch className="h-4 w-4" />,
  },
  {
    page: 9,
    title: "Croquis de Situación, Emplazamiento y Punto de Suministro",
    collectedInfo:
      "Recolecta el plano de localización geográfica del inmueble, callejero, coordenadas UTM y punto de conexión a la red.",
    icon: <MapPin className="h-4 w-4" />,
  },
  {
    page: 10,
    title: "Croquis de Trazado en Planta, Ubicación de CGP, CGMP y Tomas",
    collectedInfo:
      "Recolecta la distribución en planta de puntos de luz, interruptores, tomas de corriente, cuadro general y canalizaciones.",
    icon: <LayoutGrid className="h-4 w-4" />,
  },
  {
    page: 11,
    title: "Declaración del Autor (Instalador PH / Técnico) y Notas Oficiales",
    collectedInfo:
      "Recolecta los datos del Profesional Habilitado o Técnico Competente firmante, empresa instaladora, fecha/lugar y notas.",
    icon: <PenTool className="h-4 w-4" />,
  },
];
import {
  latLonToUtmSpain,
  MtdFormMetadata,
  RebtCalculatedCircuit,
  SystemSupplyType,
} from "@/lib/electrical-calculations";

interface MtdCanariasProps {
  meta: MtdFormMetadata;
  setMeta: React.Dispatch<React.SetStateAction<MtdFormMetadata>>;
  supplyType: SystemSupplyType;
  electrificationGrade: "basica" | "elevada";
  calculatedCircuits: RebtCalculatedCircuit[];
  cgmpSummary: {
    totalInstalledWatts: number;
    totalDesignWatts: number;
    contractDesignWatts: number;
    designCurrentAmps: number;
    igaAmps: number;
    rcd30mACount: number;
    hasEvCircuitC13: boolean;
    diCalculation: RebtCalculatedCircuit;
    nonCompliantCircuits: number;
  };
  buildingForecast: {
    totalDwellings: number;
    simultaneityCoefficient: number;
    avgDwellingPowerWatts: number;
    p1DwellingsWatts: number;
    p2GeneralServicesWatts: number;
    p3CommercialWatts: number;
    p4GarageWatts: number;
    evChargingStations: number;
    p5RawEvWatts: number;
    p5EffectiveEvWatts: number;
    totalBuildingPowerWatts: number;
    totalBuildingPowerKw: number;
    igmAmps: number;
    lgaCalculation: RebtCalculatedCircuit;
  };
  buildingInputs: {
    basicDwellings: number;
    elevatedDwellings: number;
    commonLightingW: number;
    hydroW: number;
    otherServicesW: number;
    commercialCount: number;
    commercialAreaM2: number;
    garageAreaM2: number;
    garageForcedVent: boolean;
    parkingSpaces: number;
  };
  earthingResult: {
    estimatedResistanceOhm: number;
    maxAllowedRaOhm: number;
    isCompliant: boolean;
  };
  rcdSensitivityMa: number;
  canExportMtd?: boolean;
  initialPage?: number | "all";
}

export default function MtdCanariasOfficialForm({
  meta,
  setMeta,
  supplyType,
  electrificationGrade,
  calculatedCircuits,
  cgmpSummary,
  buildingForecast,
  buildingInputs,
  earthingResult,
  rcdSensitivityMa,
  canExportMtd = true,
  initialPage = "all",
}: MtdCanariasProps) {
  const [selectedPage, setSelectedPage] =
    useState<number | "all">(initialPage);

  useEffect(() => {
    setSelectedPage(initialPage);
  }, [initialPage]);
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [isSheetDropdownOpen, setIsSheetDropdownOpen] =
    useState<boolean>(false);

  const updateField = <K extends keyof MtdFormMetadata>(
    key: K,
    value: MtdFormMetadata[K]
  ) => {
    setMeta((prev) => ({ ...prev, [key]: value }));
  };

  // ============================================================================
  // Georreferenciación de Coordenadas y Carga de Fachada de Google (Hoja 9/11)
  // ============================================================================
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geoFeedback, setGeoFeedback] = useState<string>("");
  const [streetViewUrlInput, setStreetViewUrlInput] = useState<string>("");
  const fachadaFileInputRef = useRef<HTMLInputElement | null>(null);

  const applyLatLonWithUtm = (latRaw: string, lonRaw: string) => {
    const latClean = latRaw.trim();
    const lonClean = lonRaw.trim();
    const latNum = Number(latClean.replace(",", "."));
    const lonNum = Number(lonClean.replace(",", "."));
    const valid =
      latClean !== "" &&
      lonClean !== "" &&
      Number.isFinite(latNum) &&
      Number.isFinite(lonNum) &&
      Math.abs(latNum) <= 90 &&
      Math.abs(lonNum) <= 180;
    const utmStr = valid ? latLonToUtmSpain(latNum, lonNum).formatted : "";
    setMeta((prev) => ({
      ...prev,
      coordenadasLat: latClean,
      coordenadasLng: lonClean,
      coordenadasUtm: valid ? utmStr : prev.coordenadasUtm,
    }));
  };

  const handleGeocodeAddress = async () => {
    setIsGeocoding(true);
    setGeoFeedback("Buscando coordenadas GPS y UTM de la dirección del suministro...");
    try {
      const queries = [
        `${meta.direccionCalle} ${meta.direccionNum}, ${meta.codigoPostal} ${meta.terminoMunicipal}, ${meta.isla}, España`,
        `${meta.direccionCalle}, ${meta.terminoMunicipal}, ${meta.isla}, España`,
        `${meta.terminoMunicipal}, ${meta.isla}, España`,
      ];
      let found: { lat: string; lon: string; display_name?: string } | null = null;
      for (const q of queries) {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=es&q=${encodeURIComponent(
            q
          )}`
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
            found = data[0];
            break;
          }
        }
      }
      if (found) {
        const latFixed = Number(found.lat).toFixed(6);
        const lonFixed = Number(found.lon).toFixed(6);
        const utm = latLonToUtmSpain(Number(latFixed), Number(lonFixed)).formatted;
        setMeta((prev) => ({
          ...prev,
          coordenadasLat: latFixed,
          coordenadasLng: lonFixed,
          coordenadasUtm: utm,
        }));
        setGeoFeedback(
          `✅ Coordenadas localizadas: ${latFixed}, ${lonFixed} (${utm}). Ya puedes abrir Google Street View o subir/pegar la foto de la fachada.`
        );
      } else {
        setGeoFeedback(
          "⚠️ No se encontró la calle exacta automáticamente. Puedes escribir Latitud/Longitud o pulsar «Usar mi GPS»."
        );
      }
    } catch {
      setGeoFeedback(
        "⚠️ Sin respuesta del geocodificador externo. Introduce las coordenadas manualmente o usa el GPS del dispositivo."
      );
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleUseDeviceGps = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoFeedback("⚠️ Tu navegador no dispone de sensor GPS.");
      return;
    }
    setGeoFeedback("Capturando posición GPS actual en obra...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latFixed = pos.coords.latitude.toFixed(6);
        const lonFixed = pos.coords.longitude.toFixed(6);
        const utm = latLonToUtmSpain(
          pos.coords.latitude,
          pos.coords.longitude
        ).formatted;
        setMeta((prev) => ({
          ...prev,
          coordenadasLat: latFixed,
          coordenadasLng: lonFixed,
          coordenadasUtm: utm,
        }));
        setGeoFeedback(
          `✅ GPS en obra fijado: ${latFixed}, ${lonFixed} · UTM ${utm}.`
        );
      },
      () => {
        setGeoFeedback("⚠️ Permiso de ubicación denegado o sin cobertura GPS.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const compressAndSaveFacadeImage = (file: File | Blob) => {
    const reader = new FileReader();
    reader.onload = () => {
      const rawUrl = String(reader.result || "");
      const img = new window.Image();
      img.onload = () => {
        const maxWidth = 1080;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const jpegUrl = canvas.toDataURL("image/jpeg", 0.84);
          updateField("fachadaFotoDataUrl", jpegUrl);
        } else {
          updateField("fachadaFotoDataUrl", rawUrl);
        }
        setGeoFeedback(
          "✅ Fotografía de fachada cargada en la Hoja 9/11. Haz clic en cualquier punto de la foto para situar el indicador de CGP y coordenadas."
        );
      };
      img.onerror = () => {
        updateField("fachadaFotoDataUrl", rawUrl);
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  };

  const handlePasteFacadeClipboard = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const blob = items[i].getAsFile();
        if (blob) {
          e.preventDefault();
          compressAndSaveFacadeImage(blob);
          return;
        }
      }
    }
  };

  const openGoogleStreetViewFacade = () => {
    const latStr = (meta.coordenadasLat || "").trim();
    const lonStr = (meta.coordenadasLng || "").trim();
    const hasCoords = Boolean(latStr) && Boolean(lonStr);
    const url = hasCoords
      ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(
          `${latStr},${lonStr}`
        )}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${meta.direccionCalle} ${meta.direccionNum}, ${meta.codigoPostal} ${meta.terminoMunicipal}, ${meta.isla}, España`
        )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const googleMapsEmbedQuery = meta.croquisMapaQuery?.trim()
    ? meta.croquisMapaQuery.trim()
    : meta.coordenadasLat?.trim() && meta.coordenadasLng?.trim()
      ? `${meta.coordenadasLat.trim()},${meta.coordenadasLng.trim()}`
      : `${meta.direccionCalle} ${meta.direccionNum}, ${meta.codigoPostal} ${meta.terminoMunicipal}, ${meta.isla}, España`;

  // ============================================================================
  // Edición Manual del Croquis Parcelario y Punto de Acometida (1B · Hoja 9/11)
  // ============================================================================
  type CroquisCustomItem =
    | {
        id: string;
        kind: "stroke";
        points: Array<{ x: number; y: number }>;
        color?: string;
      }
    | {
        id: string;
        kind: "label";
        x: number;
        y: number;
        text: string;
        color?: string;
      };

  const [isCroquisManualOpen, setIsCroquisManualOpen] = useState<boolean>(true);
  const [croquisTool, setCroquisTool] = useState<
    "cgp" | "red" | "parcela" | "draw" | "label"
  >("cgp");
  const [croquisLabelDraft, setCroquisLabelDraft] =
    useState<string>("Arqueta / Apoyo B.T.");
  const [activeStroke, setActiveStroke] = useState<Array<{
    x: number;
    y: number;
  }> | null>(null);
  const croquisFileInputRef = useRef<HTMLInputElement | null>(null);

  const croquisItems: CroquisCustomItem[] = (() => {
    try {
      const parsed = JSON.parse(meta.croquisDibujoJson || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const saveCroquisItems = (items: CroquisCustomItem[]) => {
    updateField("croquisDibujoJson", JSON.stringify(items));
  };

  const getCroquisSvgPoint = (
    e: React.MouseEvent<SVGSVGElement> | React.PointerEvent<SVGSVGElement>
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(
      10,
      Math.min(670, Math.round(((e.clientX - rect.left) / rect.width) * 680))
    );
    const y = Math.max(
      10,
      Math.min(375, Math.round(((e.clientY - rect.top) / rect.height) * 385))
    );
    return { x, y };
  };

  const compressAndSaveCroquisImage = (file: File | Blob) => {
    const reader = new FileReader();
    reader.onload = () => {
      const rawUrl = String(reader.result || "");
      const img = new window.Image();
      img.onload = () => {
        const maxWidth = 960;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          updateField("croquisImagenDataUrl", canvas.toDataURL("image/jpeg", 0.85));
        } else {
          updateField("croquisImagenDataUrl", rawUrl);
        }
        setGeoFeedback(
          "✅ Imagen base del Croquis 1B cargada. Puedes situar encima la CGP, la red B.T., textos o trazos manuales."
        );
      };
      img.onerror = () => updateField("croquisImagenDataUrl", rawUrl);
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  };

  const splitParcelNoteLines = (raw: string): [string, string] => {
    const clean = (raw || "CGP en fachada").trim();
    if (clean.length <= 26) return [clean, ""];
    const cutIdx = clean.lastIndexOf(" ", 26);
    const idx = cutIdx > 10 ? cutIdx : 25;
    const line1 = clean.slice(0, idx).trim();
    const rest = clean.slice(idx).trim();
    const line2 = rest.length > 28 ? `${rest.slice(0, 27).trim()}…` : rest;
    return [line1, line2];
  };

  // Generación automática de la Memoria Descriptiva (Página 5/11)
  const generatedMemoriaDescriptiva = `1. OBJETO DE LA MEMORIA TÉCNICA DE DISEÑO:
La presente Memoria Técnica de Diseño (M.T.D. B.T.) tiene por objeto definir y justificar las características técnicas y el cálculo eléctrico reglamentario de la instalación de Baja Tensión destinada a "${meta.usoDestino}", cuyo titular es ${meta.titularNombre} (D.O.I./C.I.F.: ${meta.titularNif}), emplazada en C/ ${meta.direccionCalle}, Nº ${meta.direccionNum}, ${meta.portalPlanta}, T.M. de ${meta.terminoMunicipal} (Isla de ${meta.isla}, C.P. ${meta.codigoPostal}), con una superficie útil de ${meta.superficieUtilM2} m² distribuida en ${meta.numPlantas} planta(s), en cumplimiento del Real Decreto 842/2002 (Reglamento Electrotécnico para Baja Tensión - REBT e Instrucciones Técnicas Complementarias ITC-BT-01 a ITC-BT-52).

2. CARACTERÍSTICAS DEL SUMINISTRO Y PREVISIÓN DE POTENCIA (ITC-BT-10 / ITC-BT-25):
- Tensión nominal de suministro: ${supplyType === "trifasico_400v" ? "400/230 V Trifásico (3F+N+PE)" : "230 V Monofásico (F+N+PE)"} a 50 Hz.
- Grado de electrificación: ${electrificationGrade === "elevada" ? "ELEVADA (mín. 9.200 W)" : "BÁSICA (mín. 5.750 W)"}.
- Potencia total instalada en receptores/circuitos: ${cgmpSummary.totalInstalledWatts.toLocaleString()} W.
- Potencia prevista de diseño (vivienda / instalación individual): ${cgmpSummary.contractDesignWatts.toLocaleString()} W (Intensidad de diseño Ib = ${cgmpSummary.designCurrentAmps} A).
- Previsión de carga total del edificio (ITC-BT-10): ${buildingForecast.totalBuildingPowerWatts.toLocaleString()} W (${buildingForecast.totalBuildingPowerKw} kW).

3. INSTALACIONES DE ENLACE (ITC-BT-12 a ITC-BT-16):
- Acometida: ${meta.acometidaTipo}, conductores de ${meta.acometidaMaterial} sección ${meta.acometidaSeccionMm2} mm², aislamiento 0,6/1 kV bajo ${meta.acometidaCanalizacionDesc} (${meta.acometidaCanalizacionDim}).
- Línea General de Alimentación (L.G.A. - ITC-BT-14): Conductores de Cobre (Cu) con aislamiento XLPE 0,6/1 kV libre de halógenos (AS+), sección 3×${buildingForecast.lgaCalculation.sectionMm2} + 1×${buildingForecast.lgaCalculation.neutralSectionMm2} mm² (caída de tensión ΔU = ${buildingForecast.lgaCalculation.voltageDropPct}% ≤ 0,5%), bajo tubo Ø ${buildingForecast.lgaCalculation.tubeDiameterMm} mm.
- Derivación Individual (D.I. - ITC-BT-15): Conductores de Cobre (Cu) con aislamiento XLPE 0,6/1 kV (AS+), sección ${supplyType === "trifasico_400v" ? "4×" : "2×"}${cgmpSummary.diCalculation.sectionMm2} mm² + PE ${cgmpSummary.diCalculation.peSectionMm2} mm² + hilo de mando rojo 1,5 mm², instalada bajo ${meta.diCanalizacionDesc} de diámetro Ø ${cgmpSummary.diCalculation.tubeDiameterMm} mm (ΔU = ${cgmpSummary.diCalculation.voltageDropPct}%).

4. CUADRO GENERAL DE MANDO Y PROTECCIÓN E INSTALACIÓN INTERIOR (ITC-BT-17 / 19 / 20 / 21 / 22 / 24 / 25):
- Interruptor General Automático (I.G.A.): ${cgmpSummary.igaAmps} A (poder de corte mín. 4.500 A) con protección contra sobretensiones transitorias y permanentes (Categoría ${meta.sobretensionesKv} kV).
- Protección contra contactos indirectos (ITC-BT-24): ${cgmpSummary.rcd30mACount} Interruptor(es) Diferencial(es) Clase ${meta.diferencialClase}, calibre ${meta.diferencialCalibreAmps} A y sensibilidad IΔn = ${rcdSensitivityMa} mA (máximo 5 circuitos por diferencial).
- Circuitos interiores: ${calculatedCircuits.length} circuitos (${calculatedCircuits.map((c) => `${c.code}: ${c.sectionMm2} mm² / PIA ${c.piaAmps}A / Ø${c.tubeDiameterMm}mm`).join("; ")}), ejecutados con conductores de Cobre aislados H07Z1-K (AS) 450/750 V bajo ${meta.interiorCanalizacionDesc}.

5. INSTALACIÓN DE PUESTA A TIERRA (ITC-BT-18 / ITC-BT-26):
- Electrodos de puesta a tierra: ${meta.electrodosDescripcion}.
- Línea de enlace con tierra: ${meta.conductorTierraMm2} mm² Cu; Conductor de protección principal: ${cgmpSummary.diCalculation.peSectionMm2} mm² Cu.
- Red de equipotencialidad en baños/locales húmedos: ${meta.disponeRedEquipotencial ? `SÍ (${meta.redEquipotencialMm2} mm² Cu)` : "NO"}.
- Resistencia óhmica prevista de la toma de tierra: Rt = ${earthingResult.estimatedResistanceOhm} Ω (inferior al límite admisible RA_máx = ${earthingResult.maxAllowedRaOhm} Ω para UL = ${meta.tensionSeguridad} V).`;

  const effectiveMemoriaTexto =
    meta.memoriaDescriptivaTexto.trim().length > 0
      ? meta.memoriaDescriptivaTexto
      : generatedMemoriaDescriptiva;

  // Circuitos interiores más representativos para la Página 1/11
  const mainInteriorSections = Array.from(
    new Set(calculatedCircuits.map((c) => c.sectionMm2))
  )
    .sort((a, b) => a - b)
    .join(" / ");
  const mainInteriorTubes = Array.from(
    new Set(calculatedCircuits.map((c) => c.tubeDiameterMm))
  )
    .sort((a, b) => a - b)
    .map((d) => `Ø${d}`)
    .join(", ");
  const mainInteriorPias = calculatedCircuits
    .map((c) => `${c.code}:${c.piaAmps}A`)
    .join(" ");

  // Detectar circuitos de electrificación elevada presentes (Página 2/11)
  const hasCircuitCode = (code: string) =>
    calculatedCircuits.some((c) => c.code.toUpperCase() === code.toUpperCase());

  // Cabecera oficial repetida en las 11 páginas
  const OfficialHeader = ({ isBtBox = true }: { isBtBox?: boolean }) => (
    <div className="mb-3 flex items-start justify-between border-b-2 border-black pb-2 text-black">
      <div className="flex flex-col items-start">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-gobierno-canarias.png"
          alt="Gobierno de Canarias - Consejería de Empleo, Industria y Comercio - Dirección General de Energía"
          className="h-14 w-auto object-contain"
        />
        <span className="mt-1 text-sm font-extrabold tracking-tight text-black">
          INSTALACIÓN DE BAJA TENSIÓN
        </span>
      </div>

      <div className="flex items-stretch gap-2 text-[10px]">
        <div className="flex flex-col justify-between text-right pr-1">
          <div className="font-bold leading-tight">
            Memoria Técnica
            <br />
            de Diseño {isBtBox ? "BT" : ""}
          </div>
          <div>Nº. de Instalación</div>
          <div>Nº. de Expediente</div>
        </div>
        <div className="w-28 border border-black">
          <div className="border-b border-black bg-slate-100 py-1 text-center text-xs font-extrabold">
            M.T.D.
            {isBtBox && (
              <>
                <br />
                B.T.
              </>
            )}
          </div>
          <div className="border-b border-black p-1">
            <input
              type="text"
              value={meta.instalacionNum}
              onChange={(e) => updateField("instalacionNum", e.target.value)}
              className="w-full bg-transparent text-center font-mono text-[10px] font-semibold text-black focus:outline-none"
            />
          </div>
          <div className="p-1">
            <input
              type="text"
              value={meta.expedienteNum}
              onChange={(e) => updateField("expedienteNum", e.target.value)}
              className="w-full bg-transparent text-center font-mono text-[10px] font-semibold text-black focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Pie de firma oficial (Páginas 1 a 10)
  const OfficialFooter = ({ pageNum }: { pageNum: number }) => (
    <div className="mt-3 pt-1 text-[10px] text-black">
      <div className="flex items-end justify-between gap-2">
        <div className="grid flex-1 grid-cols-12 border border-black">
          <div className="col-span-5 border-b border-r border-black p-1">
            <span className="font-semibold">Nombre: </span>
            <span>
              {meta.autorTipo === "instalador_ph"
                ? meta.instaladorNombrePh
                : meta.tecnicoNombre}
            </span>
          </div>
          <div className="col-span-3 border-b border-r border-black p-1">
            <span className="font-semibold">D.O.I.: </span>
            <span>{meta.instaladorDoi}</span>
          </div>
          <div className="col-span-4 border-b border-black p-1">
            <span className="font-semibold">Fecha: </span>
            <span>
              {meta.diaFirma}/{meta.mesFirma}/20{meta.anioFirma}
            </span>
          </div>

          <div className="col-span-5 row-span-2 border-r border-black p-1 min-h-[38px]">
            <span className="font-semibold">Firma y sello:</span>
          </div>
          <div className="col-span-4 border-b border-r border-black p-1">
            <span className="font-semibold">Empresa Instaladora nº:</span>
          </div>
          <div className="col-span-3 border-b border-black p-1 font-mono">
            {meta.empresaInstaladoraNum}
          </div>
          <div className="col-span-4 border-r border-black p-1">
            <span className="font-semibold">Colegiado nº:</span>
          </div>
          <div className="col-span-3 p-1 font-mono">
            {meta.autorTipo === "tecnico_competente"
              ? meta.tecnicoColegiadoNum
              : "—"}
          </div>
        </div>
        <div className="w-12 text-right text-sm font-bold">{pageNum}/11</div>
      </div>
      <div className="mt-0.5 italic text-[9px]">
        D.O.I.: Documento Oficial de Identidad
      </div>
    </div>
  );

  const shouldShowPage = (p: number) =>
    showPreview && (selectedPage === "all" || selectedPage === p);

  // Totales Página 2, 3, 4
  const totalOtrosServiciosReceptoresW = meta.otrosServiciosReceptores.reduce(
    (acc, r) => acc + (Number(r.powerWatts) || 0),
    0
  );
  const totalAlumbradoConocidoW = meta.receptoresAlumbrado.reduce(
    (acc, r) => acc + (Number(r.powerWatts) || 0),
    0
  );
  const totalFuerzaConocidoW = meta.receptoresFuerza.reduce(
    (acc, r) => acc + (Number(r.powerWatts) || 0),
    0
  );
  const totalIndustriasSinReceptoresW =
    meta.industriasAreaM2 > 0
      ? Math.max(meta.industriasAreaM2 * 125, meta.industriasCount * 10350)
      : 0;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* =====================================================================
          COLUMNA IZQUIERDA (FIJA): SELECCIÓN DE APARTADO Y DESCARGA OPCIONAL
         ===================================================================== */}
      <div className="no-print w-full shrink-0 space-y-4 lg:sticky lg:top-20 lg:w-80 xl:w-96">
        {/* Tarjeta 1: Selección de Apartado (Dropdown Minimalista) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-[#0f6cbd]">
              <Sparkles className="h-3 w-3" />
              Navegador de Secciones
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              {selectedPage === "all" ? "11 Hojas" : `Sección ${selectedPage}/11`}
            </span>
          </div>

          <div className="relative">
            <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Seleccionar Apartado según su Contenido
            </label>

            <button
              type="button"
              onClick={() => setIsSheetDropdownOpen((prev) => !prev)}
              className="mt-1.5 flex w-full items-center justify-between gap-2.5 rounded-lg border border-slate-300 bg-slate-50/70 px-3 py-2 text-left text-xs font-semibold text-slate-900 shadow-2xs transition hover:bg-white focus:border-[#0f6cbd] focus:outline-none"
            >
              <span className="flex items-center gap-2 truncate">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#e8f0fe] text-[#0f6cbd]">
                  {selectedPage === "all" ? (
                    <Layers className="h-3.5 w-3.5" />
                  ) : (
                    MTD_SHEETS_CATALOG.find((s) => s.page === selectedPage)
                      ?.icon
                  )}
                </span>
                <span className="truncate">
                  {selectedPage === "all"
                    ? "Vista Completa — Expediente M.T.D. B.T."
                    : MTD_SHEETS_CATALOG.find((s) => s.page === selectedPage)
                        ?.title}
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                  isSheetDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isSheetDropdownOpen && (
              <div className="absolute left-0 z-30 mt-1.5 max-h-96 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPage("all");
                    setIsSheetDropdownOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition ${
                    selectedPage === "all"
                      ? "bg-[#e8f0fe] font-bold text-[#0f6cbd]"
                      : "font-medium text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Layers
                      className={`h-4 w-4 shrink-0 ${
                        selectedPage === "all"
                          ? "text-[#0f6cbd]"
                          : "text-slate-500"
                      }`}
                    />
                    <span className="truncate">
                      Vista Completa — Expediente M.T.D. B.T.
                    </span>
                  </span>
                  {selectedPage === "all" && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-[#0f6cbd]" />
                  )}
                </button>

                <div className="my-1 border-t border-slate-100" />

                {MTD_SHEETS_CATALOG.map((sheet) => {
                  const isActive = selectedPage === sheet.page;
                  return (
                    <button
                      key={sheet.page}
                      type="button"
                      onClick={() => {
                        setSelectedPage(sheet.page);
                        setIsSheetDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition ${
                        isActive
                          ? "bg-[#e8f0fe] font-bold text-[#0f6cbd]"
                          : "font-medium text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span
                          className={`shrink-0 ${
                            isActive ? "text-[#0f6cbd]" : "text-slate-500"
                          }`}
                        >
                          {sheet.icon}
                        </span>
                        <span className="truncate">{sheet.title}</span>
                      </span>
                      {isActive && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-[#0f6cbd]" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Botones de navegación rápida entre secciones */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                if (selectedPage === "all") {
                  setSelectedPage(1);
                } else if (selectedPage > 1) {
                  setSelectedPage(selectedPage - 1);
                }
              }}
              disabled={selectedPage === 1}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Anterior
            </button>

            <button
              type="button"
              onClick={() => {
                if (selectedPage === "all") {
                  setSelectedPage(1);
                } else if (selectedPage < 11) {
                  setSelectedPage(selectedPage + 1);
                }
              }}
              disabled={selectedPage === 11}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Siguiente
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {selectedPage !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedPage("all")}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#e8f0fe] px-3 py-1.5 text-xs font-semibold text-[#0f6cbd] transition hover:bg-blue-100"
            >
              <Layers className="h-3.5 w-3.5" />
              Mostrar Vista Completa (11 Hojas)
            </button>
          )}

          {/* Descripción de la información recolectada */}
          <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-xs leading-relaxed text-slate-700">
            {selectedPage === "all" ? (
              <span>
                <strong className="block text-[#0f6cbd]">
                  Documento Oficial Completo:
                </strong>
                Visualizando las 11 secciones autocompletadas del expediente M.T.D. B.T.
              </span>
            ) : (
              <span>
                <strong className="block text-[#0f6cbd]">
                  Información recolectada:
                </strong>
                {
                  MTD_SHEETS_CATALOG.find((s) => s.page === selectedPage)
                    ?.collectedInfo
                }
              </span>
            )}
          </div>
        </div>

        {/* Tarjeta 2: Descarga / Impresión Opcional y Control de Vista */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Ficha Técnica Oficial M.T.D. B.T.
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Todos los cálculos del REBT están volcados en la ficha de la derecha. Puedes editar cualquier casilla directamente sobre el documento.
            </p>
          </div>

          <div className="space-y-2">
            {canExportMtd ? (
              <button
                type="button"
                onClick={() => {
                  setShowPreview(true);
                  setTimeout(() => window.print(), 100);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0f6cbd] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#115ea3]"
              >
                <Printer className="h-4 w-4" />
                {selectedPage === "all"
                  ? "Descargar / Imprimir Ficha M.T.D."
                  : "Descargar / Imprimir esta Sección"}
              </button>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs font-medium text-amber-800">
                Tu perfil no tiene permiso para exportar PDF.
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowPreview((prev) => !prev)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Eye className="h-4 w-4 text-slate-500" />
              {showPreview ? "Ocultar Vista Previa" : "Mostrar Vista Previa"}
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          COLUMNA DERECHA: DOCUMENTO OFICIAL M.T.D. B.T. (RESPONSIVE EN MÓVIL Y ESCRITORIO)
         ===================================================================== */}
      <div className="min-w-0 flex-1 space-y-6 overflow-x-auto pb-4">

      {/* =====================================================================
          PÁGINA 1/11: DATOS TITULAR, UBICACIÓN Y CARACTERÍSTICAS ELÉCTRICAS
         ===================================================================== */}
      {shouldShowPage(1) && (
        <div className="mtd-print-page mx-auto max-w-[210mm] rounded-sm border border-slate-400 bg-white p-6 text-[11px] leading-tight text-black shadow-2xl">
          <OfficialHeader isBtBox={true} />

          {/* DATOS DEL TITULAR Y UBICACIÓN */}
          <div className="border-2 border-black p-2">
            <div className="font-bold underline">DATOS DEL TITULAR:</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="whitespace-nowrap">Nombre/razón social</span>
              <input
                type="text"
                value={meta.titularNombre}
                onChange={(e) => updateField("titularNombre", e.target.value)}
                className="flex-1 border border-black px-1.5 py-0.5 font-semibold"
              />
              <span className="whitespace-nowrap">D.O.I./C.I.F.</span>
              <input
                type="text"
                value={meta.titularNif}
                onChange={(e) => updateField("titularNif", e.target.value)}
                className="w-32 border border-black px-1.5 py-0.5 font-mono font-semibold"
              />
            </div>

            <div className="mt-2 font-bold underline">
              UBICACIÓN DE LA INSTALACIÓN:
            </div>
            <div className="mt-1 grid grid-cols-12 gap-1.5 items-center">
              <span className="col-span-1">Dirección</span>
              <div className="col-span-5 flex items-center border border-black px-1">
                <span className="mr-1 font-semibold">C/:</span>
                <input
                  type="text"
                  value={meta.direccionCalle}
                  onChange={(e) => updateField("direccionCalle", e.target.value)}
                  className="w-full py-0.5"
                />
              </div>
              <div className="col-span-2 flex items-center border border-black px-1">
                <span className="mr-1 font-semibold">Nº:</span>
                <input
                  type="text"
                  value={meta.direccionNum}
                  onChange={(e) => updateField("direccionNum", e.target.value)}
                  className="w-full py-0.5"
                />
              </div>
              <div className="col-span-2 flex items-center border border-black px-1">
                <span className="mr-1 font-semibold">Portal/planta:</span>
                <input
                  type="text"
                  value={meta.portalPlanta}
                  onChange={(e) => updateField("portalPlanta", e.target.value)}
                  className="w-full py-0.5"
                />
              </div>
              <div className="col-span-2 flex items-center border border-black px-1">
                <span className="mr-1 font-semibold">T.M.</span>
                <input
                  type="text"
                  value={meta.terminoMunicipal}
                  onChange={(e) =>
                    updateField("terminoMunicipal", e.target.value)
                  }
                  className="w-full py-0.5"
                />
              </div>
            </div>

            <div className="mt-1.5 grid grid-cols-12 gap-1.5 items-center">
              <span className="col-span-1">Isla</span>
              <input
                type="text"
                value={meta.isla}
                onChange={(e) => updateField("isla", e.target.value)}
                className="col-span-4 border border-black px-1.5 py-0.5"
              />
              <span className="col-span-1 text-right">Tfno/s</span>
              <input
                type="text"
                value={meta.telefono}
                onChange={(e) => updateField("telefono", e.target.value)}
                className="col-span-3 border border-black px-1.5 py-0.5"
              />
              <div className="col-span-3 flex items-center border border-black px-1">
                <span className="mr-1 font-semibold">C.P.:</span>
                <input
                  type="text"
                  value={meta.codigoPostal}
                  onChange={(e) => updateField("codigoPostal", e.target.value)}
                  className="w-full py-0.5"
                />
              </div>
            </div>

            <div className="mt-1.5 grid grid-cols-12 gap-1.5 items-center">
              <span className="col-span-2">Superficie útil</span>
              <div className="col-span-2 flex items-center border border-black px-1">
                <input
                  type="number"
                  value={meta.superficieUtilM2}
                  onChange={(e) =>
                    updateField("superficieUtilM2", Number(e.target.value) || 0)
                  }
                  className="w-full py-0.5 text-right font-semibold"
                />
                <span className="ml-1">m²</span>
              </div>
              <span className="col-span-3 text-right">Uso a que se destina:</span>
              <input
                type="text"
                value={meta.usoDestino}
                onChange={(e) => updateField("usoDestino", e.target.value)}
                className="col-span-5 border border-black px-1.5 py-0.5 font-semibold"
              />
            </div>

            <div className="mt-1.5 grid grid-cols-12 gap-1.5 items-center">
              <span className="col-span-2">Nº. de plantas</span>
              <input
                type="number"
                value={meta.numPlantas}
                onChange={(e) =>
                  updateField("numPlantas", Number(e.target.value) || 1)
                }
                className="col-span-2 border border-black px-1.5 py-0.5 text-right"
              />
            </div>
          </div>

          {/* CARACTERÍSTICAS ELÉCTRICAS DE LA INSTALACIÓN */}
          <div className="mt-2 border-2 border-black">
            <div className="border-b border-black bg-slate-100 px-2 py-1 font-bold underline">
              CARACTERÍSTICAS ELÉCTRICAS DE LA INSTALACIÓN:
            </div>

            {/* POTENCIAS */}
            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-2 flex items-center justify-center border-r border-black font-bold underline">
                POTENCIAS
              </div>
              <div className="col-span-10 divide-y divide-black">
                <div className="flex items-center justify-between px-2 py-0.5">
                  <span className="font-semibold">Potencia instalada</span>
                  <div className="flex items-center gap-1 font-mono font-bold">
                    <span>{cgmpSummary.totalInstalledWatts}</span>
                    <span className="italic">W</span>
                  </div>
                </div>
                <div className="flex items-center justify-between px-2 py-0.5">
                  <span className="font-semibold">Potencia prevista</span>
                  <div className="flex items-center gap-1 font-mono font-bold">
                    <span>{cgmpSummary.contractDesignWatts}</span>
                    <span className="italic">W</span>
                  </div>
                </div>
                <div className="flex items-center justify-between px-2 py-0.5">
                  <span className="font-semibold">Tensión</span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1">
                      <span className="inline-flex h-3.5 w-3.5 items-center justify-center border border-black font-bold">
                        {supplyType === "monofasico_230v" ? "X" : ""}
                      </span>
                      <span>230 V</span>
                    </label>
                    <label className="flex items-center gap-1">
                      <span className="inline-flex h-3.5 w-3.5 items-center justify-center border border-black font-bold">
                        {supplyType === "trifasico_400v" ? "X" : ""}
                      </span>
                      <span>400 V</span>
                    </label>
                    <span>Otra: _______ V</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CONDUCTORES Y MODO DE CANALIZACIÓN (4 columnas: Acometida*, L.G.A., D.I., Inst. Interior) */}
            <div className="grid grid-cols-12 border-b border-black text-[10px]">
              <div className="col-span-2 flex flex-col justify-around border-r border-black p-1 font-bold underline">
                <span>CONDUCTORES</span>
                <span className="mt-8">MODO DE CANALIZACIÓN</span>
              </div>
              <div className="col-span-10">
                {/* Cabecera 4 columnas */}
                <div className="grid grid-cols-12 border-b border-black bg-slate-50 font-bold italic text-center">
                  <div className="col-span-4 border-r border-black py-0.5"></div>
                  <div className="col-span-2 border-r border-black py-0.5">
                    Acometida*
                  </div>
                  <div className="col-span-2 border-r border-black py-0.5">
                    L.G.A.
                  </div>
                  <div className="col-span-2 border-r border-black py-0.5">
                    D.I.
                  </div>
                  <div className="col-span-2 py-0.5">Inst. Interior</div>
                </div>

                {/* Naturaleza */}
                <div className="grid grid-cols-12 border-b border-black items-center">
                  <div className="col-span-4 border-r border-black px-1.5 py-1 font-semibold">
                    Naturaleza
                  </div>
                  <div className="col-span-2 border-r border-black p-1 text-[9px]">
                    <div className="flex justify-between">
                      <span>
                        [{meta.acometidaTipo.includes("Aerea") ? "X" : " "}] Aérea
                      </span>
                      <span>[{meta.acometidaMaterial === "Cu" ? "X" : " "}] Cu</span>
                    </div>
                    <div className="flex justify-between">
                      <span>
                        [{meta.acometidaTipo.includes("Subterranea") ? "X" : " "}] Subt.
                      </span>
                      <span>[{meta.acometidaMaterial === "Al" ? "X" : " "}] Al</span>
                    </div>
                  </div>
                  <div className="col-span-2 border-r border-black p-1 text-[9px]">
                    <div>[X] Cu</div>
                    <div>[ ] Al</div>
                  </div>
                  <div className="col-span-2 border-r border-black p-1 text-[9px]">
                    <div>[X] Cu</div>
                    <div>[ ] Al</div>
                  </div>
                  <div className="col-span-2 p-1 text-[9px]">
                    <div>[X] Cu</div>
                    <div>[ ] Al</div>
                  </div>
                </div>

                {/* Aislamiento */}
                <div className="grid grid-cols-12 border-b border-black items-center">
                  <div className="col-span-4 border-r border-black px-1.5 py-1 font-semibold">
                    Aislamiento
                  </div>
                  <div className="col-span-2 border-r border-black p-1 text-center font-bold">
                    [X] 0,6/1 KV
                  </div>
                  <div className="col-span-2 border-r border-black p-1 text-center font-bold">
                    [X] 0,6/1 KV
                  </div>
                  <div className="col-span-2 border-r border-black p-1 text-[9px]">
                    <div>[ ] 450/750 V</div>
                    <div className="font-bold">[X] 0,6/1 KV</div>
                  </div>
                  <div className="col-span-2 p-1 text-[9px]">
                    <div className="font-bold">[X] 450/750 V</div>
                    <div>[ ] 0,6/1 KV</div>
                  </div>
                </div>

                {/* Clase de aislamiento */}
                <div className="grid grid-cols-12 border-b border-black items-center">
                  <div className="col-span-4 border-r border-black px-1.5 py-0.5 font-semibold">
                    Clase de aislamiento (Nota 1)
                  </div>
                  <div className="col-span-2 border-r border-black p-0.5 text-center font-mono">
                    XLPE
                  </div>
                  <div className="col-span-2 border-r border-black p-0.5 text-center font-mono">
                    XLPE (AS+)
                  </div>
                  <div className="col-span-2 border-r border-black p-0.5 text-center font-mono">
                    XLPE (AS+)
                  </div>
                  <div className="col-span-2 p-0.5 text-center font-mono">
                    H07Z1-K (AS)
                  </div>
                </div>

                {/* Sección (mm²) */}
                <div className="grid grid-cols-12 border-b border-black items-center">
                  <div className="col-span-4 border-r border-black px-1.5 py-0.5 font-semibold">
                    Sección (mm²)
                  </div>
                  <div className="col-span-2 border-r border-black p-0.5 text-center font-mono font-bold">
                    3×{meta.acometidaSeccionMm2}
                  </div>
                  <div className="col-span-2 border-r border-black p-0.5 text-center font-mono font-bold">
                    3×{buildingForecast.lgaCalculation.sectionMm2}+1×
                    {buildingForecast.lgaCalculation.neutralSectionMm2}
                  </div>
                  <div className="col-span-2 border-r border-black p-0.5 text-center font-mono font-bold">
                    {supplyType === "trifasico_400v" ? "4×" : "2×"}
                    {cgmpSummary.diCalculation.sectionMm2}+
                    {cgmpSummary.diCalculation.peSectionMm2}
                  </div>
                  <div className="col-span-2 p-0.5 text-center font-mono font-bold">
                    {mainInteriorSections}
                  </div>
                </div>

                {/* Descripción de canalización */}
                <div className="grid grid-cols-12 border-b border-black items-center">
                  <div className="col-span-4 border-r border-black px-1.5 py-0.5 font-semibold">
                    Descripción de canalización
                  </div>
                  <div className="col-span-2 border-r border-black p-0.5 text-center text-[9px]">
                    {meta.acometidaCanalizacionDesc}
                  </div>
                  <div className="col-span-2 border-r border-black p-0.5 text-center text-[9px]">
                    {meta.lgaCanalizacionDesc}
                  </div>
                  <div className="col-span-2 border-r border-black p-0.5 text-center text-[9px]">
                    {meta.diCanalizacionDesc}
                  </div>
                  <div className="col-span-2 p-0.5 text-center text-[9px]">
                    {meta.interiorCanalizacionDesc}
                  </div>
                </div>

                {/* Dimensión (Ø tubo) */}
                <div className="grid grid-cols-12 border-b border-black items-center">
                  <div className="col-span-4 border-r border-black px-1.5 py-0.5 font-semibold">
                    Dimensión (Ø tubo, canal/bandeja)
                  </div>
                  <div className="col-span-2 border-r border-black p-0.5 text-center font-mono">
                    {meta.acometidaCanalizacionDim}
                  </div>
                  <div className="col-span-2 border-r border-black p-0.5 text-center font-mono">
                    Ø {buildingForecast.lgaCalculation.tubeDiameterMm} mm
                  </div>
                  <div className="col-span-2 border-r border-black p-0.5 text-center font-mono">
                    Ø {cgmpSummary.diCalculation.tubeDiameterMm} mm
                  </div>
                  <div className="col-span-2 p-0.5 text-center font-mono text-[9px]">
                    {mainInteriorTubes} mm
                  </div>
                </div>

                {/* Modos de instalación (Ref. / Tipo) */}
                <div className="grid grid-cols-12 items-center">
                  <div className="col-span-4 border-r border-black px-1.5 py-0.5 font-semibold">
                    Modos de instalación (Ref. / Tipo)
                  </div>
                  <div className="col-span-2 border-r border-black p-0.5 text-center font-mono">
                    {meta.acometidaModoRef} / {meta.acometidaModoTipo}
                  </div>
                  <div className="col-span-2 border-r border-black p-0.5 text-center font-mono">
                    B1 / Tubo obra
                  </div>
                  <div className="col-span-2 border-r border-black p-0.5 text-center font-mono">
                    B1 / Empotrado
                  </div>
                  <div className="col-span-2 p-0.5 text-center font-mono">
                    B1 / Empotrado
                  </div>
                </div>
              </div>
            </div>

            {/* PROTECCIONES */}
            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-2 flex items-center justify-center border-r border-black font-bold underline">
                PROTECCIONES
              </div>
              <div className="col-span-10 divide-y divide-black">
                <div className="flex items-center justify-between px-2 py-0.5">
                  <span className="font-semibold">[X] I.G.A.</span>
                  <span className="font-mono font-bold">
                    {cgmpSummary.igaAmps} A
                  </span>
                </div>
                <div className="flex items-center justify-between px-2 py-0.5">
                  <span className="font-semibold">
                    [X] Magnetotérmicos/número ({calculatedCircuits.length} ud.)
                  </span>
                  <span className="font-mono text-[9px] font-bold">
                    {mainInteriorPias}
                  </span>
                </div>
                <div className="flex items-center justify-between px-2 py-0.5">
                  <span className="font-semibold">
                    [X] Sobretensiones/categoría
                  </span>
                  <span className="font-mono font-bold">
                    {meta.sobretensionesKv} kV
                  </span>
                </div>
                <div className="flex items-center justify-between px-2 py-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      [X] Interruptores diferenciales
                    </span>
                    <span className="text-[9px]">
                      CLASE: [{meta.diferencialClase === "AC" ? "X" : " "}]AC [
                      {meta.diferencialClase === "A" ? "X" : " "}]A [
                      {meta.diferencialClase === "S" ? "X" : " "}]S [
                      {meta.diferencialClase === "B" ? "X" : " "}]B
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono font-bold">
                    <span>número: {cgmpSummary.rcd30mACount}</span>
                    <span>{rcdSensitivityMa} mA</span>
                    <span>{meta.diferencialCalibreAmps} A</span>
                  </div>
                </div>
              </div>
            </div>

            {/* MEDIDA */}
            <div className="grid grid-cols-12 border-b border-black items-center">
              <div className="col-span-2 border-r border-black px-2 py-0.5 text-center font-bold underline">
                MEDIDA
              </div>
              <div className="col-span-5 border-r border-black px-2 py-0.5 flex justify-between">
                <span className="font-semibold">Nº de contadores total</span>
                <input
                  type="number"
                  value={meta.numContadoresTotal}
                  onChange={(e) =>
                    updateField("numContadoresTotal", Number(e.target.value) || 1)
                  }
                  className="w-16 text-right font-mono font-bold"
                />
              </div>
              <div className="col-span-5 px-2 py-0.5 flex justify-between">
                <span className="font-semibold">I.G.M.</span>
                <span className="font-mono font-bold">
                  {buildingForecast.igmAmps} A
                </span>
              </div>
            </div>

            {/* INSTALACIONES DE PUESTA A TIERRA */}
            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-2 flex items-center justify-center border-r border-black p-1 text-center font-bold underline">
                INSTALACIONES DE PUESTA A TIERRA
              </div>
              <div className="col-span-10 divide-y divide-black">
                <div className="flex justify-between px-2 py-0.5">
                  <span className="font-semibold">
                    Tomas de tierra (electrodos: placa, pica, etc.)
                  </span>
                  <input
                    type="text"
                    value={meta.electrodosDescripcion}
                    onChange={(e) =>
                      updateField("electrodosDescripcion", e.target.value)
                    }
                    className="w-64 text-right font-semibold"
                  />
                </div>
                <div className="flex justify-between px-2 py-0.5">
                  <span className="font-semibold">
                    Conductores de tierra (mm²)
                  </span>
                  <span className="font-mono font-bold">
                    {meta.conductorTierraMm2} mm² Cu
                  </span>
                </div>
                <div className="flex justify-between px-2 py-0.5">
                  <span className="font-semibold">
                    Sección conductor protección (mm²)
                  </span>
                  <span className="font-mono font-bold">
                    {cgmpSummary.diCalculation.peSectionMm2} mm² Cu
                  </span>
                </div>
                <div className="flex justify-between px-2 py-0.5">
                  <span className="font-semibold">
                    Dispone de Red Equipotencial
                  </span>
                  <span className="font-mono font-bold">
                    [{meta.disponeRedEquipotencial ? "X" : " "}] Sí / [
                    {!meta.disponeRedEquipotencial ? "X" : " "}] No ·{" "}
                    {meta.redEquipotencialMm2} mm²
                  </span>
                </div>
                <div className="flex justify-between px-2 py-0.5">
                  <span className="font-semibold">
                    Resistencia óhmnica de toma de tierra (prevista)
                  </span>
                  <span className="font-mono font-bold">
                    {earthingResult.estimatedResistanceOhm} Ω
                  </span>
                </div>
              </div>
            </div>

            {/* Nº CUADROS ELÉCTRICOS Y TENSIÓN DE SEGURIDAD */}
            <div className="grid grid-cols-12 border-b border-black items-center p-1">
              <div className="col-span-3 font-bold">
                Nº. CUADROS ELÉCTRICOS:{" "}
                <span className="inline-block border border-black px-2 py-0.5 font-mono">
                  {meta.numCuadrosPrincipales +
                    meta.numCuadrosSecundarios +
                    meta.numRestoCuadros}
                </span>
              </div>
              <div className="col-span-5 text-[9px] space-y-0.5">
                <div>
                  Nº. de cuadros principales:{" "}
                  <strong>{meta.numCuadrosPrincipales}</strong>
                </div>
                <div>
                  Nº. de cuadros secundarios:{" "}
                  <strong>{meta.numCuadrosSecundarios}</strong>
                </div>
                <div>
                  Nº. de resto de cuadros:{" "}
                  <strong>{meta.numRestoCuadros}</strong>
                </div>
              </div>
              <div className="col-span-4 text-[9px]">
                <span className="font-bold">
                  Tensión de seguridad (seco/húmedo/agua):
                </span>
                <div className="flex gap-2 mt-0.5 font-mono">
                  <span>[{meta.tensionSeguridad === 50 ? "X" : " "}] 50 v</span>
                  <span>[{meta.tensionSeguridad === 24 ? "X" : " "}] 24 v</span>
                  <span>[{meta.tensionSeguridad === 12 ? "X" : " "}] 12 v</span>
                </div>
              </div>
            </div>

            {/* SUMINISTRO DE EMERGENCIA Y TIPO DE INSTALACIÓN */}
            <div className="flex items-center justify-between border-b border-black px-2 py-1 text-[10px]">
              <span className="font-bold">SUMINISTRO DE EMERGENCIA:</span>
              <div className="flex gap-4">
                <span>
                  [{meta.suministroEmergencia === "Reserva" ? "X" : " "}] Reserva
                </span>
                <span>
                  [{meta.suministroEmergencia === "Socorro" ? "X" : " "}] Socorro
                </span>
                <span>
                  [{meta.suministroEmergencia === "Duplicado" ? "X" : " "}]
                  Duplicado
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between border-b border-black px-2 py-1 text-[9px]">
              <span className="font-bold">TIPO DE INSTALACIÓN:</span>
              {(
                [
                  "Normal",
                  "L.P.C.",
                  "R.I. o Exp.",
                  "Local especial",
                  "Instalación especial",
                  "Domótica",
                  "Otras",
                ] as const
              ).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => updateField("tipoInstalacion", tipo)}
                  className="hover:underline"
                >
                  [{meta.tipoInstalacion === tipo ? "X" : " "}] {tipo}
                </button>
              ))}
            </div>

            {/* PRESUPUESTO TOTAL */}
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-extrabold">PRESUPUESTO TOTAL</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={meta.presupuestoTotalEuros}
                  onChange={(e) =>
                    updateField(
                      "presupuestoTotalEuros",
                      Number(e.target.value) || 0
                    )
                  }
                  className="w-28 border border-black px-2 py-0.5 text-right font-mono text-xs font-bold"
                />
                <span className="font-bold italic">Euros</span>
              </div>
            </div>
          </div>

          <OfficialFooter pageNum={1} />
        </div>
      )}

      {/* =====================================================================
          PÁGINA 2/11: EDIFICIOS DESTINADOS PRINCIPALMENTE A VIVIENDAS (ITC-BT-10)
         ===================================================================== */}
      {shouldShowPage(2) && (
        <div className="mtd-print-page mx-auto max-w-[210mm] rounded-sm border border-slate-400 bg-white p-6 text-[11px] leading-tight text-black shadow-2xl">
          <OfficialHeader isBtBox={true} />

          <div className="border-2 border-black">
            <div className="border-b border-black bg-slate-100 py-1 text-center font-bold">
              EDIFICIOS DESTINADOS PRINCIPALMENTE A VIVIENDAS (ITC-BT-010 apartado 3)
            </div>

            {/* Viviendas */}
            <div className="border-b border-black p-2">
              <div className="font-bold underline">Viviendas</div>
              <div className="mt-1 grid grid-cols-12 border border-black text-[10px]">
                <div className="col-span-4 border-b border-r border-black p-1">
                  Grado de electrificación básico
                </div>
                <div className="col-span-2 border-b border-r border-black p-1">
                  Nº. de viviendas:{" "}
                  <strong className="font-mono">
                    {buildingInputs.basicDwellings}
                  </strong>
                </div>
                <div className="col-span-3 border-b border-r border-black p-1">
                  Superficie útil ind.:{" "}
                  <strong className="font-mono">90 m²</strong>
                </div>
                <div className="col-span-3 border-b border-black p-1 flex justify-between">
                  <span>Potencia por vivienda:</span>
                  <strong className="font-mono">5.750 W</strong>
                </div>

                <div className="col-span-4 border-r border-black p-1">
                  Grado de electrificación elevado
                </div>
                <div className="col-span-2 border-r border-black p-1">
                  Nº. de viviendas:{" "}
                  <strong className="font-mono">
                    {buildingInputs.elevatedDwellings}
                  </strong>
                </div>
                <div className="col-span-3 border-r border-black p-1">
                  Superficie útil ind.:{" "}
                  <strong className="font-mono">165 m²</strong>
                </div>
                <div className="col-span-3 p-1 flex justify-between">
                  <span>Potencia por vivienda:</span>
                  <strong className="font-mono">9.200 W</strong>
                </div>
              </div>

              <div className="mt-1 flex justify-end items-center gap-2">
                <span className="font-bold italic">POTENCIA MEDIA VIVIENDAS</span>
                <span className="w-32 border border-black px-2 py-0.5 text-right font-mono font-bold">
                  {buildingForecast.avgDwellingPowerWatts} W
                </span>
              </div>
              <div className="mt-1 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-bold italic">
                    COEFICIENTE DE SIMULTANEIDAD
                  </span>
                  <span className="border border-black px-3 py-0.5 font-mono font-bold">
                    {buildingForecast.simultaneityCoefficient}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold italic">
                    POTENCIA TOTAL SIMULTÁNEA
                  </span>
                  <span className="w-32 border border-black px-2 py-0.5 text-right font-mono font-bold">
                    {buildingForecast.p1DwellingsWatts} W
                  </span>
                </div>
              </div>
            </div>

            {/* Servicios generales */}
            <div className="border-b border-black p-2">
              <div className="font-bold underline">Servicios generales</div>
              <div className="mt-1 grid grid-cols-3 border border-black text-[10px]">
                <div className="border-r border-black p-1 flex justify-between">
                  <span>Alumbrado zonas comunes</span>
                  <strong className="font-mono">
                    {buildingInputs.commonLightingW} W
                  </strong>
                </div>
                <div className="border-r border-black p-1 flex justify-between">
                  <span>Hidros</span>
                  <strong className="font-mono">{buildingInputs.hydroW} W</strong>
                </div>
                <div className="p-1 flex justify-between">
                  <span>Otros servicios (1)</span>
                  <strong className="font-mono">
                    {buildingInputs.otherServicesW} W
                  </strong>
                </div>
              </div>
              <div className="mt-1 flex justify-between items-center">
                <span className="text-[9px] italic">
                  (1) Especificar los receptores de &ldquo;Otros servicios&rdquo; en la tabla inferior
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold italic">
                    POTENCIA TOTAL SERVICIOS GENERALES
                  </span>
                  <span className="w-32 border border-black px-2 py-0.5 text-right font-mono font-bold">
                    {buildingForecast.p2GeneralServicesWatts} W
                  </span>
                </div>
              </div>
            </div>

            {/* Locales comerciales y/u oficinas */}
            <div className="border-b border-black p-2">
              <div className="font-bold underline">
                Locales comerciales y/u oficinas
              </div>
              <div className="mt-1 grid grid-cols-3 border border-black text-[10px]">
                <div className="border-r border-black p-1 flex justify-between">
                  <span>Nº. de locales</span>
                  <strong className="font-mono">
                    {buildingInputs.commercialCount}
                  </strong>
                </div>
                <div className="border-r border-black p-1 flex justify-between">
                  <span>Superficie útil total</span>
                  <strong className="font-mono">
                    {buildingInputs.commercialAreaM2} m²
                  </strong>
                </div>
                <div className="p-1 flex justify-between">
                  <span>Potencia específica</span>
                  <strong className="font-mono">100 W/m²</strong>
                </div>
              </div>
              <div className="mt-1 flex justify-end items-center gap-2">
                <span className="font-bold italic">POTENCIA TOTAL DE LOCALES</span>
                <span className="w-32 border border-black px-2 py-0.5 text-right font-mono font-bold">
                  {buildingForecast.p3CommercialWatts} W
                </span>
              </div>
            </div>

            {/* Garaje */}
            <div className="border-b border-black p-2">
              <div className="flex items-center gap-4">
                <span className="font-bold underline">Garaje</span>
                <span>
                  [{buildingInputs.garageAreaM2 > 0 ? "X" : " "}] Sí / [
                  {buildingInputs.garageAreaM2 === 0 ? "X" : " "}] No
                </span>
                <span>
                  [{!buildingInputs.garageForcedVent ? "X" : " "}] Ventilación natural
                </span>
                <span>
                  [{buildingInputs.garageForcedVent ? "X" : " "}] Ventilación forzada
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <div className="flex gap-4 text-[10px]">
                  <span>
                    Nº. de aparcamientos:{" "}
                    <strong className="border border-black px-2 py-0.5 font-mono">
                      {buildingInputs.parkingSpaces}
                    </strong>
                  </span>
                  <span>
                    Superficie:{" "}
                    <strong className="border border-black px-2 py-0.5 font-mono">
                      {buildingInputs.garageAreaM2} m²
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold italic">POTENCIA DE GARAJE</span>
                  <span className="w-32 border border-black px-2 py-0.5 text-right font-mono font-bold">
                    {buildingForecast.p4GarageWatts} W
                  </span>
                </div>
              </div>
            </div>

            {/* POTENCIA TOTAL EDIFICIO */}
            <div className="flex items-center justify-end gap-3 bg-slate-100 p-2">
              <span className="text-xs font-extrabold">
                POTENCIA TOTAL EDIFICIO
              </span>
              <span className="w-36 border-2 border-black bg-white px-2 py-1 text-right font-mono text-xs font-extrabold">
                {buildingForecast.totalBuildingPowerWatts} W
              </span>
            </div>
          </div>

          {/* VIVIENDAS CON GRADO DE ELECTRIFICACIÓN ELEVADA */}
          <div className="mt-2 border-2 border-black p-2 text-[9.5px]">
            <div className="text-center font-bold">
              VIVIENDAS CON GRADO DE ELECTRIFICACIÓN ELEVADA (marcar los circuitos que dispone)
            </div>
            <div className="mt-1 space-y-0.5">
              <div>
                [{hasCircuitCode("C6") ? "X" : " "}] <strong>C6</strong> Circuito adicional del tipo C1, por más de 30 puntos de luz
              </div>
              <div>
                [{hasCircuitCode("C7") ? "X" : " "}] <strong>C7</strong> Circuito adicional del tipo C2, por más de 20 tomas de corriente de uso general o si la superficie útil es mayor de 160 m²
              </div>
              <div>
                [{hasCircuitCode("C8") ? "X" : " "}] <strong>C8</strong> Circuito de distribución interna, destinado a la instalación de calefacción eléctrica
              </div>
              <div>
                [{hasCircuitCode("C9") ? "X" : " "}] <strong>C9</strong> Circuito de distribución interna, destinado a la instalación de aire acondicionado
              </div>
              <div>
                [{hasCircuitCode("C10") ? "X" : " "}] <strong>C10</strong> Circuito de distribución interna, destinado a la instalación de una secadora independiente
              </div>
              <div>
                [{hasCircuitCode("C11") ? "X" : " "}] <strong>C11</strong> Circuito destinado a la alimentación del sistema de automatización, gestión técnica de la energía y seguridad
              </div>
              <div>
                [{hasCircuitCode("C12") ? "X" : " "}] <strong>C12</strong> Circuitos adicionales de cualquiera de los tipos C3 o C4, o circuito adicional del tipo C5 cuando exceda de 6 tomas
              </div>
              <div>
                [{hasCircuitCode("C13") ? "X" : " "}] <strong>Otros:</strong>{" "}
                {hasCircuitCode("C13")
                  ? "C13 Circuito adicional para infraestructura de recarga de vehículo eléctrico (ITC-BT-52)"
                  : "__________________________________________________"}
              </div>
            </div>
          </div>

          {/* DETALLE DE RECEPTORES DESTINADOS A OTROS SERVICIOS */}
          <div className="mt-2 border-2 border-black text-[10px]">
            <div className="border-b border-black bg-slate-100 py-1 text-center font-bold">
              DETALLE DE RECEPTORES DESTINADOS A &ldquo;OTROS SERVICIOS&rdquo; Y LOCALES COMERCIALES EN EDIFICIOS DESTINADOS PRINCIPALMENTE A VIVIENDAS (ITC-BT-010 apartado 3)
            </div>
            <div className="grid grid-cols-12 border-b border-black font-bold text-center">
              <div className="col-span-8 border-r border-black py-0.5">
                Descripción del receptor
              </div>
              <div className="col-span-4 py-0.5">Potencia</div>
            </div>
            {meta.otrosServiciosReceptores.slice(0, 6).map((r, i) => (
              <div
                key={i}
                className="grid grid-cols-12 border-b border-black items-center"
              >
                <div className="col-span-8 border-r border-black px-2 py-0.5">
                  {i + 1}){" "}
                  <input
                    type="text"
                    value={r.description}
                    onChange={(e) => {
                      const next = [...meta.otrosServiciosReceptores];
                      next[i] = { ...next[i], description: e.target.value };
                      updateField("otrosServiciosReceptores", next);
                    }}
                    className="w-11/12 bg-transparent focus:outline-none"
                  />
                </div>
                <div className="col-span-4 px-2 py-0.5 flex justify-between font-mono">
                  <input
                    type="number"
                    value={r.powerWatts || ""}
                    onChange={(e) => {
                      const next = [...meta.otrosServiciosReceptores];
                      next[i] = {
                        ...next[i],
                        powerWatts: Number(e.target.value) || 0,
                      };
                      updateField("otrosServiciosReceptores", next);
                    }}
                    className="w-full text-right bg-transparent focus:outline-none"
                  />
                  <span className="ml-1 italic">W</span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-end gap-3 p-1.5">
              <span className="font-bold">POTENCIA TOTAL OTROS SERVICIOS</span>
              <span className="w-32 border border-black px-2 py-0.5 text-right font-mono font-bold">
                {totalOtrosServiciosReceptoresW} W
              </span>
            </div>
          </div>

          <OfficialFooter pageNum={2} />
        </div>
      )}

      {/* =====================================================================
          PÁGINA 3/11: LOCALES COMERCIALES, OFICINAS E INDUSTRIAS (ITC-BT-10 apdo. 4)
         ===================================================================== */}
      {shouldShowPage(3) && (
        <div className="mtd-print-page mx-auto max-w-[210mm] rounded-sm border border-slate-400 bg-white p-6 text-[11px] leading-tight text-black shadow-2xl">
          <OfficialHeader isBtBox={true} />

          {/* Locales comerciales cuando no se conocen receptores */}
          <div className="border-2 border-black p-2">
            <div className="text-center font-bold">
              EDIFICIOS DESTINADOS A LOCALES COMERCIALES U OFICINAS
              <br />
              <span className="text-[10px]">
                (cuando no se conocen receptores) (ITC-BT-010 apartado 4)
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 border border-black text-[10px]">
              <div className="border-r border-black p-1 flex justify-between">
                <span>Nº. de locales</span>
                <strong className="font-mono">
                  {buildingInputs.commercialCount}
                </strong>
              </div>
              <div className="border-r border-black p-1 flex justify-between">
                <span>Superficie útil total</span>
                <strong className="font-mono">
                  {buildingInputs.commercialAreaM2} m²
                </strong>
              </div>
              <div className="p-1 flex justify-between">
                <span>Potencia específica</span>
                <strong className="font-mono">100 W/m²</strong>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-end gap-2">
              <span className="font-bold">POTENCIA TOTAL LOCALES</span>
              <span className="w-36 border border-black px-2 py-0.5 text-right font-mono font-bold">
                {buildingForecast.p3CommercialWatts} W
              </span>
            </div>
          </div>

          {/* Industrias cuando no se conocen receptores */}
          <div className="mt-4 border-2 border-black p-2">
            <div className="text-center font-bold">
              EDIFICIOS DESTINADOS A UNA O VARIAS INDUSTRIAS
              <br />
              <span className="text-[10px]">
                (cuando no se conocen receptores) (ITC-BT-010 apartado 4)
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 border border-black text-[10px]">
              <div className="border-r border-black p-1 flex justify-between">
                <span>Nº. de Industrias</span>
                <input
                  type="number"
                  value={meta.industriasCount}
                  onChange={(e) =>
                    updateField("industriasCount", Number(e.target.value) || 0)
                  }
                  className="w-16 text-right font-mono font-bold"
                />
              </div>
              <div className="border-r border-black p-1 flex justify-between">
                <span>Superficie útil total</span>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={meta.industriasAreaM2}
                    onChange={(e) =>
                      updateField("industriasAreaM2", Number(e.target.value) || 0)
                    }
                    className="w-16 text-right font-mono font-bold"
                  />
                  <span className="ml-1">m²</span>
                </div>
              </div>
              <div className="p-1 flex justify-between">
                <span>Potencia específica</span>
                <strong className="font-mono">125 W/m²</strong>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-end gap-2">
              <span className="font-bold">POTENCIA TOTAL INDUSTRIAS</span>
              <span className="w-36 border border-black px-2 py-0.5 text-right font-mono font-bold">
                {totalIndustriasSinReceptoresW} W
              </span>
            </div>
          </div>

          {/* Cuando se conocen receptores */}
          <div className="mt-4 border-2 border-black text-[10px]">
            <div className="border-b border-black bg-slate-100 py-1 text-center font-bold">
              EDIFICIOS DESTINADOS A LOCALES COMERCIALES, OFICINAS, UNA O VARIAS INDUSTRIAS
              <br />
              (se conocen receptores)
            </div>
            <div className="grid grid-cols-2 border-b border-black font-bold text-center">
              <div className="border-r border-black py-0.5">
                Instalación de alumbrado
              </div>
              <div className="py-0.5">Instalación de fuerza</div>
            </div>
            <div className="grid grid-cols-12 border-b border-black font-semibold text-center">
              <div className="col-span-4 border-r border-black py-0.5">
                Denominación del receptor
              </div>
              <div className="col-span-2 border-r border-black py-0.5">
                Potencia
              </div>
              <div className="col-span-4 border-r border-black py-0.5">
                Denominación del receptor
              </div>
              <div className="col-span-2 py-0.5">Potencia</div>
            </div>

            {Array.from({ length: 9 }).map((_, idx) => {
              const alum = meta.receptoresAlumbrado[idx] || {
                description: "",
                powerWatts: 0,
              };
              const fuer = meta.receptoresFuerza[idx] || {
                description: "",
                powerWatts: 0,
              };
              return (
                <div
                  key={idx}
                  className="grid grid-cols-12 border-b border-black items-center"
                >
                  <div className="col-span-4 border-r border-black px-1.5 py-0.5">
                    {idx + 1}) {alum.description}
                  </div>
                  <div className="col-span-2 border-r border-black px-1.5 py-0.5 text-right font-mono">
                    {alum.powerWatts ? `${alum.powerWatts} W` : "W"}
                  </div>
                  <div className="col-span-4 border-r border-black px-1.5 py-0.5">
                    {idx + 1}) {fuer.description}
                  </div>
                  <div className="col-span-2 px-1.5 py-0.5 text-right font-mono">
                    {fuer.powerWatts ? `${fuer.powerWatts} W` : "W"}
                  </div>
                </div>
              );
            })}

            <div className="grid grid-cols-12 border-b border-black font-bold">
              <div className="col-span-4 border-r border-black px-2 py-1 text-right">
                TOTAL ALUMBRADO
              </div>
              <div className="col-span-2 border-r border-black px-2 py-1 text-right font-mono">
                {totalAlumbradoConocidoW} W
              </div>
              <div className="col-span-4 border-r border-black px-2 py-1 text-right">
                TOTAL FUERZA
              </div>
              <div className="col-span-2 px-2 py-1 text-right font-mono">
                {totalFuerzaConocidoW} W
              </div>
            </div>

            <div className="p-2 flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <span className="font-bold">POTENCIA PREVISTA</span>
                <span className="w-32 border border-black px-2 py-0.5 text-right font-mono font-bold">
                  {Math.max(
                    buildingForecast.p3CommercialWatts,
                    totalAlumbradoConocidoW + totalFuerzaConocidoW
                  )}{" "}
                  W
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">
                  POTENCIA TOTAL FUERZA Y ALUMBRADO
                </span>
                <span className="w-32 border border-black px-2 py-0.5 text-right font-mono font-bold">
                  {totalAlumbradoConocidoW + totalFuerzaConocidoW} W
                </span>
              </div>
            </div>
          </div>

          <OfficialFooter pageNum={3} />
        </div>
      )}

      {/* =====================================================================
          PÁGINA 4/11: ALMACENES (CIRCULAR BT05/04) Y SUMINISTROS SINGULARES
         ===================================================================== */}
      {shouldShowPage(4) && (
        <div className="mtd-print-page mx-auto max-w-[210mm] rounded-sm border border-slate-400 bg-white p-6 text-[11px] leading-tight text-black shadow-2xl">
          <OfficialHeader isBtBox={true} />

          {/* Almacenes sin uso definido */}
          <div className="border-2 border-black p-2">
            <div className="text-center font-bold">
              EDIFICIOS DESTINADOS A ALMACENES SIN USO DEFINIDO
              <br />
              <span className="text-[9.5px] font-normal">
                (se acoge a la Circular BT05/04 sobre las instalaciones eléctricas de Baja Tensión y los Almacenes)
              </span>
            </div>
            <div className="mt-1 grid grid-cols-3 border border-black text-[10px]">
              <div className="border-r border-black p-1 flex justify-between">
                <span>Nº. de Almacenes</span>
                <input
                  type="number"
                  value={meta.almacenesSinUsoCount}
                  onChange={(e) =>
                    updateField(
                      "almacenesSinUsoCount",
                      Number(e.target.value) || 0
                    )
                  }
                  className="w-14 text-right font-mono font-bold"
                />
              </div>
              <div className="border-r border-black p-1 flex justify-between">
                <span>Superficie útil total</span>
                <span className="font-mono">{meta.almacenesSinUsoAreaM2} m²</span>
              </div>
              <div className="p-1 flex justify-between">
                <span>Potencia prevista</span>
                <strong className="font-mono">10.000 W</strong>
              </div>
            </div>
            <div className="mt-1.5 flex justify-end items-center gap-2">
              <span className="font-bold">POTENCIA TOTAL ALMACENES</span>
              <span className="w-32 border border-black px-2 py-0.5 text-right font-mono font-bold">
                {meta.almacenesSinUsoCount * 10000} W
              </span>
            </div>
          </div>

          {/* Almacenes con uso definido */}
          <div className="mt-3 border-2 border-black text-[10px]">
            <div className="border-b border-black bg-slate-100 py-1 text-center font-bold">
              EDIFICIOS DESTINADOS A ALMACENES CON USO DEFINIDO
              <br />
              <span className="text-[9px] font-normal">
                (se acoge a la Circular BT05/04 sobre las instalaciones eléctricas de Baja Tensión y los Almacenes)
              </span>
            </div>
            <div className="grid grid-cols-12 border-b border-black p-1">
              <div className="col-span-8">
                Uso del Almacén: <strong>{meta.almacenesConUsoDestino || "—"}</strong>
              </div>
              <div className="col-span-4 text-right">
                Superficie útil total:{" "}
                <strong>{meta.almacenesConUsoAreaM2} m²</strong>
              </div>
            </div>
            <div className="border-b border-black py-0.5 text-center font-bold">
              RELACIÓN DE RECEPTORES
            </div>
            <div className="grid grid-cols-2 border-b border-black text-center font-semibold">
              <div className="border-r border-black py-0.5">
                Instalación de alumbrado
              </div>
              <div className="py-0.5">Instalación de fuerza</div>
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-12 border-b border-black text-[9.5px]"
              >
                <div className="col-span-4 border-r border-black px-1.5 py-0.5">
                  {i + 1})
                </div>
                <div className="col-span-2 border-r border-black px-1.5 py-0.5 text-right italic">
                  W
                </div>
                <div className="col-span-4 border-r border-black px-1.5 py-0.5">
                  {i + 1})
                </div>
                <div className="col-span-2 px-1.5 py-0.5 text-right italic">
                  W
                </div>
              </div>
            ))}
            <div className="flex justify-end gap-3 p-1.5">
              <span className="font-bold">POTENCIA TOTAL ALMACÉN</span>
              <span className="w-28 border border-black px-2 py-0.5 text-right font-mono font-bold">
                0 W
              </span>
            </div>
          </div>

          {/* Suministros singulares */}
          <div className="mt-3 border-2 border-black text-[10px]">
            <div className="border-b border-black bg-slate-100 py-1 text-center font-bold">
              RELACIÓN DE RECEPTORES DE SUMINISTROS SINGULARES: LUZ DE OBRA, ALUMBRADOS FESTIVOS, BOMBA DE RIEGO, ETC...
            </div>
            <div className="grid grid-cols-2 border-b border-black text-center font-semibold">
              <div className="border-r border-black py-0.5">
                Instalación de alumbrado
              </div>
              <div className="py-0.5">Instalación de fuerza</div>
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-12 border-b border-black text-[9.5px]"
              >
                <div className="col-span-4 border-r border-black px-1.5 py-0.5">
                  {i + 1})
                </div>
                <div className="col-span-2 border-r border-black px-1.5 py-0.5 text-right italic">
                  W
                </div>
                <div className="col-span-4 border-r border-black px-1.5 py-0.5">
                  {i + 1})
                </div>
                <div className="col-span-2 px-1.5 py-0.5 text-right italic">
                  W
                </div>
              </div>
            ))}
            <div className="flex justify-end gap-3 p-1.5">
              <span className="font-bold">
                POTENCIA TOTAL FUERZA Y ALUMBRADO
              </span>
              <span className="w-28 border border-black px-2 py-0.5 text-right font-mono font-bold">
                0 W
              </span>
            </div>
          </div>

          <OfficialFooter pageNum={4} />
        </div>
      )}

      {/* =====================================================================
          PÁGINA 5/11: MEMORIA DESCRIPTIVA
         ===================================================================== */}
      {shouldShowPage(5) && (
        <div className="mtd-print-page mx-auto max-w-[210mm] rounded-sm border border-slate-400 bg-white p-6 text-[11px] leading-tight text-black shadow-2xl">
          <OfficialHeader isBtBox={true} />

          <div className="flex min-h-[215mm] flex-col justify-between border-2 border-black p-3">
            <div className="flex flex-1 flex-col">
              <div className="flex items-center justify-between border-b border-black pb-1">
                <span className="font-bold">MEMORIA DESCRIPTIVA</span>
                <button
                  type="button"
                  onClick={() => updateField("memoriaDescriptivaTexto", "")}
                  className="no-print rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-800 hover:bg-slate-300"
                >
                  Sincronizar con Cálculos Automáticos REBT
                </button>
              </div>
              <textarea
                rows={Math.max(
                  36,
                  effectiveMemoriaTexto.split("\n").length + 14
                )}
                value={effectiveMemoriaTexto}
                onChange={(e) =>
                  updateField("memoriaDescriptivaTexto", e.target.value)
                }
                style={{ fieldSizing: "content" } as React.CSSProperties}
                className="mt-2 w-full flex-1 resize-none overflow-hidden bg-transparent font-serif text-[10.5px] leading-[1.45] text-black focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 text-[10px]">
              <span>
                Se adjuntan hojas complementarias para Memoria Descriptiva
              </span>
              <span className="inline-block h-4 w-4 border border-black text-center font-bold">
                {" "}
              </span>
            </div>
          </div>

          <OfficialFooter pageNum={5} />
        </div>
      )}

      {/* =====================================================================
          PÁGINA 6/11: CUADRO RESUMEN DE CÁLCULO (15 COLUMNAS OFICIALES)
         ===================================================================== */}
      {shouldShowPage(6) && (
        <div className="mtd-print-page mx-auto max-w-[210mm] rounded-sm border border-slate-400 bg-white p-6 text-[10px] leading-tight text-black shadow-2xl">
          <OfficialHeader isBtBox={true} />

          <div className="border-2 border-black">
            <div className="border-b border-black bg-slate-100 py-1 text-center text-xs font-extrabold">
              CUADRO RESUMEN DE CÁLCULO
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[8.5px]">
                <thead>
                  <tr className="border-b border-black bg-slate-50 font-bold text-center">
                    <th className="border-r border-black p-1 text-left w-36">
                      CIRCUITOS
                    </th>
                    <th className="border-r border-black p-1">
                      Potencia de cálculo
                      <br />
                      (W)
                    </th>
                    <th className="border-r border-black p-1">
                      Tensión de cálculo
                      <br />
                      (V)
                    </th>
                    <th className="border-r border-black p-1">
                      Intensidad de cálculo
                      <br />
                      (A)
                    </th>
                    <th className="border-r border-black p-1">
                      Factor de corrección
                    </th>
                    <th className="border-r border-black p-1">
                      Intensidad corregida
                      <br />
                      (A)
                    </th>
                    <th className="border-r border-black p-1">
                      Nº cond. / Sección / Mat.
                      <br />
                      (nº/mm²/Cu/Al)
                    </th>
                    <th className="border-r border-black p-1">
                      Aislamiento / Tensión nom.
                      <br />
                      (V)
                    </th>
                    <th className="border-r border-black p-1">
                      Caída Tensión circuito
                      <br />
                      (%)
                    </th>
                    <th className="border-r border-black p-1">
                      Intensidad máx. adm.
                      <br />
                      (A)
                    </th>
                    <th className="border-r border-black p-1">
                      FUS
                      <br />
                      (A)
                    </th>
                    <th className="border-r border-black p-1">
                      PIA
                      <br />
                      (A)
                    </th>
                    <th className="border-r border-black p-1">
                      Long.
                      <br />
                      (m)
                    </th>
                    <th className="border-r border-black p-1">
                      Caída Tensión acum.
                      <br />
                      (%)
                    </th>
                    <th className="p-1">
                      Intensidad cortocircuito
                      <br />
                      (A)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black font-mono">
                  {/* Fila 1: Acometida general */}
                  <tr>
                    <td className="border-r border-black p-1 font-sans font-bold">
                      Acometida general (nota 1)
                    </td>
                    <td className="border-r border-black p-1 text-right">
                      {buildingForecast.totalBuildingPowerWatts}
                    </td>
                    <td className="border-r border-black p-1 text-center">400</td>
                    <td className="border-r border-black p-1 text-right">
                      {buildingForecast.lgaCalculation.currentIbAmps}
                    </td>
                    <td className="border-r border-black p-1 text-center">1,00</td>
                    <td className="border-r border-black p-1 text-right">
                      {buildingForecast.lgaCalculation.currentIbAmps}
                    </td>
                    <td className="border-r border-black p-1 text-center">
                      3×{meta.acometidaSeccionMm2} {meta.acometidaMaterial}
                    </td>
                    <td className="border-r border-black p-1 text-center">
                      XLPE 0,6/1kV
                    </td>
                    <td className="border-r border-black p-1 text-right">0,25</td>
                    <td className="border-r border-black p-1 text-right">160</td>
                    <td className="border-r border-black p-1 text-center">160</td>
                    <td className="border-r border-black p-1 text-center">—</td>
                    <td className="border-r border-black p-1 text-right">12</td>
                    <td className="border-r border-black p-1 text-right">0,25</td>
                    <td className="p-1 text-right">6.800</td>
                  </tr>

                  {/* Fila 2: Línea General de Alimentación */}
                  <tr>
                    <td className="border-r border-black p-1 font-sans font-bold">
                      Línea General de Alimentación
                    </td>
                    <td className="border-r border-black p-1 text-right">
                      {buildingForecast.lgaCalculation.effectivePowerWatts}
                    </td>
                    <td className="border-r border-black p-1 text-center">
                      {buildingForecast.lgaCalculation.voltage}
                    </td>
                    <td className="border-r border-black p-1 text-right">
                      {buildingForecast.lgaCalculation.currentIbAmps}
                    </td>
                    <td className="border-r border-black p-1 text-center">1,00</td>
                    <td className="border-r border-black p-1 text-right">
                      {buildingForecast.lgaCalculation.correctedCurrentAmps}
                    </td>
                    <td className="border-r border-black p-1 text-center">
                      3×{buildingForecast.lgaCalculation.sectionMm2}+1×
                      {buildingForecast.lgaCalculation.neutralSectionMm2} Cu
                    </td>
                    <td className="border-r border-black p-1 text-center">
                      XLPE 0,6/1kV
                    </td>
                    <td className="border-r border-black p-1 text-right">
                      {buildingForecast.lgaCalculation.voltageDropPct}
                    </td>
                    <td className="border-r border-black p-1 text-right">
                      {buildingForecast.lgaCalculation.ampacityIzAmps}
                    </td>
                    <td className="border-r border-black p-1 text-center">
                      {buildingForecast.igmAmps}
                    </td>
                    <td className="border-r border-black p-1 text-center">
                      {buildingForecast.igmAmps}
                    </td>
                    <td className="border-r border-black p-1 text-right">
                      {buildingForecast.lgaCalculation.lengthMeters}
                    </td>
                    <td className="border-r border-black p-1 text-right">
                      {buildingForecast.lgaCalculation.voltageDropPct}
                    </td>
                    <td className="p-1 text-right">
                      {buildingForecast.lgaCalculation.shortCircuitCurrentAmps}
                    </td>
                  </tr>

                  {/* Fila 3: Derivación Individual */}
                  <tr className="bg-amber-50/40">
                    <td className="border-r border-black p-1 font-sans font-bold">
                      Derivación Individual
                    </td>
                    <td className="border-r border-black p-1 text-right">
                      {cgmpSummary.diCalculation.effectivePowerWatts}
                    </td>
                    <td className="border-r border-black p-1 text-center">
                      {cgmpSummary.diCalculation.voltage}
                    </td>
                    <td className="border-r border-black p-1 text-right">
                      {cgmpSummary.diCalculation.currentIbAmps}
                    </td>
                    <td className="border-r border-black p-1 text-center">1,00</td>
                    <td className="border-r border-black p-1 text-right">
                      {cgmpSummary.diCalculation.correctedCurrentAmps}
                    </td>
                    <td className="border-r border-black p-1 text-center font-bold">
                      {cgmpSummary.diCalculation.conductorsSummary}
                    </td>
                    <td className="border-r border-black p-1 text-center">
                      XLPE 0,6/1kV
                    </td>
                    <td className="border-r border-black p-1 text-right font-bold">
                      {cgmpSummary.diCalculation.voltageDropPct}
                    </td>
                    <td className="border-r border-black p-1 text-right">
                      {cgmpSummary.diCalculation.ampacityIzAmps}
                    </td>
                    <td className="border-r border-black p-1 text-center">63</td>
                    <td className="border-r border-black p-1 text-center font-bold">
                      {cgmpSummary.igaAmps}
                    </td>
                    <td className="border-r border-black p-1 text-right">
                      {cgmpSummary.diCalculation.lengthMeters}
                    </td>
                    <td className="border-r border-black p-1 text-right">
                      {(
                        buildingForecast.lgaCalculation.voltageDropPct +
                        cgmpSummary.diCalculation.voltageDropPct
                      ).toFixed(2)}
                    </td>
                    <td className="p-1 text-right">
                      {cgmpSummary.diCalculation.shortCircuitCurrentAmps}
                    </td>
                  </tr>

                  {/* Filas de cada Circuito Interior (C1..C13 / Alumbrado / Fuerza) */}
                  {calculatedCircuits.map((c, idx) => {
                    const accumDrop = (
                      cgmpSummary.diCalculation.voltageDropPct + c.voltageDropPct
                    ).toFixed(2);
                    return (
                      <tr key={idx}>
                        <td className="border-r border-black p-1 font-sans">
                          <strong>{c.code}</strong> - {c.description.slice(0, 22)}
                        </td>
                        <td className="border-r border-black p-1 text-right">
                          {c.effectivePowerWatts}
                        </td>
                        <td className="border-r border-black p-1 text-center">
                          {c.voltage}
                        </td>
                        <td className="border-r border-black p-1 text-right">
                          {c.currentIbAmps}
                        </td>
                        <td className="border-r border-black p-1 text-center">
                          {c.correctionFactorValue.toFixed(2)}
                        </td>
                        <td className="border-r border-black p-1 text-right">
                          {c.correctedCurrentAmps}
                        </td>
                        <td className="border-r border-black p-1 text-center font-bold">
                          {c.conductorsSummary}
                        </td>
                        <td className="border-r border-black p-1 text-center">
                          {c.insulationSummary}
                        </td>
                        <td className="border-r border-black p-1 text-right font-bold">
                          {c.voltageDropPct}
                        </td>
                        <td className="border-r border-black p-1 text-right">
                          {c.ampacityIzAmps}
                        </td>
                        <td className="border-r border-black p-1 text-center">
                          —
                        </td>
                        <td className="border-r border-black p-1 text-center font-bold">
                          {c.piaAmps}
                        </td>
                        <td className="border-r border-black p-1 text-right">
                          {c.lengthMeters}
                        </td>
                        <td className="border-r border-black p-1 text-right font-bold">
                          {accumDrop}
                        </td>
                        <td className="p-1 text-right">
                          {c.shortCircuitCurrentAmps}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-2 space-y-0.5 text-[8.5px] text-slate-800">
            <p>
              Nota 1: Acometida prevista por la Compañía suministradora, si se conoce.
            </p>
            <p>
              Nota 2: Circuitos principales y derivaciones más significativas por su carga y caída de tensión. Su designación será indicada en el Esquema Unifilar.
            </p>
            <p>
              Nota 3: Derivaciones individuales con mayor caída de tensión a las viviendas tipo según grado de electrificación, y resto de zonas comunes y locales identificando cada una de ellas.
            </p>
          </div>

          <OfficialFooter pageNum={6} />
        </div>
      )}

      {/* =====================================================================
          PÁGINA 7/11: CROQUIS DEL TRAZADO DE LA INSTALACIÓN
         ===================================================================== */}
      {shouldShowPage(7) && (
        <div className="mtd-print-page mx-auto max-w-[210mm] rounded-sm border border-slate-400 bg-white p-6 text-[11px] leading-tight text-black shadow-2xl">
          <OfficialHeader isBtBox={false} />

          <div className="flex min-h-[215mm] flex-col justify-between border-2 border-black p-3">
            <div>
              <div className="font-bold">
                CROQUIS DEL TRAZADO DE LA INSTALACIÓN
              </div>
              <p className="mt-1 text-[9.5px] text-slate-700">
                Representación en planta/alzado del trazado de canalizaciones desde la Caja General de Protección (CGP), Línea General de Alimentación (LGA), Centralización de Contadores, Derivación Individual (DI), Cuadro General de Mando y Protección (CGMP) y red de Puesta a Tierra.
              </p>

              {/* Diagrama SVG Automático del Trazado de la Instalación */}
              <div className="mt-4 flex justify-center">
                <svg
                  viewBox="0 0 700 460"
                  className="w-full max-w-[660px] border border-slate-300 bg-slate-50/40"
                >
                  {/* Contorno Edificio / Planta */}
                  <rect
                    x="30"
                    y="30"
                    width="640"
                    height="350"
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="2"
                  />
                  <line
                    x1="230"
                    y1="30"
                    x2="230"
                    y2="380"
                    stroke="#0f172a"
                    strokeWidth="1.5"
                    strokeDasharray="5,5"
                  />
                  <text x="45" y="52" fontSize="11" fontWeight="bold" fill="#0f172a">
                    ZONA COMÚN / ENLACE (ITC-BT-12 a 16)
                  </text>
                  <text x="250" y="52" fontSize="11" fontWeight="bold" fill="#0f172a">
                    PLANTA INSTALACIÓN INTERIOR ({meta.usoDestino.toUpperCase()})
                  </text>

                  {/* Acometida y CGP */}
                  <rect
                    x="50"
                    y="85"
                    width="140"
                    height="46"
                    fill="#fef3c7"
                    stroke="#000"
                    strokeWidth="1.5"
                  />
                  <text x="60" y="103" fontSize="10" fontWeight="bold">
                    ACOMETIDA + CGP
                  </text>
                  <text x="60" y="118" fontSize="9">
                    {meta.acometidaTipo} · 3×{meta.acometidaSeccionMm2} mm²{" "}
                    {meta.acometidaMaterial}
                  </text>

                  {/* Flecha LGA */}
                  <line
                    x1="120"
                    y1="131"
                    x2="120"
                    y2="185"
                    stroke="#0284c7"
                    strokeWidth="2.5"
                  />
                  <text x="128" y="162" fontSize="9" fontWeight="bold" fill="#0369a1">
                    LGA: 3×{buildingForecast.lgaCalculation.sectionMm2}+1×
                    {buildingForecast.lgaCalculation.neutralSectionMm2} mm² (Ø
                    {buildingForecast.lgaCalculation.tubeDiameterMm}mm)
                  </text>

                  {/* Centralización de Contadores */}
                  <rect
                    x="50"
                    y="185"
                    width="140"
                    height="52"
                    fill="#e0f2fe"
                    stroke="#000"
                    strokeWidth="1.5"
                  />
                  <text x="58" y="204" fontSize="10" fontWeight="bold">
                    CONTADORES + IGM ({buildingForecast.igmAmps} A)
                  </text>
                  <text x="58" y="220" fontSize="9">
                    Nº Contadores: {meta.numContadoresTotal} ud.
                  </text>

                  {/* Derivación Individual hacia CGMP */}
                  <path
                    d="M 190 210 L 290 210 L 290 135"
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="2.5"
                  />
                  <text x="196" y="202" fontSize="9" fontWeight="bold" fill="#b91c1c">
                    D.I.: {cgmpSummary.diCalculation.conductorsSummary} + PE{" "}
                    {cgmpSummary.diCalculation.peSectionMm2} mm² (Ø
                    {cgmpSummary.diCalculation.tubeDiameterMm}mm, L=
                    {cgmpSummary.diCalculation.lengthMeters}m)
                  </text>

                  {/* CGMP */}
                  <rect
                    x="255"
                    y="85"
                    width="155"
                    height="55"
                    fill="#dcfce7"
                    stroke="#000"
                    strokeWidth="2"
                  />
                  <text x="265" y="104" fontSize="10" fontWeight="bold">
                    CUADRO GENERAL (CGMP)
                  </text>
                  <text x="265" y="118" fontSize="9">
                    IGA {cgmpSummary.igaAmps}A · {cgmpSummary.rcd30mACount}×Dif.{" "}
                    {rcdSensitivityMa}mA
                  </text>
                  <text x="265" y="131" fontSize="9">
                    Sobretensiones {meta.sobretensionesKv} kV
                  </text>

                  {/* Ramales de circuitos interiores */}
                  {calculatedCircuits.slice(0, 6).map((c, idx) => {
                    const yPos = 95 + idx * 44;
                    return (
                      <g key={idx}>
                        <line
                          x1="410"
                          y1="112"
                          x2="465"
                          y2={yPos}
                          stroke="#334155"
                          strokeWidth="1.5"
                        />
                        <rect
                          x="465"
                          y={yPos - 14}
                          width="185"
                          height="30"
                          fill="#ffffff"
                          stroke="#0f172a"
                          strokeWidth="1"
                        />
                        <text x="472" y={yPos - 1} fontSize="9" fontWeight="bold">
                          {c.code}: {c.description.slice(0, 24)}
                        </text>
                        <text x="472" y={yPos + 10} fontSize="8.5" fill="#334155">
                          {c.conductorsSummary} + PE {c.peSectionMm2}mm² · Tubo Ø
                          {c.tubeDiameterMm}mm · L={c.lengthMeters}m
                        </text>
                      </g>
                    );
                  })}

                  {/* Puesta a Tierra */}
                  <rect
                    x="50"
                    y="305"
                    width="340"
                    height="55"
                    fill="#f1f5f9"
                    stroke="#000"
                    strokeWidth="1.5"
                  />
                  <text x="62" y="323" fontSize="10" fontWeight="bold">
                    INSTALACIÓN DE PUESTA A TIERRA (ITC-BT-18)
                  </text>
                  <text x="62" y="338" fontSize="9">
                    Electrodos: {meta.electrodosDescripcion}
                  </text>
                  <text x="62" y="351" fontSize="9">
                    Enlace: {meta.conductorTierraMm2} mm² Cu · Rt prevista ={" "}
                    {earthingResult.estimatedResistanceOhm} Ω (≤{" "}
                    {earthingResult.maxAllowedRaOhm} Ω)
                  </text>
                  <line
                    x1="310"
                    y1="140"
                    x2="310"
                    y2="305"
                    stroke="#16a34a"
                    strokeWidth="2"
                    strokeDasharray="4,3"
                  />
                </svg>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 pt-2 text-[10px]">
              <div className="flex items-center gap-2">
                <span>Se adjuntan hojas/planos complementarias para Croquis</span>
                <span className="inline-block h-4 w-4 border border-black"></span>
              </div>
              <div className="flex items-center gap-2">
                <span>Número de hojas/planos adjuntas</span>
                <span className="inline-block h-4 w-4 border border-black text-center">
                  0
                </span>
              </div>
            </div>
          </div>

          <OfficialFooter pageNum={7} />
        </div>
      )}

      {/* =====================================================================
          PÁGINA 8/11: ESQUEMA UNIFILAR DE LA INSTALACIÓN (SIMBOLOGÍA UNE)
         ===================================================================== */}
      {shouldShowPage(8) && (
        <div className="mtd-print-page mx-auto max-w-[210mm] rounded-sm border border-slate-400 bg-white p-6 text-[11px] leading-tight text-black shadow-2xl">
          <OfficialHeader isBtBox={false} />

          <div className="flex min-h-[215mm] flex-col justify-between border-2 border-black p-3">
            <div>
              <div className="font-bold">
                ESQUEMA UNIFILAR DE LA INSTALACIÓN
              </div>
              <p className="mt-0.5 text-[9.5px]">
                <span className="underline">Nota:</span> Se representará la instalación completa, con simbología según normas UNE, indicando las características de los dispositivos de corte y protección, receptores y su potencia, puntos de utilización, sección de los conductores y diámetros de los tubos.
              </p>

              {/* Esquema Unifilar Normalizado UNE Generado Automáticamente en SVG */}
              <div className="mt-4 flex justify-center">
                <svg
                  viewBox="0 0 740 520"
                  className="w-full border border-slate-300 bg-white"
                >
                  {/* Contador + Fusible + DI */}
                  <rect
                    x="310"
                    y="12"
                    width="120"
                    height="34"
                    fill="#f8fafc"
                    stroke="#000"
                    strokeWidth="1.5"
                  />
                  <text x="322" y="27" fontSize="9.5" fontWeight="bold">
                    CONTADOR kWh + FUS 63A
                  </text>
                  <text x="322" y="39" fontSize="8.5">
                    D.I.: {cgmpSummary.diCalculation.conductorsSummary}+PE{" "}
                    {cgmpSummary.diCalculation.peSectionMm2}mm² (Ø
                    {cgmpSummary.diCalculation.tubeDiameterMm}mm)
                  </text>

                  <line
                    x1="370"
                    y1="46"
                    x2="370"
                    y2="82"
                    stroke="#000"
                    strokeWidth="2"
                  />

                  {/* IGA + Sobretensiones */}
                  <rect
                    x="275"
                    y="82"
                    width="190"
                    height="42"
                    fill="#fef3c7"
                    stroke="#000"
                    strokeWidth="1.8"
                  />
                  <text x="285" y="99" fontSize="10" fontWeight="bold">
                    I.G.A. {supplyType === "trifasico_400v" ? "4P" : "2P"}{" "}
                    {cgmpSummary.igaAmps} A (PdC 4,5 kA)
                  </text>
                  <text x="285" y="114" fontSize="8.5">
                    + Protector Sobretensiones Cat. {meta.sobretensionesKv} kV
                  </text>

                  <line
                    x1="370"
                    y1="124"
                    x2="370"
                    y2="155"
                    stroke="#000"
                    strokeWidth="2"
                  />

                  {/* Embarrado de Interruptores Diferenciales (30 mA) */}
                  <line
                    x1="140"
                    y1="155"
                    x2="600"
                    y2="155"
                    stroke="#000"
                    strokeWidth="2.5"
                  />
                  {Array.from({ length: cgmpSummary.rcd30mACount }).map(
                    (_, rcdIdx) => {
                      const xPos =
                        cgmpSummary.rcd30mACount === 1
                          ? 370
                          : 190 +
                            rcdIdx *
                              (360 / Math.max(1, cgmpSummary.rcd30mACount - 1));
                      return (
                        <g key={rcdIdx}>
                          <line
                            x1={xPos}
                            y1="155"
                            x2={xPos}
                            y2="175"
                            stroke="#000"
                            strokeWidth="1.8"
                          />
                          <rect
                            x={xPos - 75}
                            y="175"
                            width="150"
                            height="34"
                            fill="#e0f2fe"
                            stroke="#000"
                            strokeWidth="1.5"
                          />
                          <text
                            x={xPos - 66}
                            y="190"
                            fontSize="9"
                            fontWeight="bold"
                          >
                            ID-{rcdIdx + 1}: Dif.{" "}
                            {supplyType === "trifasico_400v" ? "4P" : "2P"}{" "}
                            {meta.diferencialCalibreAmps}A / {rcdSensitivityMa}mA
                          </text>
                          <text x={xPos - 66} y="202" fontSize="8">
                            Clase {meta.diferencialClase} (máx. 5 circuitos)
                          </text>
                          <line
                            x1={xPos}
                            y1="209"
                            x2={xPos}
                            y2="235"
                            stroke="#000"
                            strokeWidth="1.8"
                          />
                        </g>
                      );
                    }
                  )}

                  {/* Barra colectora de PIAs de salida */}
                  <line
                    x1="45"
                    y1="235"
                    x2="695"
                    y2="235"
                    stroke="#000"
                    strokeWidth="2.5"
                  />

                  {/* Columnas verticales por cada circuito calculado */}
                  {calculatedCircuits.slice(0, 8).map((c, idx) => {
                    const count = Math.min(8, calculatedCircuits.length);
                    const step = 640 / Math.max(1, count);
                    const cx = 55 + idx * step + step / 2 - 20;

                    return (
                      <g key={idx}>
                        {/* Bajante desde barra a PIA */}
                        <line
                          x1={cx}
                          y1="235"
                          x2={cx}
                          y2="265"
                          stroke="#000"
                          strokeWidth="1.5"
                        />
                        {/* Símbolo PIA UNE */}
                        <line
                          x1={cx}
                          y1="265"
                          x2={cx - 8}
                          y2="288"
                          stroke="#000"
                          strokeWidth="2"
                        />
                        <circle cx={cx} cy="265" r="2.5" fill="#000" />
                        <circle cx={cx} cy="292" r="2.5" fill="#000" />
                        <rect
                          x={cx + 5}
                          y="266"
                          width="46"
                          height="24"
                          fill="#fff"
                          stroke="#000"
                          strokeWidth="1"
                        />
                        <text x={cx + 8} y="277" fontSize="8" fontWeight="bold">
                          PIA {c.piaAmps}A
                        </text>
                        <text x={cx + 8} y="287" fontSize="7.5">
                          {c.phaseSystem === "trifasico" ? "IV" : "I+N"} C
                        </text>

                        {/* Línea del circuito con trazos de conductores */}
                        <line
                          x1={cx}
                          y1="292"
                          x2={cx}
                          y2="385"
                          stroke="#000"
                          strokeWidth="1.5"
                        />
                        <line
                          x1={cx - 6}
                          y1="330"
                          x2={cx + 6}
                          y2="320"
                          stroke="#000"
                          strokeWidth="1.2"
                        />

                        {/* Etiqueta de sección y tubo */}
                        <text
                          x={cx + 6}
                          y="322"
                          fontSize="7.5"
                          fontWeight="bold"
                          fill="#0f172a"
                        >
                          {c.conductorsSummary}
                        </text>
                        <text x={cx + 6} y="333" fontSize="7.5" fill="#0f172a">
                          +PE {c.peSectionMm2}mm²
                        </text>
                        <text x={cx + 6} y="344" fontSize="7.5" fill="#0369a1">
                          Tubo Ø{c.tubeDiameterMm}mm
                        </text>
                        <text x={cx + 6} y="355" fontSize="7.5" fill="#475569">
                          L={c.lengthMeters}m ({c.voltageDropPct}%)
                        </text>

                        {/* Caja de receptor al pie */}
                        <rect
                          x={cx - 34}
                          y="385"
                          width="76"
                          height="66"
                          fill="#f8fafc"
                          stroke="#000"
                          strokeWidth="1.2"
                        />
                        <text
                          x={cx - 29}
                          y="400"
                          fontSize="9"
                          fontWeight="bold"
                        >
                          {c.code}
                        </text>
                        <text x={cx - 29} y="413" fontSize="7.5">
                          {c.description.slice(0, 14)}
                        </text>
                        <text x={cx - 29} y="424" fontSize="7.5">
                          {c.description.slice(14, 28)}
                        </text>
                        <text
                          x={cx - 29}
                          y="438"
                          fontSize="8"
                          fontWeight="bold"
                        >
                          P = {c.powerWatts} W
                        </text>
                        <text x={cx - 29} y="448" fontSize="7.5">
                          Ib = {c.currentIbAmps} A
                        </text>
                      </g>
                    );
                  })}

                  {/* Barra Colectora de Puesta a Tierra */}
                  <line
                    x1="45"
                    y1="485"
                    x2="695"
                    y2="485"
                    stroke="#15803d"
                    strokeWidth="2"
                    strokeDasharray="6,3"
                  />
                  <text
                    x="55"
                    y="502"
                    fontSize="9"
                    fontWeight="bold"
                    fill="#166534"
                  >
                    BORNE PRINCIPAL DE TIERRA · Electrodo:{" "}
                    {meta.electrodosDescripcion} · Conductor Tierra:{" "}
                    {meta.conductorTierraMm2} mm² Cu · Rt ={" "}
                    {earthingResult.estimatedResistanceOhm} Ω
                  </text>
                </svg>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 text-[10px]">
              <span>
                Se adjuntan hojas complementarias de Esquema Unifilar
              </span>
              <span className="inline-block h-4 w-4 border border-black"></span>
            </div>
          </div>

          <OfficialFooter pageNum={8} />
        </div>
      )}

      {/* =====================================================================
          PÁGINA 9/11: CROQUIS DE SITUACIÓN, FACHADA GOOGLE Y COORDENADAS
         ===================================================================== */}
      {shouldShowPage(9) && (
        <div onPaste={handlePasteFacadeClipboard} className="space-y-4">
          {/* Panel interactivo (no se imprime en PDF) para cargar fachada de Google y coordenadas */}
          <div className="no-print mx-auto max-w-[210mm] rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-xs shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Camera className="h-4 w-4 text-[#0f6cbd]" />
                  Hoja 9/11 · Fotografía de Fachada (Google Street View) e Ilustración de Coordenadas
                </h4>
                <p className="text-[11px] text-slate-600">
                  Obtén las coordenadas de la dirección, abre la fachada en Google Street View y sube o pega (<kbd className="rounded border border-slate-300 bg-white px-1 font-mono">Ctrl+V</kbd>) la captura de la fachada para ilustrar el punto exacto de las coordenadas y la CGP.
                </p>
              </div>
              <input
                ref={fachadaFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) compressAndSaveFacadeImage(f);
                  e.target.value = "";
                }}
              />
            </div>

            {/* Botonera rápida de georreferenciación y Street View */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleGeocodeAddress}
                disabled={isGeocoding}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f6cbd] px-3.5 py-2 font-semibold text-white hover:bg-[#115ea3] disabled:opacity-60"
              >
                <MapPin className="h-3.5 w-3.5" />
                {isGeocoding ? "Localizando..." : "1. Obtener Coordenadas de Dirección"}
              </button>

              <button
                type="button"
                onClick={handleUseDeviceGps}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Navigation className="h-3.5 w-3.5 text-emerald-600" />
                Usar mi GPS actual
              </button>

              <button
                type="button"
                onClick={openGoogleStreetViewFacade}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 font-semibold text-amber-950 hover:bg-amber-100"
              >
                <ExternalLink className="h-3.5 w-3.5 text-amber-700" />
                2. Abrir Fachada en Google Street View
              </button>

              <button
                type="button"
                onClick={() => fachadaFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 font-semibold text-white hover:bg-emerald-700"
              >
                <Upload className="h-3.5 w-3.5" />
                3. Subir Foto de Fachada / Google
              </button>

              {meta.fachadaFotoDataUrl && (
                <button
                  type="button"
                  onClick={() => {
                    updateField("fachadaFotoDataUrl", "");
                    setGeoFeedback("🗑️ Fotografía de fachada retirada de la Hoja 9/11.");
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-rose-300 bg-white px-3 py-2 font-semibold text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Quitar foto
                </button>
              )}
            </div>

            {/* Campos de Coordenadas Lat/Lon, UTM, Catastro y URL directa */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4 rounded-xl border border-blue-200 bg-white p-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600">
                  Latitud WGS84
                </label>
                <input
                  type="text"
                  placeholder="Ej: 28.458912"
                  value={meta.coordenadasLat || ""}
                  onChange={(e) =>
                    applyLatLonWithUtm(e.target.value, meta.coordenadasLng || "")
                  }
                  className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600">
                  Longitud WGS84
                </label>
                <input
                  type="text"
                  placeholder="Ej: -16.254610"
                  value={meta.coordenadasLng || ""}
                  onChange={(e) =>
                    applyLatLonWithUtm(meta.coordenadasLat || "", e.target.value)
                  }
                  className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600">
                  Coordenadas UTM (REGCAN95 / ETRS89)
                </label>
                <input
                  type="text"
                  placeholder="Ej: 28R X:377145 Y:3148920"
                  value={meta.coordenadasUtm || ""}
                  onChange={(e) => updateField("coordenadasUtm", e.target.value)}
                  className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600">
                  Referencia Catastral (20 díg.)
                </label>
                <input
                  type="text"
                  placeholder="Ej: 9402801CS7490S0001WX"
                  value={meta.referenciaCatastral || ""}
                  onChange={(e) =>
                    updateField("referenciaCatastral", e.target.value.toUpperCase())
                  }
                  className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 font-mono text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-600">
                  Etiqueta del Punto de Suministro en Fachada
                </label>
                <input
                  type="text"
                  value={meta.fachadaNotaPuntoSuministro || ""}
                  onChange={(e) =>
                    updateField("fachadaNotaPuntoSuministro", e.target.value)
                  }
                  placeholder="CGP / Punto de Suministro en fachada principal"
                  className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-600">
                  O pegar URL de imagen / Google Street View Static API
                </label>
                <div className="mt-0.5 flex gap-1.5">
                  <input
                    type="url"
                    value={streetViewUrlInput}
                    onChange={(e) => setStreetViewUrlInput(e.target.value)}
                    placeholder="https://maps.googleapis.com/maps/api/streetview?..."
                    className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = streetViewUrlInput.trim();
                      if (!trimmed) return;
                      updateField("fachadaFotoDataUrl", trimmed);
                      setGeoFeedback("✅ Imagen de fachada cargada desde URL de Google.");
                    }}
                    className="rounded bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-900"
                  >
                    Cargar URL
                  </button>
                </div>
              </div>
            </div>

            {geoFeedback && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-950">
                {geoFeedback}
              </div>
            )}
          </div>

          {/* HOJA OFICIAL IMPRIMIBLE 9/11 */}
          <div className="mtd-print-page mx-auto max-w-[210mm] rounded-sm border border-slate-400 bg-white p-6 text-[11px] leading-tight text-black shadow-2xl">
            <OfficialHeader isBtBox={false} />

            <div className="flex min-h-[215mm] flex-col justify-between border-2 border-black p-3">
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2 border-b border-black pb-1.5">
                  <div>
                    <div className="font-bold">
                      CROQUIS DE SITUACIÓN, EMPLAZAMIENTO Y FACHADA GEORREFERENCIADA
                    </div>
                    <p className="mt-0.5 text-[9px]">
                      <span className="underline">Nota:</span> incorpora referencias geográficas nítidas, coordenadas del punto de conexión y vista de fachada del emplazamiento.
                    </p>
                  </div>
                  <span className="border border-black bg-slate-100 px-2 py-0.5 font-mono text-[9px] font-bold">
                    {meta.coordenadasUtm
                      ? `UTM: ${meta.coordenadasUtm}`
                      : "WGS84 / REGCAN95"}
                  </span>
                </div>

                {/* Tabla técnica de Coordenadas y Emplazamiento (100% editable manualmente en hoja) */}
                <table className="w-full border-collapse border border-black text-[9.5px]">
                  <tbody>
                    <tr>
                      <td className="border border-black bg-slate-100 px-2 py-1 font-bold w-[22%]">
                        DIRECCIÓN EMPLAZAMIENTO:
                      </td>
                      <td className="border border-black px-2 py-1 font-semibold" colSpan={3}>
                        <div className="flex flex-wrap items-center gap-1">
                          <span>C/</span>
                          <input
                            type="text"
                            value={meta.direccionCalle}
                            onChange={(e) => updateField("direccionCalle", e.target.value)}
                            placeholder="Nombre de vía / calle"
                            className="min-w-[130px] flex-1 border-b border-dashed border-slate-300 bg-transparent px-1 py-0.5 font-semibold outline-none focus:bg-amber-50 print:border-0"
                          />
                          <span>, Nº</span>
                          <input
                            type="text"
                            value={meta.direccionNum}
                            onChange={(e) => updateField("direccionNum", e.target.value)}
                            placeholder="S/N"
                            className="w-12 border-b border-dashed border-slate-300 bg-transparent px-1 py-0.5 text-center font-semibold outline-none focus:bg-amber-50 print:border-0"
                          />
                          <span>,</span>
                          <input
                            type="text"
                            value={meta.portalPlanta}
                            onChange={(e) => updateField("portalPlanta", e.target.value)}
                            placeholder="Local / Planta"
                            className="w-24 border-b border-dashed border-slate-300 bg-transparent px-1 py-0.5 font-semibold outline-none focus:bg-amber-50 print:border-0"
                          />
                          <span>· C.P.</span>
                          <input
                            type="text"
                            value={meta.codigoPostal}
                            onChange={(e) => updateField("codigoPostal", e.target.value)}
                            placeholder="38000"
                            className="w-14 border-b border-dashed border-slate-300 bg-transparent px-1 py-0.5 text-center font-mono font-semibold outline-none focus:bg-amber-50 print:border-0"
                          />
                          <span>— T.M.</span>
                          <input
                            type="text"
                            value={meta.terminoMunicipal}
                            onChange={(e) => updateField("terminoMunicipal", e.target.value)}
                            placeholder="Municipio"
                            className="min-w-[105px] flex-1 border-b border-dashed border-slate-300 bg-transparent px-1 py-0.5 font-semibold outline-none focus:bg-amber-50 print:border-0"
                          />
                          <span>(Isla/Prov.:</span>
                          <input
                            type="text"
                            value={meta.isla}
                            onChange={(e) => updateField("isla", e.target.value)}
                            placeholder="Isla / Provincia"
                            className="w-24 border-b border-dashed border-slate-300 bg-transparent px-1 py-0.5 font-semibold outline-none focus:bg-amber-50 print:border-0"
                          />
                          <span>)</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black bg-slate-100 px-2 py-1 font-bold">
                        COORD. WGS84 (LAT / LON):
                      </td>
                      <td className="border border-black px-2 py-1 font-mono font-bold">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={meta.coordenadasLat || ""}
                            onChange={(e) =>
                              applyLatLonWithUtm(
                                e.target.value,
                                meta.coordenadasLng || ""
                              )
                            }
                            placeholder="Latitud"
                            className="w-[46%] border-b border-dashed border-slate-300 bg-transparent px-1 py-0.5 font-mono font-bold outline-none focus:bg-amber-50 print:border-0"
                          />
                          <span>°,</span>
                          <input
                            type="text"
                            value={meta.coordenadasLng || ""}
                            onChange={(e) =>
                              applyLatLonWithUtm(
                                meta.coordenadasLat || "",
                                e.target.value
                              )
                            }
                            placeholder="Longitud"
                            className="w-[46%] border-b border-dashed border-slate-300 bg-transparent px-1 py-0.5 font-mono font-bold outline-none focus:bg-amber-50 print:border-0"
                          />
                          <span>°</span>
                        </div>
                      </td>
                      <td className="border border-black bg-slate-100 px-2 py-1 font-bold w-[20%]">
                        COORDENADAS UTM:
                      </td>
                      <td className="border border-black px-2 py-1 font-mono font-bold">
                        <input
                          type="text"
                          value={meta.coordenadasUtm || ""}
                          onChange={(e) =>
                            updateField("coordenadasUtm", e.target.value)
                          }
                          placeholder="Huso 28R / 30T · X / Y"
                          className="w-full border-b border-dashed border-slate-300 bg-transparent px-1 py-0.5 font-mono font-bold outline-none focus:bg-amber-50 print:border-0"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black bg-slate-100 px-2 py-1 font-bold">
                        REFERENCIA CATASTRAL:
                      </td>
                      <td className="border border-black px-2 py-1 font-mono">
                        <input
                          type="text"
                          value={meta.referenciaCatastral || ""}
                          onChange={(e) =>
                            updateField(
                              "referenciaCatastral",
                              e.target.value.toUpperCase()
                            )
                          }
                          placeholder="Referencia Catastral (20 díg.)"
                          className="w-full border-b border-dashed border-slate-300 bg-transparent px-1 py-0.5 font-mono outline-none focus:bg-amber-50 print:border-0"
                        />
                      </td>
                      <td className="border border-black bg-slate-100 px-2 py-1 font-bold">
                        PUNTO DE SUMINISTRO:
                      </td>
                      <td className="border border-black px-2 py-1 font-semibold">
                        <input
                          type="text"
                          value={meta.fachadaNotaPuntoSuministro || ""}
                          onChange={(e) =>
                            updateField(
                              "fachadaNotaPuntoSuministro",
                              e.target.value
                            )
                          }
                          placeholder="CGP / Punto de Suministro en fachada principal"
                          className="w-full border-b border-dashed border-slate-300 bg-transparent px-1 py-0.5 font-semibold outline-none focus:bg-amber-50 print:border-0"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* BLOQUE 1: PLANO DE SITUACIÓN (GOOGLE MAPS SATÉLITE + CROQUIS PARCELARIO EDITABLE MANUALMENTE) */}
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  {/* Mapa Google Maps Satélite / Callejero de las Coordenadas */}
                  <div className="border border-black bg-slate-50 flex flex-col">
                    <div className="border-b border-black bg-slate-100 px-2 py-1 text-[9px] font-bold flex items-center justify-between gap-1">
                      <span>1A. PLANO DE LOCALIZACIÓN GOOGLE MAPS</span>
                      <span className="font-mono text-[8.5px] truncate">
                        {meta.coordenadasLat && meta.coordenadasLng
                          ? `${meta.coordenadasLat}, ${meta.coordenadasLng}`
                          : meta.terminoMunicipal}
                      </span>
                    </div>
                    <div className="no-print border-b border-slate-200 bg-white px-2 py-1 flex items-center gap-1.5 text-[9px]">
                      <span className="font-semibold text-slate-600 whitespace-nowrap">
                        Ubicación mapa:
                      </span>
                      <input
                        type="text"
                        value={meta.croquisMapaQuery || ""}
                        onChange={(e) =>
                          updateField("croquisMapaQuery", e.target.value)
                        }
                        placeholder="Automático (coordenadas/dirección) o escribe dirección manual..."
                        className="w-full rounded border border-slate-200 px-1.5 py-0.5 text-[9.5px] outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="relative min-h-[205px] flex-1 w-full overflow-hidden bg-slate-100">
                      <iframe
                        title="Plano Google Maps Emplazamiento"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(
                          googleMapsEmbedQuery
                        )}&t=h&z=19&output=embed`}
                        className="h-full min-h-[205px] w-full border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  </div>

                  {/* Croquis Esquemático Vectorial Oficial con Edición Manual Completa */}
                  <div className="border border-black bg-white flex flex-col">
                    <div className="border-b border-black bg-slate-100 px-2 py-1 text-[9px] font-bold flex items-center justify-between gap-1">
                      <span>1B. CROQUIS PARCELARIO Y PUNTO DE ACOMETIDA</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsCroquisManualOpen((v) => !v)}
                          className={`no-print inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[8.5px] font-bold transition ${
                            isCroquisManualOpen
                              ? "bg-[#0f6cbd] text-white"
                              : "border border-slate-400 bg-white text-slate-800 hover:bg-slate-200"
                          }`}
                        >
                          <Pencil className="h-2.5 w-2.5" />
                          {isCroquisManualOpen
                            ? "Edición manual activa"
                            : "Edición manual"}
                        </button>
                        <span>ESCALA S/E · NORTE ↑</span>
                      </div>
                    </div>

                    {/* Barra de herramientas interactivas sobre el Croquis 1B (oculta al imprimir) */}
                    {isCroquisManualOpen && (
                      <div className="no-print border-b border-slate-200 bg-amber-50/70 px-2 py-1.5 space-y-1.5 text-[9px]">
                        <input
                          ref={croquisFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) compressAndSaveCroquisImage(f);
                            e.target.value = "";
                          }}
                        />
                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setCroquisTool("cgp")}
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-bold ${
                              croquisTool === "cgp"
                                ? "bg-rose-600 text-white"
                                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                            }`}
                            title="Haz clic en el croquis para colocar la diana de CGP / Punto de Suministro"
                          >
                            <Crosshair className="h-2.5 w-2.5" />
                            Situar CGP
                          </button>
                          <button
                            type="button"
                            onClick={() => setCroquisTool("red")}
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-bold ${
                              croquisTool === "red"
                                ? "bg-emerald-700 text-white"
                                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                            }`}
                            title="Haz clic en el croquis para situar la arqueta/apoyo de Red B.T. de acometida"
                          >
                            <Zap className="h-2.5 w-2.5" />
                            Origen Red B.T.
                          </button>
                          <button
                            type="button"
                            onClick={() => setCroquisTool("parcela")}
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-bold ${
                              croquisTool === "parcela"
                                ? "bg-amber-600 text-white"
                                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                            }`}
                            title="Haz clic en el croquis para mover el recuadro amarillo de la parcela"
                          >
                            <Move className="h-2.5 w-2.5" />
                            Mover Parcela
                          </button>
                          <button
                            type="button"
                            onClick={() => setCroquisTool("draw")}
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-bold ${
                              croquisTool === "draw"
                                ? "bg-slate-900 text-white"
                                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                            }`}
                            title="Arrastra sobre el croquis para dibujar calles, líneas o canalizaciones"
                          >
                            <Pencil className="h-2.5 w-2.5" />
                            Dibujar
                          </button>
                          <button
                            type="button"
                            onClick={() => setCroquisTool("label")}
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-bold ${
                              croquisTool === "label"
                                ? "bg-indigo-600 text-white"
                                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                            }`}
                            title="Escribe una etiqueta y haz clic en el croquis para añadirla"
                          >
                            <Type className="h-2.5 w-2.5" />
                            Texto
                          </button>
                          <button
                            type="button"
                            onClick={() => croquisFileInputRef.current?.click()}
                            className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-1.5 py-0.5 font-semibold text-slate-700 hover:bg-slate-100"
                            title="Subir plano de Catastro o croquis propio como fondo de 1B"
                          >
                            <Upload className="h-2.5 w-2.5" />
                            Fondo Catastro
                          </button>
                          {meta.croquisImagenDataUrl && (
                            <button
                              type="button"
                              onClick={() => updateField("croquisImagenDataUrl", "")}
                              className="rounded border border-rose-300 bg-white px-1.5 py-0.5 font-semibold text-rose-700 hover:bg-rose-50"
                            >
                              Quitar fondo
                            </button>
                          )}
                          {croquisItems.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                saveCroquisItems(croquisItems.slice(0, -1))
                              }
                              className="inline-flex items-center gap-0.5 rounded border border-slate-300 bg-white px-1.5 py-0.5 font-semibold text-slate-700 hover:bg-slate-100"
                              title="Deshacer último trazo o etiqueta"
                            >
                              <RotateCcw className="h-2.5 w-2.5" />
                              Deshacer
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setMeta((prev) => ({
                                ...prev,
                                croquisParcelaX: 345,
                                croquisParcelaY: 218,
                                croquisPinX: 430,
                                croquisPinY: 218,
                                croquisRedX: 295,
                                croquisRedY: 185,
                                croquisNorteGrados: 0,
                                croquisDibujoJson: "[]",
                              }));
                            }}
                            className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-slate-600 hover:bg-slate-100"
                            title="Restablecer posiciones y limpiar trazos manuales"
                          >
                            Reiniciar
                          </button>
                        </div>

                        {croquisTool === "label" && (
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-indigo-800">
                              Etiqueta a colocar al hacer clic:
                            </span>
                            <input
                              type="text"
                              value={croquisLabelDraft}
                              onChange={(e) => setCroquisLabelDraft(e.target.value)}
                              placeholder="Ej: Arqueta Endesa / C.T. / Nº 40"
                              className="flex-1 rounded border border-indigo-300 bg-white px-1.5 py-0.5 text-[9.5px] outline-none"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex-1 flex items-center justify-center p-1">
                      {(() => {
                        const parcelaX = meta.croquisParcelaX ?? 345;
                        const parcelaY = meta.croquisParcelaY ?? 218;
                        const pinX = meta.croquisPinX ?? 430;
                        const pinY = meta.croquisPinY ?? 218;
                        const redX = meta.croquisRedX ?? 295;
                        const redY = meta.croquisRedY ?? 185;
                        const showAcometida =
                          meta.croquisMostrarAcometida !== false;
                        const norteDeg = meta.croquisNorteGrados ?? 0;
                        const [notaLine1, notaLine2] = splitParcelNoteLines(
                          meta.fachadaNotaPuntoSuministro || "CGP en fachada"
                        );
                        const mainStreetText = meta.croquisCallePrincipal?.trim()
                          ? meta.croquisCallePrincipal.trim().toUpperCase()
                          : meta.direccionCalle?.trim()
                            ? `C/ ${meta.direccionCalle.trim().toUpperCase()}${
                                meta.terminoMunicipal?.trim()
                                  ? ` — ${meta.terminoMunicipal.trim().toUpperCase()}`
                                  : ""
                              }`
                            : meta.terminoMunicipal?.trim()
                              ? `VÍA PÚBLICA — ${meta.terminoMunicipal.trim().toUpperCase()}`
                              : "VÍA PÚBLICA PRINCIPAL";
                        const parcelSubText = meta.croquisParcelaSubtitulo?.trim()
                          ? meta.croquisParcelaSubtitulo.trim()
                          : `Nº ${meta.direccionNum || "S/N"} ${meta.portalPlanta || ""} · ${meta.superficieUtilM2} m²`
                              .replace(/\s+/g, " ")
                              .trim();

                        return (
                          <svg
                            viewBox="0 0 680 385"
                            onPointerDown={(e) => {
                              if (croquisTool === "draw") {
                                e.currentTarget.setPointerCapture(e.pointerId);
                                const pt = getCroquisSvgPoint(e);
                                setActiveStroke([pt]);
                              }
                            }}
                            onPointerMove={(e) => {
                              if (croquisTool === "draw" && activeStroke) {
                                const pt = getCroquisSvgPoint(e);
                                const last =
                                  activeStroke[activeStroke.length - 1];
                                if (
                                  !last ||
                                  Math.hypot(pt.x - last.x, pt.y - last.y) >= 4
                                ) {
                                  setActiveStroke([...activeStroke, pt]);
                                }
                              }
                            }}
                            onPointerUp={() => {
                              if (
                                croquisTool === "draw" &&
                                activeStroke &&
                                activeStroke.length >= 2
                              ) {
                                saveCroquisItems([
                                  ...croquisItems,
                                  {
                                    id: `st-${Date.now()}`,
                                    kind: "stroke",
                                    points: activeStroke,
                                    color: "#0f172a",
                                  },
                                ]);
                              }
                              setActiveStroke(null);
                            }}
                            onClick={(e) => {
                              if (croquisTool === "draw") return;
                              const { x, y } = getCroquisSvgPoint(e);
                              if (croquisTool === "cgp") {
                                setMeta((prev) => ({
                                  ...prev,
                                  croquisPinX: x,
                                  croquisPinY: y,
                                }));
                              } else if (croquisTool === "red") {
                                setMeta((prev) => ({
                                  ...prev,
                                  croquisRedX: x,
                                  croquisRedY: y,
                                  croquisMostrarAcometida: true,
                                }));
                              } else if (croquisTool === "parcela") {
                                setMeta((prev) => ({
                                  ...prev,
                                  croquisParcelaX: Math.max(
                                    12,
                                    Math.min(492, x - 87)
                                  ),
                                  croquisParcelaY: Math.max(
                                    12,
                                    Math.min(268, y - 52)
                                  ),
                                }));
                              } else if (croquisTool === "label") {
                                const txt = croquisLabelDraft.trim();
                                if (txt) {
                                  saveCroquisItems([
                                    ...croquisItems,
                                    {
                                      id: `lb-${Date.now()}`,
                                      kind: "label",
                                      x,
                                      y,
                                      text: txt,
                                      color: "#0f172a",
                                    },
                                  ]);
                                }
                              }
                            }}
                            className="h-[197px] w-full cursor-crosshair select-none bg-slate-50 touch-none"
                          >
                            <defs>
                              <clipPath id="croquis-parcela-clip">
                                <rect
                                  x={parcelaX + 3}
                                  y={parcelaY + 3}
                                  width="169"
                                  height="99"
                                  rx="2"
                                />
                              </clipPath>
                            </defs>

                            {meta.croquisImagenDataUrl ? (
                              <image
                                href={meta.croquisImagenDataUrl}
                                x="0"
                                y="0"
                                width="680"
                                height="385"
                                preserveAspectRatio="xMidYMid slice"
                              />
                            ) : (
                              <>
                                <rect
                                  x="30"
                                  y="28"
                                  width="230"
                                  height="120"
                                  fill="#e2e8f0"
                                  stroke="#475569"
                                  strokeWidth="1.5"
                                />
                                {meta.croquisRefNoroeste?.trim() && (
                                  <text
                                    x="145"
                                    y="92"
                                    textAnchor="middle"
                                    fontSize="10.5"
                                    fontWeight="600"
                                    fill="#334155"
                                  >
                                    {meta.croquisRefNoroeste.trim()}
                                  </text>
                                )}

                                <rect
                                  x="330"
                                  y="28"
                                  width="310"
                                  height="120"
                                  fill="#e2e8f0"
                                  stroke="#475569"
                                  strokeWidth="1.5"
                                />
                                {meta.croquisRefNoreste?.trim() && (
                                  <text
                                    x="460"
                                    y="92"
                                    textAnchor="middle"
                                    fontSize="10.5"
                                    fontWeight="600"
                                    fill="#334155"
                                  >
                                    {meta.croquisRefNoreste.trim()}
                                  </text>
                                )}

                                <rect
                                  x="30"
                                  y="218"
                                  width="230"
                                  height="135"
                                  fill="#e2e8f0"
                                  stroke="#475569"
                                  strokeWidth="1.5"
                                />
                                {meta.croquisRefSuroeste?.trim() && (
                                  <text
                                    x="145"
                                    y="290"
                                    textAnchor="middle"
                                    fontSize="10.5"
                                    fontWeight="600"
                                    fill="#334155"
                                  >
                                    {meta.croquisRefSuroeste.trim()}
                                  </text>
                                )}

                                <rect
                                  x="330"
                                  y="218"
                                  width="310"
                                  height="135"
                                  fill="#e2e8f0"
                                  stroke="#475569"
                                  strokeWidth="1.5"
                                />
                              </>
                            )}

                            {/* Calle perpendicular / cruce si el usuario la define */}
                            {meta.croquisCalleCruce?.trim() && (
                              <text
                                x="296"
                                y="192"
                                textAnchor="middle"
                                fontSize="11"
                                fontWeight="bold"
                                fill="#1e293b"
                                transform="rotate(-90 296 192)"
                              >
                                {meta.croquisCalleCruce.trim().toUpperCase()}
                              </text>
                            )}

                            {/* Vía Principal */}
                            <text
                              x="340"
                              y="188"
                              textAnchor="middle"
                              fontSize="12.5"
                              fontWeight="bold"
                              fill="#0f172a"
                              stroke="#ffffff"
                              strokeWidth="3"
                              paintOrder="stroke"
                            >
                              {mainStreetText}
                            </text>

                            {/* Parcela Objeto (con recorte estricto para evitar desbordamientos) */}
                            <rect
                              x={parcelaX}
                              y={parcelaY}
                              width="175"
                              height="105"
                              fill="#fde68a"
                              fillOpacity={meta.croquisImagenDataUrl ? "0.9" : "1"}
                              stroke="#000"
                              strokeWidth="2.5"
                            />
                            <g clipPath="url(#croquis-parcela-clip)">
                              <text
                                x={parcelaX + 10}
                                y={parcelaY + 21}
                                fontSize="10.5"
                                fontWeight="bold"
                                fill="#000"
                              >
                                {meta.croquisParcelaTitulo?.trim() ||
                                  "EMPLAZAMIENTO B.T."}
                              </text>
                              <text
                                x={parcelaX + 10}
                                y={parcelaY + 37}
                                fontSize="9.2"
                                fill="#1e293b"
                              >
                                {parcelSubText}
                              </text>
                              <text
                                x={parcelaX + 10}
                                y={parcelaY + 54}
                                fontSize="8.8"
                                fontWeight="bold"
                                fill="#b91c1c"
                              >
                                ⚡ {notaLine1}
                              </text>
                              {notaLine2 && (
                                <text
                                  x={parcelaX + 20}
                                  y={parcelaY + 66}
                                  fontSize="8.5"
                                  fontWeight="bold"
                                  fill="#b91c1c"
                                >
                                  {notaLine2}
                                </text>
                              )}
                              <text
                                x={parcelaX + 10}
                                y={parcelaY + 86}
                                fontSize="8"
                                fontFamily="monospace"
                                fill="#0f172a"
                              >
                                {meta.coordenadasLat && meta.coordenadasLng
                                  ? `GPS: ${meta.coordenadasLat}, ${meta.coordenadasLng}`
                                  : meta.coordenadasUtm || "Punto georreferenciado"}
                              </text>
                            </g>

                            {/* Línea de Acometida desde Red B.T. hasta CGP */}
                            {showAcometida && (
                              <g>
                                <line
                                  x1={redX}
                                  y1={redY}
                                  x2={pinX}
                                  y2={pinY}
                                  stroke="#dc2626"
                                  strokeWidth="2.2"
                                  strokeDasharray="6 4"
                                />
                                <rect
                                  x={redX - 7}
                                  y={redY - 7}
                                  width="14"
                                  height="14"
                                  rx="2"
                                  fill="#047857"
                                  stroke="#fff"
                                  strokeWidth="1.5"
                                />
                                <text
                                  x={redX}
                                  y={redY - 11}
                                  textAnchor="middle"
                                  fontSize="8.5"
                                  fontWeight="bold"
                                  fill="#065f46"
                                  stroke="#fff"
                                  strokeWidth="2.5"
                                  paintOrder="stroke"
                                >
                                  {meta.croquisNotaAcometida?.trim() ||
                                    "Red B.T. → CGP"}
                                </text>
                              </g>
                            )}

                            {/* Trazos y etiquetas manuales añadidos por el instalador */}
                            {croquisItems.map((item) =>
                              item.kind === "stroke" ? (
                                <polyline
                                  key={item.id}
                                  fill="none"
                                  stroke={item.color || "#0f172a"}
                                  strokeWidth="2.4"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  points={item.points
                                    .map((p) => `${p.x},${p.y}`)
                                    .join(" ")}
                                />
                              ) : (
                                <text
                                  key={item.id}
                                  x={item.x}
                                  y={item.y}
                                  fontSize="10.5"
                                  fontWeight="bold"
                                  fill={item.color || "#1e1b4b"}
                                  stroke="#ffffff"
                                  strokeWidth="3"
                                  paintOrder="stroke"
                                >
                                  {item.text}
                                </text>
                              )
                            )}

                            {activeStroke && activeStroke.length >= 2 && (
                              <polyline
                                fill="none"
                                stroke="#2563eb"
                                strokeWidth="2.4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                points={activeStroke
                                  .map((p) => `${p.x},${p.y}`)
                                  .join(" ")}
                              />
                            )}

                            {/* Diana de coordenadas CGP en fachada */}
                            <g>
                              <circle
                                cx={pinX}
                                cy={pinY}
                                r="9"
                                fill="#dc2626"
                                stroke="#fff"
                                strokeWidth="2"
                              />
                              <line
                                x1={pinX}
                                y1={pinY - 14}
                                x2={pinX}
                                y2={pinY + 14}
                                stroke="#dc2626"
                                strokeWidth="1.8"
                              />
                              <line
                                x1={pinX - 14}
                                y1={pinY}
                                x2={pinX + 14}
                                y2={pinY}
                                stroke="#dc2626"
                                strokeWidth="1.8"
                              />
                            </g>

                            {/* Rosa de orientación Norte orientable */}
                            <g
                              transform={`translate(605, 68) rotate(${norteDeg})`}
                            >
                              <circle
                                cx="0"
                                cy="0"
                                r="22"
                                fill="#fff"
                                stroke="#000"
                                strokeWidth="1.5"
                              />
                              <polygon points="0,-18 -6,6 0,2 6,6" fill="#000" />
                              <text
                                x="-4"
                                y="-24"
                                fontSize="10"
                                fontWeight="bold"
                              >
                                N
                              </text>
                            </g>
                          </svg>
                        );
                      })()}
                    </div>

                    {/* Campos manuales de textos, calles y colindantes del Croquis 1B (oculto en PDF) */}
                    {isCroquisManualOpen && (
                      <div className="no-print border-t border-slate-200 bg-slate-50 p-2 grid grid-cols-2 gap-1.5 text-[9px]">
                        <div>
                          <label className="block font-bold text-slate-600">
                            Calle principal (horizontal)
                          </label>
                          <input
                            type="text"
                            value={meta.croquisCallePrincipal || ""}
                            onChange={(e) =>
                              updateField(
                                "croquisCallePrincipal",
                                e.target.value
                              )
                            }
                            placeholder={`C/ ${meta.direccionCalle || "Principal"}`}
                            className="w-full rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[9.5px]"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-600">
                            Calle cruce / perpendicular
                          </label>
                          <input
                            type="text"
                            value={meta.croquisCalleCruce || ""}
                            onChange={(e) =>
                              updateField("croquisCalleCruce", e.target.value)
                            }
                            placeholder="Ej: C/ Transversal / Esquina"
                            className="w-full rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[9.5px]"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-600">
                            Título parcela amarilla
                          </label>
                          <input
                            type="text"
                            value={meta.croquisParcelaTitulo ?? "EMPLAZAMIENTO B.T."}
                            onChange={(e) =>
                              updateField(
                                "croquisParcelaTitulo",
                                e.target.value
                              )
                            }
                            className="w-full rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[9.5px]"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-600">
                            Subtítulo parcela (Nº / m²)
                          </label>
                          <input
                            type="text"
                            value={meta.croquisParcelaSubtitulo || ""}
                            onChange={(e) =>
                              updateField(
                                "croquisParcelaSubtitulo",
                                e.target.value
                              )
                            }
                            placeholder={`Nº ${meta.direccionNum || "S/N"} · ${meta.superficieUtilM2} m²`}
                            className="w-full rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[9.5px]"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-600">
                            Manzana Sup. Izq. / Der.
                          </label>
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={meta.croquisRefNoroeste || ""}
                              onChange={(e) =>
                                updateField(
                                  "croquisRefNoroeste",
                                  e.target.value
                                )
                              }
                              placeholder="Sup. Izq."
                              className="w-1/2 rounded border border-slate-300 bg-white px-1 py-0.5 text-[9.5px]"
                            />
                            <input
                              type="text"
                              value={meta.croquisRefNoreste || ""}
                              onChange={(e) =>
                                updateField("croquisRefNoreste", e.target.value)
                              }
                              placeholder="Sup. Der."
                              className="w-1/2 rounded border border-slate-300 bg-white px-1 py-0.5 text-[9.5px]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block font-bold text-slate-600">
                            Manzana Colindante Izq.
                          </label>
                          <input
                            type="text"
                            value={meta.croquisRefSuroeste || ""}
                            onChange={(e) =>
                              updateField("croquisRefSuroeste", e.target.value)
                            }
                            placeholder="Ej: Edif. Nº 40 / Plaza"
                            className="w-full rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[9.5px]"
                          />
                        </div>
                        <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 pt-0.5">
                          <label className="inline-flex items-center gap-1 font-semibold text-slate-700">
                            <input
                              type="checkbox"
                              checked={meta.croquisMostrarAcometida !== false}
                              onChange={(e) =>
                                updateField(
                                  "croquisMostrarAcometida",
                                  e.target.checked
                                )
                              }
                            />
                            Trazar acometida:
                          </label>
                          <input
                            type="text"
                            value={meta.croquisNotaAcometida ?? "Red B.T. → CGP"}
                            onChange={(e) =>
                              updateField(
                                "croquisNotaAcometida",
                                e.target.value
                              )
                            }
                            placeholder="Red B.T. → CGP"
                            className="flex-1 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[9.5px]"
                          />
                          <label className="inline-flex items-center gap-1 font-semibold text-slate-700">
                            Norte (°):
                            <input
                              type="number"
                              min={0}
                              max={359}
                              step={15}
                              value={meta.croquisNorteGrados ?? 0}
                              onChange={(e) =>
                                updateField(
                                  "croquisNorteGrados",
                                  Number(e.target.value) || 0
                                )
                              }
                              className="w-12 rounded border border-slate-300 bg-white px-1 py-0.5 text-center font-mono text-[9.5px]"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* BLOQUE 2: FOTOGRAFÍA DE FACHADA DE GOOGLE STREET VIEW / OBRA CON PUNTO DE COORDENADAS */}
                <div
                  className="border border-black bg-white"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type.startsWith("image/")) {
                      compressAndSaveFacadeImage(file);
                    }
                  }}
                >
                  <div className="flex items-center justify-between border-b border-black bg-slate-100 px-2 py-1 text-[9.5px] font-bold">
                    <span>
                      2. FOTOGRAFÍA DE FACHADA (GOOGLE STREET VIEW / OBRA) E ILUSTRACIÓN DE COORDENADAS DEL SUMINISTRO
                    </span>
                    <span className="no-print font-normal text-[9px] text-[#0f6cbd]">
                      {meta.fachadaFotoDataUrl
                        ? "Haz clic sobre la fachada para situar la diana de CGP / Coordenadas"
                        : "Arrastra aquí la captura de Google Street View o pulsa Subir Foto"}
                    </span>
                  </div>

                  {meta.fachadaFotoDataUrl ? (
                    <div>
                      <div
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const xPct = Math.max(
                            4,
                            Math.min(
                              96,
                              Math.round(((e.clientX - rect.left) / rect.width) * 100)
                            )
                          );
                          const yPct = Math.max(
                            6,
                            Math.min(
                              94,
                              Math.round(((e.clientY - rect.top) / rect.height) * 100)
                            )
                          );
                          setMeta((prev) => ({
                            ...prev,
                            fachadaPinX: xPct,
                            fachadaPinY: yPct,
                          }));
                        }}
                        title="Haz clic para colocar el marcador exacto de CGP / Coordenadas sobre la fachada"
                        className="relative h-[275px] w-full cursor-crosshair overflow-hidden bg-slate-900"
                      >
                        <img
                          src={meta.fachadaFotoDataUrl}
                          alt="Fachada del emplazamiento Google Street View"
                          className="h-full w-full object-cover"
                        />

                        {/* Marcador ilustrativo de coordenadas y punto de suministro sobre la fachada */}
                        <div
                          style={{
                            left: `${meta.fachadaPinX ?? 52}%`,
                            top: `${meta.fachadaPinY ?? 62}%`,
                          }}
                          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-rose-600 text-white shadow-lg">
                            <Crosshair className="h-4 w-4" />
                          </div>
                          <div className="mt-1 whitespace-nowrap rounded border border-black bg-amber-300/95 px-2 py-0.5 text-[9px] font-extrabold text-black shadow">
                            ⚡ {meta.fachadaNotaPuntoSuministro || "CGP / Punto Suministro"}
                          </div>
                        </div>

                        {/* Leyenda georreferenciada impresa al pie de la foto */}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 bg-black/80 px-3 py-1.5 text-[9px] font-mono text-white">
                          <span>
                            📍 FACHADA: C/ {meta.direccionCalle} {meta.direccionNum} ({meta.terminoMunicipal})
                          </span>
                          <span>
                            {meta.coordenadasLat && meta.coordenadasLng
                              ? `WGS84: ${meta.coordenadasLat}, ${meta.coordenadasLng}`
                              : ""}{" "}
                            {meta.coordenadasUtm ? `· UTM: ${meta.coordenadasUtm}` : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative flex h-[250px] flex-col items-center justify-center bg-slate-50 p-3 text-center">
                      {/* Alzado esquemático limpio de respaldo para impresión si aún no hay foto */}
                      <svg
                        viewBox="0 0 640 185"
                        className="h-[155px] w-full max-w-[580px]"
                      >
                        <line
                          x1="20"
                          y1="168"
                          x2="620"
                          y2="168"
                          stroke="#0f172a"
                          strokeWidth="2.5"
                        />
                        <rect
                          x="170"
                          y="20"
                          width="300"
                          height="148"
                          fill="#f8fafc"
                          stroke="#334155"
                          strokeWidth="2"
                        />
                        <rect
                          x="205"
                          y="42"
                          width="55"
                          height="45"
                          fill="#e2e8f0"
                          stroke="#475569"
                        />
                        <rect
                          x="292"
                          y="42"
                          width="55"
                          height="45"
                          fill="#e2e8f0"
                          stroke="#475569"
                        />
                        <rect
                          x="380"
                          y="42"
                          width="55"
                          height="45"
                          fill="#e2e8f0"
                          stroke="#475569"
                        />
                        <rect
                          x="295"
                          y="108"
                          width="50"
                          height="60"
                          fill="#cbd5e1"
                          stroke="#334155"
                          strokeWidth="1.5"
                        />
                        {/* CGP en fachada */}
                        <rect
                          x="212"
                          y="112"
                          width="32"
                          height="40"
                          fill="#fde047"
                          stroke="#b91c1c"
                          strokeWidth="2"
                        />
                        <text
                          x="228"
                          y="135"
                          fontSize="8.5"
                          fontWeight="bold"
                          textAnchor="middle"
                          fill="#991b1b"
                        >
                          CGP
                        </text>
                        <text x="320" y="14" fontSize="10" fontWeight="bold" textAnchor="middle">
                          VISTA FRONTAL DE FACHADA — C/ {meta.direccionCalle.toUpperCase()} Nº {meta.direccionNum}
                        </text>
                      </svg>

                      <button
                        type="button"
                        onClick={() => fachadaFileInputRef.current?.click()}
                        className="no-print mt-1 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#0f6cbd] bg-white px-4 py-1.5 text-[11px] font-bold text-[#0f6cbd] shadow-xs hover:bg-blue-50"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        Cargar foto de fachada de Google Street View (o pulsa Ctrl+V para pegar captura)
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 text-[9.5px]">
                <span className="font-mono text-[9px] text-slate-700">
                  {meta.referenciaCatastral
                    ? `Ref. Catastral: ${meta.referenciaCatastral}`
                    : ""}
                </span>
                <div className="flex items-center gap-2">
                  <span>
                    Se adjuntan hojas complementarias de plano de Situación y Emplazamiento
                  </span>
                  <span className="inline-block h-4 w-4 border border-black"></span>
                </div>
              </div>
            </div>

            <OfficialFooter pageNum={9} />
          </div>
        </div>
      )}

      {/* =====================================================================
          PÁGINA 10/11: PÁGINA COMPLEMENTARIA (CÁLCULOS JUSTIFICATIVOS REBT)
         ===================================================================== */}
      {shouldShowPage(10) && (
        <div className="mtd-print-page mx-auto max-w-[210mm] rounded-sm border border-slate-400 bg-white p-6 text-[11px] leading-tight text-black shadow-2xl">
          <OfficialHeader isBtBox={false} />

          <div className="border-2 border-black">
            <div className="border-b border-black bg-slate-100 py-1 text-center font-bold">
              PÁGINA COMPLEMENTARIA
            </div>
            <div className="border-b border-black p-2 text-[9.5px]">
              <div className="font-semibold">SEÑALAR LA OPCIÓN:</div>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <span>[ ] Memoria Descriptiva</span>
                <span className="font-bold">[X] Cálculos Justificativos</span>
                <span>[ ] Croquis</span>
                <span>[ ] Esquema Unifilar</span>
                <span>[ ] Plano de Situación y Emplazamiento</span>
              </div>
            </div>

            <div className="min-h-[185mm] p-3 text-[10px] leading-relaxed space-y-3">
              <h4 className="font-bold underline">
                ANEXO DE FÓRMULAS Y CÁLCULOS JUSTIFICATIVOS REGLAMENTARIOS (REBT RD 842/2002):
              </h4>

              <div>
                <strong>1. Intensidad de Cálculo (Ib) y Condición de Sobrecarga (ITC-BT-19 / ITC-BT-22):</strong>
                <p>
                  • En líneas monofásicas (230 V):{" "}
                  <code>Ib = P / (U · cos φ)</code> | En líneas trifásicas (400 V):{" "}
                  <code>Ib = P / (√3 · U · cos φ)</code>.
                </p>
                <p>
                  • En todos los circuitos se verifica reglamentariamente:{" "}
                  <code>Ib ≤ In (PIA) ≤ Iz (Intensidad máxima admisible a 40 °C según Tabla 1 ITC-BT-19)</code>.
                </p>
              </div>

              <div>
                <strong>2. Cálculo de Caída de Tensión (ΔU%) según ITC-BT-14, ITC-BT-15 e ITC-BT-19:</strong>
                <p>
                  • Monofásico: <code>ΔU (V) = 2 · L · P / (γ · S · U)</code> | Trifásico:{" "}
                  <code>ΔU (V) = L · P / (γ · S · U)</code>, siendo la conductividad{" "}
                  <code>γ = 48 m/(Ω·mm²)</code> para Cobre en PVC (70°C) y{" "}
                  <code>γ = 44 m/(Ω·mm²)</code> para Cobre en XLPE (90°C).
                </p>
                <p>
                  • Derivación Individual calculada: L ={" "}
                  {cgmpSummary.diCalculation.lengthMeters} m, P ={" "}
                  {cgmpSummary.contractDesignWatts} W, S ={" "}
                  {cgmpSummary.diCalculation.sectionMm2} mm² Cu XLPE →{" "}
                  <strong>
                    ΔU_DI = {cgmpSummary.diCalculation.voltageDropPct}%
                  </strong>{" "}
                  (Límite máx.: {cgmpSummary.diCalculation.maxAllowedDropPct}%).
                </p>
              </div>

              <div>
                <strong>3. Cálculo de Puesta a Tierra y Contacto Indirecto en Esquema TT (ITC-BT-18 / ITC-BT-24):</strong>
                <p>
                  • Resistencia de paso a tierra estimada de electrodos:{" "}
                  <strong>Rt = {earthingResult.estimatedResistanceOhm} Ω</strong>.
                </p>
                <p>
                  • Verificación de disparo diferencial:{" "}
                  <code>
                    RA · IΔn = {earthingResult.estimatedResistanceOhm} Ω ×{" "}
                    {rcdSensitivityMa / 1000} A ={" "}
                    {(
                      earthingResult.estimatedResistanceOhm *
                      (rcdSensitivityMa / 1000)
                    ).toFixed(2)}{" "}
                    V ≤ UL ({meta.tensionSeguridad} V)
                  </code>{" "}
                  → <strong>CUMPLE REBT</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-2 flex justify-end">
            <div className="flex border border-black text-[10px]">
              <div className="border-r border-black p-1.5 font-semibold">
                Nº de páginas
                <br />
                complementarias
              </div>
              <div className=" flex w-20 items-center justify-center font-mono font-bold">
                1
              </div>
            </div>
          </div>

          <OfficialFooter pageNum={10} />
        </div>
      )}

      {/* =====================================================================
          PÁGINA 11/11: DECLARACIÓN DEL INSTALADOR PH / TÉCNICO COMPETENTE Y FIRMA
         ===================================================================== */}
      {shouldShowPage(11) && (
        <div className="mtd-print-page mx-auto max-w-[210mm] rounded-sm border border-slate-400 bg-white p-6 text-[11px] leading-tight text-black shadow-2xl">
          <OfficialHeader isBtBox={false} />

          <div className="mt-4 border-2 border-black p-3 space-y-3">
            {/* Opción 1: Instalador Autorizado PH */}
            <div>
              <div className="flex items-center gap-2 font-bold">
                <button
                  type="button"
                  onClick={() => updateField("autorTipo", "instalador_ph")}
                  className="inline-flex h-4 w-4 items-center justify-center border border-black font-mono"
                >
                  {meta.autorTipo === "instalador_ph" ? "X" : ""}
                </button>
                <span>
                  MEMORIA REALIZADA POR INSTALADOR AUTORIZADO (Profesional Habilitado PH):
                </span>
              </div>

              <div className="mt-2 grid grid-cols-12 gap-2 items-center text-[10px]">
                <span className="col-span-2">Nombre PH</span>
                <input
                  type="text"
                  value={meta.instaladorNombrePh}
                  onChange={(e) =>
                    updateField("instaladorNombrePh", e.target.value)
                  }
                  className="col-span-6 border border-black px-1.5 py-0.5 font-semibold"
                />
                <span className="col-span-1 text-right">Nº C.C.I.</span>
                <input
                  type="text"
                  value={meta.instaladorCciNum}
                  onChange={(e) =>
                    updateField("instaladorCciNum", e.target.value)
                  }
                  className="col-span-3 border border-black px-1.5 py-0.5 font-mono"
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between text-[10px]">
                <span>Categoría:</span>
                <span>
                  [{meta.instaladorCategoria === "Basica" ? "X" : " "}] Básica
                </span>
                <span>
                  [{meta.instaladorCategoria === "Especialista" ? "X" : " "}]
                  Especialista:
                </span>
                {["E1", "E6", "E7", "E8", "E9"].map((esp) => (
                  <span key={esp}>
                    [{meta.instaladorEspecialidades.includes(esp) ? "X" : " "}]{" "}
                    {esp}
                  </span>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-12 gap-2 items-center text-[10px]">
                <span className="col-span-3">EMPRESA INSTALADORA</span>
                <input
                  type="text"
                  value={meta.empresaInstaladoraNombre}
                  onChange={(e) =>
                    updateField("empresaInstaladoraNombre", e.target.value)
                  }
                  className="col-span-5 border border-black px-1.5 py-0.5 font-semibold"
                />
                <span className="col-span-1 text-right">Nº carné</span>
                <input
                  type="text"
                  value={meta.empresaInstaladoraNum}
                  onChange={(e) =>
                    updateField("empresaInstaladoraNum", e.target.value)
                  }
                  className="col-span-3 border border-black px-1.5 py-0.5 font-mono"
                />
              </div>

              <div className="mt-1.5 grid grid-cols-12 gap-2 items-center text-[10px]">
                <span className="col-span-2">Domicilio</span>
                <input
                  type="text"
                  value={meta.instaladorDomicilio}
                  onChange={(e) =>
                    updateField("instaladorDomicilio", e.target.value)
                  }
                  className="col-span-7 border border-black px-1.5 py-0.5"
                />
                <span className="col-span-1 text-right">Número</span>
                <input
                  type="text"
                  value={meta.instaladorNumeroCalle}
                  onChange={(e) =>
                    updateField("instaladorNumeroCalle", e.target.value)
                  }
                  className="col-span-2 border border-black px-1.5 py-0.5"
                />
              </div>

              <div className="mt-1.5 grid grid-cols-12 gap-2 items-center text-[10px]">
                <span className="col-span-2">Localidad</span>
                <input
                  type="text"
                  value={meta.instaladorLocalidad}
                  onChange={(e) =>
                    updateField("instaladorLocalidad", e.target.value)
                  }
                  className="col-span-4 border border-black px-1.5 py-0.5"
                />
                <span className="col-span-2 text-right">Código Postal</span>
                <input
                  type="text"
                  value={meta.instaladorCp}
                  onChange={(e) => updateField("instaladorCp", e.target.value)}
                  className="col-span-1 border border-black px-1 py-0.5"
                />
                <span className="col-span-1 text-right">Teléfono</span>
                <input
                  type="text"
                  value={meta.instaladorTelefono}
                  onChange={(e) =>
                    updateField("instaladorTelefono", e.target.value)
                  }
                  className="col-span-2 border border-black px-1.5 py-0.5"
                />
              </div>
            </div>

            {/* Opción 2: Técnico Competente */}
            <div className="border-t border-black pt-3">
              <div className="flex items-center gap-2 font-bold">
                <button
                  type="button"
                  onClick={() =>
                    updateField("autorTipo", "tecnico_competente")
                  }
                  className="inline-flex h-4 w-4 items-center justify-center border border-black font-mono"
                >
                  {meta.autorTipo === "tecnico_competente" ? "X" : ""}
                </button>
                <span>MEMORIA REALIZADA POR TÉCNICO COMPETENTE:</span>
              </div>

              <div className="mt-2 grid grid-cols-12 gap-2 items-center text-[10px]">
                <span className="col-span-2">Nombre</span>
                <input
                  type="text"
                  value={meta.tecnicoNombre}
                  onChange={(e) => updateField("tecnicoNombre", e.target.value)}
                  className="col-span-6 border border-black px-1.5 py-0.5 font-semibold"
                />
                <span className="col-span-2 text-right">Nº Colegiado</span>
                <input
                  type="text"
                  value={meta.tecnicoColegiadoNum}
                  onChange={(e) =>
                    updateField("tecnicoColegiadoNum", e.target.value)
                  }
                  className="col-span-2 border border-black px-1.5 py-0.5 font-mono"
                />
              </div>

              <div className="mt-1.5 grid grid-cols-12 gap-2 items-center text-[10px]">
                <span className="col-span-2">Domicilio</span>
                <input
                  type="text"
                  value={meta.tecnicoDomicilio}
                  onChange={(e) =>
                    updateField("tecnicoDomicilio", e.target.value)
                  }
                  className="col-span-7 border border-black px-1.5 py-0.5"
                />
                <span className="col-span-1 text-right">Número</span>
                <input
                  type="text"
                  value={meta.tecnicoNumeroCalle}
                  onChange={(e) =>
                    updateField("tecnicoNumeroCalle", e.target.value)
                  }
                  className="col-span-2 border border-black px-1.5 py-0.5"
                />
              </div>

              <div className="mt-1.5 grid grid-cols-12 gap-2 items-center text-[10px]">
                <span className="col-span-2">Localidad</span>
                <input
                  type="text"
                  value={meta.tecnicoLocalidad}
                  onChange={(e) =>
                    updateField("tecnicoLocalidad", e.target.value)
                  }
                  className="col-span-4 border border-black px-1.5 py-0.5"
                />
                <span className="col-span-2 text-right">Código Postal</span>
                <input
                  type="text"
                  value={meta.tecnicoCp}
                  onChange={(e) => updateField("tecnicoCp", e.target.value)}
                  className="col-span-1 border border-black px-1 py-0.5"
                />
                <span className="col-span-1 text-right">Teléfono</span>
                <input
                  type="text"
                  value={meta.tecnicoTelefono}
                  onChange={(e) =>
                    updateField("tecnicoTelefono", e.target.value)
                  }
                  className="col-span-2 border border-black px-1.5 py-0.5"
                />
              </div>

              <div className="mt-1.5 grid grid-cols-12 gap-2 items-center text-[10px]">
                <span className="col-span-2">Colegio Oficial</span>
                <input
                  type="text"
                  value={meta.tecnicoColegioOficial}
                  onChange={(e) =>
                    updateField("tecnicoColegioOficial", e.target.value)
                  }
                  className="col-span-10 border border-black px-1.5 py-0.5"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <span className="font-bold">
                NÚMERO DE DOCUMENTOS DE LA M.T.D.
              </span>
              <input
                type="number"
                value={meta.numDocumentosMtd}
                onChange={(e) =>
                  updateField("numDocumentosMtd", Number(e.target.value) || 11)
                }
                className="w-20 border border-black px-2 py-0.5 text-center font-mono font-bold"
              />
            </div>

            <p className="pt-1 text-[10px] leading-snug">
              <strong>DECLARO:</strong> Haber realizado la presente Memoria Técnica de Diseño de acuerdo con el vigente Reglamento Electrotécnico para Baja Tensión, sus instrucciones técnicas ITC-BT, y demás normas de obligado cumplimiento.
            </p>
          </div>

          <div className="mt-8 flex flex-col items-center space-y-10 text-center text-xs">
            <div>
              En{" "}
              <input
                type="text"
                value={meta.ciudadFirma}
                onChange={(e) => updateField("ciudadFirma", e.target.value)}
                className="border-b border-black text-center font-semibold"
              />{" "}
              a{" "}
              <input
                type="text"
                value={meta.diaFirma}
                onChange={(e) => updateField("diaFirma", e.target.value)}
                className="w-8 border-b border-black text-center font-semibold"
              />{" "}
              de{" "}
              <input
                type="text"
                value={meta.mesFirma}
                onChange={(e) => updateField("mesFirma", e.target.value)}
                className="w-24 border-b border-black text-center font-semibold"
              />{" "}
              de 20
              <input
                type="text"
                value={meta.anioFirma}
                onChange={(e) => updateField("anioFirma", e.target.value)}
                className="w-8 border-b border-black text-center font-semibold"
              />
            </div>

            <div>El autor de la Memoria Técnica de Diseño</div>

            <div className="pt-6 text-slate-600">(Firma)</div>

            <div className="pt-8 text-slate-700">
              (Sello de la Empresa Instaladora o Visado del Colegio Oficial)
            </div>
          </div>

          <div className="mt-16 text-right text-sm font-bold">11/11</div>
        </div>
      )}
      </div>
    </div>
  );
}

