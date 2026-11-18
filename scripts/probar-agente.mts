// Conversa con el agente desde la terminal y muestra qué herramientas usa.
// Uso: npm run agente -- "Somos 3: Ana celíaca, Bea embarazada y Carlos vegetariano. Presupuesto €€, nos apetece italiano"
import { generateText, isStepCount } from "ai";
import { getModel } from "@/lib/ai/model";
import { herramientas } from "@/lib/agente/tools";
import { SYSTEM_PROMPT } from "@/lib/agente/prompt";

const pregunta = process.argv.slice(2).join(" ") ||
  "Somos 4: Ana es celíaca, Bea está embarazada, Carlos es vegetariano y Dani come de todo. Presupuesto €€. Nos apetece italiano o tapas, nada de picante.";

console.log(`\n👤 ${pregunta}\n`);
const t0 = Date.now();
const res = await generateText({
  model: getModel(),
  system: SYSTEM_PROMPT,
  prompt: pregunta,
  tools: herramientas,
  stopWhen: isStepCount(8),
  onStepEnd: ({ toolCalls }) => {
    console.log(`⏱️  paso terminado a los ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    for (const c of toolCalls) console.log(`🔧 ${c.toolName}(${JSON.stringify(c.input).slice(0, 140)})`);
  },
});
console.log(`\n🤖 ${res.text}\n`);
console.log(`⏱️  ${((Date.now() - t0) / 1000).toFixed(1)} s · ${res.steps.length} pasos · ${res.totalUsage.totalTokens ?? "?"} tokens`);
