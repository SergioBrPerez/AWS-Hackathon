import Link from "next/link";
import { MesaReciente } from "@/components/MesaReciente";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 py-10">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">Agent Locally</p>
        <h1 className="mt-1 text-3xl font-bold leading-tight">¿Qué puede comer cada uno de vosotros?</h1>
        <p className="mt-2 text-muted">
          Tu asistente gastronómico para comer seguro, solo o en grupo: alergias, dietas y embarazo, plato a plato.
        </p>
      </header>

      <Link href="/buscar" className="rounded-2xl border border-line bg-card p-6 shadow-sm transition hover:border-brand">
        <h2 className="text-xl font-semibold">🔎 Buscar restaurante</h2>
        <p className="mt-1 text-sm text-muted">Planifica la salida: configura comensales, restricciones y presupuesto.</p>
      </Link>

      <Link href="/en-mesa" className="rounded-2xl border border-line bg-card p-6 shadow-sm transition hover:border-brand">
        <h2 className="text-xl font-semibold">🍽️ Estoy en el restaurante</h2>
        <p className="mt-1 text-sm text-muted">Filtra la carta actual con el semáforo por comensal.</p>
      </Link>

      <MesaReciente />
    </main>
  );
}
