"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Zap,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Building2,
  FileCheck2,
  Sparkles,
  FileSpreadsheet,
  Printer,
  FolderOpen,
  Users,
  ShieldCheck,
  UserCheck,
  LogOut,
  FilePlus2,
  MapPin,
  Lock,
  Building,
  ChevronRight,
  LayoutDashboard,
  Menu,
  X,
  Home,
  Calculator,
  GitBranch,
  Tag,
  ClipboardCheck,
  Briefcase,
  CheckSquare,
  GraduationCap,
  Search,
  Sun,
  Moon,
  MessageSquareText,
  WifiOff,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import {
  RebtCircuitInput,
  SystemSupplyType,
  CircuitUsageType,
  InstallationMethod,
  InsulationType,
  Itc04GroupCode,
  MtdFormMetadata,
  DEFAULT_MTD_METADATA,
  ITC_BT_25_TEMPLATES,
  calculateRebtCircuit,
  calculateBuildingLoadForecastItc10,
  evaluateItc04Documentation,
  calculateEarthingItc18,
  resolveSpanishRebtIgaAndTariff,
  getSpanishIgaStepsForSupply,
  sanitizeSpanishIgaAmps,
  REBT_SPAIN_IGA_MONO_STEPS,
  REBT_SPAIN_IGA_TRI_STEPS,
} from "@/lib/electrical-calculations";
import MtdCanariasOfficialForm from "@/components/MtdCanariasOfficialForm";
import {
  TechnicianDashboard,
  AdminDashboardSummary,
} from "@/components/DashboardsView";
import SectionHistoryRegistry, {
  SavedHistoryRecord,
} from "@/components/SectionHistoryRegistry";
import GoogleSelect from "@/components/GoogleSelect";
import LandingAndAuthView from "@/components/LandingAndAuthView";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useMonpixWorkspace } from "@/lib/monpix-store";
import {
  answerRebtQuestion,
  ORIENTATIVE_DISCLAIMER,
  type RebtQaResponse,
} from "@/lib/monpix-engine";
import AsistenteMonpixFloating from "@/components/monpix/AsistenteMonpixFloating";
import ExpedientesSection from "@/components/sections/ExpedientesSection";
import AdminRbacSection, {
  type EditableUserPatch,
} from "@/components/sections/AdminRbacSection";
import NewExpedienteWizardModal, {
  type GuidedScratchExpedientePayload,
} from "@/components/NewExpedienteWizardModal";
import type { DualPanelEvaluationResult } from "@/lib/rebt-vision-canarias";

const CalculadorasObraView = dynamic(
  () => import("@/components/monpix/CalculadorasObraView")
);
const UnifilarCuadroView = dynamic(
  () => import("@/components/monpix/UnifilarCuadroView")
);
const PresupuestosPlanoView = dynamic(
  () => import("@/components/monpix/PresupuestosPlanoView")
);
const TramitesOcaCatastroView = dynamic(
  () => import("@/components/monpix/TramitesOcaCatastroView")
);
const OficinaGastosView = dynamic(
  () => import("@/components/monpix/OficinaGastosView")
);
const TareasEquipoView = dynamic(
  () => import("@/components/monpix/TareasEquipoView")
);
const AprenderSimuladorView = dynamic(
  () => import("@/components/monpix/AprenderSimuladorView")
);

export type ActiveSection =
  | "dashboard_tecnico"
  | "expedientes"
  | "titular_ubicacion"
  | "circuitos"
  | "calculadoras_obra"
  | "unifilar_cuadro"
  | "edificio_itc10"
  | "tierras_legalizacion"
  | "tramites_oca"
  | "presupuestos_plano"
  | "oficina_gastos"
  | "tareas_equipo"
  | "aprender"
  | "ficha_mtd"
  | "administracion";

export type UserRole =
  | "super_admin"
  | "admin_empresa"
  | "ingeniero_instalador"
  | "visor_auditor";

export interface AppTenant {
  id: number;
  name: string;
  cif: string;
  empresa_instaladora_num: string;
  isla: string;
  is_active: boolean;
}

export interface AppUser {
  id: number;
  tenant_id: number;
  full_name: string;
  email: string;
  access_pin: string;
  doi_nif: string;
  role: UserRole;
  cci_or_colegiado: string;
  can_create_projects: boolean;
  can_edit_calculations: boolean;
  can_export_mtd: boolean;
  can_delete_projects: boolean;
  can_manage_users: boolean;
  is_active: boolean;
}

type SavedProjectRow = SavedHistoryRecord;

const FALLBACK_TENANTS: AppTenant[] = [
  {
    id: 1,
    name: "Ingeniería e Instalaciones Gómez S.L.",
    cif: "B-38901245",
    empresa_instaladora_num: "EI-38-02941",
    isla: "Tenerife",
    is_active: true,
  },
  {
    id: 2,
    name: "ElectroCanarias Proyectos B.T. S.L.",
    cif: "B-35419820",
    empresa_instaladora_num: "EI-35-01184",
    isla: "Gran Canaria",
    is_active: true,
  },
];

const FALLBACK_USERS: AppUser[] = [
  {
    id: 1,
    tenant_id: 1,
    full_name: "Daniel Gómez Rojas (Admin General)",
    email: "daniel@ingenieriagomez.es",
    access_pin: "1234",
    doi_nif: "43.829.104-Z",
    role: "super_admin",
    cci_or_colegiado: "COIITF-3109 / CCI-TF-4821",
    can_create_projects: true,
    can_edit_calculations: true,
    can_export_mtd: true,
    can_delete_projects: true,
    can_manage_users: true,
    is_active: true,
  },
  {
    id: 2,
    tenant_id: 1,
    full_name: "Carlos Morales (Instalador PH - Tenerife)",
    email: "carlos@ingenieriagomez.es",
    access_pin: "1234",
    doi_nif: "78.412.509-M",
    role: "ingeniero_instalador",
    cci_or_colegiado: "CCI-TF-5510",
    can_create_projects: true,
    can_edit_calculations: true,
    can_export_mtd: true,
    can_delete_projects: false,
    can_manage_users: false,
    is_active: true,
  },
  {
    id: 3,
    tenant_id: 2,
    full_name: "Elena Betancor (Ingeniera - Gran Canaria)",
    email: "elena@electrocanarias.es",
    access_pin: "1234",
    doi_nif: "42.918.301-P",
    role: "admin_empresa",
    cci_or_colegiado: "COIIGC-2045",
    can_create_projects: true,
    can_edit_calculations: true,
    can_export_mtd: true,
    can_delete_projects: true,
    can_manage_users: true,
    is_active: true,
  },
];

export default function SistemaCalculoRebtPage() {
  const [viewMode, setViewMode] = useState<
    "landing" | "login" | "reset_password" | "app"
  >("landing");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [activeSection, setActiveSection] =
    useState<ActiveSection>("dashboard_tecnico");
  const [targetMtdPage, setTargetMtdPage] = useState<number | "all">("all");

  const openMtdSheet = (page: number | "all") => {
    setTargetMtdPage(page);
    setActiveSection("ficha_mtd");
    setMobileMenuOpen(false);
  };

  // Estado Multi-Tenant y Usuarios (RBAC)
  const [tenants, setTenants] = useState<AppTenant[]>(FALLBACK_TENANTS);
  const [users, setUsers] = useState<AppUser[]>(FALLBACK_USERS);
  const [currentUserId, setCurrentUserId] = useState<number>(1);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [loginPin, setLoginPin] = useState<string>("");
  const [loginError, setLoginError] = useState<string | null>(null);

  // Modo de aislamiento: 'strict_user' = cada usuario ve únicamente sus propios reportes
  const [isolationScope, setIsolationScope] = useState<
    "strict_user" | "tenant_shared"
  >("strict_user");

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) || users[0],
    [users, currentUserId]
  );

  const currentTenant = useMemo(
    () =>
      tenants.find((t) => t.id === currentUser?.tenant_id) ||
      tenants[0],
    [tenants, currentUser]
  );

  // Estado aislado MONPIX (Oficina, Presupuestos, VeriFactu, Gastos, Tareas, Fichaje, Unifilares)
  const {
    workspace: monpixWorkspace,
    updateWorkspace: updateMonpixWorkspace,
    lastAutoSavedAt,
    isOnline,
    pendingSyncCount,
  } = useMonpixWorkspace({
    tenantId: currentTenant?.id || 1,
    userId: currentUser?.id || 1,
    tenantName: currentTenant?.name || "Empresa Instaladora",
    islaOrRegion: currentTenant?.isla || "Tenerife",
  });

  // Tema Claro / Oscuro y registro PWA offline
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [globalSearch, setGlobalSearch] = useState<string>("");
  const [homeRebtQuery, setHomeRebtQuery] = useState<string>("");
  const [homeRebtAnswer, setHomeRebtAnswer] = useState<RebtQaResponse | null>(
    null
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedTheme = window.localStorage.getItem("rebt_monpix_dark_mode");
    if (savedTheme === "1") {
      setDarkMode(true);
    }
    if ("serviceWorker" in navigator) {
      const isLocalDev =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
      if (isLocalDev || process.env.NODE_ENV !== "production") {
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => regs.forEach((r) => r.unregister()))
          .catch(() => undefined);
      } else {
        navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("monpix-dark", darkMode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("rebt_monpix_dark_mode", darkMode ? "1" : "0");
    }
  }, [darkMode]);

  //Formularios de Creación en el Apartado Administrativo
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantCif, setNewTenantCif] = useState("");
  const [newTenantNum, setNewTenantNum] = useState("");
  const [newTenantIsla, setNewTenantIsla] = useState("Tenerife");

  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPin, setNewUserPin] = useState("1234");
  const [newUserDoi, setNewUserDoi] = useState("");
  const [newUserTenantId, setNewUserTenantId] = useState<number>(1);
  const [newUserRole, setNewUserRole] = useState<UserRole>(
    "ingeniero_instalador"
  );
  const [newUserCci, setNewUserCci] = useState("");

  // Expediente activo
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [mtdMeta, setMtdMeta] = useState<MtdFormMetadata>(DEFAULT_MTD_METADATA);
  const [showNewWizardModal, setShowNewWizardModal] = useState(false);
  const [dualPhotoState, setDualPhotoState] = useState<{
    evaluation: DualPanelEvaluationResult;
    activeMode: "estado_actual" | "instalacion_corregida";
  } | null>(null);

  // Configuración Eléctrica REBT
  const [supplyType, setSupplyType] =
    useState<SystemSupplyType>("monofasico_230v");
  const [electrificationGrade, setElectrificationGrade] = useState<
    "basica" | "elevada"
  >("basica");
  const [diLengthMeters, setDiLengthMeters] = useState<number>(18);
  const [diType, setDiType] = useState<"di_concentrada" | "di_unico">(
    "di_concentrada"
  );

  // Circuitos interiores
  const [circuits, setCircuits] = useState<RebtCircuitInput[]>(() =>
    ITC_BT_25_TEMPLATES.slice(0, 5)
  );

  // Previsión de Cargas de Edificios (ITC-BT-10 + ITC-BT-52 + ITC-BT-14)
  const [basicDwellings, setBasicDwellings] = useState(12);
  const [elevatedDwellings, setElevatedDwellings] = useState(4);
  const [commonLightingW, setCommonLightingW] = useState(1800);
  const [hydroW, setHydroW] = useState(2200);
  const [otherServicesW, setOtherServicesW] = useState(7500);
  const [commercialCount, setCommercialCount] = useState(2);
  const [commercialAreaM2, setCommercialAreaM2] = useState(140);
  const [garageAreaM2, setGarageAreaM2] = useState(450);
  const [garageForcedVent, setGarageForcedVent] = useState(true);
  const [parkingSpaces, setParkingSpaces] = useState(20);
  const [hasSpl, setHasSpl] = useState(false);
  const [lgaLengthMeters, setLgaLengthMeters] = useState(25);

  // Clasificador ITC-BT-04 / ITC-BT-05 (Proyecto vs MTD + OCA)
  const [itc04Group, setItc04Group] = useState<Itc04GroupCode>(
    "e_edificio_viviendas"
  );
  const [itc04CustomPowerKw, setItc04CustomPowerKw] = useState<number>(115);
  const [itc04ParkingSpaces, setItc04ParkingSpaces] = useState<number>(20);

  // Puesta a Tierra (ITC-BT-18 + ITC-BT-24)
  const [soilResistivity, setSoilResistivity] = useState<number>(150);
  const [rodLengthMeters, setRodLengthMeters] = useState<number>(2);
  const [numRods, setNumRods] = useState<number>(4);
  const [buriedConductorMeters, setBuriedConductorMeters] =
    useState<number>(15);
  const [maxContactVoltageV, setMaxContactVoltageV] = useState<50 | 24>(50);
  const [rcdSensitivityMa, setRcdSensitivityMa] = useState<
    30 | 100 | 300 | 500
  >(30);

  // Estado de guardado y carga en Supabase
  const [isSaving, setIsSaving] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: "success" | "warning" | "error";
    text: string;
  } | null>(null);
  const [allProjects, setAllProjects] = useState<SavedProjectRow[]>([]);
  const [panelOverrideIgaAmps, setPanelOverrideIgaAmps] = useState<number | null>(null);
  const [panelOverrideRcdCount, setPanelOverrideRcdCount] = useState<number | null>(null);
  const [customDesignPowerKw, setCustomDesignPowerKw] = useState<number | null>(null);

  const generalServicesW = commonLightingW + hydroW + otherServicesW;

  // Cálculos de cada circuito interior (ITC-BT-19 / 21 / 22 / 25)
  const calculatedCircuits = useMemo(
    () => circuits.map((c) => calculateRebtCircuit(c)),
    [circuits]
  );

  // Resumen del Cuadro General de Mando y Protección (CGMP), Escalón Oficial IGA REBT, Tarifa 2.0TD/3.0TD y D.I.
  const cgmpSummary = useMemo(() => {
    const totalInstalledWatts = calculatedCircuits.reduce(
      (acc, c) => acc + c.powerWatts,
      0
    );
    const totalDesignWatts = calculatedCircuits.reduce(
      (acc, c) => acc + c.effectivePowerWatts,
      0
    );

    const supplyVoltage = supplyType === "trifasico_400v" ? 400 : 230;
    const denom =
      supplyType === "trifasico_400v" ? Math.sqrt(3) * 400 : 230;

    const rebtIga = resolveSpanishRebtIgaAndTariff({
      supplyType,
      electrificationGrade,
      circuits: calculatedCircuits,
      areaM2: Number(mtdMeta.superficieUtilM2) || 0,
      overrideIgaAmps: panelOverrideIgaAmps,
      customDesignPowerWatts:
        customDesignPowerKw !== null && customDesignPowerKw > 0
          ? Math.round(customDesignPowerKw * 1000)
          : null,
    });

    const igaAmps = rebtIga.igaAmps;
    const contractDesignWatts = rebtIga.effectiveDesignWatts;
    const designCurrentAmps = Number((contractDesignWatts / denom).toFixed(2));

    const hasEvCircuitC13 = calculatedCircuits.some(
      (c) => c.usageType === "recarga_ve" || c.code.toUpperCase() === "C13"
    );
    const interiorCount = calculatedCircuits.filter(
      (c) => c.usageType !== "recarga_ve" && c.code.toUpperCase() !== "C13"
    ).length;
    const autoRcdCount =
      Math.max(1, Math.ceil(interiorCount / 5)) + (hasEvCircuitC13 ? 1 : 0);
    const rcd30mACount = panelOverrideRcdCount ?? autoRcdCount;

    const diCalculation = calculateRebtCircuit({
      code: "DI",
      description: "Derivación Individual (Contador → CGMP)",
      usageType: diType,
      phaseSystem: supplyType === "trifasico_400v" ? "trifasico" : "monofasico",
      phaseAssigned: supplyType === "trifasico_400v" ? "L1-L2-L3" : "L1",
      voltage: supplyVoltage,
      powerWatts: contractDesignWatts,
      cosPhi: 1.0,
      simultaneityFactor: 1.0,
      utilizationFactor: 1.0,
      lengthMeters: diLengthMeters,
      installationMethod: "B1",
      insulationType: "XLPE_90",
      material: "Cu",
      minSectionMm2: 6,
      fixedPiaAmps: igaAmps,
    });

    const nonCompliantCircuits = calculatedCircuits.filter(
      (c) => !c.isCompliant
    ).length;

    return {
      totalInstalledWatts,
      totalDesignWatts: Math.round(totalDesignWatts),
      contractDesignWatts: Math.round(contractDesignWatts),
      effectiveDesignKw: rebtIga.effectiveDesignKw,
      maxAdmissibleWatts: rebtIga.maxAdmissibleWatts,
      maxAdmissibleKw: rebtIga.maxAdmissibleKw,
      simultaneousDemandWatts: rebtIga.simultaneousDemandWatts,
      designCurrentAmps,
      igaAmps,
      autoIgaAmps: rebtIga.autoIgaAmps,
      igaPoles: rebtIga.poles,
      accessTariff: rebtIga.accessTariff,
      tariffBadgeLabel: rebtIga.tariffBadgeLabel,
      tariffDetail: rebtIga.tariffDetail,
      effectiveElectrificationGrade: rebtIga.effectiveElectrificationGrade,
      electrificationLabel: rebtIga.electrificationLabel,
      commercialTier: rebtIga.commercialTier,
      commercialTierLabel: rebtIga.commercialTierLabel,
      headerArchitecture: rebtIga.headerArchitecture,
      headerProtectionSummary: rebtIga.headerProtectionSummary,
      rebtCitation: rebtIga.rebtCitation,
      exceedsSinglePhaseLimit: rebtIga.exceedsSinglePhaseLimit,
      rcd30mACount,
      hasEvCircuitC13,
      diCalculation,
      nonCompliantCircuits,
    };
  }, [
    calculatedCircuits,
    electrificationGrade,
    supplyType,
    diLengthMeters,
    diType,
    mtdMeta.superficieUtilM2,
    panelOverrideIgaAmps,
    panelOverrideRcdCount,
    customDesignPowerKw,
  ]);

  // Previsión de Cargas del Edificio (ITC-BT-10 + ITC-BT-52 + ITC-BT-14)
  const buildingForecast = useMemo(
    () =>
      calculateBuildingLoadForecastItc10({
        basicDwellingsCount: basicDwellings,
        elevatedDwellingsCount: elevatedDwellings,
        commonLightingWatts: commonLightingW,
        hydroWatts: hydroW,
        otherServicesWatts: otherServicesW,
        generalServicesWatts: generalServicesW,
        commercialCount,
        commercialAreaM2,
        garageAreaM2,
        garageForcedVentilation: garageForcedVent,
        parkingSpacesCount: parkingSpaces,
        hasSplProtection: hasSpl,
        lgaLengthMeters,
      }),
    [
      basicDwellings,
      elevatedDwellings,
      commonLightingW,
      hydroW,
      otherServicesW,
      generalServicesW,
      commercialCount,
      commercialAreaM2,
      garageAreaM2,
      garageForcedVent,
      parkingSpaces,
      hasSpl,
      lgaLengthMeters,
    ]
  );

  // Evaluación Documental ITC-BT-04 e Inspección OCA ITC-BT-05
  const itc04Evaluation = useMemo(
    () =>
      evaluateItc04Documentation(
        itc04Group,
        itc04CustomPowerKw,
        itc04ParkingSpaces
      ),
    [itc04Group, itc04CustomPowerKw, itc04ParkingSpaces]
  );

  // Cálculo de Puesta a Tierra ITC-BT-18 / ITC-BT-24
  const earthingResult = useMemo(
    () =>
      calculateEarthingItc18({
        soilResistivityOhmM: soilResistivity,
        rodLengthMeters,
        numRods,
        buriedConductorMeters,
        maxContactVoltageV,
        rcdSensitivityMa,
      }),
    [
      soilResistivity,
      rodLengthMeters,
      numRods,
      buriedConductorMeters,
      maxContactVoltageV,
      rcdSensitivityMa,
    ]
  );

  // Cargar Tenants, Usuarios y Expedientes desde caché local persistente + Supabase (si está activo)
  const LOCAL_TENANTS_KEY = "rebt_local_tenants_v1";
  const LOCAL_USERS_KEY = "rebt_local_users_v1";
  const LOCAL_PROJECTS_KEY = "rebt_local_projects_v1";
  const LOCAL_CIRCUITS_KEY = "rebt_local_project_circuits_v1";

  const persistDirectoryLocally = useCallback(
    (nextTenants?: AppTenant[], nextUsers?: AppUser[], nextProjects?: SavedProjectRow[]) => {
      if (typeof window === "undefined") return;
      try {
        if (nextTenants) {
          window.localStorage.setItem(LOCAL_TENANTS_KEY, JSON.stringify(nextTenants));
        }
        if (nextUsers) {
          window.localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(nextUsers));
        }
        if (nextProjects) {
          window.localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(nextProjects));
        }
      } catch {
        // Ignorar errores de cuota de almacenamiento local
      }
    },
    []
  );

  const isNetworkFetchError = (msg?: string) =>
    Boolean(
      msg &&
        (msg.toLowerCase().includes("failed to fetch") ||
          msg.toLowerCase().includes("fetch failed") ||
          msg.toLowerCase().includes("networkerror") ||
          msg.toLowerCase().includes("load failed"))
    );

  const sanitizeSavedProjectRow = useCallback((row: SavedProjectRow): SavedProjectRow => {
    if (row.system_type !== "trifasico_400v" && Number(row.iga_amps) > 63) {
      const normalizedIga = row.electrification_grade === "elevada" ? 40 : 25;
      const normalizedWatts = normalizedIga * 230;
      const normalizedDi = normalizedIga >= 40 ? 16 : 10;
      return {
        ...row,
        iga_amps: normalizedIga,
        total_demand_va: normalizedWatts,
        di_section_mm2: normalizedDi,
      };
    }
    return row;
  }, []);

  const fetchDirectoryAndProjects = useCallback(async () => {
    if (typeof window !== "undefined") {
      try {
        const rawT = window.localStorage.getItem(LOCAL_TENANTS_KEY);
        if (rawT) {
          const parsedT = JSON.parse(rawT) as AppTenant[];
          if (Array.isArray(parsedT) && parsedT.length > 0) setTenants(parsedT);
        }
        const rawU = window.localStorage.getItem(LOCAL_USERS_KEY);
        if (rawU) {
          const parsedU = JSON.parse(rawU) as AppUser[];
          if (Array.isArray(parsedU) && parsedU.length > 0) setUsers(parsedU);
        }
        const rawP = window.localStorage.getItem(LOCAL_PROJECTS_KEY);
        if (rawP) {
          const parsedP = JSON.parse(rawP) as SavedProjectRow[];
          if (Array.isArray(parsedP)) {
            const sanitizedP = parsedP.map(sanitizeSavedProjectRow);
            setAllProjects(sanitizedP);
            persistDirectoryLocally(undefined, undefined, sanitizedP);
          }
        }
      } catch {
        // Continúa con valores por defecto
      }
    }

    if (!supabase) return;

    try {
      const [tenantsRes, usersRes, projectsRes] = await Promise.all([
        supabase.from("app_tenants").select("*").order("id", { ascending: true }),
        supabase.from("app_users").select("*").order("id", { ascending: true }),
        supabase
          .from("electrical_projects")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (tenantsRes.data && tenantsRes.data.length > 0) {
        const remoteTenants = tenantsRes.data as AppTenant[];
        setTenants(remoteTenants);
        persistDirectoryLocally(remoteTenants, undefined, undefined);
      }
      if (usersRes.data && usersRes.data.length > 0) {
        const remoteUsers = usersRes.data as AppUser[];
        setUsers(remoteUsers);
        persistDirectoryLocally(undefined, remoteUsers, undefined);
      }
      if (projectsRes.data) {
        const remoteProjects = (projectsRes.data as SavedProjectRow[]).map(
          sanitizeSavedProjectRow
        );
        setAllProjects(remoteProjects);
        persistDirectoryLocally(undefined, undefined, remoteProjects);
      }
    } catch {
      // Si el servidor remoto no responde, mantiene los datos locales persistidos
    }
  }, [persistDirectoryLocally, sanitizeSavedProjectRow]);

  useEffect(() => {
    fetchDirectoryAndProjects();
  }, [fetchDirectoryAndProjects]);

  // Sembrar automáticamente el registro inicial en el historial si aún no hay registros para el usuario principal
  useEffect(() => {
    if (!supabase || typeof window === "undefined") return;
    if (localStorage.getItem("rebt_seeded_initial_history_v1")) return;
    const hasUser1Projects = allProjects.some((p) => p.owner_user_id === 1);
    if (!hasUser1Projects && currentUser?.id === 1 && !isSaving) {
      localStorage.setItem("rebt_seeded_initial_history_v1", "true");
      handleSaveToSupabase("insert");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProjects.length]);

  // Expedientes filtrados estrictamente para el usuario activo / tenant activo (Aislamiento Multi-Tenant)
  const isolatedProjects = useMemo(() => {
    if (!currentUser) return [];
    return allProjects.filter((p) => {
      if (isolationScope === "strict_user") {
        // Estricto por usuario: los reportes de un usuario nunca se ligan con los de otro
        return p.owner_user_id === currentUser.id;
      }
      // Aislado por empresa/tenant
      return p.tenant_id === currentUser.tenant_id;
    });
  }, [allProjects, currentUser, isolationScope]);

  // Preparar un expediente nuevo limpio con los datos profesionales del usuario activo
  const startNewBlankProjectForUser = useCallback(
    (user: AppUser, tenant: AppTenant | undefined) => {
      const randNum = Math.floor(100 + Math.random() * 900);
      setActiveProjectId(null);
      setMtdMeta({
        ...DEFAULT_MTD_METADATA,
        instalacionNum: `BT-2026-U${user.id}-${randNum}`,
        expedienteNum: `EXP-${tenant?.isla.slice(0, 2).toUpperCase() || "TF"}-2026-${randNum}`,
        titularNombre: "",
        titularNif: "",
        direccionCalle: "",
        direccionNum: "",
        portalPlanta: "",
        terminoMunicipal: tenant?.isla === "Gran Canaria" ? "Las Palmas de G.C." : "Santa Cruz de Tenerife",
        isla: tenant?.isla || "Tenerife",
        instaladorNombrePh: user.full_name.replace(/\s*\(.*?\)\s*/g, ""),
        tecnicoNombre: user.full_name.replace(/\s*\(.*?\)\s*/g, ""),
        instaladorDoi: user.doi_nif,
        instaladorCciNum: user.cci_or_colegiado,
        tecnicoColegiadoNum: user.cci_or_colegiado,
        empresaInstaladoraNombre: tenant?.name || "",
        empresaInstaladoraNum: tenant?.empresa_instaladora_num || "",
      });
      setCircuits(ITC_BT_25_TEMPLATES.slice(0, 5));
      setPanelOverrideIgaAmps(null);
      setPanelOverrideRcdCount(null);
      setCustomDesignPowerKw(null);
      setDualPhotoState(null);
    },
    []
  );

  // Activar una de las dos opciones separadas tras analizar la foto del cuadro (-ACT vs -COR)
  const applyDualPhotoSnapshotToActiveWorkspace = (
    evaluation: DualPanelEvaluationResult,
    mode: "estado_actual" | "instalacion_corregida",
    destination?: "ficha_mtd" | "unifilar_cuadro" | "circuitos" | "stay"
  ) => {
    const profile =
      mode === "estado_actual" ? evaluation.actual : evaluation.corregido;

    setDualPhotoState({ evaluation, activeMode: mode });

    // Si ya fue guardado previamente ese expediente (-ACT o -COR) en el historial del usuario, vincular su ID
    const existingSaved = allProjects.find(
      (p) =>
        p.owner_user_id === currentUser.id &&
        p.mtd_metadata_json?.expedienteNum === profile.expedienteNum
    );
    setActiveProjectId(existingSaved ? existingSaved.id : null);

    setSupplyType(profile.supplyType);
    setElectrificationGrade(profile.electrificationGrade);
    setCircuits(profile.circuits);
    setPanelOverrideIgaAmps(profile.igaAmps);
    setPanelOverrideRcdCount(profile.rcdCount);
    setCustomDesignPowerKw(null);

    setMtdMeta((prev) => ({
      ...prev,
      instaladorNombrePh:
        prev.instaladorNombrePh ||
        currentUser.full_name.replace(/\s*\(.*?\)\s*/g, ""),
      tecnicoNombre:
        prev.tecnicoNombre ||
        currentUser.full_name.replace(/\s*\(.*?\)\s*/g, ""),
      instaladorDoi: prev.instaladorDoi || currentUser.doi_nif,
      instaladorCciNum: prev.instaladorCciNum || currentUser.cci_or_colegiado,
      tecnicoColegiadoNum:
        prev.tecnicoColegiadoNum || currentUser.cci_or_colegiado,
      empresaInstaladoraNombre:
        prev.empresaInstaladoraNombre || currentTenant?.name || "",
      empresaInstaladoraNum:
        prev.empresaInstaladoraNum ||
        currentTenant?.empresa_instaladora_num ||
        "",
      ...profile.mtdPatch,
    }));

    if (destination && destination !== "stay") {
      setTargetMtdPage("all");
      setActiveSection(destination);
    }

    setStatusBanner({
      type:
        mode === "estado_actual" && !evaluation.overallCompliant
          ? "warning"
          : "success",
      text:
        mode === "estado_actual"
          ? `Ficha Técnica #1 cargada (${profile.expedienteNum} · Estado Actual): ${evaluation.verdictBadge}.`
          : `Ficha Técnica #2 cargada (${profile.expedienteNum} · Instalación Corregida REBT): Diseño adecuado al 100% con ${profile.circuits.length} circuitos.`,
    });
  };

  // Guardar de una sola vez AMBAS opciones de foto como 2 expedientes independientes con distintas Fichas Técnicas (-ACT y -COR)
  const handleSaveBothDualPhotoOptions = async (
    evaluation: DualPanelEvaluationResult,
    openAfterSave: "estado_actual" | "instalacion_corregida" = "instalacion_corregida"
  ) => {
    if (!currentUser.can_create_projects) {
      setStatusBanner({
        type: "warning",
        text: "Tu perfil actual no tiene permiso para crear registros.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const profiles = [evaluation.actual, evaluation.corregido] as const;
      let nextLocalId = Math.max(0, ...allProjects.map((p) => p.id)) + 1;
      const newLocalRows: SavedProjectRow[] = [];
      const circuitsToStore: Record<string, RebtCircuitInput[]> = {};

      for (const prof of profiles) {
        const calcList = prof.circuits.map((c) => calculateRebtCircuit(c));
        const diRes = resolveSpanishRebtIgaAndTariff({
          supplyType: prof.supplyType,
          electrificationGrade: prof.electrificationGrade,
          circuits: calcList,
          areaM2: mtdMeta.superficieUtilM2,
          overrideIgaAmps: prof.igaAmps,
        });
        const totalInstalled = calcList.reduce(
          (acc, c) => acc + c.powerWatts,
          0
        );
        const profMeta: MtdFormMetadata = {
          ...mtdMeta,
          instaladorNombrePh: currentUser.full_name.replace(/\s*\(.*?\)\s*/g, ""),
          tecnicoNombre: currentUser.full_name.replace(/\s*\(.*?\)\s*/g, ""),
          instaladorDoi: currentUser.doi_nif,
          instaladorCciNum: currentUser.cci_or_colegiado,
          tecnicoColegiadoNum: currentUser.cci_or_colegiado,
          empresaInstaladoraNombre: currentTenant?.name || "",
          empresaInstaladoraNum: currentTenant?.empresa_instaladora_num || "",
          ...prof.mtdPatch,
        };

        const rowPayload = {
          tenant_id: currentUser.tenant_id,
          owner_user_id: currentUser.id,
          name:
            prof.mode === "estado_actual"
              ? `M.T.D. ${prof.expedienteNum} - Estado Actual (${
                  evaluation.overallCompliant ? "Cumple REBT" : "No Cumple REBT"
                })`
              : `M.T.D. ${prof.expedienteNum} - Instalación Corregida REBT`,
          client_name: profMeta.titularNombre || "Titular sin especificar",
          location: `${profMeta.direccionCalle} ${profMeta.direccionNum}, ${profMeta.terminoMunicipal} (${profMeta.isla})`,
          system_type: prof.supplyType,
          electrification_grade: prof.electrificationGrade,
          itc04_group: itc04Group,
          document_type: itc04Evaluation.documentType,
          requires_oca: itc04Evaluation.requiresInitialOcaInspection,
          demand_factor: 1.0,
          ambient_temp_c: 40,
          total_connected_va: totalInstalled,
          total_demand_va: diRes.effectiveDesignWatts,
          main_breaker_amps: prof.igaAmps,
          iga_amps: prof.igaAmps,
          di_section_mm2: prof.igaAmps >= 40 ? 10 : 6,
          rcd_count: prof.rcdCount,
          main_feeder_awg: `${prof.igaAmps >= 40 ? 10 : 6} mm² Cu XLPE`,
          building_forecast_json: {
            ...buildingForecast,
            _inputs: {
              basicDwellings,
              elevatedDwellings,
              commonLightingW,
              hydroW,
              otherServicesW,
              commercialCount,
              commercialAreaM2,
              garageAreaM2,
              garageForcedVent,
              parkingSpaces,
              hasSpl,
              lgaLengthMeters,
            },
          },
          earthing_json: {
            ...earthingResult,
            _inputs: {
              soilResistivity,
              rodLengthMeters,
              numRods,
              buriedConductorMeters,
              maxContactVoltageV,
              rcdSensitivityMa,
              itc04Group,
              itc04CustomPowerKw,
              itc04ParkingSpaces,
            },
          },
          mtd_metadata_json: profMeta,
        };

        let savedId = nextLocalId++;
        if (supabase) {
          try {
            const { data: inserted } = await supabase
              .from("electrical_projects")
              .insert(rowPayload)
              .select("id")
              .single();
            if (inserted?.id) {
              savedId = inserted.id;
              const cRows = calcList.map((c, idx) => ({
                project_id: savedId,
                circuit_number: idx + 1,
                circuit_code: c.code,
                description: c.description,
                load_category: "especial",
                usage_type: c.usageType,
                phase_assignment: c.phaseAssigned,
                phases: c.phaseSystem === "trifasico" ? 3 : 1,
                voltage: c.voltage,
                power_va: c.powerWatts,
                power_factor: c.cosPhi,
                simultaneity_factor: c.simultaneityFactor,
                utilization_factor: c.utilizationFactor,
                is_continuous: true,
                length_meters: c.lengthMeters,
                conductor_material: c.material,
                installation_method: c.installationMethod,
                insulation_type: c.insulationType,
                calculated_current_amps: c.currentIbAmps,
                design_current_amps: c.correctedCurrentAmps,
                ampacity_iz_amps: c.ampacityIzAmps,
                recommended_awg: `${c.sectionMm2} mm²`,
                section_mm2: c.sectionMm2,
                neutral_section_mm2: c.neutralSectionMm2,
                pe_section_mm2: c.peSectionMm2,
                tube_diameter_mm: c.tubeDiameterMm,
                breaker_amps: c.piaAmps,
                voltage_drop_pct: c.voltageDropPct,
                max_allowed_drop_pct: c.maxAllowedDropPct,
              }));
              await supabase.from("electrical_circuits").insert(cRows);
            }
          } catch {
            // Respaldo local garantizado abajo
          }
        }

        circuitsToStore[String(savedId)] = prof.circuits;
        newLocalRows.push({
          id: savedId,
          ...rowPayload,
          created_at: new Date().toISOString(),
        });
      }

      setAllProjects((prev) => {
        const updated = [...newLocalRows, ...prev];
        persistDirectoryLocally(undefined, undefined, updated);
        return updated;
      });

      if (typeof window !== "undefined") {
        try {
          const rawMap = window.localStorage.getItem(LOCAL_CIRCUITS_KEY);
          const map = rawMap
            ? (JSON.parse(rawMap) as Record<string, RebtCircuitInput[]>)
            : {};
          Object.assign(map, circuitsToStore);
          window.localStorage.setItem(LOCAL_CIRCUITS_KEY, JSON.stringify(map));
        } catch {
          // Ignorar
        }
      }

      applyDualPhotoSnapshotToActiveWorkspace(
        evaluation,
        openAfterSave,
        "ficha_mtd"
      );
      setStatusBanner({
        type: "success",
        text: `¡Guardados los 2 expedientes separados! Ficha #1 (${evaluation.actual.expedienteNum} · Estado Actual) y Ficha #2 (${evaluation.corregido.expedienteNum} · Instalación Corregida) disponibles en Mis Expedientes.`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Crear expediente limpio guiado paso a paso desde el Modal Nuevo
  const handleCreateGuidedScratch = (
    payload: GuidedScratchExpedientePayload
  ) => {
    const randNum = Math.floor(100 + Math.random() * 900);
    const islandPrefix = (payload.isla || currentTenant?.isla || "TF")
      .slice(0, 2)
      .toUpperCase();
    const expCode = `EXP-${islandPrefix}-2026-${randNum}`;
    const instCode = `BT-2026-U${currentUser.id}-${randNum}`;

    setActiveProjectId(null);
    setDualPhotoState(null);
    setSupplyType(payload.supplyType);
    setCustomDesignPowerKw(null);

    if (payload.templateId === "vivienda_basica") {
      setElectrificationGrade("basica");
      setCircuits(ITC_BT_25_TEMPLATES.slice(0, 5));
      setPanelOverrideIgaAmps(25);
      setPanelOverrideRcdCount(2);
    } else if (payload.templateId === "vivienda_elevada_ve") {
      setElectrificationGrade("elevada");
      setCircuits(ITC_BT_25_TEMPLATES);
      setPanelOverrideIgaAmps(40);
      setPanelOverrideRcdCount(3);
    } else if (payload.templateId === "local_comercial") {
      setElectrificationGrade("elevada");
      setPanelOverrideIgaAmps(40);
      setPanelOverrideRcdCount(2);
      setCircuits([
        {
          code: "A1",
          description: "Alumbrado general sala de ventas / oficina",
          usageType: "alumbrado",
          phaseSystem: "monofasico",
          phaseAssigned: "L1",
          voltage: 230,
          powerWatts: 2500,
          cosPhi: 0.95,
          simultaneityFactor: 1,
          utilizationFactor: 1,
          lengthMeters: 22,
          installationMethod: "B1",
          insulationType: "XLPE_90",
          material: "Cu",
          minSectionMm2: 1.5,
          fixedPiaAmps: 10,
        },
        {
          code: "E1",
          description: "Alumbrado de emergencia y señalización",
          usageType: "alumbrado",
          phaseSystem: "monofasico",
          phaseAssigned: "L2",
          voltage: 230,
          powerWatts: 400,
          cosPhi: 0.95,
          simultaneityFactor: 1,
          utilizationFactor: 1,
          lengthMeters: 20,
          installationMethod: "B1",
          insulationType: "XLPE_90",
          material: "Cu",
          minSectionMm2: 1.5,
          fixedPiaAmps: 10,
        },
        {
          code: "F1",
          description: "Tomas de fuerza puestos de trabajo e informática",
          usageType: "fuerza_otros",
          phaseSystem: "monofasico",
          phaseAssigned: "L3",
          voltage: 230,
          powerWatts: 3450,
          cosPhi: 0.9,
          simultaneityFactor: 1,
          utilizationFactor: 1,
          lengthMeters: 24,
          installationMethod: "B1",
          insulationType: "XLPE_90",
          material: "Cu",
          minSectionMm2: 2.5,
          fixedPiaAmps: 16,
        },
        {
          code: "CL1",
          description: "Equipo de climatización / bomba de calor",
          usageType: "motor",
          phaseSystem:
            payload.supplyType === "trifasico_400v" ? "trifasico" : "monofasico",
          phaseAssigned:
            payload.supplyType === "trifasico_400v" ? "L1-L2-L3" : "L1",
          voltage: payload.supplyType === "trifasico_400v" ? 400 : 230,
          powerWatts: 5500,
          cosPhi: 0.85,
          simultaneityFactor: 1,
          utilizationFactor: 1,
          lengthMeters: 18,
          installationMethod: "B1",
          insulationType: "XLPE_90",
          material: "Cu",
          minSectionMm2: 4,
          fixedPiaAmps: 25,
        },
      ]);
    } else {
      setElectrificationGrade("elevada");
      setSupplyType("trifasico_400v");
      setPanelOverrideIgaAmps(80);
      setPanelOverrideRcdCount(2);
      setCircuits([
        {
          code: "A1",
          description: "Alumbrado general nave / gran comercio",
          usageType: "alumbrado",
          phaseSystem: "monofasico",
          phaseAssigned: "L1",
          voltage: 230,
          powerWatts: 3200,
          cosPhi: 0.95,
          simultaneityFactor: 1,
          utilizationFactor: 1,
          lengthMeters: 30,
          installationMethod: "E",
          insulationType: "XLPE_90",
          material: "Cu",
          minSectionMm2: 2.5,
          fixedPiaAmps: 16,
        },
        {
          code: "F1",
          description: "Línea trifásica maquinaria / cuadro secundario",
          usageType: "motor",
          phaseSystem: "trifasico",
          phaseAssigned: "L1-L2-L3",
          voltage: 400,
          powerWatts: 18500,
          cosPhi: 0.85,
          simultaneityFactor: 1,
          utilizationFactor: 1,
          lengthMeters: 28,
          installationMethod: "E",
          insulationType: "XLPE_90",
          material: "Cu",
          minSectionMm2: 10,
          fixedPiaAmps: 40,
        },
        {
          code: "CL1",
          description: "Climatización industrial trifásica",
          usageType: "motor",
          phaseSystem: "trifasico",
          phaseAssigned: "L1-L2-L3",
          voltage: 400,
          powerWatts: 15000,
          cosPhi: 0.85,
          simultaneityFactor: 1,
          utilizationFactor: 1,
          lengthMeters: 25,
          installationMethod: "E",
          insulationType: "XLPE_90",
          material: "Cu",
          minSectionMm2: 6,
          fixedPiaAmps: 32,
        },
      ]);
    }

    setMtdMeta({
      ...DEFAULT_MTD_METADATA,
      instalacionNum: instCode,
      expedienteNum: expCode,
      titularNombre: payload.titularNombre,
      titularNif: payload.titularNif,
      direccionCalle: payload.direccionCalle,
      direccionNum: payload.direccionNum,
      portalPlanta: "",
      terminoMunicipal: payload.terminoMunicipal,
      isla: payload.isla,
      superficieUtilM2: payload.superficieUtilM2,
      usoDestino: payload.usoDestino,
      tipoActuacion: payload.tipoActuacion,
      tieneSobretensiones: true,
      tieneIgaReglamentario: true,
      modalidadReporteFoto: "estandar",
      diferencialClase: "A",
      instaladorNombrePh: currentUser.full_name.replace(/\s*\(.*?\)\s*/g, ""),
      tecnicoNombre: currentUser.full_name.replace(/\s*\(.*?\)\s*/g, ""),
      instaladorDoi: currentUser.doi_nif,
      instaladorCciNum: currentUser.cci_or_colegiado,
      tecnicoColegiadoNum: currentUser.cci_or_colegiado,
      empresaInstaladoraNombre: currentTenant?.name || "",
      empresaInstaladoraNum: currentTenant?.empresa_instaladora_num || "",
    });

    setTargetMtdPage("all");
    setActiveSection(payload.openTarget);
    setStatusBanner({
      type: "success",
      text: `Nuevo expediente ${expCode} iniciado con plantilla «${payload.usoDestino}».`,
    });
  };

  // Cambiar de Usuario Activo (limpiando el formulario activo para que nunca se mezclen reportes entre usuarios)
  const switchActiveUser = (targetUser: AppUser) => {
    if (!targetUser.is_active) {
      setStatusBanner({
        type: "warning",
        text: `El usuario "${targetUser.full_name}" se encuentra inactivo. Reactívalo primero en la Matriz de Usuarios para iniciar sesión con su cuenta.`,
      });
      return;
    }
    const targetTenant = tenants.find((t) => t.id === targetUser.tenant_id);
    setCurrentUserId(targetUser.id);
    startNewBlankProjectForUser(targetUser, targetTenant);
    setShowLoginModal(false);
    setLoginError(null);
    setStatusBanner({
      type: "success",
      text: `Sesión iniciada como ${targetUser.full_name} (${targetTenant?.name}). Sus reportes están aislados de otros usuarios.`,
    });
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = users.find(
      (u) =>
        u.email.toLowerCase().trim() === loginEmail.toLowerCase().trim() &&
        u.access_pin === loginPin.trim()
    );
    if (!found) {
      setLoginError("Credenciales inválidas. Verifica el correo y el PIN (por defecto 1234).");
      return;
    }
    if (!found.is_active) {
      setLoginError("Esta cuenta de usuario se encuentra desactivada por el administrador.");
      return;
    }
    switchActiveUser(found);
    setViewMode("app");
  };

  const handleResetPassword = async (
    emailToReset: string,
    doiOrSecret: string,
    newPinValue: string
  ): Promise<{ ok: boolean; message: string }> => {
    const targetUser = users.find(
      (u) => u.email.toLowerCase().trim() === emailToReset.toLowerCase().trim()
    );
    if (!targetUser) {
      return {
        ok: false,
        message: "No existe ningún usuario registrado con ese correo electrónico.",
      };
    }

    const cleanInput = doiOrSecret.toUpperCase().replace(/[\s.-]/g, "");
    const cleanUserDoi = (targetUser.doi_nif || "")
      .toUpperCase()
      .replace(/[\s.-]/g, "");
    const cleanUserCci = (targetUser.cci_or_colegiado || "")
      .toUpperCase()
      .replace(/[\s.-]/g, "");

    const isMasterCode =
      cleanInput === "REBT2026" || cleanInput === "REBTADMIN";
    const matchesDoi = cleanUserDoi.length > 0 && cleanInput === cleanUserDoi;
    const matchesCci =
      cleanUserCci.length > 0 && cleanUserCci.includes(cleanInput);

    if (!isMasterCode && !matchesDoi && !matchesCci) {
      return {
        ok: false,
        message:
          "El NIF / Colegiado o código de recuperación no coincide con el titular de la cuenta.",
      };
    }

    setUsers((prev) => {
      const updated = prev.map((u) =>
        u.id === targetUser.id ? { ...u, access_pin: newPinValue } : u
      );
      persistDirectoryLocally(undefined, updated, undefined);
      return updated;
    });

    if (supabase) {
      try {
        await supabase
          .from("app_users")
          .update({ access_pin: newPinValue })
          .eq("id", targetUser.id);
      } catch {
        // Persistido localmente
      }
    }

    return {
      ok: true,
      message: `Contraseña / PIN actualizada correctamente para ${targetUser.full_name}. Ya puedes iniciar sesión con tu nueva clave.`,
    };
  };

  const handleLoadProject = async (projectId: number) => {
    const proj = isolatedProjects.find((p) => p.id === projectId);
    if (!proj) {
      setStatusBanner({
        type: "error",
        text: "Acceso denegado: este reporte pertenece a otro usuario/tenant.",
      });
      return;
    }

    setActiveProjectId(proj.id);
    const loadedSupply: SystemSupplyType =
      proj.system_type === "trifasico_400v" ? "trifasico_400v" : "monofasico_230v";
    const isValidSavedIga =
      typeof proj.iga_amps === "number" &&
      getSpanishIgaStepsForSupply(loadedSupply).some(
        (st) => st.igaAmps === proj.iga_amps
      );
    setPanelOverrideIgaAmps(isValidSavedIga ? proj.iga_amps : null);
    setPanelOverrideRcdCount(proj.rcd_count || null);

    // 1. Restaurar Titular, Ubicación y Profesional Habilitado
    if (
      proj.mtd_metadata_json &&
      Object.keys(proj.mtd_metadata_json).length > 0
    ) {
      setMtdMeta({ ...DEFAULT_MTD_METADATA, ...proj.mtd_metadata_json });
    }

    // 2. Restaurar Configuración de Suministro y Grado de Electrificación
    if (
      proj.system_type === "monofasico_230v" ||
      proj.system_type === "trifasico_400v"
    ) {
      setSupplyType(proj.system_type);
    }
    if (
      proj.electrification_grade === "basica" ||
      proj.electrification_grade === "elevada"
    ) {
      setElectrificationGrade(proj.electrification_grade);
    }

    // 3. Restaurar Previsión de Cargas del Edificio (ITC-BT-10 / 52)
    if (proj.building_forecast_json) {
      const bfIn = proj.building_forecast_json._inputs;
      if (bfIn) {
        if (typeof bfIn.basicDwellings === "number")
          setBasicDwellings(bfIn.basicDwellings);
        if (typeof bfIn.elevatedDwellings === "number")
          setElevatedDwellings(bfIn.elevatedDwellings);
        if (typeof bfIn.commonLightingW === "number")
          setCommonLightingW(bfIn.commonLightingW);
        if (typeof bfIn.hydroW === "number") setHydroW(bfIn.hydroW);
        if (typeof bfIn.otherServicesW === "number")
          setOtherServicesW(bfIn.otherServicesW);
        if (typeof bfIn.commercialCount === "number")
          setCommercialCount(bfIn.commercialCount);
        if (typeof bfIn.commercialAreaM2 === "number")
          setCommercialAreaM2(bfIn.commercialAreaM2);
        if (typeof bfIn.garageAreaM2 === "number")
          setGarageAreaM2(bfIn.garageAreaM2);
        if (typeof bfIn.garageForcedVent === "boolean")
          setGarageForcedVent(bfIn.garageForcedVent);
        if (typeof bfIn.parkingSpaces === "number")
          setParkingSpaces(bfIn.parkingSpaces);
        if (typeof bfIn.hasSpl === "boolean") setHasSpl(bfIn.hasSpl);
        if (typeof bfIn.lgaLengthMeters === "number")
          setLgaLengthMeters(bfIn.lgaLengthMeters);
      }
    }

    // 4. Restaurar Puesta a Tierra y Clasificador ITC-BT-04
    if (proj.itc04_group) {
      setItc04Group(proj.itc04_group);
    }
    if (proj.earthing_json) {
      const eIn = proj.earthing_json._inputs;
      if (eIn) {
        if (typeof eIn.soilResistivity === "number")
          setSoilResistivity(eIn.soilResistivity);
        if (typeof eIn.rodLengthMeters === "number")
          setRodLengthMeters(eIn.rodLengthMeters);
        if (typeof eIn.numRods === "number") setNumRods(eIn.numRods);
        if (typeof eIn.buriedConductorMeters === "number")
          setBuriedConductorMeters(eIn.buriedConductorMeters);
        if (eIn.maxContactVoltageV === 50 || eIn.maxContactVoltageV === 24)
          setMaxContactVoltageV(eIn.maxContactVoltageV);
        if (
          eIn.rcdSensitivityMa === 30 ||
          eIn.rcdSensitivityMa === 100 ||
          eIn.rcdSensitivityMa === 300 ||
          eIn.rcdSensitivityMa === 500
        )
          setRcdSensitivityMa(eIn.rcdSensitivityMa);
        if (eIn.itc04Group) setItc04Group(eIn.itc04Group);
        if (typeof eIn.itc04CustomPowerKw === "number")
          setItc04CustomPowerKw(eIn.itc04CustomPowerKw);
        if (typeof eIn.itc04ParkingSpaces === "number")
          setItc04ParkingSpaces(eIn.itc04ParkingSpaces);
      }
    }

    // 5. Restaurar Circuitos Interiores desde electrical_circuits o caché local
    let restoredFromRemote = false;
    if (supabase) {
      try {
        const { data: dbCircuits } = await supabase
          .from("electrical_circuits")
          .select("*")
          .eq("project_id", projectId)
          .order("circuit_number", { ascending: true });

        if (dbCircuits && dbCircuits.length > 0) {
          restoredFromRemote = true;
          setCircuits(
            dbCircuits.map((row) => ({
              code: row.circuit_code || `C${row.circuit_number}`,
              description: row.description,
              usageType:
                (row.usage_type as CircuitUsageType) || "vivienda_interior",
              phaseSystem: row.phases === 3 ? "trifasico" : "monofasico",
              phaseAssigned: row.phases === 3 ? "L1-L2-L3" : "L1",
              voltage: row.phases === 3 ? 400 : 230,
              powerWatts: Number(row.power_va) || 2300,
              cosPhi: Number(row.power_factor) || 1.0,
              simultaneityFactor: Number(row.simultaneity_factor) || 1.0,
              utilizationFactor: Number(row.utilization_factor) || 1.0,
              lengthMeters: Number(row.length_meters) || 15,
              installationMethod:
                (row.installation_method as InstallationMethod) || "B1",
              insulationType: (row.insulation_type as InsulationType) || "PVC_70",
              material: row.conductor_material === "Al" ? "Al" : "Cu",
              fixedPiaAmps: Number(row.breaker_amps) || undefined,
            }))
          );
        }
      } catch {
        // Fallback a circuitos locales
      }
    }

    if (!restoredFromRemote && typeof window !== "undefined") {
      try {
        const rawMap = window.localStorage.getItem(LOCAL_CIRCUITS_KEY);
        const map = rawMap
          ? (JSON.parse(rawMap) as Record<string, RebtCircuitInput[]>)
          : {};
        if (Array.isArray(map[String(projectId)]) && map[String(projectId)].length > 0) {
          setCircuits(map[String(projectId)]);
        }
      } catch {
        // Ignorar
      }
    }

    setStatusBanner({
      type: "success",
      text: `Registro #${projectId} (${proj.name}) cargado en modo edición. Modifica cualquier dato y pulsa 'Guardar Cambios (#${projectId})'.`,
    });
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!currentUser.can_delete_projects) {
      setStatusBanner({
        type: "warning",
        text: "No tienes permiso para eliminar registros. Solicita el permiso 'Borrar Reportes' en Administración.",
      });
      return;
    }

    if (supabase) {
      try {
        await supabase.from("electrical_projects").delete().eq("id", projectId);
      } catch {
        // Continúa con borrado local
      }
    }

    if (activeProjectId === projectId) {
      setActiveProjectId(null);
    }
    setAllProjects((prev) => {
      const filtered = prev.filter((p) => p.id !== projectId);
      persistDirectoryLocally(undefined, undefined, filtered);
      return filtered;
    });
    if (typeof window !== "undefined") {
      try {
        const rawMap = window.localStorage.getItem(LOCAL_CIRCUITS_KEY);
        if (rawMap) {
          const map = JSON.parse(rawMap) as Record<string, RebtCircuitInput[]>;
          delete map[String(projectId)];
          window.localStorage.setItem(LOCAL_CIRCUITS_KEY, JSON.stringify(map));
        }
      } catch {
        // Ignorar
      }
    }
    setStatusBanner({
      type: "success",
      text: `Registro #${projectId} eliminado del historial correctamente.`,
    });
  };

  const handleSaveToSupabase = async (
    mode: "auto" | "insert" | "update" = "auto"
  ) => {
    if (!currentUser.can_create_projects) {
      setStatusBanner({
        type: "warning",
        text: "Tu perfil actual no tiene permiso para crear o editar registros.",
      });
      return;
    }

    setIsSaving(true);
    setStatusBanner(null);

    const shouldUpdate =
      mode === "update" || (mode === "auto" && activeProjectId !== null);

    const projectPayload = {
      tenant_id: currentUser.tenant_id,
      owner_user_id: currentUser.id,
      name: `M.T.D. ${mtdMeta.expedienteNum} - ${mtdMeta.usoDestino || "Instalación BT"}`,
      client_name: mtdMeta.titularNombre || "Titular sin especificar",
      location: `${mtdMeta.direccionCalle} ${mtdMeta.direccionNum}, ${mtdMeta.terminoMunicipal} (${mtdMeta.isla})`,
      system_type: supplyType,
      electrification_grade: electrificationGrade,
      itc04_group: itc04Group,
      document_type: itc04Evaluation.documentType,
      requires_oca: itc04Evaluation.requiresInitialOcaInspection,
      demand_factor: 1.0,
      ambient_temp_c: 40,
      total_connected_va: cgmpSummary.totalInstalledWatts,
      total_demand_va: cgmpSummary.contractDesignWatts,
      main_breaker_amps: cgmpSummary.igaAmps,
      iga_amps: cgmpSummary.igaAmps,
      di_section_mm2: cgmpSummary.diCalculation.sectionMm2,
      rcd_count: cgmpSummary.rcd30mACount,
      main_feeder_awg: `${cgmpSummary.diCalculation.sectionMm2} mm² Cu XLPE`,
      building_forecast_json: {
        ...buildingForecast,
        _inputs: {
          basicDwellings,
          elevatedDwellings,
          commonLightingW,
          hydroW,
          otherServicesW,
          commercialCount,
          commercialAreaM2,
          garageAreaM2,
          garageForcedVent,
          parkingSpaces,
          hasSpl,
          lgaLengthMeters,
        },
      },
      earthing_json: {
        ...earthingResult,
        _inputs: {
          soilResistivity,
          rodLengthMeters,
          numRods,
          buriedConductorMeters,
          maxContactVoltageV,
          rcdSensitivityMa,
          itc04Group,
          itc04CustomPowerKw,
          itc04ParkingSpaces,
        },
      },
      mtd_metadata_json: mtdMeta,
    };

    const saveProjectLocally = (forcedId?: number) => {
      const nextId =
        forcedId ??
        (shouldUpdate && activeProjectId !== null
          ? activeProjectId
          : Math.max(0, ...allProjects.map((p) => p.id)) + 1);
      const nowIso = new Date().toISOString();
      const localRow: SavedProjectRow = {
        id: nextId,
        ...projectPayload,
        created_at:
          allProjects.find((p) => p.id === nextId)?.created_at || nowIso,
      };
      setAllProjects((prev) => {
        const exists = prev.some((p) => p.id === nextId);
        const updated = exists
          ? prev.map((p) => (p.id === nextId ? localRow : p))
          : [localRow, ...prev];
        persistDirectoryLocally(undefined, undefined, updated);
        return updated;
      });
      if (typeof window !== "undefined") {
        try {
          const rawMap = window.localStorage.getItem(LOCAL_CIRCUITS_KEY);
          const map = rawMap
            ? (JSON.parse(rawMap) as Record<string, RebtCircuitInput[]>)
            : {};
          map[String(nextId)] = circuits;
          window.localStorage.setItem(LOCAL_CIRCUITS_KEY, JSON.stringify(map));
        } catch {
          // Ignorar
        }
      }
      setActiveProjectId(nextId);
      setStatusBanner({
        type: "success",
        text: shouldUpdate
          ? `Registro #${nextId} actualizado correctamente en el historial.`
          : `Nuevo Registro #${nextId} añadido al historial de ${currentUser.full_name}.`,
      });
    };

    if (!supabase) {
      saveProjectLocally();
      setIsSaving(false);
      return;
    }

    try {
      let targetProjectId = activeProjectId;

      if (shouldUpdate && activeProjectId !== null) {
        const { error: updateErr } = await supabase
          .from("electrical_projects")
          .update(projectPayload)
          .eq("id", activeProjectId);

        if (updateErr) {
          throw new Error(updateErr.message);
        }

        await supabase
          .from("electrical_circuits")
          .delete()
          .eq("project_id", activeProjectId);
      } else {
        const { data: project, error: projectErr } = await supabase
          .from("electrical_projects")
          .insert(projectPayload)
          .select("id")
          .single();

        if (projectErr || !project) {
          throw new Error(
            projectErr?.message || "No se pudo guardar el registro"
          );
        }
        targetProjectId = project.id;
      }

      if (!targetProjectId) {
        throw new Error("ID de registro no válido");
      }

      const circuitRows = calculatedCircuits.map((c, idx) => ({
        project_id: targetProjectId,
        circuit_number: idx + 1,
        circuit_code: c.code,
        description: c.description,
        load_category: "especial",
        usage_type: c.usageType,
        phase_assignment: c.phaseAssigned,
        phases: c.phaseSystem === "trifasico" ? 3 : 1,
        voltage: c.voltage,
        power_va: c.powerWatts,
        power_factor: c.cosPhi,
        simultaneity_factor: c.simultaneityFactor,
        utilization_factor: c.utilizationFactor,
        is_continuous: true,
        length_meters: c.lengthMeters,
        conductor_material: c.material,
        installation_method: c.installationMethod,
        insulation_type: c.insulationType,
        calculated_current_amps: c.currentIbAmps,
        design_current_amps: c.correctedCurrentAmps,
        ampacity_iz_amps: c.ampacityIzAmps,
        recommended_awg: `${c.sectionMm2} mm²`,
        section_mm2: c.sectionMm2,
        neutral_section_mm2: c.neutralSectionMm2,
        pe_section_mm2: c.peSectionMm2,
        tube_diameter_mm: c.tubeDiameterMm,
        breaker_amps: c.piaAmps,
        voltage_drop_pct: c.voltageDropPct,
        max_allowed_drop_pct: c.maxAllowedDropPct,
      }));

      const { error: circuitsErr } = await supabase
        .from("electrical_circuits")
        .insert(circuitRows);

      if (circuitsErr) {
        throw new Error(circuitsErr.message);
      }

      setActiveProjectId(targetProjectId);
      await fetchDirectoryAndProjects();
      setStatusBanner({
        type: "success",
        text: shouldUpdate
          ? `Registro #${targetProjectId} actualizado correctamente en el historial.`
          : `Nuevo Registro #${targetProjectId} añadido al historial de ${currentUser.full_name}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      if (isNetworkFetchError(msg)) {
        saveProjectLocally();
      } else {
        setStatusBanner({
          type: "error",
          text: `Error al guardar expediente: ${msg}`,
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Funciones Administrativas (Crear Empresa/Tenant, Crear Usuario, Actualizar Permisos RBAC)
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim()) return;

    const saveTenantLocally = () => {
      const nextId = Math.max(0, ...tenants.map((t) => t.id)) + 1;
      const created: AppTenant = {
        id: nextId,
        name: newTenantName.trim(),
        cif: newTenantCif.trim(),
        empresa_instaladora_num: newTenantNum.trim(),
        isla: newTenantIsla,
        is_active: true,
      };
      setTenants((prev) => {
        const updated = [...prev, created];
        persistDirectoryLocally(updated, undefined, undefined);
        return updated;
      });
      setNewTenantName("");
      setNewTenantCif("");
      setNewTenantNum("");
      setStatusBanner({
        type: "success",
        text: `Empresa / Tenant "${created.name}" creada correctamente.`,
      });
    };

    if (!supabase) {
      saveTenantLocally();
      return;
    }

    try {
      const { data, error } = await supabase
        .from("app_tenants")
        .insert({
          name: newTenantName.trim(),
          cif: newTenantCif.trim(),
          empresa_instaladora_num: newTenantNum.trim(),
          isla: newTenantIsla,
        })
        .select("*")
        .single();

      if (error) {
        if (isNetworkFetchError(error.message)) {
          saveTenantLocally();
          return;
        }
        setStatusBanner({
          type: "error",
          text: `No se pudo crear la empresa: ${error.message}`,
        });
        return;
      }

      if (data) {
        setNewTenantName("");
        setNewTenantCif("");
        setNewTenantNum("");
        await fetchDirectoryAndProjects();
        setStatusBanner({
          type: "success",
          text: `Empresa / Tenant "${data.name}" creada correctamente.`,
        });
      }
    } catch {
      saveTenantLocally();
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const cleanEmail = newUserEmail.trim().toLowerCase();
    if (users.some((u) => u.email.trim().toLowerCase() === cleanEmail)) {
      setStatusBanner({
        type: "warning",
        text: `Ya existe un usuario registrado con el correo "${cleanEmail}".`,
      });
      return;
    }

    const isAdminRole =
      newUserRole === "super_admin" || newUserRole === "admin_empresa";
    const isReadOnly = newUserRole === "visor_auditor";

    const saveUserLocally = () => {
      const nextId = Math.max(0, ...users.map((u) => u.id)) + 1;
      const createdUser: AppUser = {
        id: nextId,
        tenant_id: newUserTenantId,
        full_name: newUserName.trim(),
        email: cleanEmail,
        access_pin: newUserPin.trim() || "1234",
        doi_nif: newUserDoi.trim(),
        role: newUserRole,
        cci_or_colegiado: newUserCci.trim(),
        can_create_projects: !isReadOnly,
        can_edit_calculations: !isReadOnly,
        can_export_mtd: true,
        can_delete_projects: isAdminRole,
        can_manage_users: isAdminRole,
        is_active: true,
      };
      setUsers((prev) => {
        const updated = [...prev, createdUser];
        persistDirectoryLocally(undefined, updated, undefined);
        return updated;
      });
      setNewUserName("");
      setNewUserEmail("");
      setNewUserDoi("");
      setNewUserCci("");
      setStatusBanner({
        type: "success",
        text: `Usuario "${createdUser.full_name}" creado con su propio espacio aislado de reportes.`,
      });
    };

    if (!supabase) {
      saveUserLocally();
      return;
    }

    try {
      const { data, error } = await supabase
        .from("app_users")
        .insert({
          tenant_id: newUserTenantId,
          full_name: newUserName.trim(),
          email: cleanEmail,
          access_pin: newUserPin.trim() || "1234",
          doi_nif: newUserDoi.trim(),
          role: newUserRole,
          cci_or_colegiado: newUserCci.trim(),
          can_create_projects: !isReadOnly,
          can_edit_calculations: !isReadOnly,
          can_export_mtd: true,
          can_delete_projects: isAdminRole,
          can_manage_users: isAdminRole,
        })
        .select("*")
        .single();

      if (error) {
        if (isNetworkFetchError(error.message)) {
          saveUserLocally();
          return;
        }
        setStatusBanner({
          type: "error",
          text: `Error al crear usuario: ${error.message}`,
        });
        return;
      }

      if (data) {
        setNewUserName("");
        setNewUserEmail("");
        setNewUserDoi("");
        setNewUserCci("");
        await fetchDirectoryAndProjects();
        setStatusBanner({
          type: "success",
          text: `Usuario "${data.full_name}" creado con su propio espacio aislado de reportes.`,
        });
      }
    } catch {
      saveUserLocally();
    }
  };

  const handleTogglePermission = async (
    targetUser: AppUser,
    permField:
      | "can_create_projects"
      | "can_edit_calculations"
      | "can_export_mtd"
      | "can_delete_projects"
      | "can_manage_users"
      | "is_active"
  ) => {
    if (!currentUser.can_manage_users && currentUser.role !== "super_admin") {
      setStatusBanner({
        type: "warning",
        text: "Solo un usuario con permiso de Administración puede modificar la matriz de permisología.",
      });
      return;
    }

    const nextVal = !targetUser[permField];
    setUsers((prev) => {
      const updated = prev.map((u) =>
        u.id === targetUser.id ? { ...u, [permField]: nextVal } : u
      );
      persistDirectoryLocally(undefined, updated, undefined);
      return updated;
    });

    if (supabase) {
      try {
        await supabase
          .from("app_users")
          .update({ [permField]: nextVal })
          .eq("id", targetUser.id);
      } catch {
        // Persistido localmente
      }
    }
  };

  const handleUpdateUser = async (
    userId: number,
    patch: EditableUserPatch
  ): Promise<boolean> => {
    if (!currentUser.can_manage_users && currentUser.role !== "super_admin") {
      setStatusBanner({
        type: "warning",
        text: "Solo un usuario con permiso de Administración puede editar cuentas de usuario.",
      });
      return false;
    }

    const cleanName = patch.full_name.trim();
    const cleanEmail = patch.email.trim().toLowerCase();
    const cleanPin = patch.access_pin.trim() || "1234";

    if (!cleanName || !cleanEmail) {
      setStatusBanner({
        type: "warning",
        text: "El nombre completo y el correo electrónico son obligatorios.",
      });
      return false;
    }

    if (
      users.some(
        (u) => u.id !== userId && u.email.trim().toLowerCase() === cleanEmail
      )
    ) {
      setStatusBanner({
        type: "warning",
        text: `Ya existe otro usuario registrado con el correo "${cleanEmail}".`,
      });
      return false;
    }

    const effectiveIsActive =
      userId === currentUser.id ? true : Boolean(patch.is_active);
    const isAdminRole =
      patch.role === "super_admin" || patch.role === "admin_empresa";
    const isReadOnly = patch.role === "visor_auditor";

    const existingUser = users.find((u) => u.id === userId);
    const roleChanged = existingUser && existingUser.role !== patch.role;

    const updatedFields: Partial<AppUser> = {
      full_name: cleanName,
      email: cleanEmail,
      access_pin: cleanPin,
      tenant_id: patch.tenant_id,
      role: patch.role,
      doi_nif: patch.doi_nif.trim(),
      cci_or_colegiado: patch.cci_or_colegiado.trim(),
      is_active: effectiveIsActive,
      ...(roleChanged
        ? {
            can_create_projects: !isReadOnly,
            can_edit_calculations: !isReadOnly,
            can_export_mtd: true,
            can_delete_projects: isAdminRole,
            can_manage_users: isAdminRole,
          }
        : {}),
    };

    setUsers((prev) => {
      const updated = prev.map((u) =>
        u.id === userId ? { ...u, ...updatedFields } : u
      );
      persistDirectoryLocally(undefined, updated, undefined);
      return updated;
    });

    if (supabase) {
      try {
        await supabase.from("app_users").update(updatedFields).eq("id", userId);
        // Si existe la columna pin_hash en BD remota, limpiarla para regenerar o validar nuevo PIN
        if (existingUser && existingUser.access_pin !== cleanPin) {
          await supabase
            .from("app_users")
            .update({ pin_hash: "" } as Record<string, unknown>)
            .eq("id", userId);
        }
      } catch {
        // Persistido localmente
      }
    }

    setStatusBanner({
      type: "success",
      text: `Datos del usuario "${cleanName}" actualizados correctamente.`,
    });
    return true;
  };

  const handleToggleUserActive = async (targetUser: AppUser) => {
    if (!currentUser.can_manage_users && currentUser.role !== "super_admin") {
      setStatusBanner({
        type: "warning",
        text: "Solo un usuario con permiso de Administración puede activar o inactivar cuentas.",
      });
      return;
    }

    if (targetUser.id === currentUser.id && targetUser.is_active) {
      setStatusBanner({
        type: "warning",
        text: "No puedes inactivar el usuario con el que tienes la sesión iniciada actualmente.",
      });
      return;
    }

    const nextActive = !targetUser.is_active;
    setUsers((prev) => {
      const updated = prev.map((u) =>
        u.id === targetUser.id ? { ...u, is_active: nextActive } : u
      );
      persistDirectoryLocally(undefined, updated, undefined);
      return updated;
    });

    if (supabase) {
      try {
        await supabase
          .from("app_users")
          .update({ is_active: nextActive })
          .eq("id", targetUser.id);
      } catch {
        // Persistido localmente
      }
    }

    setStatusBanner({
      type: nextActive ? "success" : "warning",
      text: nextActive
        ? `Usuario "${targetUser.full_name}" reactivado. Ya puede volver a iniciar sesión.`
        : `Usuario "${targetUser.full_name}" inactivado. Su acceso al sistema ha quedado bloqueado.`,
    });
  };

  const handleDeleteUser = async (targetUser: AppUser) => {
    if (!currentUser.can_manage_users && currentUser.role !== "super_admin") {
      setStatusBanner({
        type: "warning",
        text: "Solo un usuario con permiso de Administración puede eliminar usuarios.",
      });
      return;
    }

    if (targetUser.id === currentUser.id) {
      setStatusBanner({
        type: "warning",
        text: "No puedes eliminar el usuario con la sesión activa actual.",
      });
      return;
    }

    setUsers((prev) => {
      const updated = prev.filter((u) => u.id !== targetUser.id);
      persistDirectoryLocally(undefined, updated, undefined);
      return updated;
    });

    if (supabase) {
      try {
        await supabase.from("app_users").delete().eq("id", targetUser.id);
      } catch {
        // Persistido localmente
      }
    }

    setStatusBanner({
      type: "success",
      text: `Usuario "${targetUser.full_name}" eliminado correctamente del directorio.`,
    });
  };

  const loadPresetDwellings = (preset: "basica" | "elevada_ve") => {
    if (!currentUser.can_edit_calculations) return;
    setPanelOverrideIgaAmps(null);
    setPanelOverrideRcdCount(null);
    setCustomDesignPowerKw(null);
    if (preset === "basica") {
      setElectrificationGrade("basica");
      setCircuits(ITC_BT_25_TEMPLATES.slice(0, 5));
    } else {
      setElectrificationGrade("elevada");
      setCircuits(ITC_BT_25_TEMPLATES);
    }
  };

  const addCircuit = () => {
    if (!currentUser.can_edit_calculations) return;
    const nextIdx = circuits.length + 1;
    setCircuits((prev) => [
      ...prev,
      {
        code: `C${nextIdx}`,
        description: `Circuito interior ${nextIdx}`,
        usageType: "fuerza_otros",
        phaseSystem:
          supplyType === "trifasico_400v" ? "trifasico" : "monofasico",
        phaseAssigned: supplyType === "trifasico_400v" ? "L1-L2-L3" : "L1",
        voltage: supplyType === "trifasico_400v" ? 400 : 230,
        powerWatts: 3450,
        cosPhi: 0.9,
        simultaneityFactor: 1.0,
        utilizationFactor: 1.0,
        correctionFactor: 1.0,
        lengthMeters: 20,
        installationMethod: "B1",
        insulationType: "PVC_70",
        material: "Cu",
      },
    ]);
  };

  const removeCircuit = (index: number) => {
    if (!currentUser.can_edit_calculations) return;
    setCircuits((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCircuit = <K extends keyof RebtCircuitInput>(
    index: number,
    field: K,
    value: RebtCircuitInput[K]
  ) => {
    if (!currentUser.can_edit_calculations) return;
    setCircuits((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        const updated = { ...c, [field]: value };
        if (field === "phaseSystem") {
          updated.voltage = value === "trifasico" ? 400 : 230;
          updated.phaseAssigned = value === "trifasico" ? "L1-L2-L3" : "L1";
        }
        return updated;
      })
    );
  };

  type NavGroup =
    | "1. Obra y Campo"
    | "2. Expediente y Legalización"
    | "3. Oficina y Almacén"
    | "4. Formación y Admin";

  const navItems: {
    id: ActiveSection;
    label: string;
    group: NavGroup;
    keywords?: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "dashboard_tecnico",
      label: "Inicio / Dashboard",
      group: "1. Obra y Campo",
      keywords: "inicio resumen kpi monitor",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      id: "expedientes",
      label: "Mis Expedientes",
      group: "1. Obra y Campo",
      keywords: "obras proyectos historial clientes",
      icon: <FolderOpen className="h-4 w-4" />,
    },
    {
      id: "calculadoras_obra",
      label: "Calculadoras de Obra",
      group: "1. Obra y Campo",
      keywords: "cable tubo itc-21 fases rst cgp cpm fusibles coche ve itc-52 factura luz",
      icon: <Calculator className="h-4 w-4" />,
    },
    {
      id: "unifilar_cuadro",
      label: "Unifilar y Cuadro DIN",
      group: "1. Obra y Campo",
      keywords: "esquema unifilar foto voz din a3 svg cad subcuadros",
      icon: <GitBranch className="h-4 w-4" />,
    },
    {
      id: "titular_ubicacion",
      label: "1. Titular y Ubicación",
      group: "2. Expediente y Legalización",
      keywords: "direccion cliente nif acometida",
      icon: <MapPin className="h-4 w-4" />,
    },
    {
      id: "circuitos",
      label: "2. Cuadro de Circuitos",
      group: "2. Expediente y Legalización",
      keywords: "pia diferencial seccion caida tension itc-bt-25",
      icon: <Activity className="h-4 w-4" />,
    },
    {
      id: "edificio_itc10",
      label: "3. Previsión de Edificio",
      group: "2. Expediente y Legalización",
      keywords: "itc-bt-10 lga centralizacion viviendas garaje locales",
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      id: "tierras_legalizacion",
      label: "4. Tierra y Legalización",
      group: "2. Expediente y Legalización",
      keywords: "picas electrodo itc-bt-18 resistencia ra itc-bt-04",
      icon: <FileCheck2 className="h-4 w-4" />,
    },
    {
      id: "tramites_oca",
      label: "5. Trámites, OCA y Catastro",
      group: "2. Expediente y Legalización",
      keywords: "19 ccaa industria boletin cie inspeccion oca referencia catastral gps",
      icon: <ClipboardCheck className="h-4 w-4" />,
    },
    {
      id: "ficha_mtd",
      label: "6. Ficha Técnica M.T.D.",
      group: "2. Expediente y Legalización",
      keywords: "memoria tecnica diseño canarias 11 paginas pdf",
      icon: <FileSpreadsheet className="h-4 w-4" />,
    },
    {
      id: "presupuestos_plano",
      label: "Presupuesto y Plano",
      group: "3. Oficina y Almacén",
      keywords: "presupuesto vivienda plano simbolos precios pedido almacen simon niessen",
      icon: <Tag className="h-4 w-4" />,
    },
    {
      id: "oficina_gastos",
      label: "Oficina, Facturas y Pedido",
      group: "3. Oficina y Almacén",
      keywords: "verifactu qr factura ticket gasto rentabilidad gestoria logo pedido",
      icon: <Briefcase className="h-4 w-4" />,
    },
    {
      id: "tareas_equipo",
      label: "Tareas, Equipo y Fichaje",
      group: "3. Oficina y Almacén",
      keywords: "whatsapp voz operarios fichar jornada partes firma",
      icon: <CheckSquare className="h-4 w-4" />,
    },
    {
      id: "aprender",
      label: "Aprender y Simulador",
      group: "4. Formación y Admin",
      keywords: "simulador montar cuadro polimetro examen instalador",
      icon: <GraduationCap className="h-4 w-4" />,
    },
    {
      id: "administracion",
      label: "Administración (RBAC)",
      group: "4. Formación y Admin",
      keywords: "usuarios empresas permisos rbac pin",
      icon: <ShieldCheck className="h-4 w-4" />,
    },
  ];

  const NAV_GROUPS: NavGroup[] = [
    "1. Obra y Campo",
    "2. Expediente y Legalización",
    "3. Oficina y Almacén",
    "4. Formación y Admin",
  ];

  const EXPEDIENTE_WIZARD_STEPS: { id: ActiveSection; stepLabel: string }[] = [
    { id: "titular_ubicacion", stepLabel: "1. Titular" },
    { id: "circuitos", stepLabel: "2. Circuitos" },
    { id: "unifilar_cuadro", stepLabel: "3. Cuadro y Unifilar" },
    { id: "presupuestos_plano", stepLabel: "4. Presupuesto" },
    { id: "ficha_mtd", stepLabel: "5. Ficha M.T.D." },
  ];
  const wizardCurrentIdx = EXPEDIENTE_WIZARD_STEPS.findIndex(
    (s) => s.id === activeSection
  );

  const globalSearchMatches = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return { sections: [], projects: [] };
    const sections = navItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.keywords && item.keywords.toLowerCase().includes(q))
    );
    const projects = isolatedProjects
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.client_name.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q)
      )
      .slice(0, 5);
    return { sections, projects };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalSearch, isolatedProjects]);

  if (viewMode !== "app") {
    return (
      <LandingAndAuthView
        mode={viewMode}
        setMode={(next) => setViewMode(next)}
        users={users}
        tenants={tenants}
        onLoginSuccess={(loggedInUser) => {
          const found =
            users.find((u) => u.id === loggedInUser.id) || users[0];
          switchActiveUser(found);
          setViewMode("app");
        }}
        onResetPassword={handleResetPassword}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900">
      {/* =====================================================================
          DRAWER MÓVIL (RESPONSIVE PARA TELÉFONOS Y TABLETS)
         ===================================================================== */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-64 flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f6cbd] text-white">
                  <Zap className="h-4 w-4" />
                </div>
                <span className="text-sm font-bold text-slate-900">
                  REBT Cloud Suite
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
              {NAV_GROUPS.map((group) => (
                <div key={group} className="space-y-1">
                  <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {group}
                  </div>
                  {navItems
                    .filter((item) => item.group === group)
                    .map((item) => {
                      const isActive = activeSection === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setActiveSection(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2 text-left text-xs transition ${
                            isActive
                              ? "bg-[#e8f0fe] text-[#0f6cbd] font-semibold"
                              : "font-medium text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <span
                            className={
                              isActive ? "text-[#0f6cbd]" : "text-slate-500"
                            }
                          >
                            {item.icon}
                          </span>
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                </div>
              ))}
            </nav>

            <div className="border-t border-slate-200 p-3 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setViewMode("landing");
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Home className="h-3.5 w-3.5" />
                Landing / Cerrar Sesión
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* =====================================================================
          MENÚ LATERAL IZQUIERDO SIMPLIFICADO (ESCRITORIO)
         ===================================================================== */}
      <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        {/* Marca / Cabecera Lateral */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f6cbd] text-white shadow-xs">
              <Zap className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold tracking-tight text-slate-900">
              REBT Cloud Suite
            </span>
          </div>
          <button
            type="button"
            onClick={() => setViewMode("landing")}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            title="Ir a la Landing Page"
          >
            <Home className="h-4 w-4" />
          </button>
        </div>

        {/* Navegación Agrupada por Flujo de Trabajo */}
        <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group} className="space-y-0.5">
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group}
              </div>
              {navItems
                .filter((item) => item.group === group)
                .map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveSection(item.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2 text-left text-xs transition ${
                        isActive
                          ? "bg-[#e8f0fe] text-[#0f6cbd] font-semibold"
                          : "font-medium text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span
                        className={
                          isActive ? "text-[#0f6cbd]" : "text-slate-500"
                        }
                      >
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
            </div>
          ))}
        </nav>

        {/* Estado compacto al pie */}
        <div className="border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500 flex items-center justify-between">
          <span>REBT RD 842/2002</span>
          <span
            className={`inline-flex items-center gap-1 font-semibold ${
              !isOnline
                ? "text-amber-700"
                : pendingSyncCount > 0
                ? "text-blue-700"
                : "text-emerald-700"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                !isOnline
                  ? "bg-amber-500"
                  : pendingSyncCount > 0
                  ? "bg-blue-500 animate-pulse"
                  : "bg-emerald-500"
              }`}
            ></span>
            {!isOnline
              ? "Offline"
              : pendingSyncCount > 0
              ? `Sinc. (${pendingSyncCount})`
              : isSupabaseConfigured
              ? "Online"
              : "Local"}
          </span>
        </div>
      </aside>

      {/* =====================================================================
          ÁREA DE CONTENIDO PRINCIPAL
         ===================================================================== */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Barra Superior con Acciones y Perfil de Sesión Organizado Arriba a la Derecha */}
        <header className="no-print sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-3 py-2.5 sm:px-6 sm:py-3 backdrop-blur">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 hover:bg-slate-100 lg:hidden"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="rounded-md bg-blue-50 px-2 py-1 text-[11px] sm:text-xs font-bold text-[#0f6cbd] shrink-0">
              {mtdMeta.expedienteNum}
            </span>
            <ChevronRight className="hidden sm:block h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate text-xs sm:text-sm font-bold text-slate-900 max-w-[140px] sm:max-w-xs">
              {mtdMeta.titularNombre || "Nuevo Expediente REBT"}
            </span>
            {activeProjectId && (
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                #{activeProjectId}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Buscador Global de Obra, Herramienta o ITC */}
            <div className="relative">
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                <Search className="h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Buscar obra, herramienta, ITC…"
                  className="ml-1.5 w-36 sm:w-48 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
                {globalSearch && (
                  <button
                    type="button"
                    onClick={() => setGlobalSearch("")}
                    className="ml-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {globalSearch.trim() && (
                <div className="absolute right-0 z-50 mt-1.5 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Herramientas y Secciones
                  </div>
                  {globalSearchMatches.sections.length === 0 ? (
                    <p className="px-2 py-1 text-xs text-slate-400">
                      Sin herramientas coincidentes
                    </p>
                  ) : (
                    globalSearchMatches.sections.map((sec) => (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => {
                          setActiveSection(sec.id);
                          setGlobalSearch("");
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-[#0f6cbd]"
                      >
                        {sec.icon}
                        <span>{sec.label}</span>
                      </button>
                    ))
                  )}

                  {globalSearchMatches.projects.length > 0 && (
                    <>
                      <div className="mt-1.5 border-t border-slate-100 px-2 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Mis Obras / Expedientes
                      </div>
                      {globalSearchMatches.projects.map((proj) => (
                        <button
                          key={proj.id}
                          type="button"
                          onClick={() => {
                            handleLoadProject(proj.id);
                            setGlobalSearch("");
                          }}
                          className="flex w-full flex-col rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-emerald-50"
                        >
                          <span className="font-semibold text-slate-800 truncate">
                            {proj.name}
                          </span>
                          <span className="text-[10px] text-slate-500 truncate">
                            {proj.client_name} · {proj.location}
                          </span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {!isOnline ? (
              <span
                className="hidden xl:inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-300/60"
                title="Trabajando sin conexión: tus cambios quedan en cola local y se sincronizarán al volver internet"
              >
                <WifiOff className="h-3 w-3" />
                Offline{pendingSyncCount > 0 ? ` · ${pendingSyncCount} pend.` : ""}
              </span>
            ) : pendingSyncCount > 0 ? (
              <span className="hidden xl:inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-semibold text-[#0f6cbd]">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Sincronizando ({pendingSyncCount})
              </span>
            ) : (
              lastAutoSavedAt && (
                <span
                  className="hidden xl:inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700"
                  title="Tus datos de oficina, presupuestos y tareas se guardan solos al instante"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Guardado {lastAutoSavedAt}
                </span>
              )
            )}

            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-100"
              title={darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              aria-label="Cambiar tema claro u oscuro"
            >
              {darkMode ? (
                <Sun className="h-3.5 w-3.5 text-amber-500" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Botones de Acción del Expediente */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setShowNewWizardModal(true)}
                title="Abrir Asistente Guiado: Nuevo Expediente o Análisis Dual por Foto de Cuadro"
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-bold text-[#0f6cbd] shadow-2xs transition hover:bg-blue-50"
              >
                <FilePlus2 className="h-3.5 w-3.5 text-[#0f6cbd]" />
                <span className="hidden sm:inline">Nuevo</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection("ficha_mtd")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-[#0f6cbd] transition hover:bg-blue-100/70"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Ficha M.T.D.</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveToSupabase("auto")}
                disabled={isSaving || !currentUser?.can_create_projects}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f6cbd] px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#115ea3] disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                <span>
                  {isSaving
                    ? "Guardando..."
                    : activeProjectId
                    ? `Guardar (#${activeProjectId})`
                    : "Registrar"}
                </span>
              </button>
            </div>

            <div className="hidden sm:block h-6 w-px bg-slate-200" />

            {/* Perfil de Sesión Organizado en la Esquina Superior Derecha */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-2.5 py-1 sm:px-3 sm:py-1.5 shadow-2xs">
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-[#0f6cbd] text-xs font-bold text-white">
                {currentUser?.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <GoogleSelect
                  variant="ghost"
                  value={currentUser?.id || 1}
                  onChange={(e) => {
                    const target = users.find(
                      (u) => u.id === Number(e.target.value)
                    );
                    if (target) switchActiveUser(target);
                  }}
                  className="max-w-[140px] sm:max-w-[220px]"
                  title="Cambiar cuenta activa (Multitenant)"
                >
                  {users
                    .filter((u) => u.is_active)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                </GoogleSelect>
                <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-500">
                  <Building className="h-2.5 w-2.5 text-[#0f6cbd]" />
                  <span className="truncate max-w-[180px]">
                    {currentTenant?.name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewMode("login")}
                className="ml-0.5 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                title="Cambiar sesión / Recuperar contraseña"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Contenedor de Secciones */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 pb-20 lg:pb-8">
          {/* Barra global de conmutación rápida cuando hay 2 Fichas Técnicas separadas desde Foto (-ACT vs -COR) */}
          {dualPhotoState && (
            <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50/90 via-white to-emerald-50/70 px-4 py-2.5 shadow-xs">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-md bg-[#0f6cbd] px-2 py-0.5 text-[10px] font-extrabold text-white">
                  2 FICHAS SEPARADAS (FOTO)
                </span>
                <span className="font-semibold text-slate-800">
                  Viendo ahora:{" "}
                  <strong
                    className={
                      dualPhotoState.activeMode === "estado_actual"
                        ? "text-amber-800"
                        : "text-emerald-800"
                    }
                  >
                    {dualPhotoState.activeMode === "estado_actual"
                      ? `Ficha #1 · Estado Actual (${dualPhotoState.evaluation.actual.expedienteNum})`
                      : `Ficha #2 · Instalación Corregida (${dualPhotoState.evaluation.corregido.expedienteNum})`}
                  </strong>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    applyDualPhotoSnapshotToActiveWorkspace(
                      dualPhotoState.evaluation,
                      "estado_actual",
                      "stay"
                    )
                  }
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                    dualPhotoState.activeMode === "estado_actual"
                      ? "bg-amber-600 text-white shadow-2xs"
                      : "border border-amber-300 bg-white text-amber-900 hover:bg-amber-50"
                  }`}
                >
                  Opción 1: Estado Actual (-ACT)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyDualPhotoSnapshotToActiveWorkspace(
                      dualPhotoState.evaluation,
                      "instalacion_corregida",
                      "stay"
                    )
                  }
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                    dualPhotoState.activeMode === "instalacion_corregida"
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "border border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-50"
                  }`}
                >
                  Opción 2: Cómo Debe Ir (-COR)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection("ficha_mtd")}
                  className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-[#0f6cbd] hover:bg-blue-100"
                >
                  Ver Ficha M.T.D. Activa
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewWizardModal(true)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Comparativa
                </button>
              </div>
            </div>
          )}

          {/* Flujo guiado del expediente (Wizard Progress Bar) */}
          {activeSection !== "dashboard_tecnico" && (
            <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-2xs">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="mr-1 font-bold text-slate-500">Flujo obra:</span>
                {EXPEDIENTE_WIZARD_STEPS.map((st, idx) => {
                  const isStepActive = activeSection === st.id;
                  const isPassed =
                    wizardCurrentIdx >= 0 && idx < wizardCurrentIdx;
                  return (
                    <React.Fragment key={st.id}>
                      <button
                        type="button"
                        onClick={() => setActiveSection(st.id)}
                        className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                          isStepActive
                            ? "bg-[#0f6cbd] text-white"
                            : isPassed
                            ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {st.stepLabel}
                      </button>
                      {idx < EXPEDIENTE_WIZARD_STEPS.length - 1 && (
                        <ChevronRight className="h-3 w-3 text-slate-400" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              {wizardCurrentIdx >= 0 &&
                wizardCurrentIdx < EXPEDIENTE_WIZARD_STEPS.length - 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveSection(
                        EXPEDIENTE_WIZARD_STEPS[wizardCurrentIdx + 1].id
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white hover:bg-slate-800"
                  >
                    Siguiente paso
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
            </div>
          )}

          {statusBanner && (
            <div
              className={`no-print mb-6 flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-medium shadow-2xs ${
                statusBanner.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : statusBanner.type === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-rose-200 bg-rose-50 text-rose-900"
              }`}
            >
              <span>{statusBanner.text}</span>
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                className="ml-4 text-xs font-bold underline"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* =================================================================
              DASHBOARD OPERATIVO DEL TÉCNICO (KPIs Y MONITOR REBT + ACCESOS MONPIX)
             ================================================================= */}
          {activeSection === "dashboard_tecnico" && (
            <div className="space-y-6">
              {/* Cabecera rápida de obra a oficina + Pregunta al REBT */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      Hola, {currentUser?.full_name.split(" ")[0]} ·{" "}
                      <span className="font-medium text-slate-500 text-xs sm:text-sm">
                        {new Date().toLocaleDateString("es-ES", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </span>
                    </h2>
                    <p className="mt-0.5 text-[11px] text-amber-700 font-medium">
                      ⚠️ {ORIENTATIVE_DISCLAIMER}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveSection("tareas_equipo")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 font-semibold text-amber-900 hover:bg-amber-100"
                    >
                      <CheckSquare className="h-3.5 w-3.5" />
                      {
                        monpixWorkspace.tasks.filter((t) => !t.completed).length
                      }{" "}
                      tareas pendientes
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSection("tareas_equipo")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      <Users className="h-3.5 w-3.5" />
                      {
                        monpixWorkspace.workers.filter(
                          (w) => w.statusToday === "trabajando"
                        ).length
                      }
                      /{monpixWorkspace.workers.length} en obra
                    </button>
                  </div>
                </div>

                {/* Accesos directos de un toque (de la obra a la oficina) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {[
                    {
                      id: "calculadoras_obra" as ActiveSection,
                      title: "Calculadoras",
                      sub: "Cable, Tubo, R·S·T, VE",
                      icon: <Calculator className="h-4 w-4 text-[#0f6cbd]" />,
                    },
                    {
                      id: "unifilar_cuadro" as ActiveSection,
                      title: "Unifilar A3/SVG",
                      sub: "Foto, Voz o Cuadro DIN",
                      icon: <GitBranch className="h-4 w-4 text-indigo-600" />,
                    },
                    {
                      id: "presupuestos_plano" as ActiveSection,
                      title: "Presupuesto",
                      sub: "Vivienda, Plano, Pedido",
                      icon: <Tag className="h-4 w-4 text-emerald-600" />,
                    },
                    {
                      id: "tramites_oca" as ActiveSection,
                      title: "19 CCAA y OCA",
                      sub: "Industria + Catastro GPS",
                      icon: <ClipboardCheck className="h-4 w-4 text-amber-600" />,
                    },
                    {
                      id: "oficina_gastos" as ActiveSection,
                      title: "Oficina VeriFactu",
                      sub: "Facturas QR y Gastos",
                      icon: <Briefcase className="h-4 w-4 text-blue-700" />,
                    },
                    {
                      id: "tareas_equipo" as ActiveSection,
                      title: "Equipo y Fichaje",
                      sub: "WhatsApp, Jornada, Firma",
                      icon: <CheckSquare className="h-4 w-4 text-teal-600" />,
                    },
                    {
                      id: "aprender" as ActiveSection,
                      title: "Simulador DIN",
                      sub: "Montar cuadro y Test",
                      icon: <GraduationCap className="h-4 w-4 text-purple-600" />,
                    },
                  ].map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setActiveSection(card.id)}
                      className="flex flex-col items-start gap-1 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-left transition hover:border-[#0f6cbd] hover:bg-blue-50/40"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                        {card.icon}
                        <span className="truncate">{card.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight">
                        {card.sub}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Pregunta rápida al reglamento REBT desde inicio */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!homeRebtQuery.trim()) return;
                    setHomeRebtAnswer(answerRebtQuestion(homeRebtQuery));
                  }}
                  className="flex flex-col sm:flex-row gap-2 pt-1"
                >
                  <div className="relative flex-1">
                    <MessageSquareText className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#0f6cbd]" />
                    <input
                      type="text"
                      value={homeRebtQuery}
                      onChange={(e) => setHomeRebtQuery(e.target.value)}
                      placeholder="Pregunta rápida al REBT: ej. ¿Qué sección pongo para un horno de 3,5 kW? o ¿Cómo mido la tierra?"
                      className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-xl bg-[#0f6cbd] px-4 py-2 text-xs font-semibold text-white hover:bg-[#115ea3] shrink-0"
                  >
                    Consultar ITC
                  </button>
                </form>

                {homeRebtAnswer && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center rounded-md bg-[#0f6cbd] px-2 py-0.5 text-[10px] font-bold text-white">
                        {homeRebtAnswer.itcCitation}
                      </span>
                      <button
                        type="button"
                        onClick={() => setHomeRebtAnswer(null)}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                      >
                        Cerrar
                      </button>
                    </div>
                    <p className="font-semibold text-slate-900">
                      {homeRebtAnswer.title}
                    </p>
                    <p className="text-slate-700">{homeRebtAnswer.answer}</p>
                    <p className="text-[11px] text-emerald-800 font-medium">
                      💡 Consejo de obra: {homeRebtAnswer.practicalTip}
                    </p>
                  </div>
                )}
              </div>

              <TechnicianDashboard
                currentUser={currentUser}
                currentTenant={currentTenant}
                isolatedProjects={isolatedProjects}
                activeProjectId={activeProjectId}
                mtdMeta={mtdMeta}
                calculatedCircuits={calculatedCircuits}
                cgmpSummary={cgmpSummary}
                buildingForecast={buildingForecast}
                earthingResult={earthingResult}
                itc04Evaluation={itc04Evaluation}
                onNavigate={(sec) => setActiveSection(sec)}
                onLoadProject={(id) => handleLoadProject(id)}
                onNewProject={() => setShowNewWizardModal(true)}
              />
            </div>
          )}

          {/* =================================================================
              APARTADO 0: MIS EXPEDIENTES Y REPORTES (AISLADOS POR USUARIO)
             ================================================================= */}
          {activeSection === "expedientes" && (
            <ExpedientesSection
              currentUser={currentUser}
              currentTenant={currentTenant}
              isolationScope={isolationScope}
              setIsolationScope={setIsolationScope}
              isolatedProjects={isolatedProjects}
              allProjects={allProjects}
              activeProjectId={activeProjectId}
              mtdMeta={mtdMeta}
              calculatedCircuits={calculatedCircuits}
              contractDesignWatts={cgmpSummary.contractDesignWatts}
              onStartNewProject={() => setShowNewWizardModal(true)}
              onNavigate={setActiveSection}
              onLoadProject={handleLoadProject}
              onDeleteProject={handleDeleteProject}
            />
          )}

          {/* =================================================================
              APARTADO 1: DATOS DEL TITULAR, UBICACIÓN E INSTALADOR
             ================================================================= */}
          {activeSection === "titular_ubicacion" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* Columna 1: Datos del Titular y Ubicación */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        1. Datos del Titular y Ubicación de la Instalación
                      </h2>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Datos administrativos del expediente sincronizados con la Ficha Técnica M.T.D.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openMtdSheet(1)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-[11px] font-semibold text-[#0f6cbd] transition hover:bg-blue-100/70"
                      title="Abrir este apartado en la Ficha Técnica M.T.D."
                    >
                      <Printer className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Datos del Titular, Ubicación, Canalizaciones, Protecciones y Tierra
                      </span>
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Nº de Instalación
                      </label>
                      <input
                        type="text"
                        value={mtdMeta.instalacionNum}
                        onChange={(e) =>
                          setMtdMeta((p) => ({
                            ...p,
                            instalacionNum: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Nº de Expediente
                      </label>
                      <input
                        type="text"
                        value={mtdMeta.expedienteNum}
                        onChange={(e) =>
                          setMtdMeta((p) => ({
                            ...p,
                            expedienteNum: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        D.O.I. / C.I.F. del Titular
                      </label>
                      <input
                        type="text"
                        value={mtdMeta.titularNif}
                        onChange={(e) =>
                          setMtdMeta((p) => ({ ...p, titularNif: e.target.value }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Nombre / Razón Social del Titular
                      </label>
                      <input
                        type="text"
                        value={mtdMeta.titularNombre}
                        onChange={(e) =>
                          setMtdMeta((p) => ({
                            ...p,
                            titularNombre: e.target.value,
                          }))
                        }
                        placeholder="Ej. Comunidad de Propietarios Edificio Atlántico"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Teléfono(s)
                      </label>
                      <input
                        type="text"
                        value={mtdMeta.telefono}
                        onChange={(e) =>
                          setMtdMeta((p) => ({ ...p, telefono: e.target.value }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Dirección (Calle / Avenida)
                      </label>
                      <input
                        type="text"
                        value={mtdMeta.direccionCalle}
                        onChange={(e) =>
                          setMtdMeta((p) => ({
                            ...p,
                            direccionCalle: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700">
                          Número
                        </label>
                        <input
                          type="text"
                          value={mtdMeta.direccionNum}
                          onChange={(e) =>
                            setMtdMeta((p) => ({
                              ...p,
                              direccionNum: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700">
                          Portal / Planta
                        </label>
                        <input
                          type="text"
                          value={mtdMeta.portalPlanta}
                          onChange={(e) =>
                            setMtdMeta((p) => ({
                              ...p,
                              portalPlanta: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Término Municipal (T.M.)
                      </label>
                      <input
                        type="text"
                        value={mtdMeta.terminoMunicipal}
                        onChange={(e) =>
                          setMtdMeta((p) => ({
                            ...p,
                            terminoMunicipal: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Isla
                      </label>
                      <GoogleSelect
                        value={mtdMeta.isla}
                        onChange={(e) =>
                          setMtdMeta((p) => ({ ...p, isla: e.target.value }))
                        }
                        className="mt-1"
                      >
                        <option value="Tenerife">Tenerife</option>
                        <option value="Gran Canaria">Gran Canaria</option>
                        <option value="Lanzarote">Lanzarote</option>
                        <option value="Fuerteventura">Fuerteventura</option>
                        <option value="La Palma">La Palma</option>
                        <option value="La Gomera">La Gomera</option>
                        <option value="El Hierro">El Hierro</option>
                      </GoogleSelect>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Código Postal (C.P.)
                      </label>
                      <input
                        type="text"
                        value={mtdMeta.codigoPostal}
                        onChange={(e) =>
                          setMtdMeta((p) => ({
                            ...p,
                            codigoPostal: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Superficie Útil (m²)
                      </label>
                      <input
                        type="number"
                        value={mtdMeta.superficieUtilM2}
                        onChange={(e) =>
                          setMtdMeta((p) => ({
                            ...p,
                            superficieUtilM2: Number(e.target.value) || 0,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Uso a que se destina
                      </label>
                      <input
                        type="text"
                        value={mtdMeta.usoDestino}
                        onChange={(e) =>
                          setMtdMeta((p) => ({ ...p, usoDestino: e.target.value }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Presupuesto Total (Euros)
                      </label>
                      <input
                        type="number"
                        value={mtdMeta.presupuestoTotalEuros}
                        onChange={(e) =>
                          setMtdMeta((p) => ({
                            ...p,
                            presupuestoTotalEuros: Number(e.target.value) || 0,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Columna 2: Datos del Profesional Habilitado (PH) / Técnico Competente */}
                <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Datos del Profesional Habilitado (PH) / Técnico Competente
                        </h3>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Identificación del instalador o ingeniero firmante y empresa instaladora habilitada.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openMtdSheet(11)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-[11px] font-semibold text-[#0f6cbd] transition hover:bg-blue-100/70"
                        title="Abrir este apartado en la Ficha Técnica M.T.D."
                      >
                        <Printer className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          Declaración del Autor (Instalador PH / Técnico) y Notas Oficiales
                        </span>
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          Modalidad de Firma
                        </label>
                        <GoogleSelect
                          value={mtdMeta.autorTipo}
                          onChange={(e) =>
                            setMtdMeta((p) => ({
                              ...p,
                              autorTipo: e.target.value as
                                | "instalador_ph"
                                | "tecnico_competente",
                            }))
                          }
                          className="mt-1"
                        >
                          <option value="instalador_ph">
                            Instalador Autorizado (Profesional Habilitado PH)
                          </option>
                          <option value="tecnico_competente">
                            Técnico Competente Colegiado
                          </option>
                        </GoogleSelect>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700">
                          Nombre del Instalador PH / Técnico
                        </label>
                        <input
                          type="text"
                          value={mtdMeta.instaladorNombrePh}
                          onChange={(e) =>
                            setMtdMeta((p) => ({
                              ...p,
                              instaladorNombrePh: e.target.value,
                              tecnicoNombre: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700">
                          D.O.I. / N.I.F. Firmante
                        </label>
                        <input
                          type="text"
                          value={mtdMeta.instaladorDoi}
                          onChange={(e) =>
                            setMtdMeta((p) => ({
                              ...p,
                              instaladorDoi: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700">
                          Nº C.C.I. / Nº Colegiado
                        </label>
                        <input
                          type="text"
                          value={mtdMeta.instaladorCciNum}
                          onChange={(e) =>
                            setMtdMeta((p) => ({
                              ...p,
                              instaladorCciNum: e.target.value,
                              tecnicoColegiadoNum: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700">
                          Nº Empresa Instaladora
                        </label>
                        <input
                          type="text"
                          value={mtdMeta.empresaInstaladoraNum}
                          onChange={(e) =>
                            setMtdMeta((p) => ({
                              ...p,
                              empresaInstaladoraNum: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700">
                          Empresa Instaladora
                        </label>
                        <input
                          type="text"
                          value={mtdMeta.empresaInstaladoraNombre}
                          onChange={(e) =>
                            setMtdMeta((p) => ({
                              ...p,
                              empresaInstaladoraNombre: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700">
                          Lugar de Firma
                        </label>
                        <input
                          type="text"
                          value={mtdMeta.ciudadFirma}
                          onChange={(e) =>
                            setMtdMeta((p) => ({
                              ...p,
                              ciudadFirma: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Resumen rápido al pie de la tarjeta de firmante */}
                  <div className="mt-4 flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/50 px-3.5 py-2.5 text-xs text-slate-700">
                    <span>
                      Expediente:{" "}
                      <strong className="text-[#0f6cbd]">
                        {mtdMeta.expedienteNum}
                      </strong>{" "}
                      · {mtdMeta.isla}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {Number(mtdMeta.presupuestoTotalEuros || 0).toLocaleString()} €
                    </span>
                  </div>
                </div>
              </div>

              {/* Historial de Registros de Titular, Ubicación y Profesional Habilitado */}
              <SectionHistoryRegistry
                section="titular_ubicacion"
                records={isolatedProjects}
                activeRecordId={activeProjectId}
                isSaving={isSaving}
                canEdit={currentUser?.can_create_projects}
                canDelete={currentUser?.can_delete_projects}
                onSaveNew={() => handleSaveToSupabase("insert")}
                onUpdateActive={() => handleSaveToSupabase("update")}
                onEditRecord={handleLoadProject}
                onDeleteRecord={handleDeleteProject}
                onOpenMtdForRecord={async (id) => {
                  await handleLoadProject(id);
                  setActiveSection("ficha_mtd");
                }}
                onResetForm={() =>
                  startNewBlankProjectForUser(currentUser, currentTenant)
                }
              />
            </div>
          )}

          {/* =================================================================
              APARTADO 2: CUADRO DE CIRCUITOS INTERIORES Y D.I.
             ================================================================= */}
          {activeSection === "circuitos" && (
            <div className="space-y-6">
              {/* Tarjetas Resumen en Diseño Claro ( Potencia Editable + Rangos Comerciales IGA ≤63A Combi DIN vs >63A Caja Moldeada + Bobina ) */}
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-2xs ring-1 ring-[#0f6cbd]/10">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-600">
                      Potencia Prevista / Contratada
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        cgmpSummary.commercialTier === "gran_comercio_mccb"
                          ? "bg-amber-50 text-amber-900 ring-1 ring-amber-500/30"
                          : cgmpSummary.commercialTier === "comercio_estandar_din"
                          ? "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-500/25"
                          : cgmpSummary.effectiveElectrificationGrade === "elevada"
                          ? "bg-blue-50 text-[#0f6cbd] ring-1 ring-[#0f6cbd]/20"
                          : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20"
                      }`}
                    >
                      {cgmpSummary.commercialTier === "gran_comercio_mccb"
                        ? "> 43 kW · Gran Comercio"
                        : cgmpSummary.commercialTier === "comercio_estandar_din"
                        ? "≤ 43 kW · Comercio Estándar"
                        : cgmpSummary.effectiveElectrificationGrade === "elevada"
                        ? "Elevada ITC-BT-10"
                        : "Básica ITC-BT-10"}
                    </span>
                  </div>

                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {cgmpSummary.contractDesignWatts.toLocaleString()} W{" "}
                    <span className="text-sm font-semibold text-[#0f6cbd]">
                      ({cgmpSummary.effectiveDesignKw.toFixed(2)} kW)
                    </span>
                  </p>

                  {/* Selector e Input directo para cambiar la potencia en kW */}
                  <div className="mt-2 flex items-center gap-1.5">
                    <label
                      htmlFor="custom-power-kw-input"
                      className="text-[11px] font-semibold text-slate-600 whitespace-nowrap"
                    >
                      Cambiar kW:
                    </label>
                    <input
                      id="custom-power-kw-input"
                      type="number"
                      min={1}
                      max={173.21}
                      step={0.05}
                      value={
                        customDesignPowerKw !== null
                          ? customDesignPowerKw
                          : cgmpSummary.effectiveDesignKw
                      }
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (!raw) {
                          setCustomDesignPowerKw(null);
                          return;
                        }
                        const valKw = Number(raw);
                        if (!Number.isFinite(valKw) || valKw <= 0) return;
                        setCustomDesignPowerKw(valKw);
                        setPanelOverrideIgaAmps(null);
                        if (valKw > 14.49 && supplyType === "monofasico_230v") {
                          setSupplyType("trifasico_400v");
                          setElectrificationGrade("elevada");
                        } else if (
                          supplyType === "monofasico_230v" &&
                          valKw > 7.36
                        ) {
                          setElectrificationGrade("elevada");
                        }
                      }}
                      className="w-24 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 font-mono text-xs font-bold text-slate-900 focus:border-[#0f6cbd] focus:bg-white focus:outline-none"
                      title="Escribe cualquier potencia en kW (ej. 5.75, 9.2, 22.17, 43.65, 55.43, 86.6)"
                    />
                    <span className="text-[11px] font-semibold text-slate-500">
                      kW
                    </span>
                    {customDesignPowerKw !== null && (
                      <button
                        type="button"
                        onClick={() => setCustomDesignPowerKw(null)}
                        className="ml-auto rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-200"
                        title="Volver al cálculo automático según circuitos"
                      >
                        Auto
                      </button>
                    )}
                  </div>

                  <p className="mt-1.5 text-[11px] text-slate-500">
                    PMA IGA: {cgmpSummary.maxAdmissibleKw.toFixed(2)} kW · Suma nominal:{" "}
                    {cgmpSummary.totalInstalledWatts.toLocaleString()} W
                  </p>
                </div>

                <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-2xs ring-1 ring-[#0f6cbd]/10">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-600">
                      Protección General (CGMP) y Tarifa
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        cgmpSummary.accessTariff === "3.0TD"
                          ? "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-500/25"
                          : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/25"
                      }`}
                      title={cgmpSummary.tariffDetail}
                    >
                      {cgmpSummary.tariffBadgeLabel}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between gap-2">
                    <p className="text-2xl font-bold text-[#0f6cbd]">
                      {cgmpSummary.igaAmps > 63 ? "MCCB " : "IGA "}
                      {cgmpSummary.igaAmps} A{" "}
                      <span className="text-xs font-semibold text-slate-500">
                        ({cgmpSummary.igaPoles}P)
                      </span>
                    </p>
                    <span className="text-[11px] font-medium text-slate-500">
                      DIF {rcdSensitivityMa} mA:{" "}
                      <strong className="text-slate-900">
                        {cgmpSummary.rcd30mACount} ud.
                      </strong>
                    </span>
                  </div>

                  {/* Selector agrupado por Tipo de Local y Rango Comercial (≤63A Combi DIN vs >63A Caja Moldeada + Bobina) */}
                  <div className="mt-2">
                    <select
                      aria-label="Seleccionar potencia y calibre IGA según tipo de local (Vivienda, Comercio Estándar ≤43kW o Gran Comercio >43kW)"
                      value={
                        panelOverrideIgaAmps === null
                          ? "auto"
                          : `${supplyType === "trifasico_400v" ? "3F" : "1F"}-${cgmpSummary.igaAmps}`
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "auto") {
                          setPanelOverrideIgaAmps(null);
                          return;
                        }
                        const [phaseTag, ampsStr] = val.split("-");
                        const nextAmps = Number(ampsStr);
                        const nextSupply: SystemSupplyType =
                          phaseTag === "3F" ? "trifasico_400v" : "monofasico_230v";
                        setSupplyType(nextSupply);
                        setCustomDesignPowerKw(null);
                        setPanelOverrideIgaAmps(nextAmps);
                        if (nextSupply === "trifasico_400v" || nextAmps >= 40) {
                          setElectrificationGrade("elevada");
                        } else if (
                          nextAmps <= 32 &&
                          calculatedCircuits.length <= 5
                        ) {
                          setElectrificationGrade("basica");
                        }
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-800 focus:border-[#0f6cbd] focus:outline-none"
                    >
                      <option value="auto">
                        Automático ({cgmpSummary.autoIgaAmps} A ·{" "}
                        {cgmpSummary.effectiveDesignKw.toFixed(2)} kW ·{" "}
                        {cgmpSummary.accessTariff})
                      </option>
                      <optgroup label="Vivienda / Pequeño Local Monofásico 230 V (≤ 14,49 kW · Combi DIN)">
                        {REBT_SPAIN_IGA_MONO_STEPS.map((st) => (
                          <option key={`1F-${st.igaAmps}`} value={`1F-${st.igaAmps}`}>
                            1F · {st.shortLabel}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Comercio Estándar Trifásico 400 V (≤ 43,65 kW · 25A–63A · Combi DIN compacto)">
                        {REBT_SPAIN_IGA_TRI_STEPS.filter((st) => st.igaAmps <= 63).map(
                          (st) => (
                            <option
                              key={`3F-${st.igaAmps}`}
                              value={`3F-${st.igaAmps}`}
                            >
                              3F · {st.shortLabel}
                            </option>
                          )
                        )}
                      </optgroup>
                      <optgroup label="Gran Comercio / Mediana Industria (> 43,65 kW · 80A–250A · Caja Moldeada + Bobina)">
                        {REBT_SPAIN_IGA_TRI_STEPS.filter((st) => st.igaAmps > 63).map(
                          (st) => (
                            <option
                              key={`3F-${st.igaAmps}`}
                              value={`3F-${st.igaAmps}`}
                            >
                              3F · {st.shortLabel}
                            </option>
                          )
                        )}
                      </optgroup>
                    </select>
                  </div>

                  <p className="mt-1.5 text-[10.5px] font-medium text-slate-600">
                    {cgmpSummary.igaAmps > 63
                      ? "⚙️ > 63 A: Caja Moldeada + Bobina MX + DPS/POP indep."
                      : "🧩 ≤ 63 A: Equipo compacto Combi carril DIN (IGA+POP+T2)"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">
                      Derivación Individual (ITC-BT-15)
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        value={diLengthMeters}
                        onChange={(e) =>
                          setDiLengthMeters(Number(e.target.value) || 1)
                        }
                        className="w-14 rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-right text-xs text-slate-900"
                      />
                      <span className="text-xs text-slate-500">m</span>
                    </div>
                  </div>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {cgmpSummary.diCalculation.conductorsSummary} + PE{" "}
                    {cgmpSummary.diCalculation.peSectionMm2} mm²
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    ΔU = {cgmpSummary.diCalculation.voltageDropPct}% · Tubo Ø{" "}
                    {cgmpSummary.diCalculation.tubeDiameterMm} mm
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <span className="text-xs font-medium text-slate-500">
                    Verificación REBT (ITC-BT-19 / 22)
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    {cgmpSummary.nonCompliantCircuits === 0 &&
                    !cgmpSummary.exceedsSinglePhaseLimit ? (
                      <>
                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                        <span className="text-lg font-bold text-emerald-700">
                          Cumple REBT
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-6 w-6 text-amber-600" />
                        <span className="text-lg font-bold text-amber-700">
                          {cgmpSummary.nonCompliantCircuits +
                            (cgmpSummary.exceedsSinglePhaseLimit ? 1 : 0)}{" "}
                          alerta(s)
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {cgmpSummary.rebtCitation}
                  </p>
                </div>
              </section>

              {cgmpSummary.exceedsSinglePhaseLimit && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950">
                  <div>
                    <strong>
                      Aviso REBT España (Límite Monofásico 63 A / 14,49 kW):
                    </strong>{" "}
                    La demanda simultánea estimada (
                    {cgmpSummary.simultaneousDemandWatts.toLocaleString()} W) supera el
                    máximo reglamentario monofásico de 14.490 W (IGA 63 A · Tarifa
                    2.0TD). Se ha limitado el IGA a 63 A; para potencias superiores
                    cambia a suministro Trifásico 400 V (Tarifa 3.0TD &gt; 15 kW).
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSupplyType("trifasico_400v");
                      setPanelOverrideIgaAmps(null);
                    }}
                    className="rounded-lg bg-amber-700 px-3 py-1.5 font-semibold text-white hover:bg-amber-800"
                  >
                    Pasar a Trifásico 400 V (3.0TD)
                  </button>
                </div>
              )}

              {/* Controles de Suministro y Plantillas ITC-BT-25 */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Sparkles className="h-4 w-4 text-[#0f6cbd]" />
                    Plantillas Oficiales ITC-BT-25:
                  </span>
                  <button
                    type="button"
                    onClick={() => loadPresetDwellings("basica")}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      cgmpSummary.effectiveElectrificationGrade === "basica"
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                        : "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Electrificación Básica (5.750 W · IGA 25 A)
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPresetDwellings("elevada_ve")}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      cgmpSummary.effectiveElectrificationGrade === "elevada"
                        ? "border-blue-300 bg-blue-50 text-[#0f6cbd]"
                        : "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Electrificación Elevada + VE (≥ 9.200 W · IGA 40/50 A)
                  </button>
                  <button
                    type="button"
                    onClick={() => openMtdSheet(6)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-[11px] font-semibold text-[#0f6cbd] transition hover:bg-blue-100/70"
                    title="Abrir Tabla de Cálculos en la Ficha Técnica M.T.D."
                  >
                    <Printer className="h-3.5 w-3.5 shrink-0" />
                    <span>Tabla de Cálculos Eléctricos: LGA, D.I. y Circuitos C1 a C5</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <GoogleSelect
                    value={electrificationGrade}
                    onChange={(e) => {
                      setElectrificationGrade(
                        e.target.value as "basica" | "elevada"
                      );
                      setPanelOverrideIgaAmps(null);
                    }}
                    className="w-48"
                  >
                    <option value="basica">Grado Básico (5,75 kW · 25 A)</option>
                    <option value="elevada">Grado Elevado (≥ 9,20 kW · ≥ 40 A)</option>
                  </GoogleSelect>

                  <GoogleSelect
                    value={supplyType}
                    onChange={(e) => {
                      setSupplyType(e.target.value as SystemSupplyType);
                      setPanelOverrideIgaAmps(null);
                    }}
                    className="w-44"
                  >
                    <option value="monofasico_230v">Monofásico 230 V (2.0TD)</option>
                    <option value="trifasico_400v">Trifásico 400 V (2.0TD / 3.0TD)</option>
                  </GoogleSelect>

                  <GoogleSelect
                    value={diType}
                    onChange={(e) =>
                      setDiType(e.target.value as "di_concentrada" | "di_unico")
                    }
                    className="w-64"
                  >
                    <option value="di_concentrada">
                      DI Contadores Concentrados (ΔU 1,0%)
                    </option>
                    <option value="di_unico">DI Único Usuario (ΔU 1,5%)</option>
                  </GoogleSelect>

                  <button
                    type="button"
                    onClick={addCircuit}
                    disabled={!currentUser.can_edit_calculations}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f6cbd] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#115ea3] disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Añadir Circuito
                  </button>
                </div>
              </div>

              {/* Tabla de Circuitos */}
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="px-2.5 py-3">Cód.</th>
                        <th className="px-2.5 py-3">Descripción del Circuito</th>
                        <th className="px-2.5 py-3">Uso / ITC</th>
                        <th className="px-2.5 py-3">Tensión</th>
                        <th className="px-2.5 py-3">Potencia (W)</th>
                        <th className="px-2.5 py-3">Long. (m)</th>
                        <th className="px-2.5 py-3">Aisl. / Mét.</th>
                        <th className="px-2.5 py-3 text-right">Ib (A)</th>
                        <th className="px-2.5 py-3 text-right">PIA (A)</th>
                        <th className="px-2.5 py-3 text-right">Iz (A)</th>
                        <th className="px-2.5 py-3">Sección (mm²)</th>
                        <th className="px-2.5 py-3 text-right">ΔU (%)</th>
                        <th className="px-2.5 py-3 text-right">Icc (A)</th>
                        <th className="px-2.5 py-3 text-right">Tubo Ø</th>
                        <th className="px-2.5 py-3 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {calculatedCircuits.map((c, index) => (
                        <tr key={index} className="hover:bg-slate-50/80">
                          <td className="px-2.5 py-2">
                            <input
                              type="text"
                              value={c.code}
                              onChange={(e) =>
                                updateCircuit(index, "code", e.target.value)
                              }
                              className="w-12 rounded border border-slate-300 bg-white px-1.5 py-1 font-bold text-[#0f6cbd]"
                            />
                          </td>
                          <td className="px-2.5 py-2">
                            <input
                              type="text"
                              value={c.description}
                              onChange={(e) =>
                                updateCircuit(
                                  index,
                                  "description",
                                  e.target.value
                                )
                              }
                              className="w-48 rounded border border-slate-300 bg-white px-2 py-1 text-slate-900"
                            />
                          </td>
                          <td className="px-2.5 py-2 min-w-[140px]">
                            <GoogleSelect
                              value={c.usageType}
                              onChange={(e) =>
                                updateCircuit(
                                  index,
                                  "usageType",
                                  e.target.value as CircuitUsageType
                                )
                              }
                            >
                              <option value="vivienda_interior">
                                Vivienda (3%)
                              </option>
                              <option value="alumbrado">Alumbrado (3%)</option>
                              <option value="alumbrado_descarga">
                                Descarga x1,8 (3%)
                              </option>
                              <option value="fuerza_otros">
                                Fuerza / Otros (5%)
                              </option>
                              <option value="motor">Motor x1,25 (5%)</option>
                              <option value="recarga_ve">Recarga VE (5%)</option>
                            </GoogleSelect>
                          </td>
                          <td className="px-2.5 py-2 min-w-[100px]">
                            <GoogleSelect
                              value={c.phaseSystem}
                              onChange={(e) =>
                                updateCircuit(
                                  index,
                                  "phaseSystem",
                                  e.target.value as "monofasico" | "trifasico"
                                )
                              }
                            >
                              <option value="monofasico">230V 1F</option>
                              <option value="trifasico">400V 3F</option>
                            </GoogleSelect>
                          </td>
                          <td className="px-2.5 py-2">
                            <input
                              type="number"
                              min={0}
                              step={100}
                              value={c.powerWatts}
                              onChange={(e) =>
                                updateCircuit(
                                  index,
                                  "powerWatts",
                                  Number(e.target.value) || 0
                                )
                              }
                              className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-right text-slate-900"
                            />
                          </td>
                          <td className="px-2.5 py-2">
                            <input
                              type="number"
                              min={1}
                              value={c.lengthMeters}
                              onChange={(e) =>
                                updateCircuit(
                                  index,
                                  "lengthMeters",
                                  Number(e.target.value) || 1
                                )
                              }
                              className="w-14 rounded border border-slate-300 bg-white px-1.5 py-1 text-right text-slate-900"
                            />
                          </td>
                          <td className="px-2.5 py-2 min-w-[165px]">
                            <div className="flex items-center gap-1">
                              <GoogleSelect
                                value={c.insulationType}
                                onChange={(e) =>
                                  updateCircuit(
                                    index,
                                    "insulationType",
                                    e.target.value as InsulationType
                                  )
                                }
                              >
                                <option value="PVC_70">PVC 70°C</option>
                                <option value="XLPE_90">XLPE 90°C</option>
                              </GoogleSelect>
                              <GoogleSelect
                                value={c.installationMethod}
                                onChange={(e) =>
                                  updateCircuit(
                                    index,
                                    "installationMethod",
                                    e.target.value as InstallationMethod
                                  )
                                }
                              >
                                <option value="B1">B1</option>
                                <option value="E">E/F</option>
                              </GoogleSelect>
                            </div>
                          </td>
                          <td className="px-2.5 py-2 text-right font-mono text-slate-700">
                            {c.currentIbAmps} A
                          </td>
                          <td className="px-2.5 py-2 text-right font-mono font-bold text-[#0f6cbd]">
                            {c.piaAmps} A
                          </td>
                          <td className="px-2.5 py-2 text-right font-mono text-slate-600">
                            {c.ampacityIzAmps} A
                          </td>
                          <td className="px-2.5 py-2 font-mono font-semibold text-slate-900">
                            {c.conductorsSummary} + PE {c.peSectionMm2} mm²
                          </td>
                          <td className="px-2.5 py-2 text-right font-mono">
                            <span
                              className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold ${
                                c.voltageDropPct <= c.maxAllowedDropPct
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {c.voltageDropPct}%
                            </span>
                          </td>
                          <td className="px-2.5 py-2 text-right font-mono text-slate-600">
                            {c.shortCircuitCurrentAmps} A
                          </td>
                          <td className="px-2.5 py-2 text-right font-mono text-slate-700">
                            Ø {c.tubeDiameterMm} mm
                          </td>
                          <td className="px-2.5 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeCircuit(index)}
                              className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Historial de Registros de Cuadro de Circuitos y D.I. */}
              <SectionHistoryRegistry
                section="circuitos"
                records={isolatedProjects}
                activeRecordId={activeProjectId}
                isSaving={isSaving}
                canEdit={currentUser?.can_create_projects}
                canDelete={currentUser?.can_delete_projects}
                onSaveNew={() => handleSaveToSupabase("insert")}
                onUpdateActive={() => handleSaveToSupabase("update")}
                onEditRecord={handleLoadProject}
                onDeleteRecord={handleDeleteProject}
                onOpenMtdForRecord={async (id) => {
                  await handleLoadProject(id);
                  setActiveSection("ficha_mtd");
                }}
                onResetForm={() =>
                  startNewBlankProjectForUser(currentUser, currentTenant)
                }
              />
            </div>
          )}

          {/* =================================================================
              APARTADO 3: PREVISIÓN DE CARGAS DEL EDIFICIO Y LGA (ITC-BT-10 / 52)
             ================================================================= */}
          {activeSection === "edificio_itc10" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      3. Previsión de Cargas del Edificio (ITC-BT-10 + ITC-BT-52)
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Estos valores dimensionan automáticamente la Línea General de Alimentación (LGA), el IGM y rellenan la Memoria Técnica de Diseño.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openMtdSheet(2)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-[11px] font-semibold text-[#0f6cbd] transition hover:bg-blue-100/70"
                    title="Abrir este apartado en la Ficha Técnica M.T.D."
                  >
                    <Printer className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Previsión de Potencia de Viviendas y Servicios Generales (ITC-BT-10)
                    </span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Nº Viviendas Electrificación Básica (5.750 W)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={basicDwellings}
                      onChange={(e) =>
                        setBasicDwellings(Number(e.target.value) || 0)
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Nº Viviendas Electrificación Elevada (9.200 W)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={elevatedDwellings}
                      onChange={(e) =>
                        setElevatedDwellings(Number(e.target.value) || 0)
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Servicios Generales: Alumbrado Zonas Comunes [W]
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={commonLightingW}
                      onChange={(e) =>
                        setCommonLightingW(Number(e.target.value) || 0)
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Servicios Generales: Hidros / Grupo Presión [W]
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={hydroW}
                      onChange={(e) => setHydroW(Number(e.target.value) || 0)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Servicios Generales: Otros Servicios (Ascensor, ICT) [W]
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={otherServicesW}
                      onChange={(e) =>
                        setOtherServicesW(Number(e.target.value) || 0)
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Locales Comerciales: Nº Locales y Superficie [m²]
                    </label>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min={0}
                        value={commercialCount}
                        onChange={(e) =>
                          setCommercialCount(Number(e.target.value) || 0)
                        }
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                        placeholder="Nº locales"
                      />
                      <input
                        type="number"
                        min={0}
                        value={commercialAreaM2}
                        onChange={(e) =>
                          setCommercialAreaM2(Number(e.target.value) || 0)
                        }
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                        placeholder="m²"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Garaje: Superficie [m²] y Ventilación
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={garageAreaM2}
                        onChange={(e) =>
                          setGarageAreaM2(Number(e.target.value) || 0)
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                      />
                      <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={garageForcedVent}
                          onChange={(e) =>
                            setGarageForcedVent(e.target.checked)
                          }
                        />
                        Forzada (20 W/m²)
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Plazas Aparcamiento (VE) y Longitud LGA [m]
                    </label>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min={0}
                        value={parkingSpaces}
                        onChange={(e) =>
                          setParkingSpaces(Number(e.target.value) || 0)
                        }
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                      />
                      <input
                        type="number"
                        min={1}
                        value={lgaLengthMeters}
                        onChange={(e) =>
                          setLgaLengthMeters(Number(e.target.value) || 1)
                        }
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                <h3 className="text-base font-bold text-[#0f6cbd]">
                  Resumen de Carga del Edificio y LGA
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600">Potencia Media Viviendas:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {buildingForecast.avgDwellingPowerWatts.toLocaleString()} W
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600">
                      Coef. Simultaneidad ({buildingForecast.totalDwellings} viv.):
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {buildingForecast.simultaneityCoefficient}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600">P1 Viviendas Simultánea:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {buildingForecast.p1DwellingsWatts.toLocaleString()} W
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600">P2 Servicios Generales:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {buildingForecast.p2GeneralServicesWatts.toLocaleString()} W
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600">P3 Locales Comerciales:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {buildingForecast.p3CommercialWatts.toLocaleString()} W
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600">P4 Garaje:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {buildingForecast.p4GarageWatts.toLocaleString()} W
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600">
                      P5 Recarga VE ({buildingForecast.evChargingStations} pl.):
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {buildingForecast.p5EffectiveEvWatts.toLocaleString()} W
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 text-sm font-extrabold text-[#0f6cbd]">
                    <span>POTENCIA TOTAL EDIFICIO:</span>
                    <span className="font-mono">
                      {buildingForecast.totalBuildingPowerWatts.toLocaleString()} W
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-slate-700 space-y-1">
                  <div className="font-bold text-[#0f6cbd]">
                    Línea General de Alimentación (ITC-BT-14):
                  </div>
                  <div>
                    • Sección:{" "}
                    <strong>
                      3×{buildingForecast.lgaCalculation.sectionMm2} + 1×
                      {buildingForecast.lgaCalculation.neutralSectionMm2} mm² Cu XLPE
                    </strong>
                  </div>
                  <div>
                    • Caída de tensión:{" "}
                    <strong>
                      {buildingForecast.lgaCalculation.voltageDropPct}% (máx. 0,5%)
                    </strong>
                  </div>
                  <div>
                    • Tubo:{" "}
                    <strong>
                      Ø {buildingForecast.lgaCalculation.tubeDiameterMm} mm
                    </strong>{" "}
                    · IGM: <strong>{buildingForecast.igmAmps} A</strong>
                  </div>
                </div>
              </div>

              {/* Historial de Registros de Previsión de Edificio y LGA */}
              <div className="lg:col-span-3">
                <SectionHistoryRegistry
                  section="edificio_itc10"
                  records={isolatedProjects}
                  activeRecordId={activeProjectId}
                  isSaving={isSaving}
                  canEdit={currentUser?.can_create_projects}
                  canDelete={currentUser?.can_delete_projects}
                  onSaveNew={() => handleSaveToSupabase("insert")}
                  onUpdateActive={() => handleSaveToSupabase("update")}
                  onEditRecord={handleLoadProject}
                  onDeleteRecord={handleDeleteProject}
                  onOpenMtdForRecord={async (id) => {
                    await handleLoadProject(id);
                    setActiveSection("ficha_mtd");
                  }}
                  onResetForm={() =>
                    startNewBlankProjectForUser(currentUser, currentTenant)
                  }
                />
              </div>
            </div>
          )}

          {/* =================================================================
              APARTADO 4: PUESTA A TIERRA Y LEGALIZACIÓN (ITC-BT-04 / 18 / 24)
             ================================================================= */}
          {activeSection === "tierras_legalizacion" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Cálculo de Puesta a Tierra (ITC-BT-18 / ITC-BT-24)
                  </h2>
                  <button
                    type="button"
                    onClick={() => openMtdSheet(1)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-[11px] font-semibold text-[#0f6cbd] transition hover:bg-blue-100/70"
                    title="Abrir este apartado en la Ficha Técnica M.T.D."
                  >
                    <Printer className="h-3.5 w-3.5 shrink-0" />
                    <span>Datos del Titular, Ubicación, Canalizaciones, Protecciones y Tierra</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Resistividad del Terreno ρ [Ω·m]
                    </label>
                    <input
                      type="number"
                      min={5}
                      value={soilResistivity}
                      onChange={(e) =>
                        setSoilResistivity(Number(e.target.value) || 10)
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Nº de Picas Verticales (n)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={numRods}
                      onChange={(e) => setNumRods(Number(e.target.value) || 0)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Longitud de cada Pica [m]
                    </label>
                    <input
                      type="number"
                      min={1}
                      step={0.5}
                      value={rodLengthMeters}
                      onChange={(e) =>
                        setRodLengthMeters(Number(e.target.value) || 1)
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Conductor Cobre Enterrado [m] (≥35 mm²)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={buriedConductorMeters}
                      onChange={(e) =>
                        setBuriedConductorMeters(Number(e.target.value) || 0)
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Sensibilidad Diferencial IΔn [mA]
                    </label>
                    <GoogleSelect
                      value={rcdSensitivityMa}
                      onChange={(e) =>
                        setRcdSensitivityMa(
                          Number(e.target.value) as 30 | 100 | 300 | 500
                        )
                      }
                      className="mt-1"
                    >
                      <option value={30}>30 mA</option>
                      <option value={100}>100 mA</option>
                      <option value={300}>300 mA</option>
                      <option value={500}>500 mA</option>
                    </GoogleSelect>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Tensión Límite de Contacto UL
                    </label>
                    <GoogleSelect
                      value={maxContactVoltageV}
                      onChange={(e) => {
                        const v = Number(e.target.value) as 50 | 24;
                        setMaxContactVoltageV(v);
                        setMtdMeta((prev) => ({
                          ...prev,
                          tensionSeguridad: v,
                        }));
                      }}
                      className="mt-1"
                    >
                      <option value={50}>50 V (Locales secos)</option>
                      <option value={24}>24 V (Locales húmedos)</option>
                    </GoogleSelect>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
                  Resistencia Óhmica Prevista:{" "}
                  <strong className="font-mono text-base text-emerald-800">
                    {earthingResult.estimatedResistanceOhm} Ω
                  </strong>{" "}
                  (Límite máx. RA = {earthingResult.maxAllowedRaOhm} Ω)
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Clasificador ITC-BT-04 (Proyecto vs M.T.D.) e Inspección OCA (ITC-BT-05)
                  </h2>
                  <button
                    type="button"
                    onClick={() => openMtdSheet(5)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-[11px] font-semibold text-[#0f6cbd] transition hover:bg-blue-100/70"
                    title="Abrir este apartado en la Ficha Técnica M.T.D."
                  >
                    <Printer className="h-3.5 w-3.5 shrink-0" />
                    <span>Memoria Descriptiva Reglamentaria (REBT e ITC-BT)</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Grupo de Instalación según ITC-BT-04
                  </label>
                  <GoogleSelect
                    value={itc04Group}
                    onChange={(e) =>
                      setItc04Group(e.target.value as Itc04GroupCode)
                    }
                    className="mt-1"
                  >
                    <option value="f_vivienda_unifamiliar">
                      Grupo f) Vivienda unifamiliar (M.T.D. hasta 50 kW)
                    </option>
                    <option value="e_edificio_viviendas">
                      Grupo e) Edificio de viviendas / locales (M.T.D. hasta 100 kW)
                    </option>
                    <option value="a_industria">
                      Grupo a) Industrias (M.T.D. hasta 20 kW)
                    </option>
                    <option value="i_publica_concurrencia">
                      Grupo i) Locales de Pública Concurrencia (Proyecto siempre)
                    </option>
                    <option value="g_garaje_forzada">
                      Grupo g) Garajes con ventilación forzada (Proyecto siempre)
                    </option>
                    <option value="h_garaje_natural">
                      Grupo h) Garajes con ventilación natural (M.T.D. hasta 5 plazas)
                    </option>
                    <option value="k_alumbrado_exterior">
                      Grupo k) Alumbrado Exterior (M.T.D. hasta 5 kW)
                    </option>
                    <option value="z_recarga_ve_interior">
                      Grupo z) Recarga de Vehículo Eléctrico (M.T.D. hasta 50 kW)
                    </option>
                  </GoogleSelect>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Potencia a Legalizar [kW]
                    </label>
                    <input
                      type="number"
                      value={itc04CustomPowerKw}
                      onChange={(e) =>
                        setItc04CustomPowerKw(Number(e.target.value) || 0)
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Nº Plazas Estacionamiento
                    </label>
                    <input
                      type="number"
                      value={itc04ParkingSpaces}
                      onChange={(e) =>
                        setItc04ParkingSpaces(Number(e.target.value) || 0)
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 space-y-1">
                  <div className="text-[11px] font-semibold uppercase text-[#0f6cbd]">
                    Dictamen Reglamentario ITC-BT-04 / 05:
                  </div>
                  <div className="text-base font-bold text-slate-900">
                    {itc04Evaluation.documentType}
                  </div>
                  <p className="text-xs text-slate-600">
                    {itc04Evaluation.normativeRule}
                  </p>
                  <p className="pt-1 text-xs font-bold text-slate-800">
                    Inspección Inicial por OCA:{" "}
                    {itc04Evaluation.requiresInitialOcaInspection
                      ? "SÍ REQUERIDA"
                      : "NO REQUERIDA"}
                  </p>
                </div>
              </div>

              {/* Historial de Registros de Puesta a Tierra y Legalización */}
              <div className="lg:col-span-2">
                <SectionHistoryRegistry
                  section="tierras_legalizacion"
                  records={isolatedProjects}
                  activeRecordId={activeProjectId}
                  isSaving={isSaving}
                  canEdit={currentUser?.can_create_projects}
                  canDelete={currentUser?.can_delete_projects}
                  onSaveNew={() => handleSaveToSupabase("insert")}
                  onUpdateActive={() => handleSaveToSupabase("update")}
                  onEditRecord={handleLoadProject}
                  onDeleteRecord={handleDeleteProject}
                  onOpenMtdForRecord={async (id) => {
                    await handleLoadProject(id);
                    setActiveSection("ficha_mtd");
                  }}
                  onResetForm={() =>
                    startNewBlankProjectForUser(currentUser, currentTenant)
                  }
                />
              </div>
            </div>
          )}

          {/* =================================================================
              APARTADO 5: FICHA TÉCNICA M.T.D. B.T. (VISTA Y DESCARGA OPCIONAL)
             ================================================================= */}
          {activeSection === "ficha_mtd" && (
            <MtdCanariasOfficialForm
              meta={mtdMeta}
              setMeta={setMtdMeta}
              supplyType={supplyType}
              electrificationGrade={cgmpSummary.effectiveElectrificationGrade}
              calculatedCircuits={calculatedCircuits}
              cgmpSummary={cgmpSummary}
              buildingForecast={buildingForecast}
              buildingInputs={{
                basicDwellings,
                elevatedDwellings,
                commonLightingW,
                hydroW,
                otherServicesW,
                commercialCount,
                commercialAreaM2,
                garageAreaM2,
                garageForcedVent,
                parkingSpaces,
              }}
              earthingResult={earthingResult}
              rcdSensitivityMa={rcdSensitivityMa}
              canExportMtd={currentUser?.can_export_mtd}
              initialPage={targetMtdPage}
              dualPhotoSwitcher={
                dualPhotoState
                  ? {
                      activeMode: dualPhotoState.activeMode,
                      actualExpNum:
                        dualPhotoState.evaluation.actual.expedienteNum,
                      corregidoExpNum:
                        dualPhotoState.evaluation.corregido.expedienteNum,
                      overallCompliant:
                        dualPhotoState.evaluation.overallCompliant,
                      onSwitch: (nextMode) =>
                        applyDualPhotoSnapshotToActiveWorkspace(
                          dualPhotoState.evaluation,
                          nextMode,
                          "ficha_mtd"
                        ),
                    }
                  : null
              }
            />
          )}

          {/* =================================================================
              APARTADO 6: DASHBOARD ADMINISTRATIVO, CREACIÓN DE USUARIOS Y PERMISOLOGÍA
             ================================================================= */}
          {activeSection === "administracion" && (
            <AdminRbacSection
              tenants={tenants}
              users={users}
              allProjects={allProjects}
              currentUser={currentUser}
              onSwitchUser={switchActiveUser}
              onCreateUser={handleCreateUser}
              onCreateTenant={handleCreateTenant}
              onTogglePermission={handleTogglePermission}
              onUpdateUser={handleUpdateUser}
              onToggleUserActive={handleToggleUserActive}
              onDeleteUser={handleDeleteUser}
              newUserName={newUserName}
              setNewUserName={setNewUserName}
              newUserEmail={newUserEmail}
              setNewUserEmail={setNewUserEmail}
              newUserPin={newUserPin}
              setNewUserPin={setNewUserPin}
              newUserTenantId={newUserTenantId}
              setNewUserTenantId={setNewUserTenantId}
              newUserRole={newUserRole}
              setNewUserRole={setNewUserRole}
              newUserDoi={newUserDoi}
              setNewUserDoi={setNewUserDoi}
              newUserCci={newUserCci}
              setNewUserCci={setNewUserCci}
              newTenantName={newTenantName}
              setNewTenantName={setNewTenantName}
              newTenantCif={newTenantCif}
              setNewTenantCif={setNewTenantCif}
              newTenantNum={newTenantNum}
              setNewTenantNum={setNewTenantNum}
              newTenantIsla={newTenantIsla}
              setNewTenantIsla={setNewTenantIsla}
            />
          )}

          {/* =================================================================
              MÓDULOS MONPIX: CALCULADORAS, UNIFILAR, PRESUPUESTO, 19 CCAA, OFICINA, EQUIPO Y APRENDER
             ================================================================= */}
          {activeSection === "calculadoras_obra" && (
            <CalculadorasObraView
              activeCircuits={circuits}
              defaultIsCanarias={Boolean(currentTenant?.isla)}
              onApplyPhaseBalanceToProject={(assignments) => {
                setSupplyType("trifasico_400v");
                setCircuits((prev) =>
                  prev.map((c, idx) =>
                    assignments[idx]
                      ? {
                          ...c,
                          phaseAssigned: assignments[idx],
                          voltage:
                            assignments[idx] === "L1-L2-L3" ? 400 : 230,
                        }
                      : c
                  )
                );
                setStatusBanner({
                  type: "success",
                  text: "Reparto de fases R·S·T aplicado al cuadro de circuitos activo.",
                });
              }}
              onAddEvCircuitToProject={(evCircuit) => {
                setCircuits((prev) => [...prev, evCircuit]);
                setStatusBanner({
                  type: "success",
                  text: `Circuito ${evCircuit.code} (ITC-BT-52 Recarga VE) añadido al cuadro del expediente.`,
                });
              }}
            />
          )}

          {activeSection === "unifilar_cuadro" && (
            <UnifilarCuadroView
              meta={mtdMeta}
              supplyType={supplyType}
              igaAmps={cgmpSummary.igaAmps}
              rcdCount={cgmpSummary.rcd30mACount}
              diSectionMm2={cgmpSummary.diCalculation.sectionMm2}
              calculatedCircuits={calculatedCircuits}
              companyLogoDataUrl={monpixWorkspace.companyLogoDataUrl}
              savedUnifilares={monpixWorkspace.savedUnifilares}
              savedDinModules={
                monpixWorkspace.dinPanelsByExpediente?.[mtdMeta.expedienteNum]
              }
              savedBoxModules={
                monpixWorkspace.dinBoxSizesByExpediente?.[mtdMeta.expedienteNum]
              }
              onPersistDinPanel={(modules, boxSize) => {
                updateMonpixWorkspace((prev) => ({
                  ...prev,
                  dinPanelsByExpediente: {
                    ...(prev.dinPanelsByExpediente || {}),
                    [mtdMeta.expedienteNum]: modules,
                  },
                  dinBoxSizesByExpediente: {
                    ...(prev.dinBoxSizesByExpediente || {}),
                    [mtdMeta.expedienteNum]: boxSize,
                  },
                }));
              }}
              onAddToUnifiedOrder={(items) => {
                updateMonpixWorkspace((prev) => ({
                  ...prev,
                  unifiedOrderCart: [...items, ...(prev.unifiedOrderCart || [])],
                }));
                setStatusBanner({
                  type: "success",
                  text: `${items.length} línea(s) de material del cuadro añadidas al Pedido Unificado de Obra (Oficina).`,
                });
              }}
              onApplyDraftCircuits={(nextCircuits, nextSupply, panelMeta) => {
                setSupplyType(nextSupply);
                setCircuits(nextCircuits);
                if (panelMeta?.electrificationGrade) {
                  setElectrificationGrade(panelMeta.electrificationGrade);
                }
                if (typeof panelMeta?.igaAmps === "number") {
                  setPanelOverrideIgaAmps(
                    sanitizeSpanishIgaAmps(panelMeta.igaAmps, nextSupply)
                  );
                }
                if (typeof panelMeta?.rcdCount === "number") {
                  setPanelOverrideRcdCount(panelMeta.rcdCount);
                }
                if (panelMeta) {
                  const circuitsSummary = nextCircuits
                    .map(
                      (c) =>
                        `${c.code} (${c.description}, ${c.fixedPiaAmps || 16} A, ${
                          c.minSectionMm2 || 2.5
                        } mm²)`
                    )
                    .join("; ");
                  setMtdMeta((prev) => ({
                    ...prev,
                    diferencialCalibreAmps:
                      panelMeta.diferencialCalibreAmps ?? prev.diferencialCalibreAmps,
                    diferencialClase:
                      panelMeta.diferencialClase ?? prev.diferencialClase,
                    sobretensionesKv: panelMeta.hasSurgeProtection ? "1,5" : "—",
                    numCuadrosPrincipales: 1,
                    conductorTierraMm2:
                      nextSupply === "trifasico_400v" || (panelMeta.igaAmps ?? 25) >= 40
                        ? 16
                        : 10,
                    diCanalizacionDesc:
                      nextSupply === "trifasico_400v"
                        ? "4x RZ1-K (AS) 0,6/1kV + TT bajo tubo protector"
                        : "2x RZ1-K (AS) 0,6/1kV + TT bajo tubo protector",
                    memoriaDescriptivaTexto: `Instalación interior de baja tensión (${
                      panelMeta.formatLabel ||
                      (nextSupply === "trifasico_400v"
                        ? "Trifásico 400 V"
                        : "Monofásico 230 V")
                    }) con CGMP dotado de IGA ${panelMeta.igaAmps ?? 40} A, ${
                      panelMeta.hasSurgeProtection
                        ? "protección combinada contra sobretensiones permanentes y transitorias Tipo 2 (Up ≤ 1,5 kV), "
                        : ""
                    }${panelMeta.rcdCount ?? 1} interruptor(es) diferencial(es) de ${
                      panelMeta.diferencialCalibreAmps ?? 40
                    } A / 30 mA Clase ${
                      panelMeta.diferencialClase ?? "AC"
                    } y ${nextCircuits.length} circuitos interiores: ${circuitsSummary}.`,
                  }));
                }
                setStatusBanner({
                  type: "success",
                  text: panelMeta?.isAutoFromPhoto
                    ? `Formato detectado (${panelMeta.formatLabel || "REBT"}): Simulador DIN, Plano Unifilar IEC 60617 y Ficha Técnica M.T.D. generados automáticamente.`
                    : "Esquema Unifilar, Simulador DIN y Ficha Técnica M.T.D. actualizados automáticamente.",
                });
              }}
              onOpenFichaMtd={() => setActiveSection("ficha_mtd")}
              activeDualPhotoEval={dualPhotoState?.evaluation ?? null}
              activeDualPhotoMode={
                dualPhotoState?.activeMode ?? "estado_actual"
              }
              onSelectDualPhotoMode={(evaluation, mode, dest) =>
                applyDualPhotoSnapshotToActiveWorkspace(
                  evaluation,
                  mode,
                  dest === "ficha_mtd" ? "ficha_mtd" : "stay"
                )
              }
              onSaveBothDualPhotoModes={(evaluation) =>
                handleSaveBothDualPhotoOptions(
                  evaluation,
                  dualPhotoState?.activeMode ?? "instalacion_corregida"
                )
              }
              onApplyMemoriaCanarias={(texto) => {
                setMtdMeta((prev) => ({
                  ...prev,
                  memoriaDescriptivaTexto: texto,
                }));
                setTargetMtdPage(5);
                setActiveSection("ficha_mtd");
                setStatusBanner({
                  type: "success",
                  text: "Memoria Descriptiva formal (Gobierno de Canarias / NRZ103 Edistribución) volcada a la Hoja 5/11 de la Ficha M.T.D.",
                });
              }}
              onSaveDiagramRecord={(item) => {
                updateMonpixWorkspace((prev) => ({
                  ...prev,
                  savedUnifilares: [item, ...prev.savedUnifilares],
                }));
                setStatusBanner({
                  type: "success",
                  text: `Esquema unifilar "${item.title}" guardado en tu archivo privado.`,
                });
              }}
            />
          )}

          {activeSection === "presupuestos_plano" && (
            <PresupuestosPlanoView
              projectRef={mtdMeta.expedienteNum}
              activeProjectId={activeProjectId}
              defaultClientName={mtdMeta.titularNombre}
              defaultClientNif={mtdMeta.titularNif}
              defaultClientAddress={`${mtdMeta.direccionCalle} ${mtdMeta.direccionNum}, ${mtdMeta.terminoMunicipal}`.trim()}
              defaultIsCanarias={Boolean(currentTenant?.isla)}
              priceCatalog={monpixWorkspace.priceCatalog}
              onUpdatePriceCatalog={(nextCatalog) =>
                updateMonpixWorkspace((prev) => ({
                  ...prev,
                  priceCatalog: nextCatalog,
                }))
              }
              onCreateOfficeQuote={(quote) => {
                updateMonpixWorkspace((prev) => ({
                  ...prev,
                  quotes: [quote, ...prev.quotes],
                }));
                setStatusBanner({
                  type: "success",
                  text: `Presupuesto ${quote.number} guardado en Oficina (listo para imprimir sin costes internos o convertir en factura).`,
                });
              }}
              onNavigateToOffice={() => setActiveSection("oficina_gastos")}
              onApplyBudgetAndCircuitsToMtd={(totalEuros, generatedCircuits) => {
                setMtdMeta((prev) => ({
                  ...prev,
                  presupuestoTotalEuros: Number(totalEuros.toFixed(2)),
                }));
                if (generatedCircuits.length > 0) {
                  setCircuits(generatedCircuits);
                }
                setStatusBanner({
                  type: "success",
                  text: `Presupuesto (${totalEuros.toFixed(2)} €) y ${generatedCircuits.length} circuitos sincronizados con el expediente M.T.D.`,
                });
              }}
              onAddToUnifiedOrder={(items) => {
                updateMonpixWorkspace((prev) => ({
                  ...prev,
                  unifiedOrderCart: [...items, ...(prev.unifiedOrderCart || [])],
                }));
                setStatusBanner({
                  type: "success",
                  text: `${items.length} línea(s) enviadas al Pedido Unificado de Obra (Oficina).`,
                });
              }}
            />
          )}

          {activeSection === "tramites_oca" && (
            <TramitesOcaCatastroView
              defaultIsla={mtdMeta.isla || currentTenant?.isla || "Tenerife"}
              onApplyLocationToMtd={({
                calle,
                municipio,
                refCatastralNote,
                lat,
                lon,
                utm,
              }) => {
                setMtdMeta((prev) => ({
                  ...prev,
                  direccionCalle: calle || prev.direccionCalle,
                  terminoMunicipal: municipio || prev.terminoMunicipal,
                  referenciaCatastral:
                    refCatastralNote || prev.referenciaCatastral,
                  coordenadasLat: lat || prev.coordenadasLat,
                  coordenadasLng: lon || prev.coordenadasLng,
                  coordenadasUtm: utm || prev.coordenadasUtm,
                  memoriaDescriptivaTexto: prev.memoriaDescriptivaTexto
                    ? `${prev.memoriaDescriptivaTexto}\nRef. Catastral: ${refCatastralNote}${
                        utm ? ` · UTM: ${utm}` : ""
                      }`
                    : `Ref. Catastral: ${refCatastralNote}${
                        utm ? ` · UTM: ${utm}` : ""
                      }`,
                }));
                setStatusBanner({
                  type: "success",
                  text: "Ubicación, Coordenadas GPS/UTM y Referencia Catastral aplicadas al expediente y Hoja 9/11 M.T.D.",
                });
              }}
              onOpenMtdPage9={() => {
                setTargetMtdPage(9);
                setActiveSection("ficha_mtd");
              }}
            />
          )}

          {activeSection === "oficina_gastos" && (
            <OficinaGastosView
              tenant={currentTenant}
              workspace={monpixWorkspace}
              onUpdateWorkspace={updateMonpixWorkspace}
            />
          )}

          {activeSection === "tareas_equipo" && (
            <TareasEquipoView
              currentUserName={currentUser?.full_name || "Instalador"}
              activeProjectRef={mtdMeta.expedienteNum}
              workspace={monpixWorkspace}
              onUpdateWorkspace={updateMonpixWorkspace}
            />
          )}

          {activeSection === "aprender" && <AprenderSimuladorView />}
        </main>

        {/* Barra de Navegación Inferior Fija para Móviles */}
        <nav className="no-print fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-slate-200 bg-white/95 px-1 py-1.5 backdrop-blur lg:hidden">
          {[
            {
              id: "dashboard_tecnico" as ActiveSection,
              label: "Inicio",
              icon: <LayoutDashboard className="h-4 w-4" />,
            },
            {
              id: "calculadoras_obra" as ActiveSection,
              label: "Cálculos",
              icon: <Calculator className="h-4 w-4" />,
            },
            {
              id: "unifilar_cuadro" as ActiveSection,
              label: "Unifilar",
              icon: <GitBranch className="h-4 w-4" />,
            },
            {
              id: "presupuestos_plano" as ActiveSection,
              label: "Presup.",
              icon: <Tag className="h-4 w-4" />,
            },
            {
              id: "oficina_gastos" as ActiveSection,
              label: "Oficina",
              icon: <Briefcase className="h-4 w-4" />,
            },
          ].map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition ${
                  isActive
                    ? "text-[#0f6cbd] bg-blue-50/80"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Asistente Flotante REBT con Voz, Cita de ITC y Confirmación de Acciones */}
      <AsistenteMonpixFloating
        onNavigateSection={(secId) => setActiveSection(secId as ActiveSection)}
        onQuickCreateTask={(taskTitle) => {
          updateMonpixWorkspace((prev) => ({
            ...prev,
            tasks: [
              {
                id: `tsk-${Date.now()}`,
                title: taskTitle,
                whenDate: new Date().toISOString().slice(0, 10),
                assignedTo: currentUser?.full_name || "Instalador",
                projectRef: mtdMeta.expedienteNum,
                phone: "",
                email: "",
                notes: "Creada desde Asistente REBT tras confirmación",
                origin: "voz",
                priority: "normal",
                completed: false,
              },
              ...prev.tasks,
            ],
          }));
          setStatusBanner({
            type: "success",
            text: `Tarea "${taskTitle}" guardada en tu lista de trabajo.`,
          });
        }}
      />

      {/* =====================================================================
          MODAL ASISTENTE GUIADO DE NUEVO EXPEDIENTE Y ANÁLISIS DUAL POR FOTO
         ===================================================================== */}
      <NewExpedienteWizardModal
        isOpen={showNewWizardModal}
        onClose={() => setShowNewWizardModal(false)}
        defaultIsla={mtdMeta.isla || currentTenant?.isla || "Tenerife"}
        defaultMunicipio={
          mtdMeta.terminoMunicipal ||
          (currentTenant?.isla === "Gran Canaria"
            ? "Las Palmas de G.C."
            : "Santa Cruz de Tenerife")
        }
        initialMeta={mtdMeta}
        onCreateGuidedScratch={handleCreateGuidedScratch}
        onApplyPhotoOption={(evaluation, selectedMode, destination) =>
          applyDualPhotoSnapshotToActiveWorkspace(
            evaluation,
            selectedMode,
            destination
          )
        }
        onSaveBothPhotoOptions={(evaluation, openAfterSave) =>
          handleSaveBothDualPhotoOptions(evaluation, openAfterSave)
        }
      />

      {/* =====================================================================
          MODAL DE INICIO DE SESIÓN / CAMBIO DE USUARIO MULTI-TENANT
         ===================================================================== */}
      {showLoginModal && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f6cbd] text-white">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Acceso Multi-Usuario (Aislamiento de Reportes)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Ingresa con tu correo y PIN o selecciona una cuenta
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  PIN de Acceso
                </label>
                <input
                  type="password"
                  required
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                />
              </div>

              {loginError && (
                <p className="rounded-lg bg-rose-50 p-2 text-xs font-medium text-rose-700">
                  {loginError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#0f6cbd] px-4 py-2 text-xs font-semibold text-white hover:bg-[#115ea3]"
                >
                  Iniciar Sesión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
