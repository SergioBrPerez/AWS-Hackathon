"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cargarMesa, resumenMesa, type Mesa } from "@/lib/mesa";

/** Acceso directo a la última mesa configurada (pantalla 1 del diseño). */
export function MesaReciente() {
  const [mesa, setMesa] = useState<Mesa | null>(null);
  useEffect(() => setMesa(cargarMesa()), []);
  if (!mesa?.comensales.length) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Perfiles recientes</h2>
      <Link href="/buscar" className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3">
        <span className="min-w-0">
          <span className="block truncate font-medium">{mesa.comensales.map((c) => c.nombre).join(", ")}</span>
          <span className="block truncate text-sm text-muted">{resumenMesa(mesa)}</span>
        </span>
        <span className="shrink-0 text-brand">→</span>
      </Link>
    </section>
  );
}
