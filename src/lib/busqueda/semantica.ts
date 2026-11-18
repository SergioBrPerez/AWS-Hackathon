import "server-only";
import { aVector, embeber } from "@/lib/embeddings";
import { supabaseServer } from "@/lib/supabase/server";

export type ResultadoSemantico = { restaurante_id: string; similitud: number; plato_coincidente: string | null };

/**
 * Restaurantes ordenados por parecido de SIGNIFICADO con la consulta.
 * Devuelve null si la búsqueda semántica no está disponible (la Edge Function
 * no existe o falla): quien llama debe usar la búsqueda por palabras.
 */
export async function buscarSemantico(consulta: string, presupuestoMax = 3, limite = 12): Promise<ResultadoSemantico[] | null> {
  if (!consulta.trim()) return null;
  try {
    const [v] = await embeber([consulta]);
    const { data, error } = await supabaseServer().rpc("buscar_semantico", {
      consulta: aVector(v),
      presupuesto_max: presupuestoMax,
      limite,
    });
    if (error) throw error;
    return (data as ResultadoSemantico[]).map((d) => ({ ...d, similitud: Math.round(d.similitud * 1000) / 1000 }));
  } catch (e) {
    console.warn("[semantica] no disponible, se usa la búsqueda por palabras:", e instanceof Error ? e.message : e);
    return null;
  }
}
