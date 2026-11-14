"use client";

import React from "react";
import { ShieldCheck, Users, Plus, Building, UserCheck } from "lucide-react";
import GoogleSelect from "@/components/GoogleSelect";
import { AdminDashboardSummary } from "@/components/DashboardsView";
import type { SavedHistoryRecord } from "@/components/SectionHistoryRegistry";
import type { AppTenant, AppUser, UserRole } from "@/app/page";

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
  return (
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

      {/* Matriz de Permisología (RBAC) por Usuario */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Matriz de Usuarios, Multitenencia y Permisología (RBAC)
            </h3>
            <p className="text-xs text-slate-500">
              Activa o desactiva permisos granulares para cada usuario o cambia de sesión con un clic. Las claves PIN permanecen cifradas / ocultas.
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
                        {u.email} · Acceso:{" "}
                        <code className="font-mono">••••</code>
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
                          onChange={() => onTogglePermission(u, perm)}
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
                          onClick={() => onSwitchUser(u)}
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
  );
}

