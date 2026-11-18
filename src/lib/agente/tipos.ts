import type { InferUITools, UIDataTypes, UIMessage } from "ai";
import type { herramientas } from "./tools";

/** Mensaje del chat con las herramientas tipadas (para la UI). */
export type AgenteMessage = UIMessage<never, UIDataTypes, InferUITools<typeof herramientas>>;
