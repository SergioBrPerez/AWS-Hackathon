"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Configurador } from "@/components/Configurador";
import { Resultados } from "@/components/Resultados";
import { cargarMesa, guardarMesa, mesaInicial, type Mesa } from "@/lib/mesa";

/** Modo 1 — Buscador y planificador (antes de ir). */
export default function BuscarPage() {
  const [mesa, setMesa] = useState<Mesa>(mesaInicial);
  const [busqueda, setBusqueda] = useState(0); // >0 = mostrando resultados; cambia para relanzar

  // Recuperar la última mesa guardada (solo en el navegador)
  useEffect(() => {
    const guardada = cargarMesa();
    if (guardada?.comensales.length) setMesa(guardada);
  }, []);

  const buscar = () => {
    guardarMesa(mesa);
    setBusqueda((n) => n + 1);
    window.scrollTo({ top: 0 });
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-6">
      <header className="flex items-center gap-3">
        {busqueda ? (
          <button onClick={() => setBusqueda(0)} className="text-2xl leading-none" aria-label="Volver al configurador">←</button>
        ) : (
          <Link href="/" className="text-2xl leading-none" aria-label="Volver al inicio">←</Link>
        )}
        <h1 className="text-xl font-bold">{busqueda ? "Recomendaciones" : "Configura vuestra mesa"}</h1>
      </header>

      {busqueda ? (
        <Resultados key={busqueda} mesa={mesa} onEditar={() => setBusqueda(0)} />
      ) : (
        <Configurador mesa={mesa} onChange={setMesa} onBuscar={buscar} />
      )}
    </main>
  );
}
