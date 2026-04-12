export default function AuthStatusScreen({ title, message, actionLabel, onAction }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-md p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl text-red-600">
          !
        </div>
        <h1 className="text-xl font-bold text-stone-900">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">{message}</p>
        <button className="btn-primary mt-6 w-full" onClick={onAction} type="button">
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
