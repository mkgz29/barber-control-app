import { CirclePlus } from "lucide-react";

export default function FloatingAddButton({ onClick }) {
  return (
    <div
      className="pointer-events-none fixed right-4 z-[9999] sm:right-5"
      style={{
        bottom: "calc(22px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <button
        aria-label="Nuevo corte"
        className="pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-sky-500 bg-sky-600 text-white opacity-0 shadow-lg shadow-sky-900/15 transition duration-200 animate-[fab-in_260ms_ease-out_forwards] hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-100 active:scale-95"
        onClick={onClick}
        type="button"
      >
        <CirclePlus className="h-7 w-7" aria-hidden="true" strokeWidth={2.35} />
      </button>
    </div>
  );
}
