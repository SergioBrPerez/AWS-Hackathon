"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CartaSemaforo } from "@/components/CartaSemaforo";
import { Configurador } from "@/components/Configurador";
import { comprimirImagen, type ImagenCarta } from "@/lib/imagen";
import { cargarMesa, guardarMesa, mesaInicial, perfilesDeMesa, resumenMesa, UBICACION, type Mesa } from "@/lib/mesa";
import type { AuditoriaGrupo } from "@/lib/semaforo/auditoria";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Plato, Restaurante } from "@/lib/supabase/types";

type Paso = "comensales" | "carta" | "procesando" | "resultado";
type Fuente = "lista" | "foto" | "texto";
const MAX_FOTOS = 4;

/** Modo 2 — Asistente en mesa ("ya estoy en el restaurante"). */
export default function EnMesaPage() {
  const router = useRouter();
  const [mesa, setMesa] = useState<Mesa>(mesaInicial);
  const [paso, setPaso] = useState<Paso>("comensales");
  const [fuente, setFuente] = useState<Fuente>("lista");
  const [fotos, setFotos] = useState<ImagenCarta[]>([]);
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState("");
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<{ auditoria: AuditoriaGrupo; platos: Plato[]; nombre: string | null; aviso: string | null }>();

  useEffect(() => {
    const guardada = cargarMesa();
    if (guardada?.comensales.length) setMesa(guardada);
  }, []);

  const añadirFotos = async (files: FileList | null) => {
    if (!files) return;
    setError("");
    try {
      const nuevas = await Promise.all([...files].slice(0, MAX_FOTOS - fotos.length).map(comprimirImagen));
      setFotos((f) => [...f, ...nuevas].slice(0, MAX_FOTOS));
    } catch {
      setError("No se ha podido abrir esa imagen. Prueba con otra (JPG o PNG).");
    }
  };

  const analizar = async () => {
    setError("");
    setPaso("procesando");
    try {
      setEstado(fuente === "foto" ? `Leyendo ${fotos.length > 1 ? `las ${fotos.length} fotos` : "la foto"} de la carta…` : "Leyendo la carta…");
      const r1 = await fetch("/api/carta/extraer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fuente === "foto" ? { imagenes: fotos.map(({ base64, mediaType }) => ({ base64, mediaType })) } : { texto }),
      });
      const carta = await r1.json();
      if (!r1.ok) throw new Error(carta.error);
      if (!carta.platos.length) throw new Error(carta.aviso ?? "No he encontrado platos en la carta.");

      setEstado(`He encontrado ${carta.platos.length} platos. Revisándolos para ${mesa.comensales.length === 1 ? "ti" : `los ${mesa.comensales.length}`}…`);
      const r2 = await fetch("/api/carta/auditar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perfiles: perfilesDeMesa(mesa), platos: carta.platos }),
      });
      const audit = await r2.json();
      if (!r2.ok) throw new Error(audit.error);

      setResultado({ auditoria: audit.auditoria, platos: carta.platos, nombre: carta.restaurante_nombre, aviso: carta.aviso });
      setPaso("resultado");
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Algo ha fallado. Inténtalo de nuevo.");
      setPaso("carta");
    }
  };

  const atras = () => setPaso(paso === "resultado" || paso === "procesando" ? "carta" : "comensales");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-6">
      <header className="flex items-center gap-3">
        {paso === "comensales" ? (
          <Link href="/" className="text-2xl leading-none" aria-label="Volver al inicio">←</Link>
        ) : (
          <button onClick={atras} className="text-2xl leading-none" aria-label="Atrás">←</button>
        )}
        <h1 className="text-xl font-bold">
          {paso === "comensales" ? "¿Quién está en la mesa?" : paso === "resultado" ? "Carta semáforo" : "Estoy en el restaurante"}
        </h1>
      </header>

      {paso === "comensales" && (
        <Configurador
          mesa={mesa}
          onChange={setMesa}
          modo="mesa"
          textoBoton="Continuar"
          onBuscar={() => { guardarMesa(mesa); setPaso("carta"); }}
        />
      )}

      {paso === "carta" && (
        <div className="flex flex-col gap-4 pb-28">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-brand-soft px-4 py-3 text-sm">
            <span className="min-w-0">{resumenMesa(mesa).replace(/ · €+$/, "")}</span>
            <button onClick={() => setPaso("comensales")} className="shrink-0 font-medium text-brand">Editar</button>
          </div>

          <div className="grid grid-cols-3 rounded-xl border border-line bg-card p-1 text-sm" role="tablist">
            {([["lista", "🔎 Buscar local"], ["foto", "📷 Foto"], ["texto", "✍️ Texto"]] as const).map(([f, label]) => (
              <button key={f} role="tab" aria-selected={fuente === f} onClick={() => { setFuente(f); setError(""); }}
                className={`rounded-lg py-2 font-medium ${fuente === f ? "bg-foreground text-white" : "text-muted"}`}>
                {label}
              </button>
            ))}
          </div>

          {error && <p className="rounded-xl border border-rojo/30 bg-red-50 p-3 text-sm text-rojo">{error}</p>}

          {fuente === "foto" && <SubirFotos fotos={fotos} onAñadir={añadirFotos} onQuitar={(j) => setFotos(fotos.filter((_, k) => k !== j))} />}

          {fuente === "texto" && (
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={12}
              placeholder={"Pega aquí la carta, por ejemplo:\n\nEntrantes\nCroquetas de jamón — 8 €\nEnsalada de burrata con pesto — 11 €\n\nPrincipales\nRisotto de setas — 14 €"}
              className="w-full rounded-2xl border border-line bg-card p-3 text-base"
            />
          )}

          {fuente === "lista" && (
            <ListaRestaurantes
              onElegir={(id) => { guardarMesa(mesa); router.push(`/restaurante/${id}`); }}
              onHacerFoto={() => setFuente("foto")}
            />
          )}

          {fuente !== "lista" && (
            <div className="fixed inset-x-0 bottom-0 border-t border-line bg-background/95 px-4 pt-3 backdrop-blur" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
              <button
                onClick={analizar}
                disabled={fuente === "foto" ? fotos.length === 0 : texto.trim().length < 10}
                className="mx-auto block w-full max-w-md rounded-2xl bg-brand py-4 text-base font-semibold text-white disabled:opacity-40"
              >
                Analizar carta
              </button>
            </div>
          )}
        </div>
      )}

      {paso === "procesando" && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-brand" aria-hidden />
          <p className="font-medium" aria-live="polite">{estado}</p>
          <p className="text-sm text-muted">Suele tardar entre 20 y 40 segundos.</p>
        </div>
      )}

      {paso === "resultado" && resultado && (
        <>
          {resultado.aviso && <p className="rounded-xl bg-amber-50 p-3 text-sm">⚠️ {resultado.aviso}</p>}
          <CartaSemaforo
            auditoria={resultado.auditoria}
            platos={resultado.platos}
            titulo={resultado.nombre ?? "Tu carta"}
            subtitulo={`${resultado.platos.length} platos leídos de ${fuente === "foto" ? "la foto" : "la carta"}`}
          />
        </>
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------

function SubirFotos({ fotos, onAñadir, onQuitar }: { fotos: ImagenCarta[]; onAñadir: (f: FileList | null) => void; onQuitar: (i: number) => void }) {
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const lleno = fotos.length >= MAX_FOTOS;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">Haz una foto a cada página de la carta (hasta {MAX_FOTOS}). Que se lea bien el texto.</p>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => camara.current?.click()} disabled={lleno}
          className="flex flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-brand/40 bg-brand-soft py-6 font-medium text-brand disabled:opacity-40">
          <span className="text-3xl" aria-hidden>📷</span> Hacer foto
        </button>
        <button onClick={() => galeria.current?.click()} disabled={lleno}
          className="flex flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-line bg-card py-6 font-medium disabled:opacity-40">
          <span className="text-3xl" aria-hidden>🖼️</span> Subir imagen
        </button>
      </div>
      {/* capture="environment" abre directamente la cámara trasera en el móvil */}
      <input ref={camara} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { onAñadir(e.target.files); e.target.value = ""; }} />
      <input ref={galeria} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { onAñadir(e.target.files); e.target.value = ""; }} />

      {fotos.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {fotos.map((f, i) => (
            <div key={i} className="relative aspect-[3/4] overflow-hidden rounded-lg border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.preview} alt={`Página ${i + 1} de la carta`} className="h-full w-full object-cover" />
              <button onClick={() => onQuitar(i)} aria-label={`Quitar foto ${i + 1}`}
                className="absolute right-1 top-1 h-6 w-6 rounded-full bg-black/60 text-xs text-white">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const normalizar = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Buscador de restaurantes de nuestra base de datos (para usar su carta). */
function ListaRestaurantes({ onElegir, onHacerFoto }: { onElegir: (id: string) => void; onHacerFoto: () => void }) {
  const [lista, setLista] = useState<(Pick<Restaurante, "id" | "nombre" | "tipo_cocina" | "direccion"> & { km: number })[]>();
  const [q, setQ] = useState("");

  useEffect(() => {
    supabaseBrowser.from("restaurantes").select("id, nombre, tipo_cocina, direccion, latitud, longitud").then(({ data }) => {
      const [la, lo] = UBICACION.coords;
      setLista(
        (data ?? [])
          .map((r) => ({ ...r, km: Math.hypot((r.latitud - la) * 111, (r.longitud - lo) * 85) }))
          .sort((a, b) => a.km - b.km),
      );
    });
  }, []);

  const filtrados = (lista ?? []).filter((r) =>
    normalizar(q).trim().split(/\s+/).every((palabra) => normalizar(`${r.nombre} ${r.tipo_cocina} ${r.direccion}`).includes(palabra)),
  );

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Nombre, tipo de cocina o calle…"
        aria-label="Buscar restaurante"
        className="w-full rounded-xl border border-line bg-card px-4 py-3 text-base"
      />

      {!lista ? (
        <p className="text-sm text-muted">Cargando restaurantes…</p>
      ) : filtrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card p-5 text-center text-sm">
          <p>No tenemos <strong>«{q.trim()}»</strong> en nuestra base de datos.</p>
          <button onClick={onHacerFoto} className="mt-3 rounded-xl bg-brand px-4 py-2.5 font-semibold text-white">📷 Hacer foto a su carta</button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">
            {q.trim() ? `${filtrados.length} ${filtrados.length === 1 ? "resultado" : "resultados"}` : `¿En cuál estáis? Ordenados por cercanía a ${UBICACION.nombre}.`}
          </p>
          {filtrados.map((r) => (
            <button key={r.id} onClick={() => onElegir(r.id)} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-left transition hover:border-brand">
              <span className="min-w-0">
                <span className="block truncate font-medium">{r.nombre}</span>
                <span className="block truncate text-sm text-muted">{r.tipo_cocina} · {r.direccion.replace(/, Madrid$/, "")}</span>
              </span>
              <span className="shrink-0 text-sm text-muted">{r.km.toFixed(1).replace(".", ",")} km</span>
            </button>
          ))}
          <p className="pt-1 text-center text-sm text-muted">
            ¿No está en la lista? <button onClick={onHacerFoto} className="font-medium text-brand">Haz una foto a su carta</button>
          </p>
        </>
      )}
    </div>
  );
}
