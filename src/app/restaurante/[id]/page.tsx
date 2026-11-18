"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CartaSemaforo } from "@/components/CartaSemaforo";
import { cargarMesa, perfilesDeMesa, PRECIO, resumenMesa, type Mesa } from "@/lib/mesa";
import type { AuditoriaGrupo } from "@/lib/semaforo/auditoria";
import type { Plato, Restaurante } from "@/lib/supabase/types";

/** Pantalla 4 del diseño: ficha del local y carta semáforo para la mesa guardada. */
export default function FichaRestaurante() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [datos, setDatos] = useState<{ restaurante: Restaurante; auditoria: AuditoriaGrupo; platos: Plato[] }>();
  const [error, setError] = useState("");

  useEffect(() => {
    const m = cargarMesa();
    if (!m?.comensales.length) { setError("sin-mesa"); return; }
    setMesa(m);
    const ctrl = new AbortController();
    fetch("/api/carta/auditar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ perfiles: perfilesDeMesa(m), restaurante_id: id }),
      signal: ctrl.signal,
    })
      .then(async (r) => (r.ok ? setDatos(await r.json()) : setError((await r.json()).error ?? "Error")))
      .catch((e) => e.name !== "AbortError" && setError("No se ha podido cargar la carta."));
    return () => ctrl.abort();
  }, [id]);

  const confirmar = async () => {
    const r = await fetch("/api/eleccion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        perfiles: perfilesDeMesa(mesa!),
        restaurante_id: id,
        // Platos aptos (verdes o adaptables) para alguien de la mesa
        platos: [...new Set(datos!.auditoria.comensales.flatMap((c) => [...c.verdes, ...c.amarillos].map((v) => v.plato_id)))],
      }),
    });
    if (!r.ok) throw new Error();
    return r.json();
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-6">
      <header className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-2xl leading-none" aria-label="Atrás">←</button>
        <h1 className="text-xl font-bold">Ficha del local</h1>
      </header>

      {mesa && (
        <div className="rounded-2xl bg-brand-soft px-4 py-3 text-sm">{resumenMesa(mesa).replace(/ · €+$/, "")}</div>
      )}

      {error === "sin-mesa" ? (
        <div className="rounded-2xl border border-line bg-card p-6 text-center">
          <p>Primero dinos quién va a comer.</p>
          <Link href="/en-mesa" className="mt-3 inline-block font-medium text-brand">Configurar la mesa →</Link>
        </div>
      ) : error ? (
        <p className="rounded-xl border border-rojo/30 bg-red-50 p-3 text-sm text-rojo">{error}</p>
      ) : !datos ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-brand" aria-hidden />
          <p className="font-medium">Revisando la carta plato a plato…</p>
        </div>
      ) : (
        <CartaSemaforo
          auditoria={datos.auditoria}
          platos={datos.platos}
          titulo={datos.restaurante.nombre}
          subtitulo={`${datos.restaurante.tipo_cocina} · ${PRECIO[datos.restaurante.rango_precio]} · ${datos.restaurante.direccion.replace(/, Madrid$/, "")}`}
          onConfirmar={confirmar}
        />
      )}
    </main>
  );
}
