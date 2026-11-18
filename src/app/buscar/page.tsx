"use client";

import { Cabecera } from "@/components/Cabecera";
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
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-6 md:max-w-2xl md:py-8">
      <Cabecera
        titulo={busqueda ? "Recomendaciones" : "Configura vuestra mesa"}
        onAtras={busqueda ? () => setBusqueda(0) : undefined}
      />

      {busqueda ? (
        <Resultados key={busqueda} mesa={mesa} onEditar={() => setBusqueda(0)} />
      ) : (
        <Configurador mesa={mesa} onChange={setMesa} onBuscar={buscar} />
      )}
    </main>
  );
}
