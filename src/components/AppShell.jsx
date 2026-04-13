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
        `inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
          isActive
            ? "bg-stone-900 text-white shadow-[0_12px_30px_-18px_rgba(28,25,23,0.7)]"
            : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50 hover:text-stone-900 hover:ring-stone-300"
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
    <div className="min-h-screen px-4 pb-24 pt-5 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="card overflow-hidden border-white/60">
          <div className="bg-[linear-gradient(135deg,#1c1917_0%,#292524_52%,#44403c_100%)] px-5 py-5 text-white sm:px-6">
            <div className="flex flex-col gap-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-200/90">
                    Agenda Barber
                  </p>
                  <p className="mt-2 max-w-xl text-sm text-stone-300">
                    Panel de gestion semanal para tu barberia.
                  </p>
                </div>

                <button
                  className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-stone-200 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-200"
                  onClick={signOut}
                >
                  Salir
                </button>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-lg font-bold text-white shadow-inner shadow-black/10">
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
                    <p
                      className="mt-1 truncate text-sm text-stone-300"
                      title={profile?.email || ""}
                    >
                      {profile?.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-stone-200/80 bg-white/70 px-4 py-4 sm:px-5">
            <nav className="flex flex-wrap gap-2 sm:gap-3">
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
