"use client";

import React, { useMemo, useState } from "react";
import {
  ShieldCheck,
  Users,
  Plus,
  Building,
  UserCheck,
  Pencil,
  Trash2,
  Power,
  X,
  Eye,
  EyeOff,
  Search,
  AlertTriangle,
  CheckCircle2,
  Ban,
} from "lucide-react";
import GoogleSelect from "@/components/GoogleSelect";
import { AdminDashboardSummary } from "@/components/DashboardsView";
import type { SavedHistoryRecord } from "@/components/SectionHistoryRegistry";
import type { AppTenant, AppUser, UserRole } from "@/app/page";

export interface EditableUserPatch {
  full_name: string;
  email: string;
  access_pin: string;
  tenant_id: number;
  role: UserRole;
  doi_nif: string;
  cci_or_colegiado: string;
  is_active: boolean;
}

interface AdminRbacSectionProps {
  tenants: AppTenant[];
  users: AppUser[];
  allProjects: SavedHistoryRecord[];
  currentUser: AppUser;
  onSwitchUser: (u: AppUser) => void;
  onCreateUser: (e: React.FormEvent) => void;
  onCreateTenant: (e: React.FormEvent) => void;
  onTogglePermission: (
    user: AppUser,
    field:
      | "can_create_projects"
      | "can_edit_calculations"
      | "can_export_mtd"
      | "can_delete_projects"
      | "can_manage_users"
  ) => void;
  onUpdateUser: (
    userId: number,
    patch: EditableUserPatch
  ) => Promise<boolean> | boolean;
  onToggleUserActive: (user: AppUser) => void;
  onDeleteUser: (user: AppUser) => void;
  newUserName: string;
  setNewUserName: (v: string) => void;
  newUserEmail: string;
  setNewUserEmail: (v: string) => void;
  newUserPin: string;
  setNewUserPin: (v: string) => void;
  newUserTenantId: number;
  setNewUserTenantId: (v: number) => void;
  newUserRole: UserRole;
  setNewUserRole: (v: UserRole) => void;
  newUserDoi: string;
  setNewUserDoi: (v: string) => void;
  newUserCci: string;
  setNewUserCci: (v: string) => void;
  newTenantName: string;
  setNewTenantName: (v: string) => void;
  newTenantCif: string;
  setNewTenantCif: (v: string) => void;
  newTenantNum: string;
  setNewTenantNum: (v: string) => void;
  newTenantIsla: string;
  setNewTenantIsla: (v: string) => void;
}

export default function AdminRbacSection({
  tenants,
  users,
  allProjects,
  currentUser,
  onSwitchUser,
  onCreateUser,
  onCreateTenant,
  onTogglePermission,
  onUpdateUser,
  onToggleUserActive,
  onDeleteUser,
  newUserName,
  setNewUserName,
  newUserEmail,
  setNewUserEmail,
  newUserPin,
  setNewUserPin,
  newUserTenantId,
  setNewUserTenantId,
  newUserRole,
  setNewUserRole,
  newUserDoi,
  setNewUserDoi,
  newUserCci,
  setNewUserCci,
  newTenantName,
  setNewTenantName,
  newTenantCif,
  setNewTenantCif,
  newTenantNum,
  setNewTenantNum,
  newTenantIsla,
  setNewTenantIsla,
}: AdminRbacSectionProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all"
  );
  const [searchTerm, setSearchTerm] = useState("");

  // Estado del Modal de Edición de Usuario
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editForm, setEditForm] = useState<EditableUserPatch>({
    full_name: "",
    email: "",
    access_pin: "",
    tenant_id: 1,
    role: "ingeniero_instalador",
    doi_nif: "",
    cci_or_colegiado: "",
    is_active: true,
  });
  const [showEditPin, setShowEditPin] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Estado del Modal de Confirmación de Eliminación
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);

  const canManage =
    currentUser?.can_manage_users || currentUser?.role === "super_admin";

  const activeCount = useMemo(
    () => users.filter((u) => u.is_active).length,
    [users]
  );
  const inactiveCount = users.length - activeCount;

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter === "active" && !u.is_active) return false;
      if (statusFilter === "inactive" && u.is_active) return false;
      if (!q) return true;
      return (
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.doi_nif || "").toLowerCase().includes(q) ||
        (u.cci_or_colegiado || "").toLowerCase().includes(q)
      );
    });
  }, [users, statusFilter, searchTerm]);

  const openEditModal = (u: AppUser) => {
    setEditingUser(u);
    setShowEditPin(false);
    setEditForm({
      full_name: u.full_name,
      email: u.email,
      access_pin: u.access_pin || "1234",
      tenant_id: u.tenant_id,
      role: u.role,
      doi_nif: u.doi_nif || "",
      cci_or_colegiado: u.cci_or_colegiado || "",
      is_active: u.is_active,
    });
  };

  const handleSaveEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSavingEdit(true);
    const ok = await onUpdateUser(editingUser.id, editForm);
    setIsSavingEdit(false);
    if (ok) {
      setEditingUser(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#0f6cbd]">
          <ShieldCheck className="h-3.5 w-3.5" />
          Dashboard Administrativo Multi-Tenant y RBAC
        </span>
        <h2 className="mt-2 text-lg font-bold text-slate-900">
          Métricas Globales, Empresas (Tenants), Gestión de Usuarios y Matriz de Permisología
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Supervisa las métricas de actividad por empresa, crea, edita, inactiva o elimina técnicos y configura permisos RBAC con aislamiento estricto.
        </p>
      </div>

      {/* Dashboard Ejecutivo de Administración */}
      <AdminDashboardSummary
        tenants={tenants}
        users={users}
        allProjects={allProjects}
        currentUser={currentUser}
        onSwitchUser={onSwitchUser}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Formulario 1: Crear Nuevo Usuario */}
        <form
          onSubmit={onCreateUser}
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
                type="password"
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
                onChange={(e) => setNewUserTenantId(Number(e.target.value))}
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
                onChange={(e) => setNewUserRole(e.target.value as UserRole)}
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
          onSubmit={onCreateTenant}
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

      {/* Matriz de Permisología y Gestión de Usuarios (RBAC) */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Matriz de Usuarios, Multitenencia y Permisología (RBAC)
            </h3>
            <p className="text-xs text-slate-500">
              Edita datos profesionales, activa/inactiva cuentas, elimina usuarios o ajusta permisos granulares con un clic.
            </p>
          </div>

          {/* Filtros de Estado y Buscador */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`rounded-md px-2.5 py-1 transition ${
                  statusFilter === "all"
                    ? "bg-white text-[#0f6cbd] shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Todos ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`rounded-md px-2.5 py-1 transition ${
                  statusFilter === "active"
                    ? "bg-white text-emerald-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Activos ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("inactive")}
                className={`rounded-md px-2.5 py-1 transition ${
                  statusFilter === "inactive"
                    ? "bg-white text-amber-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Inactivos ({inactiveCount})
              </button>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar usuario o correo..."
                className="w-48 sm:w-56 rounded-lg border border-slate-300 bg-white pl-8 pr-2.5 py-1.5 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Usuario / Correo</th>
                <th className="px-4 py-3">Empresa (Tenant)</th>
                <th className="px-3 py-3">Rol / Estado</th>
                <th className="px-2.5 py-3 text-center">Reportes</th>
                <th className="px-2.5 py-3 text-center">Crear</th>
                <th className="px-2.5 py-3 text-center">Editar</th>
                <th className="px-2.5 py-3 text-center">M.T.D.</th>
                <th className="px-2.5 py-3 text-center">Borrar</th>
                <th className="px-2.5 py-3 text-center">Admin</th>
                <th className="px-3 py-3 text-center">Sesión</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-8 text-center text-xs text-slate-500"
                  >
                    No se encontraron usuarios con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const t = tenants.find((ten) => ten.id === u.tenant_id);
                  const userProjectsCount = allProjects.filter(
                    (p) => p.owner_user_id === u.id
                  ).length;
                  const isCurrent = u.id === currentUser?.id;

                  return (
                    <tr
                      key={u.id}
                      className={
                        isCurrent
                          ? "bg-blue-50/40"
                          : !u.is_active
                          ? "bg-slate-50/80 opacity-75"
                          : "hover:bg-slate-50"
                      }
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`font-bold ${
                              u.is_active
                                ? "text-slate-900"
                                : "text-slate-500 line-through"
                            }`}
                          >
                            {u.full_name}
                          </span>
                          {!u.is_active && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                              <Ban className="h-2.5 w-2.5" />
                              Inactivo
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {u.email} · PIN: <code className="font-mono">••••</code>
                        </div>
                        {(u.doi_nif || u.cci_or_colegiado) && (
                          <div className="mt-0.5 text-[10px] text-slate-400">
                            {u.doi_nif ? `NIF: ${u.doi_nif}` : ""}
                            {u.doi_nif && u.cci_or_colegiado ? " · " : ""}
                            {u.cci_or_colegiado ? `CCI: ${u.cci_or_colegiado}` : ""}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">
                          {t?.name || "—"}
                        </span>
                        <div className="text-[10px] text-slate-500">
                          {t?.empresa_instaladora_num} ({t?.isla})
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            {u.role}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              u.is_active
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                                : "bg-amber-50 text-amber-800 ring-1 ring-amber-600/20"
                            }`}
                          >
                            {u.is_active ? (
                              <>
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                Activo
                              </>
                            ) : (
                              <>
                                <Ban className="h-2.5 w-2.5" />
                                Inactivo
                              </>
                            )}
                          </span>
                        </div>
                      </td>

                      <td className="px-2.5 py-3 text-center font-mono font-bold text-[#0f6cbd]">
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
                        <td key={perm} className="px-2.5 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={u[perm]}
                            disabled={!canManage}
                            onChange={() => onTogglePermission(u, perm)}
                            className="h-4 w-4 rounded border-slate-300 text-[#0f6cbd] focus:ring-[#0f6cbd] disabled:opacity-50"
                          />
                        </td>
                      ))}

                      <td className="px-3 py-3 text-center">
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 whitespace-nowrap">
                            <UserCheck className="h-3.5 w-3.5" />
                            Sesión Activa
                          </span>
                        ) : !u.is_active ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                            Acceso Bloqueado
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSwitchUser(u)}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                          >
                            Entrar como usuario
                          </button>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={!canManage}
                            onClick={() => openEditModal(u)}
                            title="Editar datos del usuario"
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 py-1.5 text-[11px] font-semibold text-[#0f6cbd] transition hover:bg-blue-100 disabled:opacity-40"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            disabled={!canManage || isCurrent}
                            onClick={() => onToggleUserActive(u)}
                            title={
                              isCurrent
                                ? "No puedes inactivar tu propia sesión activa"
                                : u.is_active
                                ? "Inactivar usuario (bloquear acceso)"
                                : "Reactivar usuario"
                            }
                            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition disabled:opacity-40 ${
                              u.is_active
                                ? "border-amber-200 bg-amber-50/80 text-amber-800 hover:bg-amber-100"
                                : "border-emerald-200 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100"
                            }`}
                          >
                            <Power className="h-3.5 w-3.5" />
                            <span>{u.is_active ? "Inactivar" : "Activar"}</span>
                          </button>

                          <button
                            type="button"
                            disabled={!canManage || isCurrent}
                            onClick={() => setUserToDelete(u)}
                            title={
                              isCurrent
                                ? "No puedes eliminar tu propia sesión activa"
                                : "Eliminar usuario permanentemente"
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/80 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================================
          MODAL 1: EDITAR DATOS PROFESIONALES, ROL, EMPRESA Y PIN DEL USUARIO
      ===================================================================== */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0f6cbd] text-white">
                  <Pencil className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Editar Usuario #{editingUser.id}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Actualiza perfil profesional, empresa, rol RBAC, estado o clave de acceso
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSubmit} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Nombre Completo y Cargo
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.full_name}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        full_name: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    PIN / Contraseña de Acceso
                  </label>
                  <div className="relative mt-1">
                    <input
                      type={showEditPin ? "text" : "password"}
                      required
                      value={editForm.access_pin}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          access_pin: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white pl-3 pr-9 py-2 text-xs font-mono text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPin((p) => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showEditPin ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Empresa / Organización (Tenant)
                  </label>
                  <GoogleSelect
                    value={editForm.tenant_id}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        tenant_id: Number(e.target.value),
                      }))
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
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        role: e.target.value as UserRole,
                      }))
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
                    value={editForm.doi_nif}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        doi_nif: e.target.value,
                      }))
                    }
                    placeholder="43.000.000-A"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Nº C.C.I. / Nº Colegiado
                  </label>
                  <input
                    type="text"
                    value={editForm.cci_or_colegiado}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        cci_or_colegiado: e.target.value,
                      }))
                    }
                    placeholder="CCI-TF-6021"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0f6cbd] focus:outline-none"
                  />
                </div>

                {editingUser.id !== currentUser?.id && (
                  <div className="sm:col-span-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Estado de Acceso de la Cuenta
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Si se inactiva, el usuario no podrá iniciar sesión hasta reactivarlo.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setEditForm((prev) => ({
                          ...prev,
                          is_active: !prev.is_active,
                        }))
                      }
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        editForm.is_active
                          ? "bg-emerald-600 text-white"
                          : "bg-amber-500 text-white"
                      }`}
                    >
                      <Power className="h-3.5 w-3.5" />
                      {editForm.is_active ? "Cuenta Activa" : "Cuenta Inactiva"}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3.5">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f6cbd] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#115ea3] disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isSavingEdit ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: CONFIRMACIÓN DE ELIMINACIÓN DE USUARIO
      ===================================================================== */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  ¿Eliminar usuario del directorio?
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Estás a punto de eliminar a{" "}
                  <strong className="text-slate-900">
                    {userToDelete.full_name}
                  </strong>{" "}
                  (<span className="font-mono">{userToDelete.email}</span>).
                </p>
                <p className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-900">
                  💡 <strong>Nota:</strong> Si solo deseas revocar su acceso temporalmente conservando su ficha técnica, puedes usar el botón{" "}
                  <strong>Inactivar</strong> en lugar de eliminarlo.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              {userToDelete.is_active && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleUserActive(userToDelete);
                    setUserToDelete(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                >
                  <Power className="h-3.5 w-3.5" />
                  Solo Inactivar
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onDeleteUser(userToDelete);
                  setUserToDelete(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Sí, Eliminar Usuario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
