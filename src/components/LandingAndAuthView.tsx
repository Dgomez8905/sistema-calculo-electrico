"use client";

import React, { useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const cleanEmail = email.toLowerCase().trim();
    const cleanPin = pin.trim();

    let found = users.find(
      (u) =>
        u.email.toLowerCase().trim() === cleanEmail &&
        u.access_pin === cleanPin
    );

    if (!found && isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase.rpc("verify_app_user_pin", {
          p_email: cleanEmail,
          p_pin: cleanPin,
        });
        const verifiedId = Array.isArray(data) ? data[0]?.id : data?.id;
        if (verifiedId) {
          found = users.find((u) => u.id === Number(verifiedId));
        }
      } catch {
        // Fallback silencioso si la RPC aún no se ha aplicado en remoto
      }
    }

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
      <div className="relative min-h-screen bg-[#f4f7fb] text-slate-900 flex flex-col isolate">
        {/* Marca de agua de fondo en blanco y negro resaltada (Esquema eléctrico CAD y sistema B.T.) */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat opacity-95 mix-blend-multiply"
          style={{
            backgroundImage: "url('/bg-electrical-cad.jpg')",
            filter: "grayscale(100%) contrast(280%) brightness(88%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:28px_28px] opacity-25"
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
          <section className="relative overflow-hidden py-12 sm:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12">
                <div className="flex flex-col justify-between gap-6 lg:col-span-7">
                  <div className="space-y-6">
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
                      Plataforma multi-empresa en la nube para ingenieros e instaladores habilitados. Dimensiona cuadros de circuitos (ITC-BT-19/25), previsión de cargas de edificios (ITC-BT-10/52), puesta a tierra (ITC-BT-18/24) y genera la{" "}
                      <strong className="text-slate-900">
                        M.T.D. B.T. del Gobierno de Canarias
                      </strong>{" "}
                      lista para firmar e imprimir.
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
                        <span>Ficha Oficial M.T.D.</span>
                      </div>
                      <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>Aislamiento Multi-Tenant</span>
                      </div>
                    </div>
                  </div>

                  {/* Sellos y Normas Europeas / ISO / UNE-HD (Unión Europea y España) */}
                  <div className="mt-auto rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-xs backdrop-blur-xs">
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Estándares y Normativa Técnica en la Unión Europea
                      </span>
                      <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#0f6cbd]">
                        Directiva UE 2014/35/UE (LVD)
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-stretch">
                      {/* Sello 1: ISO 9001 */}
                      <div className="flex h-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-2.5">
                        <div className="flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-lg border border-blue-200 bg-[#0f6cbd] text-white shadow-2xs">
                          <span className="text-[8px] font-extrabold leading-none tracking-tighter">
                            ISO
                          </span>
                          <span className="text-[8px] font-bold leading-none mt-0.5">
                            9001
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[11px] font-bold text-slate-900">
                            ISO 9001
                          </div>
                          <div className="truncate text-[9.5px] text-slate-500">
                            Calidad M.T.D.
                          </div>
                        </div>
                      </div>

                      {/* Sello 2: UNE-HD 60364 (IEC 60364 / CENELEC UE) */}
                      <div className="flex h-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-2.5">
                        <div className="flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-lg border border-blue-900 bg-[#003399] text-white shadow-2xs">
                          <span className="text-[7.5px] font-extrabold leading-none text-amber-300">
                            ★ UE ★
                          </span>
                          <span className="text-[7.5px] font-bold leading-none mt-0.5">
                            60364
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[11px] font-bold text-slate-900">
                            UNE-HD 60364
                          </div>
                          <div className="truncate text-[9.5px] text-slate-500">
                            Cálculo B.T. CENELEC
                          </div>
                        </div>
                      </div>

                      {/* Sello 3: EN / IEC 61082 & 60617 (Esquemas y Documentación Técnica) */}
                      <div className="flex h-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-2.5">
                        <div className="flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-lg border border-slate-300 bg-slate-800 text-white shadow-2xs">
                          <span className="text-[8px] font-extrabold leading-none">
                            EN/IEC
                          </span>
                          <span className="text-[7.5px] font-bold leading-none mt-0.5 text-blue-200">
                            61082
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[11px] font-bold text-slate-900">
                            EN 61082 / 60617
                          </div>
                          <div className="truncate text-[9.5px] text-slate-500">
                            Unifilar y Ficha
                          </div>
                        </div>
                      </div>

                      {/* Sello 4: ISO/IEC 27001 (Seguridad Cloud Multi-Tenant) */}
                      <div className="flex h-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-2.5">
                        <div className="flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-lg border border-emerald-300 bg-emerald-700 text-white shadow-2xs">
                          <span className="text-[8px] font-extrabold leading-none">
                            ISO
                          </span>
                          <span className="text-[7.5px] font-bold leading-none mt-0.5">
                            27001
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[11px] font-bold text-slate-900">
                            ISO/IEC 27001
                          </div>
                          <div className="truncate text-[9.5px] text-slate-500">
                            Datos Aislados
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tarjeta Visual Derecha con Imagen Profesional e Información Técnica REBT */}
                <div className="flex lg:col-span-5">
                  <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    {/* Imagen Hero de Ingeniería Eléctrica y Cuadro Modular REBT */}
                    <div className="relative h-52 sm:h-56 w-full shrink-0 overflow-hidden bg-slate-900">
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

                    <div className="flex flex-1 flex-col justify-between p-5 sm:p-6 gap-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8f0fe] text-[#0f6cbd]">
                            <ShieldCheck className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 leading-tight">
                              Reglamento Electrotécnico B.T.
                            </div>
                            <div className="text-[10.5px] text-slate-500">
                              Cálculo y Documentación Técnica Oficial
                            </div>
                          </div>
                        </div>
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
                            Memoria Técnica de Diseño B.T.
                          </strong>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 items-stretch gap-3 text-xs">
                        <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                          <div className="font-bold text-[#0f6cbd]">Ficha M.T.D.</div>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            Autocompletado M.T.D. con Unifilar y Croquis SVG
                          </p>
                        </div>
                        <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                          <div className="font-bold text-[#0f6cbd]">Multi-Dispositivo</div>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            Optimizado para móvil, tablet y escritorio
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setMode("login")}
                        className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white transition hover:bg-slate-800"
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

              <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
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

                <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
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

                <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f0fe] text-[#0f6cbd]">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-slate-900">
                    Ficha Oficial M.T.D. B.T.
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    Visualización en doble columna sin scroll innecesario, navegador por contenido de sección, edición en vivo e impresión directa en formato oficial.
                  </p>
                </div>

                <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
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

                <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
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

                <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
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
            <span>Ingeniería e Instalaciones Eléctricas de Baja Tensión · ITC-BT-01 a ITC-BT-52</span>
          </div>
        </footer>
      </div>
    );
  }

  // ===========================================================================
  // VISTA 2 Y 3: LOGIN Y RESTABLECIMIENTO DE CONTRASEÑA (SPLIT-SCREEN: LOGIN IZQUIERDA / FOTO DERECHA)
  // ===========================================================================
  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 bg-white text-slate-900">
      {/* =====================================================================
          COLUMNA IZQUIERDA: PANEL DE ACCESO Y RECUPERACIÓN DE CLAVE
      ===================================================================== */}
      <div className="lg:col-span-5 xl:col-span-5 flex flex-col justify-between bg-white px-6 py-6 sm:px-10 lg:px-12 xl:px-16 border-b lg:border-b-0 lg:border-r border-slate-200/80 relative z-10">
        {/* Barra Superior: Marca + Volver al Inicio */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0f6cbd] text-white shadow-xs">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold tracking-tight text-slate-900 leading-none">
                REBT Cloud Suite
              </div>
              <div className="mt-0.5 text-[10px] font-semibold text-[#0f6cbd]">
                RD 842/2002 · M.T.D. Canarias
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setAuthError(null);
              setAuthSuccess(null);
              setMode("landing");
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Volver al Inicio
          </button>
        </div>

        {/* Contenedor Central del Formulario */}
        <div className="mx-auto my-auto w-full max-w-md py-8 sm:py-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3 py-1 text-[11px] font-semibold text-[#0f6cbd]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Entorno Multi-Tenant Aislado · RBAC
          </div>

          <div className="mt-4">
            <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-slate-900 leading-tight">
              {mode === "login"
                ? "Iniciar Sesión en tu Espacio REBT"
                : "Restablecer Contraseña / PIN"}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed">
              {mode === "login"
                ? "Accede a tus expedientes técnicos, simulador DIN interactivo y Memoria Técnica de Diseño M.T.D."
                : "Verifica tu correo electrónico profesional y NIF o Nº de Colegiado para definir una nueva clave."}
            </p>
          </div>

          {/* Pestañas Login / Recuperar */}
          <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setAuthError(null);
                setAuthSuccess(null);
                setMode("login");
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2.5 transition ${
                mode === "login"
                  ? "bg-white text-[#0f6cbd] shadow-xs ring-1 ring-slate-200/70"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthError(null);
                setAuthSuccess(null);
                setMode("reset_password");
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2.5 transition ${
                mode === "reset_password"
                  ? "bg-white text-[#0f6cbd] shadow-xs ring-1 ring-slate-200/70"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              Recuperar Clave
            </button>
          </div>

          {authError && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs font-medium text-rose-800">
              {authError}
            </div>
          )}

          {authSuccess && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs font-medium text-emerald-800 space-y-2">
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
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Correo Electrónico Profesional
                </label>
                <div className="relative mt-1.5">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@empresa.es"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/40 pl-10 pr-3.5 py-2.5 sm:py-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#0f6cbd] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0f6cbd]/10"
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
                    className="text-xs font-semibold text-[#0f6cbd] hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative mt-1.5">
                  <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPin ? "text" : "password"}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/40 pl-10 pr-10 py-2.5 sm:py-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#0f6cbd] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0f6cbd]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin((p) => !p)}
                    aria-label={showPin ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
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
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f6cbd] px-5 py-3 text-sm font-bold text-white shadow-md shadow-[#0f6cbd]/20 transition hover:bg-[#115ea3] active:scale-[0.99]"
              >
                Entrar al Sistema REBT
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordReset} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Correo Electrónico de la Cuenta
                </label>
                <div className="relative mt-1.5">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="correo@empresa.es"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/40 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#0f6cbd] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0f6cbd]/10"
                  />
                </div>
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
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50/40 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#0f6cbd] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0f6cbd]/10"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Documento de identidad o número de instalador/colegiado registrado en tu perfil.
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
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50/40 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#0f6cbd] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0f6cbd]/10"
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
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50/40 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#0f6cbd] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0f6cbd]/10"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isResetting}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f6cbd] px-5 py-3 text-sm font-bold text-white shadow-md shadow-[#0f6cbd]/20 transition hover:bg-[#115ea3] disabled:opacity-50"
              >
                <KeyRound className="h-4 w-4" />
                {isResetting
                  ? "Actualizando Contraseña..."
                  : "Restablecer Contraseña Ahora"}
              </button>
            </form>
          )}

          {/* Sellos Técnicos de Confianza bajo el formulario */}
          <div className="mt-7 pt-5 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-slate-50 px-2 py-2 border border-slate-200/60">
              <div className="text-[11px] font-bold text-slate-800">ITC-BT 01–52</div>
              <div className="text-[10px] text-slate-500">Cálculo Oficial</div>
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-2 border border-slate-200/60">
              <div className="text-[11px] font-bold text-slate-800">IEC 60617</div>
              <div className="text-[10px] text-slate-500">Unifilar & DXF</div>
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-2 border border-slate-200/60">
              <div className="text-[11px] font-bold text-slate-800">M.T.D. 11 Hojas</div>
              <div className="text-[10px] text-slate-500">Sede Canarias</div>
            </div>
          </div>
        </div>

        {/* Pie Izquierdo */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-2">
          <span>REBT Cloud Suite · Ingeniería B.T.</span>
          <span>Seguridad Multi-Tenant Aislada</span>
        </div>
      </div>

      {/* =====================================================================
          COLUMNA DERECHA: FOTOGRAFÍA PROFESIONAL DE INGENIERÍA ELÉCTRICA REBT
      ===================================================================== */}
      <div className="lg:col-span-7 xl:col-span-7 relative min-h-[340px] sm:min-h-[420px] lg:min-h-screen overflow-hidden bg-slate-950 flex flex-col justify-between p-6 sm:p-10 lg:p-12">
        {/* Imagen Fotográfica Principal a Pantalla Completa */}
        <img
          src="/hero-rebt-banner.jpg"
          alt="Cuadro Eléctrico Modular REBT, Esquema Unifilar y Memoria Técnica de Diseño"
          className="absolute inset-0 h-full w-full object-cover object-center scale-[1.01]"
        />

        {/* Capas de Contraste Suaves para Realzar la Foto y Garantizar Lectura */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-slate-950/40"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/35 via-transparent to-transparent"
        />

        {/* Cabecera Flotante sobre la Fotografía */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/55 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Homologado REBT · RD 842/2002 · NRZ103 Endesa
          </div>

          <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/95 px-3.5 py-1.5 text-[11px] font-bold text-slate-900 shadow-sm">
            <Building2 className="h-3.5 w-3.5 text-[#0f6cbd]" />
            Empresas Instaladoras Habilitadas B.T.
          </div>
        </div>

        {/* Tarjeta Inferior Glassmorphism sobre la Fotografía */}
        <div className="relative z-10 mt-auto max-w-2xl rounded-2xl border border-white/15 bg-slate-950/65 p-5 sm:p-6 text-white backdrop-blur-md shadow-2xl">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-sky-300">
            <Sparkles className="h-3.5 w-3.5" />
            Automatización Integral de Proyectos y Boletines Eléctricos
          </div>
          <h2 className="mt-2 text-lg sm:text-xl font-bold tracking-tight text-white leading-snug">
            De la fotografía del cuadro eléctrico al esquema unifilar IEC 60617 y la Memoria Técnica Oficial en minutos.
          </h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-200">
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 border border-white/10">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>Reconocimiento IA de Cuadros DIN</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 border border-white/10">
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-sky-400" />
              <span>M.T.D. Canarias Autocompletada</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 border border-white/10">
              <Activity className="h-4 w-4 shrink-0 text-amber-300" />
              <span>Exportación PDF A3 y AutoCAD DXF</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

