import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export default function CollapsibleSection({
  title,
  eyebrow,
  description,
  defaultOpen = false,
  children,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const Icon = isOpen ? ChevronUp : ChevronDown;

  return (
    <section>
      <button
        aria-expanded={isOpen}
        className="card flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-brand-200"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="min-w-0">
          {eyebrow && (
            <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">
              {eyebrow}
            </span>
          )}
          <span className="mt-1 block text-xl font-bold text-stone-900">{title}</span>
          {description && (
            <span className="mt-1 block text-sm text-stone-600">{description}</span>
          )}
        </span>

        <span className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700">
          <Icon className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">{isOpen ? "Ocultar" : "Ver"}</span>
        </span>
      </button>

      <div
        className={`grid transition-all duration-300 ease-out ${
          isOpen ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </section>
  );
}
