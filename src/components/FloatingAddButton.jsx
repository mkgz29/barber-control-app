import { CirclePlus } from "lucide-react";

export default function FloatingAddButton({ onClick }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[9999] flex justify-center px-4"
      style={{
        bottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <button
        aria-label="Agregar corte"
        className="pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 text-white opacity-0 shadow-[0_18px_44px_-22px_rgba(6,78,59,0.9)] ring-1 ring-emerald-950/10 transition duration-200 animate-[fab-in_260ms_ease-out_forwards] hover:scale-105 hover:from-emerald-400 hover:via-emerald-600 hover:to-emerald-800 hover:shadow-[0_22px_52px_-24px_rgba(6,78,59,0.95)] focus:outline-none focus:ring-4 focus:ring-emerald-200 active:scale-95"
        onClick={onClick}
        type="button"
      >
        <CirclePlus className="h-7 w-7" aria-hidden="true" strokeWidth={2.35} />
      </button>
    </div>
  );
}
