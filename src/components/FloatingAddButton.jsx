import { Plus } from "lucide-react";

export default function FloatingAddButton({ onClick }) {
  return (
    <button
      aria-label="Agregar corte"
      className="fixed left-1/2 z-50 inline-flex min-h-14 -translate-x-1/2 animate-card-in items-center justify-center gap-2 rounded-full bg-gradient-to-br from-brand-600 to-brand-800 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-20px_rgba(89,47,37,0.85)] transition duration-200 hover:-translate-x-1/2 hover:-translate-y-0.5 hover:from-brand-500 hover:to-brand-800 focus:outline-none focus:ring-4 focus:ring-brand-200 active:-translate-x-1/2 active:translate-y-0"
      onClick={onClick}
      style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
      type="button"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
        <Plus className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="hidden sm:inline">Agregar corte</span>
    </button>
  );
}
