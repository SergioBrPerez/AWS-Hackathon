/**
 * Lectura de cartas que NO están en la base de datos (Modo 2):
 * fotos de la carta (visión) o texto pegado → lista de platos estructurada.
 * Después se auditan con el mismo semáforo que el resto (auditoria.ts).
 */
import { generateText, Output, type FilePart, type TextPart } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/model";
import type { Plato } from "@/lib/supabase/types";

export const ALERGENOS_UE = [
  "gluten", "crustaceos", "huevo", "pescado", "cacahuete", "soja", "lacteos",
  "frutos_secos", "apio", "mostaza", "sesamo", "sulfitos", "altramuces", "moluscos",
] as const;

const esquema = z.object({
  es_carta: z.boolean().describe("false si las imágenes/texto no son una carta de restaurante"),
  aviso: z.string().nullable().describe("Problemas de lectura (foto borrosa, parte cortada…) o null"),
  restaurante_nombre: z.string().nullable().describe("Nombre del restaurante si aparece, si no null"),
  platos: z.array(
    z.object({
      nombre: z.string(),
      categoria: z.enum(["Entrante", "Principal", "Postre", "Bebida"]),
      descripcion: z.string().nullable().describe("Descripción tal como aparece en la carta, o null"),
      precio: z.number().nullable(),
      ingredientes: z.array(z.string()).describe("SOLO ingredientes que aparecen escritos en la carta; lista vacía si no se indican"),
      alergenos_declarados: z.array(z.enum(ALERGENOS_UE)).describe("SOLO si la carta los indica (texto o iconos)"),
    }),
  ),
});

const SISTEMA = `Eres un transcriptor de cartas de restaurante. Convierte la carta en una lista de platos.
- Transcribe fielmente: nombre, descripción y precio tal como aparecen. NO inventes ingredientes: si la carta no los detalla, deja la lista vacía (otro sistema los deducirá después).
- Copia los alérgenos solo si la carta los indica (con texto o iconos).
- Clasifica cada plato como Entrante (incluye tapas, raciones, ensaladas, sopas), Principal, Postre o Bebida. Omite las bebidas salvo cócteles o batidos con ingredientes relevantes.
- Si hay varias fotos, son páginas de la misma carta: no dupliques platos.
- Si no es una carta, devuelve es_carta=false y la lista vacía.`;

export type CartaExtraida = { platos: Plato[]; restaurante_nombre: string | null; aviso: string | null };

export async function extraerCarta(entrada: { imagenes?: { base64: string; mediaType: string }[]; texto?: string }): Promise<CartaExtraida> {
  const contenido: (TextPart | FilePart)[] = [
    { type: "text", text: entrada.texto?.trim() ? `Carta del restaurante:\n\n${entrada.texto.trim()}` : "Estas fotos son la carta del restaurante:" },
    ...(entrada.imagenes ?? []).map((img): FilePart => ({ type: "file", data: img.base64, mediaType: img.mediaType })),
  ];

  const { output } = await generateText({
    model: getModel(),
    output: Output.object({ schema: esquema }),
    system: SISTEMA,
    messages: [{ role: "user", content: contenido }],
  });

  if (!output.es_carta) {
    return { platos: [], restaurante_nombre: null, aviso: output.aviso ?? "No parece una carta de restaurante." };
  }

  const platos: Plato[] = output.platos.slice(0, 80).map((p) => ({
    id: crypto.randomUUID(),
    restaurante_id: "externo",
    nombre: p.nombre,
    categoria: p.categoria,
    descripcion: p.descripcion,
    precio: p.precio,
    ingredientes: p.ingredientes,
    alergenos_declarados: p.alergenos_declarados,
    // No sabemos qué admite la cocina: se deja que la IA valore las adaptaciones
    // y las formule como pregunta al camarero.
    permite_modificacion: true,
    nota_cocina: null,
  }));

  return { platos, restaurante_nombre: output.restaurante_nombre, aviso: output.aviso };
}
