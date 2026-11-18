import Link from "next/link";

/** Modo 2 — Asistente en mesa. Se construye en la Fase 4. */
export default function EnMesaPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-6">
      <header className="flex items-center gap-3">
        <Link href="/" className="text-2xl leading-none" aria-label="Volver al inicio">←</Link>
        <h1 className="text-xl font-bold">Estoy en el restaurante</h1>
      </header>
      <div className="rounded-2xl border border-dashed border-line bg-card p-6 text-center text-muted">
        <p className="text-3xl">🚧</p>
        <p className="mt-2">La carta semáforo llega en la Fase 4.</p>
        <Link href="/buscar" className="mt-4 inline-block font-medium text-brand">Mientras tanto, busca restaurante →</Link>
      </div>
    </main>
  );
}
