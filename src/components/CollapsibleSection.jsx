import { ChevronDown } from "lucide-react";
import { useState } from "react";

export default function CollapsibleSection({
  title,
  eyebrow,
  description,
  defaultOpen = false,
  children,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="animate-card-in overflow-hidden rounded-lg border border-slate-200 bg-white">
      <button
        aria-expanded={isOpen}
        className="flex min-h-16 w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-sky-100 sm:px-5"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="min-w-0">
          {eyebrow && (
            <span className="eyebrow block">
              {eyebrow}
            </span>
          )}
          <span className="mt-1 block text-lg font-semibold text-slate-950 sm:text-xl">{title}</span>
          {description && (
            <span className="mt-1 block text-sm leading-5 text-slate-500">{description}</span>
          )}
        </span>

        <span className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700">
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
          <span className="sr-only">{isOpen ? "Ocultar" : "Ver"}</span>
        </span>
      </button>

      <div
        className={`grid transition-all duration-300 ease-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-200 px-4 pb-4 pt-4 sm:px-5">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
