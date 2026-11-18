import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import type { LanguageModelV4 } from "@ai-sdk/provider";
import { APICallError, wrapLanguageModel, type LanguageModel, type LanguageModelMiddleware } from "ai";

/** Segundos máximos que esperamos a que cada modelo empiece a responder. */
const TIMEOUT_S = Number(process.env.AI_TIMEOUT_S ?? process.env.GEMINI_TIMEOUT_S ?? 30);

/**
 * Modelo de IA de la app: una CADENA de modelos que se prueban en orden.
 *
 *   1. Amazon Bedrock (Claude): solo si hay credenciales AWS en el entorno.
 *      Son temporales (workshop): cuando caducan, se salta al siguiente.
 *   2. Gemini: GEMINI_MODEL_ID y después GEMINI_FALLBACK_MODELS.
 *
 * AI_PROVIDER=google fuerza usar solo Gemini (útil para ahorrar crédito de AWS).
 */
export function getModel(): LanguageModel {
  const cadena = [...modelosBedrock(), ...modelosGemini()];
  if (cadena.length === 0) throw new Error("No hay ningún modelo de IA configurado: revisa .env.local");
  return wrapLanguageModel({ model: cadena[0], middleware: cadenaDeRespaldo(cadena) });
}

function modelosBedrock(): LanguageModelV4[] {
  const e = process.env;
  if (e.AI_PROVIDER === "google" || !e.AWS_ACCESS_KEY_ID || !e.AWS_SECRET_ACCESS_KEY) return [];
  const bedrock = createAmazonBedrock({
    region: e.AWS_REGION ?? "us-east-1",
    accessKeyId: e.AWS_ACCESS_KEY_ID,
    secretAccessKey: e.AWS_SECRET_ACCESS_KEY,
    sessionToken: e.AWS_SESSION_TOKEN || undefined,
  });
  return [bedrock(e.BEDROCK_MODEL_ID ?? "us.anthropic.claude-opus-5-5")];
}

function modelosGemini(): LanguageModelV4[] {
  const e = process.env;
  if (!e.GOOGLE_GENERATIVE_AI_API_KEY) return [];
  const google = createGoogleGenerativeAI({ apiKey: e.GOOGLE_GENERATIVE_AI_API_KEY });
  const ids = [
    e.GEMINI_MODEL_ID ?? "gemini-3.5-flash",
    ...(e.GEMINI_FALLBACK_MODELS ?? "gemini-3.5-flash-lite,gemini-3.1-flash-lite").split(","),
  ].map((s) => s.trim()).filter(Boolean);
  return [...new Set(ids)].map((id) => google(id));
}

/**
 * Errores en los que tiene sentido probar el siguiente modelo:
 * credenciales caducadas (401/403), modelo inexistente (404), cuota (429),
 * saturación (5xx) o que no responda a tiempo.
 */
const recuperable = (e: unknown) =>
  (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) ||
  (APICallError.isInstance(e) && [401, 403, 404, 429].includes(e.statusCode ?? 0)) ||
  (APICallError.isInstance(e) && (e.statusCode ?? 0) >= 500);

/**
 * Modelos que han fallado hace poco y se saltan durante un tiempo, para no
 * pagar el error en cada llamada: 10 min si son credenciales (caducadas),
 * 30 s si es saturación o timeout.
 */
const enPausa = new Map<string, number>();
const clave = (m: LanguageModelV4) => `${m.provider}/${m.modelId}`;

function cadenaDeRespaldo(cadena: LanguageModelV4[]): LanguageModelMiddleware {
  async function probar<T>(params: { abortSignal?: AbortSignal }, llamar: (m: LanguageModelV4, signal: AbortSignal) => PromiseLike<T>): Promise<T> {
    let ultimoError: unknown;
    const disponibles = cadena.filter((m) => (enPausa.get(clave(m)) ?? 0) < Date.now());
    // Si todos están en pausa, se prueban todos igualmente
    for (const modelo of disponibles.length ? disponibles : cadena) {
      // El límite solo cuenta hasta que el modelo responde (en streaming, hasta
      // que empieza a llegar la respuesta); después se desactiva.
      const ctrl = new AbortController();
      const reloj = setTimeout(() => ctrl.abort(new DOMException("timeout", "TimeoutError")), TIMEOUT_S * 1000);
      const signal = params.abortSignal ? AbortSignal.any([params.abortSignal, ctrl.signal]) : ctrl.signal;
      try {
        const res = await llamar(modelo, signal);
        clearTimeout(reloj);
        return res;
      } catch (e) {
        clearTimeout(reloj);
        if (params.abortSignal?.aborted || !recuperable(e)) throw e;
        const motivo = APICallError.isInstance(e) ? e.statusCode : "timeout";
        const credenciales = motivo === 401 || motivo === 403;
        enPausa.set(clave(modelo), Date.now() + (credenciales ? 10 * 60_000 : 30_000));
        console.warn(`[ia] ${clave(modelo)} no disponible (${motivo}${credenciales ? ", ¿credenciales caducadas?" : ""}); se salta durante ${credenciales ? "10 min" : "30 s"}`);
        ultimoError = e;
      }
    }
    throw ultimoError;
  }

  return {
    specificationVersion: "v4",
    wrapGenerate: ({ params }) => probar(params, (m, abortSignal) => m.doGenerate({ ...params, abortSignal })),
    wrapStream: ({ params }) => probar(params, (m, abortSignal) => m.doStream({ ...params, abortSignal })),
  };
}
