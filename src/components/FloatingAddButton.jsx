import { CirclePlus } from "lucide-react";

export default function FloatingAddButton({ onClick }) {
  return (
    <div
      className="pointer-events-none fixed left-1/2 z-[100] flex w-[min(calc(100%_-_32px),430px)] animate-card-in justify-center"
      style={{
        bottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
        transform: "translateX(-50%)",
      }}
    >
      <button
        aria-label="Agregar corte"
        className="pointer-events-auto inline-flex min-h-14 min-w-14 items-center justify-center gap-2 rounded-full border border-white/20 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_44px_-22px_rgba(6,78,59,0.9)] ring-1 ring-emerald-950/10 transition duration-200 hover:-translate-y-0.5 hover:from-emerald-400 hover:via-emerald-600 hover:to-emerald-800 hover:shadow-[0_22px_52px_-24px_rgba(6,78,59,0.95)] focus:outline-none focus:ring-4 focus:ring-emerald-200 active:translate-y-0 sm:rounded-full sm:px-5"
        onClick={onClick}
        type="button"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 shadow-inner">
          <CirclePlus className="h-5 w-5" aria-hidden="true" strokeWidth={2.4} />
        </span>
        <span className="hidden sm:inline">Agregar</span>
      </button>
    </div>
  );
}
