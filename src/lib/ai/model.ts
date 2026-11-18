import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import type { LanguageModel } from "ai";

/**
 * Proveedor de IA intercambiable por variable de entorno.
 *  - AI_PROVIDER=google  -> Gemini (Google AI Studio). Desarrollo y post-hackathon.
 *  - AI_PROVIDER=bedrock -> Claude en Amazon Bedrock (cuenta del hackathon, 72h).
 * El resto de la app (tools, prompts, UI) no cambia.
 */
export function getModel(): LanguageModel {
  const provider = process.env.AI_PROVIDER ?? "google";

  if (provider === "bedrock") {
    const bedrock = createAmazonBedrock({
      region: process.env.AWS_REGION ?? "eu-west-1",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN,
    });
    return bedrock(process.env.BEDROCK_MODEL_ID ?? "anthropic.claude-opus-5-5");
  }

  const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });
  return google(process.env.GEMINI_MODEL_ID ?? "gemini-3.5-flash");
}
