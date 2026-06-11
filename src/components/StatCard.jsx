import { formatCurrency } from "../lib/date";

export default function StatCard({ title, value, highlight = false, money = false }) {
  return (
    <div
      className={`surface tap-card p-4 ${
        highlight ? "border-brand-200 bg-brand-50/80" : "bg-white/80"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{title}</p>
      <p className={`mt-2 text-2xl font-semibold tracking-normal ${highlight ? "text-brand-800" : "text-stone-950"}`}>
        {money ? formatCurrency(value) : value}
      </p>
    </div>
  );
}
