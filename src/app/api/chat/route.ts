import { convertToModelMessages, isStepCount, streamText, type UIMessage } from "ai";
import { getModel } from "@/lib/ai/model";
import { herramientas } from "@/lib/agente/tools";
import { SYSTEM_PROMPT } from "@/lib/agente/prompt";

// Vercel: dar margen a varias llamadas a herramientas
export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: getModel(),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: herramientas,
    stopWhen: isStepCount(8),
  });

  return result.toUIMessageStreamResponse();
}
