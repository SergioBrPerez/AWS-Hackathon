import { z } from "zod";
import { extraerCarta } from "@/lib/semaforo/extraer";

export const maxDuration = 60;

const MAX_IMAGENES = 4;
const MAX_BASE64 = 3_000_000; // ~2,2 MB por imagen (el cliente ya las comprime)

const cuerpo = z
  .object({
    imagenes: z
      .array(z.object({ base64: z.string().max(MAX_BASE64), mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]) }))
      .max(MAX_IMAGENES)
      .optional(),
    texto: z.string().max(20_000).optional(),
  })
  .refine((b) => (b.imagenes?.length ?? 0) > 0 || (b.texto?.trim().length ?? 0) > 0, "Envía al menos una imagen o el texto de la carta");

/** Foto(s) o texto de una carta → platos estructurados. */
export async function POST(req: Request) {
  const parsed = cuerpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Petición no válida" }, { status: 400 });
  try {
    return Response.json(await extraerCarta(parsed.data));
  } catch (e) {
    console.error("[extraer]", e);
    return Response.json({ error: "No se ha podido leer la carta. Prueba con otra foto o pega el texto." }, { status: 502 });
  }
}
