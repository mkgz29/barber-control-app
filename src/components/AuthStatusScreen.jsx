import { Button } from "@/components/ui/button";

export default function AuthStatusScreen({ title, message, actionLabel, onAction }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-6">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 text-xl font-semibold text-red-600">
          !
        </div>
        <h1 className="text-xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
        <Button className="mt-6 w-full bg-sky-600 text-white shadow-none hover:bg-sky-700" onClick={onAction} type="button">
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
