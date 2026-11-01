"use client";

import React, { useState } from "react";
import {
  Zap,
  ShieldCheck,
  FileSpreadsheet,
  Activity,
  Building2,
  Lock,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Mail,
  UserCheck,
  Sparkles,
  ChevronLeft,
  Eye,
  EyeOff,
  Layers,
  Smartphone,
} from "lucide-react";

export interface AuthUserItem {
  id: number;
  tenant_id: number;
  full_name: string;
  email: string;
  access_pin: string;
  doi_nif: string;
  role: string;
  cci_or_colegiado: string;
  is_active: boolean;
}

export interface AuthTenantItem {
  id: number;
  name: string;
  cif: string;
  empresa_instaladora_num: string;
  isla: string;
}

interface LandingAndAuthViewProps {
  mode: "landing" | "login" | "reset_password";
  setMode: (mode: "landing" | "login" | "reset_password") => void;
  users: AuthUserItem[];
  tenants: AuthTenantItem[];
  onLoginSuccess: (user: AuthUserItem) => void;
  onResetPassword: (
    email: string,
    doiOrSecret: string,
    newPin: string
  ) => Promise<{ ok: boolean; message: string }>;
}

export default function LandingAndAuthView({
  mode,
  setMode,
  users,
  onLoginSuccess,
  onResetPassword,
}: LandingAndAuthViewProps) {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Estado para Restablecimiento de Contraseña
  const [resetEmail, setResetEmail] = useState("");
  const [resetDoi, setResetDoi] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const found = users.find(
      (u) =>
        u.email.toLowerCase().trim() === email.toLowerCase().trim() &&
        u.access_pin === pin.trim()
    );
    if (!found) {
      setAuthError(
        "Credenciales incorrectas. Verifica tu correo electrónico y contraseña/PIN."
      );
      return;
    }
    if (!found.is_active) {
      setAuthError(
        "Esta cuenta se encuentra desactivada por el Administrador Global."
      );
      return;
    }
    onLoginSuccess(found);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (newPin.trim().length < 4) {
      setAuthError("La nueva contraseña / PIN debe tener al menos 4 caracteres.");
      return;
    }
    if (newPin.trim() !== confirmPin.trim()) {
      setAuthError("Las contraseñas introducidas no coinciden.");
      return;
    }

    setIsResetting(true);
    const result = await onResetPassword(
      resetEmail.trim(),
      resetDoi.trim(),
      newPin.trim()
    );
    setIsResetting(false);

    if (!result.ok) {
      setAuthError(result.message);
      return;
    }

    setAuthSuccess(result.message);
    setEmail(resetEmail.trim());
    setPin(newPin.trim());
  };

  // ===========================================================================
  // VISTA 1: LANDING PAGE CORPORATIVA E INGENIERÍA REBT
  // ===========================================================================
  if (mode === "landing") {
    return (
      <div className="relative min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col isolate">
        {/* Marca de agua de fondo en blanco y negro tenue (Esquema eléctrico CAD y sistema B.T.) */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat opacity-[0.42] grayscale contrast-125 mix-blend-multiply"
          style={{
            backgroundImage: "url('/bg-electrical-cad.jpg')",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-white/55 via-white/35 to-[#f8fafc]/65"
        />

        {/* Navegación Superior Responsive */}
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0f6cbd] text-white shadow-xs">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-slate-900">
                  REBT Cloud Suite
                </span>
                <span className="hidden sm:inline-block ml-2 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#0f6cbd]">
                  RD 842/2002 · M.T.D. Canarias
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setAuthError(null);
                  setAuthSuccess(null);
                  setMode("reset_password");
                }}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <KeyRound className="h-3.5 w-3.5" />
                Recuperar Contraseña
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthError(null);
                  setAuthSuccess(null);
                  setMode("login");
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0f6cbd] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#115ea3]"
              >
                <Lock className="h-3.5 w-3.5" />
                Iniciar Sesión
              </button>
            </div>
          </div>
        </header>

        {/* Hero Principal */}
        <main className="flex-1">
          <section className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-white/50 via-blue-50/20 to-transparent py-12 sm:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
                <div className="space-y-6 lg:col-span-7">
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1.5 text-xs font-semibold text-[#0f6cbd]">
                    <Sparkles className="h-3.5 w-3.5" />
                    Ingeniería Eléctrica de Baja Tensión y Generación M.T.D. Oficial
                  </div>

                  <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl leading-[1.15]">
                    Cálculo Reglamentario{" "}
                    <span className="text-[#0f6cbd]">REBT</span> y Memoria
                    Técnica de Diseño Automatizada
                  </h1>

                  <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-slate-600">
                    Plataforma multi-empresa en la nube para ingenieros e instaladores habilitados. Dimensiona cuadros de circuitos (ITC-BT-19/25), previsión de cargas de edificios (ITC-BT-10/52), puesta a tierra (ITC-BT-18/24) y genera las 11 páginas oficiales de la{" "}
                    <strong className="text-slate-900">
                      M.T.D. B.T. del Gobierno de Canarias
                    </strong>{" "}
                    listas para firmar e imprimir.
                  </p>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthError(null);
                        setAuthSuccess(null);
                        setMode("login");
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f6cbd] px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#115ea3]"
                    >
                      Acceder a la Plataforma
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAuthError(null);
                        setAuthSuccess(null);
                        setMode("reset_password");
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
                    >
                      <KeyRound className="h-4 w-4 text-[#0f6cbd]" />
                      Recuperar Contraseña
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200/80 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>ITC-BT-01 a ITC-BT-52</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>Ficha Oficial 11 Hojas A4</span>
                    </div>
                    <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>Aislamiento Multi-Tenant</span>
                    </div>
                  </div>
                </div>

                {/* Tarjeta Visual Derecha con Imagen Profesional e Información Técnica REBT */}
                <div className="lg:col-span-5">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    {/* Imagen Hero de Ingeniería Eléctrica y Cuadro Modular REBT */}
                    <div className="relative h-56 sm:h-64 w-full overflow-hidden bg-slate-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/hero-rebt-banner.jpg"
                        alt="Cuadro Eléctrico de Baja Tensión y Esquema Unifilar REBT"
                        className="h-full w-full object-cover object-center transition duration-500 hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-900/15 to-transparent" />
                      <div className="absolute top-3 right-3">
                        <span className="rounded-lg bg-emerald-500/95 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm backdrop-blur-xs">
                          100% Homologado REBT
                        </span>
                      </div>
                      <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between text-white">
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">
                            Ingeniería de Baja Tensión
                          </span>
                          <p className="text-sm font-bold leading-snug">
                            Cuadro CGMP, Esquema Unifilar y M.T.D. Oficial
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 sm:p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/logo-gobierno-canarias.png"
                          alt="Gobierno de Canarias"
                          className="h-10 w-auto object-contain"
                        />
                        <span className="rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-[#0f6cbd]">
                          RD 842/2002
                        </span>
                      </div>

                      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 text-xs space-y-2 text-slate-700">
                        <div className="flex items-center justify-between">
                          <span>Instrucciones Técnicas:</span>
                          <strong className="font-semibold text-slate-900">
                            ITC-BT-01 a ITC-BT-52
                          </strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Documento Generado:</span>
                          <strong className="font-semibold text-[#0f6cbd]">
                            M.T.D. B.T. (11 Páginas A4)
                          </strong>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                          <div className="font-bold text-[#0f6cbd]">11 Secciones</div>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            Autocompletado M.T.D. con Unifilar y Croquis SVG
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                          <div className="font-bold text-[#0f6cbd]">Multi-Dispositivo</div>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            Optimizado para móvil, tablet y escritorio
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setMode("login")}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white transition hover:bg-slate-800"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        Ir al Portal de Inicio de Sesión
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Módulos del Sistema */}
          <section className="py-12 sm:py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-10">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Módulos Integrados en la Suite Técnica
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-slate-500">
                  Todo el flujo de trabajo eléctrico reglamentario en una interfaz limpia con historial editable por apartado.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f0fe] text-[#0f6cbd]">
                    <Activity className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-slate-900">
                    Cuadro de Circuitos y D.I. (ITC-BT-15 / 19 / 25)
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    Cálculo automático de sección en mm², intensidad admisible Iz, protección PIA, caída de tensión ΔU%, corriente de cortocircuito Icc y diámetro de tubo.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f0fe] text-[#0f6cbd]">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-slate-900">
                    Previsión de Edificio y Recarga VE (ITC-BT-10 / 52)
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    Coeficientes de simultaneidad en edificios residenciales, servicios generales, locales comerciales, garajes y estaciones de vehículo eléctrico con LGA.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f0fe] text-[#0f6cbd]">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-slate-900">
                    Ficha Oficial M.T.D. B.T. (11 Hojas A4)
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    Visualización en doble columna sin scroll innecesario, navegador por contenido de sección, edición en vivo e impresión directa en formato oficial.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f0fe] text-[#0f6cbd]">
                    <Layers className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-slate-900">
                    Historial de Registros por Apartado
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    Cada apartado cuenta con su tabla de registros históricos para inspeccionar detalles, cargar en modo edición o eliminar expedientes en tiempo real.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f0fe] text-[#0f6cbd]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-slate-900">
                    Gobierno Multi-Tenant y Permisos RBAC
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    Aislamiento estricto por usuario e instaladora. Panel administrativo para alta de empresas, técnicos y matriz de permisos granulares.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f0fe] text-[#0f6cbd]">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-slate-900">
                    Diseño Adaptable a Móviles y Tablets
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    Menú deslizante móvil, tablas con desplazamiento táctil suave y acceso desde obra o despacho en cualquier teléfono inteligente.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Pie de página */}
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              <strong>REBT Cloud Suite</strong> · Sistema de Cálculo B.T. y Memoria Técnica de Diseño (RD 842/2002)
            </span>
            <span>Gobierno de Canarias · Dirección General de Energía</span>
          </div>
        </footer>
      </div>
    );
  }

  // ===========================================================================
  // VISTA 2 Y 3: LOGIN Y RESTABLECIMIENTO DE CONTRASEÑA
  // ===========================================================================
  return (
    <div className="relative min-h-screen bg-[#f8fafc] flex flex-col justify-between p-4 sm:p-6 isolate">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat opacity-[0.42] grayscale contrast-125 mix-blend-multiply"
        style={{
          backgroundImage: "url('/bg-electrical-cad.jpg')",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-white/55 via-white/35 to-[#f8fafc]/65"
      />
      <div className="mx-auto w-full max-w-6xl pt-2">
        <button
          type="button"
          onClick={() => {
            setAuthError(null);
            setAuthSuccess(null);
            setMode("landing");
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver a la Página de Inicio
        </button>
      </div>

      <div className="mx-auto my-8 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl">
        {/* Cabecera del Formulario */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f6cbd] text-white shadow-sm">
            {mode === "login" ? (
              <Lock className="h-5 w-5" />
            ) : (
              <KeyRound className="h-5 w-5" />
            )}
          </div>
          <h1 className="mt-3 text-lg font-bold text-slate-900">
            {mode === "login"
              ? "Iniciar Sesión en REBT Cloud Suite"
              : "Restablecer Contraseña / PIN"}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {mode === "login"
              ? "Accede a tu espacio aislado de expedientes y Memoria Técnica M.T.D."
              : "Verifica tu correo electrónico y NIF/Colegiado para asignar una nueva clave"}
          </p>
        </div>

        {/* Pestañas Login / Recuperar */}
        <div className="mt-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setAuthError(null);
              setAuthSuccess(null);
              setMode("login");
            }}
            className={`rounded-lg py-2 transition ${
              mode === "login"
                ? "bg-white text-[#0f6cbd] shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthError(null);
              setAuthSuccess(null);
              setMode("reset_password");
            }}
            className={`rounded-lg py-2 transition ${
              mode === "reset_password"
                ? "bg-white text-[#0f6cbd] shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Recuperar Clave
          </button>
        </div>

        {authError && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
            {authError}
          </div>
        )}

        {authSuccess && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 space-y-2">
            <p>{authSuccess}</p>
            {mode === "reset_password" && (
              <button
                type="button"
                onClick={() => {
                  setAuthSuccess(null);
                  setMode("login");
                }}
                className="inline-flex items-center gap-1 font-bold text-[#0f6cbd] underline"
              >
                Ir a Iniciar Sesión ahora →
              </button>
            )}
          </div>
        )}

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Correo Electrónico Profesional
              </label>
              <div className="relative mt-1">
                <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@empresa.es"
                  className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Contraseña / PIN de Acceso
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setAuthError(null);
                    setAuthSuccess(null);
                    setMode("reset_password");
                  }}
                  className="text-[11px] font-semibold text-[#0f6cbd] hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative mt-1">
                <KeyRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPin ? "text" : "password"}
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-9 py-2 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPin((p) => !p)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  {showPin ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f6cbd] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#115ea3]"
            >
              Entrar al Sistema REBT
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordReset} className="mt-5 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Correo Electrónico de la Cuenta
              </label>
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="correo@empresa.es"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                D.O.I. / N.I.F. del Titular o Nº Colegiado / CCI
              </label>
              <input
                type="text"
                required
                value={resetDoi}
                onChange={(e) => setResetDoi(e.target.value)}
                placeholder="Introduce tu NIF o Nº de Colegiado / CCI"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
              />
              <p className="mt-1 text-[10px] text-slate-500">
                Introduce el documento de identidad o número de colegiado registrado en tu perfil profesional.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Nueva Contraseña / PIN
                </label>
                <input
                  type="password"
                  required
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="Mín. 4 caracteres"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Confirmar Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="Repite la clave"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isResetting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f6cbd] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#115ea3] disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4" />
              {isResetting
                ? "Actualizando Contraseña..."
                : "Restablecer Contraseña Ahora"}
            </button>
          </form>
        )}
      </div>

      <div className="text-center text-[11px] text-slate-400 pb-2">
        REBT Cloud Suite · Seguridad Multi-Tenant con Aislamiento de Expedientes
      </div>
    </div>
  );
}

