export default function LoadingScreen({ message = "Cargando..." }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-sm p-6 text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-brand-500" />
        <p className="text-sm font-medium text-stone-600">{message}</p>
      </div>
    </div>
  );
}
