/**
 * Búsqueda semántica (Fase 5): embeddings con gte-small vía la Edge Function
 * "embed" de Supabase, y búsqueda por similitud con pgvector.
 */
import "server-only";
import type { Plato, Restaurante } from "@/lib/supabase/types";

const URL_EMBED = () => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/embed`;

/**
 * Textos → vectores de 384 dimensiones (normalizados). Lanza error si la función falla.
 * Se envían en lotes pequeños: el plan gratuito de Supabase limita el cómputo por llamada.
 */
export async function embeber(textos: string[], timeoutMs = 15_000, lote = 4): Promise<number[][]> {
  const salida: number[][] = [];
  for (let i = 0; i < textos.length; i += lote) {
    const r = await fetch(URL_EMBED(), {
      method: "POST",
      // La función solo acepta la clave secreta: este código corre únicamente en el servidor
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.SUPABASE_SECRET_KEY ?? "",
        Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY ?? ""}`,
      },
      body: JSON.stringify({ textos: textos.slice(i, i + lote) }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) throw new Error(`embed ${r.status}: ${(await r.text()).slice(0, 120)}`);
    salida.push(...((await r.json()) as { embeddings: number[][] }).embeddings);
  }
  return salida;
}

/** Texto que representa a un restaurante (ficha + nombres de sus platos). */
export const textoRestaurante = (r: Restaurante, platos: Plato[]) =>
  `${r.nombre}. Restaurante de cocina ${r.tipo_cocina}. ${r.descripcion ?? ""} Platos: ${platos.map((p) => p.nombre).join(", ")}.`;

/** Texto que representa a un plato. */
export const textoPlato = (p: Plato) =>
  `${p.nombre}. ${p.categoria}. ${p.descripcion ?? ""} ${p.ingredientes.length ? `Ingredientes: ${p.ingredientes.join(", ")}.` : ""}`.trim();

/** pgvector acepta el vector como texto "[0.1,0.2,...]". */
export const aVector = (v: number[]) => `[${v.join(",")}]`;
