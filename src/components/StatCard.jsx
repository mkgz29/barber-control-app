import { formatCurrency } from "../lib/date";

export default function StatCard({ title, value, highlight = false, money = false }) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{title}</p>
      <p className={`mt-1.5 text-2xl font-semibold tracking-normal ${highlight ? "text-sky-700" : "text-slate-950"}`}>
        {money ? formatCurrency(value) : value}
      </p>
    </div>
  );
}
