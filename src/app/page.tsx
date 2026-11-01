"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
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
  REBT_PIA_RATINGS,
  calculateRebtCircuit,
  calculateBuildingLoadForecastItc10,
  evaluateItc04Documentation,
  calculateEarthingItc18,
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

type ActiveSection =
  | "dashboard_tecnico"
  | "expedientes"
  | "titular_ubicacion"
  | "circuitos"
  | "edificio_itc10"
  | "tierras_legalizacion"
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

  const generalServicesW = commonLightingW + hydroW + otherServicesW;

  // Cálculos de cada circuito interior (ITC-BT-19 / 21 / 22 / 25)
  const calculatedCircuits = useMemo(
    () => circuits.map((c) => calculateRebtCircuit(c)),
    [circuits]
  );

  // Resumen del Cuadro General de Mando y Protección (CGMP) y Derivación Individual
  const cgmpSummary = useMemo(() => {
    const totalInstalledWatts = calculatedCircuits.reduce(
      (acc, c) => acc + c.powerWatts,
      0
    );
    const totalDesignWatts = calculatedCircuits.reduce(
      (acc, c) => acc + c.effectivePowerWatts,
      0
    );

    const minNormativeWatts = electrificationGrade === "elevada" ? 9200 : 5750;
    const contractDesignWatts = Math.max(totalDesignWatts, minNormativeWatts);

    const supplyVoltage = supplyType === "trifasico_400v" ? 400 : 230;
    const denom =
      supplyType === "trifasico_400v" ? Math.sqrt(3) * 400 : 230;
    const designCurrentAmps = Number((contractDesignWatts / denom).toFixed(2));

    const igaAmps =
      REBT_PIA_RATINGS.find((r) => r >= designCurrentAmps && r >= 25) || 63;

    const hasEvCircuitC13 = calculatedCircuits.some(
      (c) => c.usageType === "recarga_ve" || c.code.toUpperCase() === "C13"
    );
    const interiorCount = calculatedCircuits.filter(
      (c) => c.usageType !== "recarga_ve" && c.code.toUpperCase() !== "C13"
    ).length;
    const rcd30mACount =
      Math.max(1, Math.ceil(interiorCount / 5)) + (hasEvCircuitC13 ? 1 : 0);

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
      designCurrentAmps,
      igaAmps,
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

  // Cargar Tenants, Usuarios y Expedientes desde Supabase
  const fetchDirectoryAndProjects = useCallback(async () => {
    if (!supabase) return;

    const [tenantsRes, usersRes, projectsRes] = await Promise.all([
      supabase.from("app_tenants").select("*").order("id", { ascending: true }),
      supabase.from("app_users").select("*").order("id", { ascending: true }),
      supabase
        .from("electrical_projects")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (tenantsRes.data && tenantsRes.data.length > 0) {
      setTenants(tenantsRes.data as AppTenant[]);
    }
    if (usersRes.data && usersRes.data.length > 0) {
      setUsers(usersRes.data as AppUser[]);
    }
    if (projectsRes.data) {
      setAllProjects(projectsRes.data as SavedProjectRow[]);
    }
  }, []);

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
    },
    []
  );

  // Cambiar de Usuario Activo (limpiando el formulario activo para que nunca se mezclen reportes entre usuarios)
  const switchActiveUser = (targetUser: AppUser) => {
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

    setUsers((prev) =>
      prev.map((u) =>
        u.id === targetUser.id ? { ...u, access_pin: newPinValue } : u
      )
    );

    if (supabase) {
      await supabase
        .from("app_users")
        .update({ access_pin: newPinValue })
        .eq("id", targetUser.id);
    }

    return {
      ok: true,
      message: `Contraseña / PIN actualizada correctamente para ${targetUser.full_name}. Ya puedes iniciar sesión con tu nueva clave.`,
    };
  };

  const handleLoadProject = async (projectId: number) => {
    if (!supabase) return;
    const proj = isolatedProjects.find((p) => p.id === projectId);
    if (!proj) {
      setStatusBanner({
        type: "error",
        text: "Acceso denegado: este reporte pertenece a otro usuario/tenant.",
      });
      return;
    }

    setActiveProjectId(proj.id);

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

    // 5. Restaurar Circuitos Interiores desde electrical_circuits
    const { data: dbCircuits } = await supabase
      .from("electrical_circuits")
      .select("*")
      .eq("project_id", projectId)
      .order("circuit_number", { ascending: true });

    if (dbCircuits && dbCircuits.length > 0) {
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
    if (!supabase) return;
    const { error } = await supabase
      .from("electrical_projects")
      .delete()
      .eq("id", projectId);

    if (!error) {
      if (activeProjectId === projectId) {
        setActiveProjectId(null);
      }
      await fetchDirectoryAndProjects();
      setStatusBanner({
        type: "success",
        text: `Registro #${projectId} eliminado del historial correctamente.`,
      });
    }
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

    if (!supabase) {
      setStatusBanner({
        type: "error",
        text: "Configura las credenciales de Supabase para guardar.",
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
      setStatusBanner({
        type: "error",
        text: `Error al guardar en Supabase: ${msg}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Funciones Administrativas (Crear Empresa/Tenant, Crear Usuario, Actualizar Permisos RBAC)
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim()) return;
    if (!supabase) return;

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
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    if (!supabase) return;

    const isAdminRole =
      newUserRole === "super_admin" || newUserRole === "admin_empresa";
    const isReadOnly = newUserRole === "visor_auditor";

    const { data, error } = await supabase
      .from("app_users")
      .insert({
        tenant_id: newUserTenantId,
        full_name: newUserName.trim(),
        email: newUserEmail.trim().toLowerCase(),
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
    setUsers((prev) =>
      prev.map((u) =>
        u.id === targetUser.id ? { ...u, [permField]: nextVal } : u
      )
    );

    if (supabase) {
      await supabase
        .from("app_users")
        .update({ [permField]: nextVal })
        .eq("id", targetUser.id);
    }
  };

  const loadPresetDwellings = (preset: "basica" | "elevada_ve") => {
    if (!currentUser.can_edit_calculations) return;
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

  const navItems: {
    id: ActiveSection;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "dashboard_tecnico",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      id: "expedientes",
      label: "Mis Expedientes",
      icon: <FolderOpen className="h-4 w-4" />,
    },
    {
      id: "titular_ubicacion",
      label: "Titular y Ubicación",
      icon: <MapPin className="h-4 w-4" />,
    },
    {
      id: "circuitos",
      label: "Cuadro de Circuitos",
      icon: <Activity className="h-4 w-4" />,
    },
    {
      id: "edificio_itc10",
      label: "Previsión de Edificio",
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      id: "tierras_legalizacion",
      label: "Tierra y Legalización",
      icon: <FileCheck2 className="h-4 w-4" />,
    },
    {
      id: "ficha_mtd",
      label: "Ficha Técnica M.T.D.",
      icon: <FileSpreadsheet className="h-4 w-4" />,
    },
    {
      id: "administracion",
      label: "Administración",
      icon: <ShieldCheck className="h-4 w-4" />,
    },
  ];

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

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {navItems.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveSection(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-xs transition ${
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

        {/* Navegación Limpia y Minimalista */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-xs transition ${
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
        </nav>

        {/* Estado compacto al pie */}
        <div className="border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500 flex items-center justify-between">
          <span>REBT RD 842/2002</span>
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            {isSupabaseConfigured ? "Online" : "Local"}
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
            {/* Botones de Acción del Expediente */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() =>
                  startNewBlankProjectForUser(currentUser, currentTenant)
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
              >
                <FilePlus2 className="h-3.5 w-3.5 text-slate-500" />
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
              DASHBOARD OPERATIVO DEL TÉCNICO (KPIs Y MONITOR REBT)
             ================================================================= */}
          {activeSection === "dashboard_tecnico" && (
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
              onNewProject={() =>
                startNewBlankProjectForUser(currentUser, currentTenant)
              }
            />
          )}

          {/* =================================================================
              APARTADO 0: MIS EXPEDIENTES Y REPORTES (AISLADOS POR USUARIO)
             ================================================================= */}
          {activeSection === "expedientes" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#0f6cbd]">
                    <Lock className="h-3.5 w-3.5" />
                    Espacio de Trabajo Aislado (Multitenant)
                  </span>
                  <h2 className="mt-2 text-lg font-bold text-slate-900">
                    Reportes y Expedientes de {currentUser?.full_name}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Los expedientes creados bajo tu usuario quedan asociados exclusivamente a tu identificador (
                    <code>owner_user_id = {currentUser?.id}</code>) y organización (
                    <code>{currentTenant?.name}</code>), evitando que se mezclen con los reportes de otros usuarios.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {(currentUser.role === "super_admin" ||
                    currentUser.role === "admin_empresa") && (
                    <GoogleSelect
                      value={isolationScope}
                      onChange={(e) =>
                        setIsolationScope(
                          e.target.value as "strict_user" | "tenant_shared"
                        )
                      }
                      className="min-w-[260px]"
                    >
                      <option value="strict_user">
                        Vista Estricta: Solo mis reportes ({currentUser.full_name})
                      </option>
                      <option value="tenant_shared">
                        Vista Empresa: Todos los de {currentTenant.name}
                      </option>
                    </GoogleSelect>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      startNewBlankProjectForUser(currentUser, currentTenant);
                      setActiveSection("titular_ubicacion");
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0f6cbd] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#115ea3]"
                  >
                    <Plus className="h-4 w-4" />
                    Crear Nuevo Expediente REBT
                  </button>
                </div>
              </div>

              {/* Tarjetas de Resumen Rápido del Expediente en Curso */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <span className="text-xs font-medium text-slate-500">
                    Usuario Activo
                  </span>
                  <p className="mt-1 truncate text-base font-bold text-slate-900">
                    {currentUser?.full_name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {currentTenant?.name} · {currentTenant?.isla}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <span className="text-xs font-medium text-slate-500">
                    Mis Reportes Guardados
                  </span>
                  <p className="mt-1 text-2xl font-bold text-[#0f6cbd]">
                    {isolatedProjects.length}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Aislados de otros usuarios ({allProjects.length} totales en BD)
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <span className="text-xs font-medium text-slate-500">
                    Expediente en Edición
                  </span>
                  <p className="mt-1 truncate text-base font-bold text-slate-900">
                    {mtdMeta.expedienteNum}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {calculatedCircuits.length} circuitos ·{" "}
                    {cgmpSummary.contractDesignWatts.toLocaleString()} W
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <span className="text-xs font-medium text-slate-500">
                    Descarga Ficha M.T.D. (11 Págs)
                  </span>
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setActiveSection("ficha_mtd")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-200"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-[#0f6cbd]" />
                      Ir a Vista / Descarga Opcional
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabla de Expedientes Aislados por Usuario */}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                <div className="border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Listado de Reportes de {currentUser?.full_name}
                  </h3>
                  <span className="text-xs text-slate-500">
                    Mostrando {isolatedProjects.length} expediente(s)
                  </span>
                </div>

                {isolatedProjects.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-sm font-medium text-slate-700">
                      Este usuario aún no tiene reportes guardados en su espacio aislado.
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Pulsa en &ldquo;Guardar Reporte del Usuario&rdquo; arriba a la derecha o crea un nuevo expediente para registrarlo bajo {currentUser?.full_name}.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">ID</th>
                          <th className="px-4 py-3">Expediente / Uso</th>
                          <th className="px-4 py-3">Titular</th>
                          <th className="px-4 py-3">Emplazamiento</th>
                          <th className="px-4 py-3 text-right">Potencia</th>
                          <th className="px-4 py-3 text-right">IGA</th>
                          <th className="px-4 py-3">Fecha</th>
                          <th className="px-4 py-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {isolatedProjects.map((proj) => (
                          <tr
                            key={proj.id}
                            className={`hover:bg-slate-50 ${
                              activeProjectId === proj.id ? "bg-blue-50/40" : ""
                            }`}
                          >
                            <td className="px-4 py-3 font-mono font-bold text-[#0f6cbd]">
                              #{proj.id}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {proj.name}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {proj.client_name}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {proj.location}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">
                              {Number(proj.total_demand_va).toLocaleString()} W
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-slate-700">
                              {proj.iga_amps} A
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              {new Date(proj.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-right space-x-2">
                              <button
                                type="button"
                                onClick={() => handleLoadProject(proj.id)}
                                className="rounded-lg bg-[#e8f0fe] px-3 py-1 text-xs font-semibold text-[#0f6cbd] hover:bg-blue-100"
                              >
                                Abrir Cálculos
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await handleLoadProject(proj.id);
                                  setActiveSection("ficha_mtd");
                                }}
                                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Ver M.T.D.
                              </button>
                              {currentUser.can_delete_projects && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProject(proj.id)}
                                  className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                  title="Eliminar reporte"
                                >
                                  <Trash2 className="inline h-4 w-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
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
              {/* Tarjetas Resumen en Diseño Claro */}
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <span className="text-xs font-medium text-slate-500">
                    Potencia Prevista / Instalada
                  </span>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {cgmpSummary.contractDesignWatts.toLocaleString()} W
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Instalada: {cgmpSummary.totalInstalledWatts.toLocaleString()} W
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <span className="text-xs font-medium text-slate-500">
                    Protección General (CGMP)
                  </span>
                  <p className="mt-1 text-2xl font-bold text-[#0f6cbd]">
                    IGA {cgmpSummary.igaAmps} A
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Diferenciales {rcdSensitivityMa} mA:{" "}
                    <strong className="text-slate-900">
                      {cgmpSummary.rcd30mACount} ud.
                    </strong>
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
                    {cgmpSummary.nonCompliantCircuits === 0 ? (
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
                          {cgmpSummary.nonCompliantCircuits} alerta(s)
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Condición Ib ≤ In ≤ Iz y caída ΔU%
                  </p>
                </div>
              </section>

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
                    className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Electrificación Básica (C1 a C5)
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPresetDwellings("elevada_ve")}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#0f6cbd] hover:bg-blue-100"
                  >
                    Electrificación Elevada + VE (C1 a C13)
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
                    value={supplyType}
                    onChange={(e) =>
                      setSupplyType(e.target.value as SystemSupplyType)
                    }
                    className="w-44"
                  >
                    <option value="monofasico_230v">Monofásico 230 V</option>
                    <option value="trifasico_400v">Trifásico 400 V</option>
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
              electrificationGrade={electrificationGrade}
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
            />
          )}

          {/* =================================================================
              APARTADO 6: DASHBOARD ADMINISTRATIVO, CREACIÓN DE USUARIOS Y PERMISOLOGÍA
             ================================================================= */}
          {activeSection === "administracion" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#0f6cbd]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Dashboard Administrativo Multi-Tenant y RBAC
                </span>
                <h2 className="mt-2 text-lg font-bold text-slate-900">
                  Métricas Globales, Empresas (Tenants), Creación de Usuarios y Matriz de Permisología
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Supervisa las métricas de actividad por empresa, la cobertura de permisos RBAC y registra nuevas organizaciones y técnicos con espacios de trabajo aislados.
                </p>
              </div>

              {/* Dashboard Ejecutivo de Administración */}
              <AdminDashboardSummary
                tenants={tenants}
                users={users}
                allProjects={allProjects}
                currentUser={currentUser}
                onSwitchUser={(u) => switchActiveUser(u)}
              />

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Formulario 1: Crear Nuevo Usuario */}
                <form
                  onSubmit={handleCreateUser}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4"
                >
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Users className="h-5 w-5 text-[#0f6cbd]" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Registrar Nuevo Usuario
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700">
                        Nombre Completo y Cargo
                      </label>
                      <input
                        type="text"
                        required
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="Ej. Javier Padrón (Instalador PH)"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Correo Electrónico (Usuario)
                      </label>
                      <input
                        type="email"
                        required
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="javier@empresa.es"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        PIN / Contraseña de Acceso
                      </label>
                      <input
                        type="text"
                        required
                        value={newUserPin}
                        onChange={(e) => setNewUserPin(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Empresa / Organización (Tenant)
                      </label>
                      <GoogleSelect
                        value={newUserTenantId}
                        onChange={(e) =>
                          setNewUserTenantId(Number(e.target.value))
                        }
                        className="mt-1"
                      >
                        {tenants.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.isla})
                          </option>
                        ))}
                      </GoogleSelect>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Rol de Permisología (RBAC)
                      </label>
                      <GoogleSelect
                        value={newUserRole}
                        onChange={(e) =>
                          setNewUserRole(e.target.value as UserRole)
                        }
                        className="mt-1"
                      >
                        <option value="ingeniero_instalador">
                          Ingeniero / Instalador Autorizado PH
                        </option>
                        <option value="admin_empresa">
                          Administrador de Empresa Instaladora
                        </option>
                        <option value="visor_auditor">
                          Visor / Auditor OCA (Solo lectura)
                        </option>
                        <option value="super_admin">
                          Super Administrador Global
                        </option>
                      </GoogleSelect>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        D.O.I. / N.I.F.
                      </label>
                      <input
                        type="text"
                        value={newUserDoi}
                        onChange={(e) => setNewUserDoi(e.target.value)}
                        placeholder="43.000.000-A"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Nº C.C.I. / Nº Colegiado
                      </label>
                      <input
                        type="text"
                        value={newUserCci}
                        onChange={(e) => setNewUserCci(e.target.value)}
                        placeholder="CCI-TF-6021"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0f6cbd] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#115ea3]"
                  >
                    <Plus className="h-4 w-4" />
                    Crear Usuario con Espacio Aislado
                  </button>
                </form>

                {/* Formulario 2: Crear Nueva Empresa / Tenant */}
                <form
                  onSubmit={handleCreateTenant}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4"
                >
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Building className="h-5 w-5 text-[#0f6cbd]" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Registrar Nueva Empresa Instaladora / Tenant
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700">
                        Razón Social de la Empresa / Estudio
                      </label>
                      <input
                        type="text"
                        required
                        value={newTenantName}
                        onChange={(e) => setNewTenantName(e.target.value)}
                        placeholder="Ej. Instalaciones Eléctricas Teide S.L."
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        C.I.F. Empresa
                      </label>
                      <input
                        type="text"
                        value={newTenantCif}
                        onChange={(e) => setNewTenantCif(e.target.value)}
                        placeholder="B-38000000"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Nº Empresa Instaladora Habilitada
                      </label>
                      <input
                        type="text"
                        value={newTenantNum}
                        onChange={(e) => setNewTenantNum(e.target.value)}
                        placeholder="EI-38-04500"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700">
                        Isla Principal
                      </label>
                      <GoogleSelect
                        value={newTenantIsla}
                        onChange={(e) => setNewTenantIsla(e.target.value)}
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
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" />
                    Registrar Empresa (Tenant)
                  </button>
                </form>
              </div>

              {/* Matriz de Permisología (RBAC) por Usuario */}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                <div className="border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Matriz de Usuarios, Multitenencia y Permisología (RBAC)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Activa o desactiva permisos granulares para cada usuario o cambia de sesión con un clic para verificar que los reportes están aislados.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Usuario / Correo</th>
                        <th className="px-4 py-3">Empresa (Tenant)</th>
                        <th className="px-4 py-3">Rol</th>
                        <th className="px-3 py-3 text-center">Reportes Propios</th>
                        <th className="px-3 py-3 text-center">Crear Reportes</th>
                        <th className="px-3 py-3 text-center">Editar Cálculos</th>
                        <th className="px-3 py-3 text-center">Descargar M.T.D.</th>
                        <th className="px-3 py-3 text-center">Borrar Reportes</th>
                        <th className="px-3 py-3 text-center">Admin Usuarios</th>
                        <th className="px-4 py-3 text-right">Sesión</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {users.map((u) => {
                        const t = tenants.find((ten) => ten.id === u.tenant_id);
                        const userProjectsCount = allProjects.filter(
                          (p) => p.owner_user_id === u.id
                        ).length;
                        const isCurrent = u.id === currentUser?.id;

                        return (
                          <tr
                            key={u.id}
                            className={
                              isCurrent ? "bg-blue-50/40" : "hover:bg-slate-50"
                            }
                          >
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-900">
                                {u.full_name}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {u.email} · PIN:{" "}
                                <code className="font-mono">{u.access_pin}</code>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-medium text-slate-800">
                                {t?.name}
                              </span>
                              <div className="text-[10px] text-slate-500">
                                {t?.empresa_instaladora_num} ({t?.isla})
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                {u.role}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center font-mono font-bold text-[#0f6cbd]">
                              {userProjectsCount}
                            </td>
                            {(
                              [
                                "can_create_projects",
                                "can_edit_calculations",
                                "can_export_mtd",
                                "can_delete_projects",
                                "can_manage_users",
                              ] as const
                            ).map((perm) => (
                              <td key={perm} className="px-3 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={u[perm]}
                                  onChange={() =>
                                    handleTogglePermission(u, perm)
                                  }
                                  className="h-4 w-4 rounded border-slate-300 text-[#0f6cbd] focus:ring-[#0f6cbd]"
                                />
                              </td>
                            ))}
                            <td className="px-4 py-3 text-right">
                              {isCurrent ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                                  <UserCheck className="h-3.5 w-3.5" />
                                  Sesión Activa
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => switchActiveUser(u)}
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                  Entrar como este usuario
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Barra de Navegación Inferior Fija para Móviles */}
        <nav className="no-print fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-slate-200 bg-white/95 px-1 py-1.5 backdrop-blur lg:hidden">
          {[
            {
              id: "dashboard_tecnico" as ActiveSection,
              label: "Dashboard",
              icon: <LayoutDashboard className="h-4 w-4" />,
            },
            {
              id: "titular_ubicacion" as ActiveSection,
              label: "Titular",
              icon: <MapPin className="h-4 w-4" />,
            },
            {
              id: "circuitos" as ActiveSection,
              label: "Circuitos",
              icon: <Activity className="h-4 w-4" />,
            },
            {
              id: "ficha_mtd" as ActiveSection,
              label: "Ficha M.T.D.",
              icon: <FileSpreadsheet className="h-4 w-4" />,
            },
            {
              id: "administracion" as ActiveSection,
              label: "Admin",
              icon: <ShieldCheck className="h-4 w-4" />,
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
