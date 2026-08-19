import { CalendarDays, Clock, LogOut, Scissors, Shield, Trophy, User } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function getUserInitial(profile) {
  const fullName = String(profile?.full_name || "").trim();

  if (!fullName) {
    return "A";
  }

  return fullName.charAt(0).toUpperCase();
}

function getRoleLabel(role) {
  if (role === "admin") {
    return "Admin";
  }

  if (role === "barber") {
    return "Barber";
  }

  return null;
}

function NavItem({ to, label, icon: Icon }) {
  return (
    <NavLink
      aria-label={label}
      to={to}
      className={({ isActive }) =>
        `inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-2 text-xs font-medium transition-colors duration-150 sm:gap-2 sm:px-3 sm:text-sm lg:min-h-9 ${
          isActive
            ? "border-sky-200 bg-sky-50 text-sky-700"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
        }`
      }
      title={label}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  );
}

export default function AppShell() {
  const { profile, signOut } = useAuth();
  const roleLabel = getRoleLabel(profile?.role);
  const userInitial = getUserInitial(profile);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:px-6 lg:h-16 lg:flex-row lg:items-center lg:gap-5 lg:py-0">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-100 bg-sky-50 text-sky-700">
                <Scissors className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold uppercase tracking-[0.12em] text-slate-950">
                  Agenda Barber
                </p>
                <p className="text-xs text-slate-500 lg:hidden">
                  Panel de cortes
                </p>
              </div>
            </div>

            <button
              className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-sky-100 lg:hidden"
              onClick={signOut}
              type="button"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Salir
            </button>
          </div>

          <nav className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 lg:flex lg:flex-1 lg:justify-center lg:gap-1">
            <NavItem to="/semana" label="Semana" icon={Scissors} />
            <NavItem to="/turnos" label="Turnos" icon={Clock} />
            <NavItem to="/resumen-mensual" label="Mes" icon={CalendarDays} />
            <NavItem to="/ranking-mensual" label="Ranking" icon={Trophy} />
            <NavItem to="/perfil" label="Perfil" icon={User} />
            {profile?.role === "admin" && <NavItem to="/admin" label="Admin" icon={Shield} />}
          </nav>

          <div className="hidden min-w-0 items-center justify-end gap-3 lg:flex">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm font-semibold text-slate-700">
                {userInitial}
              </div>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <p
                    className="max-w-[11rem] truncate text-sm font-medium text-slate-900"
                    title={profile?.full_name || "Mi cuenta"}
                  >
                    {profile?.full_name || "Mi cuenta"}
                  </p>
                  {roleLabel && (
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[0.68rem] font-medium uppercase tracking-[0.08em] text-slate-500">
                      {roleLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-sky-100"
              onClick={signOut}
              type="button"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-4 md:px-6 md:py-6">
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
