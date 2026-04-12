import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-2xl px-4 py-3 text-sm font-semibold transition ${
          isActive
            ? "bg-stone-900 text-white"
            : "bg-stone-100 text-stone-600 hover:bg-stone-200"
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export default function AppShell() {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen px-4 pb-24 pt-5 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="card overflow-hidden">
          <div className="bg-stone-900 px-5 py-4 text-white">
            <p className="text-xs uppercase tracking-[0.25em] text-brand-200">
              Agenda Barber
            </p>
            <div className="mt-2 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-lg font-bold">{profile?.full_name || "Mi cuenta"}</h1>
                <p className="text-sm text-stone-300">{profile?.email}</p>
              </div>
              <button
                className="btn-secondary !border-stone-700 !bg-stone-800 !text-white"
                onClick={signOut}
              >
                Salir
              </button>
            </div>
          </div>

          <nav className="grid grid-cols-2 gap-3 p-4 sm:flex">
            <NavItem to="/semana" label="Semana" />
            <NavItem to="/resumen-mensual" label="Mes" />
            <NavItem to="/perfil" label="Perfil" />
            {profile?.role === "admin" && <NavItem to="/admin" label="Admin" />}
          </nav>
        </header>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
