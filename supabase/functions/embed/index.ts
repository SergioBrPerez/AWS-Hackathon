// =====================================================================
// Agent Locally · Edge Function "embed" (Fase 5)
// Convierte textos en embeddings de 384 dimensiones con el modelo gte-small,
// que Supabase ejecuta dentro de la propia función (gratis, sin APIs externas).
//
// Entrada:  POST { "textos": ["ramen", "comida asiática ligera", ...] }  (máx. 50)
// Salida:   { "embeddings": [[0.01, -0.03, ...], ...] }
//
// Seguridad: solo acepta la clave SECRETA (sb_secret_…), es decir, solo la puede
// llamar el servidor de la app, nunca un navegador.
// =====================================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";

const session = new Supabase.ai.Session("gte-small");

export default {
  fetch: withSupabase({ auth: ["secret"] }, async (req) => {
    if (req.method !== "POST") return Response.json({ error: "Usa POST" }, { status: 405 });

    let textos: unknown;
    try {
      ({ textos } = await req.json());
    } catch {
      return Response.json({ error: "JSON no válido" }, { status: 400 });
    }
    if (!Array.isArray(textos) || textos.length === 0 || textos.length > 50 || !textos.every((t) => typeof t === "string")) {
      return Response.json({ error: "Envía { textos: string[] } (entre 1 y 50)" }, { status: 400 });
    }

    const embeddings: number[][] = [];
    for (const texto of textos as string[]) {
      const v = await session.run(texto.slice(0, 2000), { mean_pool: true, normalize: true });
      embeddings.push(Array.from(v as number[]));
    }
    return Response.json({ embeddings });
  }),
};
