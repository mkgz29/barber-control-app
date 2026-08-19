export default function LoadingScreen({ message = "Cargando..." }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-6">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-sky-500" />
        <p className="text-sm font-medium text-slate-600">{message}</p>
      </div>
    </div>
  );
}
