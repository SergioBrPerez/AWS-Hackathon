import { z } from "zod";
import { firmaPerfil, perfilSchema } from "@/lib/restricciones";
import { supabaseServer } from "@/lib/supabase/server";

const cuerpo = z.object({
  perfiles: z.array(perfilSchema).min(1).max(12),
  restaurante_id: z.string().uuid(),
  platos: z.array(z.string().uuid()).max(80).default([]),
});

/** Botón "Confirmar elección de este sitio": alimenta la memoria colectiva. */
export async function POST(req: Request) {
  const parsed = cuerpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Petición no válida" }, { status: 400 });
  const { perfiles, restaurante_id, platos } = parsed.data;
  const firma = firmaPerfil(perfiles);

  const { data, error } = await supabaseServer().rpc("registrar_eleccion", {
    p_firma_perfil: firma,
    p_restaurante_id: restaurante_id,
    p_platos: platos,
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ firma_perfil: firma, veces_elegido: data.contador_selecciones });
}
