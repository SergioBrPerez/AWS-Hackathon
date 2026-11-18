import { z } from "zod";
import { perfilSchema } from "@/lib/restricciones";
import { auditarCarta } from "@/lib/semaforo/auditoria";
import { supabaseServer } from "@/lib/supabase/server";
import type { Plato, Restaurante } from "@/lib/supabase/types";

export const maxDuration = 60;

const platoSchema = z.object({
  id: z.string(),
  restaurante_id: z.string(),
  nombre: z.string().max(200),
  categoria: z.enum(["Entrante", "Principal", "Postre", "Bebida"]),
  descripcion: z.string().max(1000).nullable(),
  precio: z.number().nullable(),
  ingredientes: z.array(z.string().max(200)).max(60),
  alergenos_declarados: z.array(z.string()).max(14),
  permite_modificacion: z.boolean(),
  nota_cocina: z.string().max(500).nullable(),
});

const cuerpo = z.object({
  perfiles: z.array(perfilSchema).min(1).max(12),
  restaurante_id: z.string().uuid().optional(),
  platos: z.array(platoSchema).max(80).optional(),
});

/** Carta semáforo completa: de un restaurante de la BD o de platos ya extraídos. */
export async function POST(req: Request) {
  const parsed = cuerpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Petición no válida" }, { status: 400 });
  const { perfiles, restaurante_id } = parsed.data;

  let platos = parsed.data.platos as Plato[] | undefined;
  let restaurante: Restaurante | null = null;

  if (restaurante_id) {
    const db = supabaseServer();
    const [r, p] = await Promise.all([
      db.from("restaurantes").select("*").eq("id", restaurante_id).single(),
      db.from("platos").select("*").eq("restaurante_id", restaurante_id),
    ]);
    if (r.error || !r.data) return Response.json({ error: "Restaurante no encontrado" }, { status: 404 });
    restaurante = r.data as Restaurante;
    platos = p.data as Plato[];
  }
  if (!platos?.length) return Response.json({ error: "No hay platos que revisar" }, { status: 400 });

  const auditoria = await auditarCarta(platos, perfiles);
  return Response.json({ restaurante, auditoria, platos });
}
