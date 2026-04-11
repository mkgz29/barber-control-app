import { formatCurrency } from "../lib/date";

export default function StatCard({ title, value, highlight = false, money = false }) {
  return (
    <div className={`card p-4 ${highlight ? "border-brand-200 bg-brand-50/70" : ""}`}>
      <p className="text-sm font-medium text-stone-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-stone-900">
        {money ? formatCurrency(value) : value}
      </p>
    </div>
  );
}
