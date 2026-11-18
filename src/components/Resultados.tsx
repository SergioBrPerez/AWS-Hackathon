"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { AgenteMessage } from "@/lib/agente/tipos";
import { mesaAPrompt, resumenMesa, type Mesa } from "@/lib/mesa";
import type { PuntoMapa } from "./Mapa";

const Mapa = dynamic(() => import("./Mapa"), {
  ssr: false,
  loading: () => <div className="h-[60vh] animate-pulse rounded-2xl bg-line" />,
});

type Parte = AgenteMessage["parts"][number];
type Salida<T extends Parte["type"]> = Extract<Parte, { type: T; state: "output-available" }>["output"];
type Candidato = NonNullable<Salida<"tool-buscar_candidatos">["candidatos"]>[number];
type Auditoria = Required<Omit<Salida<"tool-auditar_carta_grupo">, "error">>;
type Experiencia = NonNullable<NonNullable<Salida<"tool-consultar_experiencia_previa">["resultados"]>[number]>;

/** Pantalla 3 del diseño: resultados (lista + mapa) con el agente trabajando en vivo. */
export function Resultados({ mesa, onEditar }: { mesa: Mesa; onEditar: () => void }) {
  const { messages, sendMessage, status, error, regenerate, stop } = useChat<AgenteMessage>({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [vista, setVista] = useState<"lista" | "mapa">("lista");
  const [texto, setTexto] = useState("");
  const [yo, setYo] = useState<[number, number]>();
  const [destacado, setDestacado] = useState<string>();
  const enviado = useRef(false);

  // Lanzar la búsqueda una sola vez.
  // En desarrollo, React (StrictMode) monta → desmonta → vuelve a montar, y al
  // desmontar useChat CANCELA la petición en curso. Por eso el envío se programa
  // con un setTimeout que la limpieza anula: solo sale el del montaje definitivo.
  useEffect(() => {
    if (enviado.current) return;
    const t = setTimeout(() => {
      enviado.current = true;
      sendMessage({ text: mesaAPrompt(mesa) });
    }, 0);
    return () => clearTimeout(t);
  }, [mesa, sendMessage]);

  // Ubicación del usuario para calcular distancias (opcional)
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((p) => setYo([p.coords.latitude, p.coords.longitude]), () => {}, { timeout: 8000 });
  }, []);

  // Extraer los datos de las herramientas de toda la conversación (la última versión gana)
  const datos = useMemo(() => {
    const candidatos = new Map<string, Candidato>();
    const auditorias = new Map<string, Auditoria>();
    const experiencia = new Map<string, Experiencia>();
    let registro: { veces: number } | undefined;
    for (const m of messages) {
      for (const p of m.parts) {
        if (p.type === "tool-buscar_candidatos" && p.state === "output-available")
          p.output.candidatos?.forEach((c) => candidatos.set(c.id, c));
        if (p.type === "tool-auditar_carta_grupo" && p.state === "output-available" && p.output.restaurante_id)
          auditorias.set(p.output.restaurante_id, p.output as Auditoria);
        if (p.type === "tool-consultar_experiencia_previa" && p.state === "output-available")
          p.output.resultados?.forEach((r) => r && (!experiencia.has(r.restaurante_id) || r.coincidencia === "exacta") && experiencia.set(r.restaurante_id, r));
        if (p.type === "tool-registrar_feedback_eleccion" && p.state === "output-available" && "veces_elegido" in p.output)
          registro = { veces: p.output.veces_elegido };
      }
    }
    return { candidatos, auditorias, experiencia, registro };
  }, [messages]);

  const distancia = (c?: Candidato) => (yo && c ? haversine(yo, [c.latitud, c.longitud]) : undefined);

  const ranking = [...datos.auditorias.values()].sort(
    (a, b) =>
      b.encaje_pct - a.encaje_pct ||
      (datos.experiencia.get(b.restaurante_id)?.veces_elegido ?? 0) - (datos.experiencia.get(a.restaurante_id)?.veces_elegido ?? 0) ||
      Number(datos.candidatos.get(b.restaurante_id)?.patrocinado) - Number(datos.candidatos.get(a.restaurante_id)?.patrocinado),
  );

  const idsPuntos = [...datos.candidatos.keys()].join() + "|" + [...datos.auditorias.keys()].join() + "|" + (yo ? "y" : "");
  const puntos: PuntoMapa[] = useMemo(
    () =>
      [...datos.candidatos.values()].map((c) => ({
        id: c.id, nombre: c.nombre, latitud: c.latitud, longitud: c.longitud, precio: c.precio,
        encaje: datos.auditorias.get(c.id)?.encaje_pct, distanciaKm: distancia(c),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idsPuntos],
  );

  const trabajando = status === "submitted" || status === "streaming";
  const [primeraRespuesta, ...resto] = messages.filter((m) => m.role === "assistant");
  const seguimiento = primeraRespuesta ? messages.slice(messages.indexOf(primeraRespuesta) + 1) : [];

  const enviar = (t: string) => {
    if (!t.trim() || trabajando) return;
    sendMessage({ text: t });
    setTexto("");
  };

  const seleccionar = (id: string) => {
    setDestacado(id);
    setVista("lista");
    setTimeout(() => document.getElementById(`r-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  return (
    <div className="flex flex-col gap-5 pb-32">
      {/* Resumen de la mesa */}
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-brand-soft px-4 py-3 text-sm">
        <span className="min-w-0">{resumenMesa(mesa)}</span>
        <button onClick={onEditar} className="shrink-0 font-medium text-brand">Editar</button>
      </div>

      {/* Progreso del agente */}
      <Progreso mensaje={primeraRespuesta} candidatos={datos.candidatos} trabajando={trabajando && resto.length === 0} />

      {/* Red de seguridad: la búsqueda terminó sin respuesta ni error (p.ej. se canceló) */}
      {!error && !trabajando && !primeraRespuesta && messages.length > 0 && (
        <div className="rounded-2xl border border-line bg-card p-4 text-sm">
          <p className="font-medium">La búsqueda se ha interrumpido.</p>
          <button onClick={() => regenerate()} className="mt-3 rounded-lg bg-brand px-4 py-2 text-white">Volver a buscar</button>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rojo/30 bg-red-50 p-4 text-sm">
          <p className="font-medium text-rojo">El agente no ha podido responder.</p>
          <p className="mt-1 text-muted">{error.message.slice(0, 160)}</p>
          <button onClick={() => regenerate()} className="mt-3 rounded-lg bg-rojo px-4 py-2 text-white">Reintentar</button>
        </div>
      )}

      {/* Lista / Mapa */}
      {(ranking.length > 0 || datos.candidatos.size > 0) && (
        <section>
          <div className="mb-3 grid grid-cols-2 rounded-xl border border-line bg-card p-1 text-sm" role="tablist">
            {(["lista", "mapa"] as const).map((v) => (
              <button key={v} role="tab" aria-selected={vista === v} onClick={() => setVista(v)}
                className={`rounded-lg py-2 font-medium ${vista === v ? "bg-foreground text-white" : "text-muted"}`}>
                {v === "lista" ? "☰ Lista" : "🗺️ Mapa"}
              </button>
            ))}
          </div>

          {vista === "mapa" ? (
            <Mapa puntos={puntos} yo={yo} onSeleccionar={seleccionar} />
          ) : ranking.length ? (
            <div className="flex flex-col gap-3">
              {ranking.map((a, i) => (
                <Tarjeta
                  key={a.restaurante_id}
                  auditoria={a}
                  candidato={datos.candidatos.get(a.restaurante_id)}
                  experiencia={datos.experiencia.get(a.restaurante_id)}
                  distanciaKm={distancia(datos.candidatos.get(a.restaurante_id))}
                  posicion={i + 1}
                  destacado={destacado === a.restaurante_id}
                  deshabilitado={trabajando}
                  onElegir={() => enviar(`Confirmamos la elección: ${a.restaurante} (restaurante_id ${a.restaurante_id}).`)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Revisando cartas…</p>
          )}
        </section>
      )}

      {datos.registro && (
        <div className="rounded-2xl border border-verde/30 bg-green-50 p-4 text-sm">
          ✅ <strong>Elección registrada.</strong> Ya la han elegido {datos.registro.veces} {datos.registro.veces === 1 ? "grupo" : "grupos"} con vuestro perfil. ¡Esto ayudará a los próximos!
        </div>
      )}

      {/* Respuesta del agente */}
      {primeraRespuesta && <TextoAgente mensaje={primeraRespuesta} />}

      {/* Conversación de seguimiento */}
      {seguimiento.map((m) =>
        m.role === "user" ? (
          <div key={m.id} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-foreground px-4 py-2 text-sm text-white">
            {m.parts.map((p) => (p.type === "text" ? p.text : "")).join("")}
          </div>
        ) : (
          <TextoAgente key={m.id} mensaje={m} />
        ),
      )}

      {/* Caja para seguir hablando con el agente */}
      <form
        onSubmit={(e) => { e.preventDefault(); enviar(texto); }}
        className="fixed inset-x-0 bottom-0 border-t border-line bg-background/95 px-4 pt-3 backdrop-blur"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-md gap-2">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={trabajando ? "El agente está trabajando…" : "Pregunta algo más: ¿y algo más barato?"}
            aria-label="Mensaje para el agente"
            className="min-w-0 flex-1 rounded-xl border border-line bg-card px-3 py-3 text-base"
          />
          {trabajando ? (
            <button type="button" onClick={() => stop()} className="rounded-xl border border-line px-4 text-sm">Parar</button>
          ) : (
            <button type="submit" className="rounded-xl bg-brand px-4 font-semibold text-white disabled:opacity-40" disabled={!texto.trim()}>Enviar</button>
          )}
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Progreso({ mensaje, candidatos, trabajando }: { mensaje?: AgenteMessage; candidatos: Map<string, Candidato>; trabajando: boolean }) {
  const pasos = (mensaje?.parts ?? []).flatMap((p) => {
    if (!p.type.startsWith("tool-")) return [];
    const t = p as Extract<Parte, { type: `tool-${string}` }>;
    const hecho = t.state === "output-available";
    const fallo = t.state === "output-error";
    let etiqueta = "";
    switch (t.type) {
      case "tool-buscar_candidatos":
        etiqueta = hecho && "total" in t.output ? `${t.output.total} restaurantes dentro del presupuesto` : "Buscando restaurantes…";
        break;
      case "tool-consultar_experiencia_previa":
        etiqueta = hecho && t.output.resultados
          ? `Memoria colectiva: ${t.output.resultados.length} ${t.output.resultados.length === 1 ? "coincidencia" : "coincidencias"}`
          : "Consultando qué eligieron grupos parecidos…";
        break;
      case "tool-auditar_carta_grupo": {
        const nombre = t.input ? candidatos.get(t.input.restaurante_id ?? "")?.nombre : undefined;
        etiqueta = hecho && "encaje_pct" in t.output
          ? `Carta de ${t.output.restaurante} revisada · encaje ${t.output.encaje_pct}%`
          : `Revisando plato a plato la carta${nombre ? ` de ${nombre}` : ""}…`;
        break;
      }
      case "tool-registrar_feedback_eleccion":
        etiqueta = hecho ? "Elección guardada en la memoria colectiva" : "Guardando vuestra elección…";
        break;
    }
    return [{ id: t.toolCallId, etiqueta, hecho, fallo }];
  });

  if (!trabajando && pasos.length === 0) return null;
  return (
    <ol className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-4 text-sm" aria-live="polite">
      {pasos.map((p) => (
        <li key={p.id} className="flex items-start gap-2">
          <span className="w-5 shrink-0 text-center">{p.fallo ? "❌" : p.hecho ? "✅" : <Spinner />}</span>
          <span className={p.hecho ? "" : "text-muted"}>{p.etiqueta}</span>
        </li>
      ))}
      {trabajando && (pasos.length === 0 || pasos.every((p) => p.hecho)) && (
        <li className="flex items-center gap-2 text-muted">
          <span className="w-5 text-center"><Spinner /></span>
          {pasos.length === 0 ? "El agente está pensando…" : "Preparando la recomendación…"}
        </li>
      )}
    </ol>
  );
}

function Tarjeta({ auditoria: a, candidato: c, experiencia: e, distanciaKm, posicion, destacado, deshabilitado, onElegir }: {
  auditoria: Auditoria; candidato?: Candidato; experiencia?: Experiencia; distanciaKm?: number;
  posicion: number; destacado: boolean; deshabilitado: boolean; onElegir: () => void;
}) {
  const [abierta, setAbierta] = useState(posicion === 1);
  const color = a.encaje_pct >= 100 ? "bg-verde" : a.encaje_pct >= 50 ? "bg-amarillo" : "bg-rojo";

  return (
    <article id={`r-${a.restaurante_id}`} className={`rounded-2xl border bg-card p-4 transition ${destacado ? "border-brand ring-2 ring-brand/30" : "border-line"}`}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold leading-tight">{a.restaurante}</h3>
          <p className="mt-0.5 text-sm text-muted">
            {[c?.cocina, c?.precio, distanciaKm !== undefined ? `a ${distanciaKm.toFixed(1)} km` : undefined].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold text-white ${color}`}>{a.encaje_pct}%</span>
      </header>

      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {e && (
          <span className="rounded-full bg-brand-soft px-2 py-1 text-brand">
            ⭐ Elegido por {e.veces_elegido} {e.veces_elegido === 1 ? "grupo" : "grupos"} {e.coincidencia === "exacta" ? "con vuestro perfil" : `similares (${e.firma_perfil.replaceAll("+", " + ").replaceAll("_", " ")})`}
          </span>
        )}
        {c?.patrocinado && <span className="rounded-full bg-line px-2 py-1 text-muted">Patrocinado</span>}
      </div>

      <ul className="mt-3 flex flex-col gap-1 text-sm">
        {a.comensales.map((p) => (
          <li key={p.nombre} className="flex items-center justify-between gap-2">
            <span className="truncate">{p.tiene_principal_apto ? "✅" : "⚠️"} {p.nombre}</span>
            <span className="shrink-0 text-muted">🟢 {p.aptos.length} · 🟡 {p.con_modificacion.length} · 🔴 {p.no_recomendados.length}</span>
          </li>
        ))}
      </ul>

      <button onClick={() => setAbierta(!abierta)} className="mt-3 text-sm font-medium text-brand" aria-expanded={abierta}>
        {abierta ? "Ocultar qué puede pedir cada uno" : "Ver qué puede pedir cada uno"}
      </button>

      {abierta && (
        <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3 text-sm">
          {a.comensales.map((p) => (
            <div key={p.nombre}>
              <p className="font-medium">{p.nombre}</p>
              {p.aptos.length > 0 && <p className="mt-1"><span className="text-verde">●</span> {p.aptos.join(", ")}</p>}
              {p.con_modificacion.map((m) => (
                <p key={m.plato} className="mt-1"><span className="text-amarillo">●</span> {m.plato}: <em className="text-muted">{m.instruccion}</em></p>
              ))}
              {p.no_recomendados.length > 0 && (
                <details className="mt-1 text-muted">
                  <summary className="cursor-pointer"><span className="text-rojo">●</span> {p.no_recomendados.length} no recomendados</summary>
                  <ul className="mt-1 pl-4">
                    {p.no_recomendados.map((r) => <li key={r.plato}>{r.plato}: {r.motivo}</li>)}
                  </ul>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      <button onClick={onElegir} disabled={deshabilitado} className="mt-4 w-full rounded-xl border border-brand py-2.5 text-sm font-semibold text-brand disabled:opacity-40">
        Elegimos este sitio
      </button>
    </article>
  );
}

function TextoAgente({ mensaje }: { mensaje: AgenteMessage }) {
  const texto = mensaje.parts.map((p) => (p.type === "text" ? p.text : "")).join("\n\n").trim();
  if (!texto) return null;
  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">🤖 El agente recomienda</p>
      <div className="texto-agente">
        <ReactMarkdown>{texto}</ReactMarkdown>
      </div>
    </section>
  );
}

const Spinner = () => <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-brand align-middle" aria-hidden />;

function haversine([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]) {
  const rad = (x: number) => (x * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}
