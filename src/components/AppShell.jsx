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

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 sm:flex-none ${
          isActive
            ? "bg-stone-950 text-white shadow-[0_12px_26px_-18px_rgba(28,25,23,0.7)]"
            : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50 hover:text-stone-950 hover:ring-stone-300"
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export default function AppShell() {
  const { profile, signOut } = useAuth();
  const roleLabel = getRoleLabel(profile?.role);
  const userInitial = getUserInitial(profile);

  return (
    <div className="min-h-screen px-3 pb-20 pt-3 sm:px-4 sm:pt-5 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="card overflow-hidden">
          <div className="bg-[linear-gradient(135deg,#1c1917_0%,#292524_58%,#3b332f_100%)] px-4 py-5 text-white sm:px-6">
            <div className="flex flex-col gap-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-brand-200/90">
                    Agenda Barber
                  </p>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-stone-300">
                    Panel de gestion semanal para tu barberia.
                  </p>
                </div>

                <button
                  className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-stone-200 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-4 focus:ring-brand-200/25 active:scale-[0.98]"
                  onClick={signOut}
                >
                  Salir
                </button>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-lg font-bold text-white shadow-inner shadow-black/10 sm:h-14 sm:w-14">
                    {userInitial}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1
                        className="truncate text-xl font-bold tracking-[-0.02em] text-white sm:text-2xl"
                        title={profile?.full_name || "Mi cuenta"}
                      >
                        {profile?.full_name || "Mi cuenta"}
                      </h1>
                      {roleLabel && (
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-stone-200">
                          {roleLabel}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-stone-300">Panel de cortes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-stone-200/80 bg-white/75 px-3 py-3 sm:px-5 sm:py-4">
            <nav className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
              <NavItem to="/semana" label="Semana" />
              <NavItem to="/resumen-mensual" label="Mes" />
              <NavItem to="/perfil" label="Perfil" />
              {profile?.role === "admin" && <NavItem to="/admin" label="Admin" />}
            </nav>
          </div>
        </header>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
