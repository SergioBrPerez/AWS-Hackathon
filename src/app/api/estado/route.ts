import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, type LanguageModel } from "ai";
import { embeber } from "@/lib/embeddings";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Estado = { ok: boolean; detalle: string; segundos?: number };

/** Resultado reciente en memoria: evita gastar llamadas a la IA si alguien recarga mucho. */
let ultimo: { cuando: number; datos: unknown } | null = null;

/**
 * Diagnóstico: GET /api/estado
 * Dice qué servicios funcionan en este entorno (local o Vercel) sin mostrar ninguna clave.
 */
export async function GET() {
  if (ultimo && Date.now() - ultimo.cuando < 60_000) return Response.json(ultimo.datos);
  const e = process.env;

  const medir = async (f: () => Promise<string>): Promise<Estado> => {
    const t = Date.now();
    try {
      return { ok: true, detalle: await f(), segundos: +((Date.now() - t) / 1000).toFixed(1) };
    } catch (x) {
      return { ok: false, detalle: x instanceof Error ? x.message.split("\n")[0].slice(0, 140) : String(x) };
    }
  };
  const probarModelo = (m: LanguageModel) => medir(async () => {
    await generateText({ model: m, prompt: "Responde solo: ok", maxRetries: 0, abortSignal: AbortSignal.timeout(20_000) });
    return "responde";
  });
  const falta = (vars: string[]) => vars.filter((v) => !e[v]);

  const [supabase, embeddings, bedrock, gemini] = await Promise.all([
    medir(async () => {
      if (falta(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY"]).length) throw new Error("Faltan variables de Supabase");
      const { count, error } = await supabaseServer().from("restaurantes").select("*", { count: "exact", head: true });
      if (error) throw error;
      return `${count} restaurantes`;
    }),
    medir(async () => `Edge Function "embed" OK (${(await embeber(["prueba"], 15_000))[0].length} dim.)`),
    falta(["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"]).length || e.AI_PROVIDER === "google"
      ? Promise.resolve<Estado>({ ok: false, detalle: "Sin credenciales de AWS (o AI_PROVIDER=google): se usa Gemini" })
      : probarModelo(createAmazonBedrock({ region: e.AWS_REGION ?? "us-east-1", accessKeyId: e.AWS_ACCESS_KEY_ID, secretAccessKey: e.AWS_SECRET_ACCESS_KEY, sessionToken: e.AWS_SESSION_TOKEN || undefined })(e.BEDROCK_MODEL_ID ?? "us.anthropic.claude-sonnet-5-5")),
    e.GOOGLE_GENERATIVE_AI_API_KEY
      ? probarModelo(createGoogleGenerativeAI({ apiKey: e.GOOGLE_GENERATIVE_AI_API_KEY })(e.GEMINI_MODEL_ID ?? "gemini-3.5-flash-lite"))
      : Promise.resolve<Estado>({ ok: false, detalle: "Falta GOOGLE_GENERATIVE_AI_API_KEY" }),
  ]);

  const ia = bedrock.ok ? "Claude en Bedrock" : gemini.ok ? "Gemini (respaldo)" : "NINGUNA";
  const datos = {
    entorno: e.VERCEL ? `Vercel (${e.VERCEL_ENV})` : "local",
    todo_ok: supabase.ok && (bedrock.ok || gemini.ok),
    ia_en_uso: ia,
    servicios: { supabase, busqueda_semantica: embeddings, bedrock: { ...bedrock, modelo: e.BEDROCK_MODEL_ID }, gemini: { ...gemini, modelo: e.GEMINI_MODEL_ID } },
  };
  ultimo = { cuando: Date.now(), datos };
  return Response.json(datos);
}
