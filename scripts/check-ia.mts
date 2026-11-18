// Comprueba qué proveedores de IA responden y cuánto tardan.
// Uso: npm run ia:check
import { generateText } from "ai";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

async function probar(nombre: string, model: Parameters<typeof generateText>[0]["model"]) {
  const t = Date.now();
  try {
    const { text } = await generateText({ model, prompt: "Responde solo: hola", maxRetries: 0, abortSignal: AbortSignal.timeout(45_000) });
    console.log(`✅ ${nombre} · ${((Date.now() - t) / 1000).toFixed(1)} s · "${text.trim().slice(0, 40)}"`);
  } catch (e) {
    const msg = e instanceof Error ? e.message.split("\n")[0].slice(0, 140) : String(e);
    console.log(`❌ ${nombre} · ${msg}`);
  }
}

const env = process.env;
if (env.GOOGLE_GENERATIVE_AI_API_KEY) {
  const google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY });
  const ids = [env.GEMINI_MODEL_ID ?? "gemini-3.5-flash", ...(env.GEMINI_FALLBACK_MODELS ?? "gemini-3.5-flash-lite,gemini-3.1-flash-lite").split(",")];
  for (const id of ids) await probar(`Gemini ${id.trim()}`, google(id.trim()));
} else console.log("⚪ Gemini sin configurar");

if (env.AWS_ACCESS_KEY_ID) {
  const bedrock = createAmazonBedrock({ region: env.AWS_REGION ?? "us-east-1", accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY, sessionToken: env.AWS_SESSION_TOKEN });
  await probar(`Bedrock ${env.BEDROCK_MODEL_ID}`, bedrock(env.BEDROCK_MODEL_ID ?? "us.anthropic.claude-opus-5-5"));
} else console.log("⚪ Bedrock sin credenciales");
