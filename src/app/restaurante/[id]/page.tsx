"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Cabecera } from "@/components/Cabecera";
import { CartaCompleta } from "@/components/CartaCompleta";
import { CartaSemaforo } from "@/components/CartaSemaforo";
import { Configurador } from "@/components/Configurador";
import { cargarMesa, emojiCocina, guardarMesa, mesaInicial, perfilesDeMesa, PRECIO, resumenMesa, type Mesa } from "@/lib/mesa";
import type { AuditoriaGrupo } from "@/lib/semaforo/auditoria";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Plato, Restaurante } from "@/lib/supabase/types";

type Vista = "carta" | "semaforo";

/**
 * Pantalla 4 del diseño: ficha del local.
 *  - "Carta completa": todos los platos, sin necesidad de configurar nada.
 *  - "Semáforo": la carta filtrada para la mesa (pide los comensales si no hay).
 */
export default function FichaRestaurante() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [restaurante, setRestaurante] = useState<Restaurante>();
  const [platos, setPlatos] = useState<Plato[]>();
  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [vista, setVista] = useState<Vista>("carta");
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState<Mesa>(mesaInicial);
  const [auditoria, setAuditoria] = useState<AuditoriaGrupo>();
  const [error, setError] = useState("");

  // Local y carta (lectura pública) + mesa guardada
  useEffect(() => {
    Promise.all([
      supabaseBrowser.from("restaurantes").select("*").eq("id", id).single(),
      supabaseBrowser.from("platos").select("*").eq("restaurante_id", id),
    ]).then(([r, p]) => {
      if (!r.data) return setError("Restaurante no encontrado.");
      setRestaurante(r.data as Restaurante);
      setPlatos((p.data ?? []) as Plato[]);
    });
    const m = cargarMesa();
    // Con alguna restricción guardada, abrimos directamente el semáforo
    if (m?.comensales.length) {
      setMesa(m);
      if (m.comensales.some((c) => c.restricciones.length)) setVista("semaforo");
    }
  }, [id]);

  // Auditar al entrar en el semáforo (o al cambiar la mesa)
  useEffect(() => {
    if (vista !== "semaforo" || !mesa || editando) return;
    setAuditoria(undefined);
    const ctrl = new AbortController();
    fetch("/api/carta/auditar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ perfiles: perfilesDeMesa(mesa), restaurante_id: id }),
      signal: ctrl.signal,
    })
      .then(async (r) => (r.ok ? setAuditoria((await r.json()).auditoria) : setError((await r.json()).error ?? "Error")))
      .catch((e) => e.name !== "AbortError" && setError("No se ha podido revisar la carta."));
    return () => ctrl.abort();
  }, [id, mesa, editando, vista]);

  const abrirSemaforo = () => {
    setVista("semaforo");
    if (!mesa) setEditando(true);
  };

  const confirmar = async () => {
    const r = await fetch("/api/eleccion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        perfiles: perfilesDeMesa(mesa!),
        restaurante_id: id,
        platos: [...new Set(auditoria!.comensales.flatMap((c) => [...c.verdes, ...c.amarillos].map((v) => v.plato_id)))],
      }),
    });
    if (!r.ok) throw new Error();
    return r.json();
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-6 md:max-w-2xl md:py-8">
      <Cabecera titulo={restaurante?.nombre ?? "Ficha del local"} onAtras={() => router.back()} />

      {error && <p className="rounded-xl border border-rojo/30 bg-red-50 p-3 text-sm text-rojo">{error}</p>}

      {restaurante && (
        <section className="flex gap-4 rounded-2xl border border-line bg-card p-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-3xl" aria-hidden>
            {emojiCocina(restaurante.tipo_cocina)}
          </span>
          <div className="min-w-0">
            <p className="text-sm text-muted">
              Cocina {restaurante.tipo_cocina} · {PRECIO[restaurante.rango_precio]}
              {restaurante.patrocinado && " · Patrocinado"}
            </p>
            <p className="text-sm font-medium">📍 {restaurante.direccion.replace(/, Madrid$/, "")}</p>
            {restaurante.descripcion && <p className="mt-1 text-sm text-muted">{restaurante.descripcion}</p>}
          </div>
        </section>
      )}

      {/* Carta completa / Semáforo */}
      <div className="grid grid-cols-2 rounded-xl border border-line bg-card p-1 text-sm" role="tablist">
        <button role="tab" aria-selected={vista === "carta"} onClick={() => { setVista("carta"); setEditando(false); }}
          className={`rounded-lg py-2 font-medium ${vista === "carta" ? "bg-foreground text-white" : "text-muted"}`}>
          📋 Carta completa
        </button>
        <button role="tab" aria-selected={vista === "semaforo"} onClick={abrirSemaforo}
          className={`rounded-lg py-2 font-medium ${vista === "semaforo" ? "bg-foreground text-white" : "text-muted"}`}>
          🚦 Para mi mesa
        </button>
      </div>

      {vista === "carta" ? (
        !platos ? (
          <div className="h-64 animate-pulse rounded-2xl bg-line" />
        ) : (
          <>
            <CartaCompleta platos={platos} />
            <button onClick={abrirSemaforo} className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-brand/40 bg-brand-soft p-4 text-left">
              <span className="text-2xl" aria-hidden>🚦</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-brand">¿Alergias, dietas o embarazo?</span>
                <span className="block text-sm text-muted">Filtra esta carta y mira qué puede pedir cada uno.</span>
              </span>
              <span className="text-brand" aria-hidden>→</span>
            </button>
          </>
        )
      ) : editando ? (
        <>
          <p className="rounded-2xl bg-brand-soft px-4 py-3 text-sm">Dinos <strong>quién va a comer</strong> y sus restricciones.</p>
          <Configurador
            mesa={mesa ?? borrador}
            onChange={(m) => (mesa ? setMesa(m) : setBorrador(m))}
            modo="mesa"
            textoBoton="Ver la carta semáforo"
            onBuscar={() => {
              const m = mesa ?? borrador;
              guardarMesa(m);
              setMesa(m);
              setEditando(false);
            }}
          />
        </>
      ) : (
        <>
          {mesa && (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-brand-soft px-4 py-3 text-sm">
              <span className="min-w-0">{resumenMesa(mesa).replace(/ · €+$/, "")}</span>
              <button onClick={() => setEditando(true)} className="shrink-0 font-medium text-brand">Editar</button>
            </div>
          )}
          {!auditoria || !platos ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <span className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-brand" aria-hidden />
              <p className="font-medium">Revisando la carta plato a plato…</p>
            </div>
          ) : (
            <CartaSemaforo auditoria={auditoria} platos={platos} onConfirmar={confirmar} />
          )}
        </>
      )}
    </main>
  );
}
