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
    <section className="card overflow-hidden animate-card-in">
      <button
        aria-expanded={isOpen}
        className="flex min-h-[5.25rem] w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-stone-50/80 focus:outline-none focus:ring-4 focus:ring-brand-100 sm:px-5"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="min-w-0">
          {eyebrow && (
            <span className="eyebrow block">
              {eyebrow}
            </span>
          )}
          <span className="mt-1 block text-lg font-semibold text-stone-950 sm:text-xl">{title}</span>
          {description && (
            <span className="mt-1 block text-sm leading-5 text-stone-500">{description}</span>
          )}
        </span>

        <span className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-700 shadow-[0_8px_20px_-18px_rgba(28,25,23,0.8)]">
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
          <div className="border-t border-stone-200/70 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
