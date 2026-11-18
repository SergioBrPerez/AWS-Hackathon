import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold">Agent Locally</h1>
        <p className="mt-1 text-neutral-600">
          Tu asistente gastronómico para comer seguro, solo o en grupo.
        </p>
      </header>

      <Link
        href="/buscar"
        className="rounded-2xl border border-neutral-200 p-6 shadow-sm transition hover:border-orange-400"
      >
        <h2 className="text-xl font-semibold">🔎 Buscar restaurante</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Planifica la salida: configura comensales, restricciones y presupuesto.
        </p>
      </Link>

      <Link
        href="/en-mesa"
        className="rounded-2xl border border-neutral-200 p-6 shadow-sm transition hover:border-orange-400"
      >
        <h2 className="text-xl font-semibold">🍽️ Estoy en el restaurante</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Filtra la carta actual con el semáforo por comensal.
        </p>
      </Link>
    </main>
  );
}
