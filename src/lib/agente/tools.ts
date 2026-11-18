/**
 * Las 4 herramientas del agente (sección 3.4 del documento de diseño).
 */
import { tool } from "ai";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import type { Plato, Restaurante } from "@/lib/supabase/types";
import { perfilSchema, firmaPerfil } from "@/lib/restricciones";
import { auditarCarta } from "@/lib/semaforo/auditoria";
import { normalizar } from "@/lib/semaforo/reglas";
import { buscarSemantico } from "@/lib/busqueda/semantica";

const PRECIO = ["", "€", "€€", "€€€"];

// ---------------------------------------------------------------------------
// 1. buscar_candidatos
// ---------------------------------------------------------------------------
export const buscar_candidatos = tool({
  description:
    "Busca restaurantes dentro del presupuesto y los ordena por afinidad con lo que les apetece. Usa búsqueda SEMÁNTICA (por significado: 'algo ligero y asiático' encuentra sushi o poke) sobre la ficha y los platos de cada local; 'plato_coincidente' indica el plato que mejor encaja. La búsqueda semántica no entiende negaciones ('nada de fritos'): aplica tú esos vetos. Devuelve candidatos SIN auditar la carta.",
  inputSchema: z.object({
    presupuesto_max: z.number().int().min(1).max(3).describe("1=€, 2=€€, 3=€€€"),
    preferencias_texto: z.string().describe("Lo que les apetece, en positivo, p.ej. 'italiana o tapas'. Cadena vacía si no hay preferencia."),
  }),
  execute: async ({ presupuesto_max, preferencias_texto }) => {
    const { data, error } = await supabaseServer()
      .from("restaurantes")
      .select("id, nombre, tipo_cocina, rango_precio, direccion, descripcion, patrocinado, latitud, longitud")
      .lte("rango_precio", presupuesto_max);
    if (error) return { error: error.message };

    // 1º búsqueda semántica (pgvector); si no está disponible, afinidad por palabras clave
    const semantica = await buscarSemantico(preferencias_texto, presupuesto_max, 50);
    const porId = new Map(semantica?.map((s) => [s.restaurante_id, s]));
    const palabras = normalizar(preferencias_texto).split(/[^a-z]+/).filter((w) => w.length > 3);

    const candidatos = (data as Restaurante[])
      .map((r) => {
        const s = porId.get(r.id);
        const afinidad = semantica
          ? (s?.similitud ?? 0)
          : palabras.filter((w) => normalizar(`${r.nombre} ${r.tipo_cocina} ${r.descripcion ?? ""}`).includes(w.slice(0, 5))).length;
        return {
          id: r.id, nombre: r.nombre, cocina: r.tipo_cocina, precio: PRECIO[r.rango_precio], direccion: r.direccion,
          descripcion: r.descripcion, patrocinado: r.patrocinado, latitud: r.latitud, longitud: r.longitud,
          afinidad, plato_coincidente: s?.plato_coincidente ?? null,
        };
      })
      .sort((a, b) => b.afinidad - a.afinidad || Number(b.patrocinado) - Number(a.patrocinado));

    return { total: candidatos.length, busqueda: semantica ? "semantica" : "palabras", candidatos };
  },
});

// ---------------------------------------------------------------------------
// 2. auditar_carta_grupo
// ---------------------------------------------------------------------------
export const auditar_carta_grupo = tool({
  description:
    "Audita TODA la carta de un restaurante para cada comensal y la clasifica en semáforo: verde (apto), amarillo (apto con modificación, con instrucción para el camarero) y rojo (no recomendado, con motivo). Devuelve también el % de encaje del grupo.",
  inputSchema: z.object({
    restaurante_id: z.string().uuid(),
    lista_perfiles: z.array(perfilSchema).min(1),
  }),
  execute: async ({ restaurante_id, lista_perfiles }) => {
    const db = supabaseServer();
    const [{ data: rest }, { data: platos, error }] = await Promise.all([
      db.from("restaurantes").select("nombre").eq("id", restaurante_id).single(),
      db.from("platos").select("*").eq("restaurante_id", restaurante_id),
    ]);
    if (error || !platos?.length) return { error: error?.message ?? "Restaurante sin platos" };

    const a = await auditarCarta(platos as Plato[], lista_perfiles);

    // Resumen compacto para el modelo (la UI usará la auditoría completa)
    return {
      restaurante_id,
      restaurante: rest?.nombre,
      encaje_pct: a.encaje_pct,
      comensales: a.comensales.map((c) => ({
        nombre: c.nombre,
        restricciones: c.restricciones,
        tiene_principal_apto: c.cubierto,
        aptos: c.verdes.map((v) => `${v.plato} (${v.categoria})`),
        con_modificacion: c.amarillos.map((v) => ({ plato: v.plato, categoria: v.categoria, instruccion: v.instruccion })),
        no_recomendados: c.rojos.map((v) => ({ plato: v.plato, motivo: v.motivo })),
      })),
    };
  },
});

// ---------------------------------------------------------------------------
// 3. consultar_experiencia_previa
// ---------------------------------------------------------------------------
export const consultar_experiencia_previa = tool({
  description:
    "Consulta la memoria colectiva: qué restaurantes eligieron antes grupos con restricciones iguales o parecidas, y cuántas veces.",
  inputSchema: z.object({
    firma_perfil: z.string().describe("Restricciones del grupo ordenadas y unidas con '+', p.ej. 'embarazo+sin_gluten+vegetariano'"),
  }),
  execute: async ({ firma_perfil }) => {
    const { data, error } = await supabaseServer()
      .from("historial_elecciones")
      .select("firma_perfil, contador_selecciones, restaurante_id, restaurantes(nombre)")
      .order("contador_selecciones", { ascending: false });
    if (error) return { error: error.message };

    const grupo = new Set(firma_perfil.split("+"));
    const resultados = (data ?? [])
      .map((h) => {
        const partes = h.firma_perfil.split("+");
        const comunes = partes.filter((p: string) => grupo.has(p)).length;
        const coincidencia = h.firma_perfil === firma_perfil ? "exacta" : comunes > 0 ? "parcial" : null;
        const nombre = (h.restaurantes as unknown as { nombre: string } | null)?.nombre;
        return coincidencia && { restaurante_id: h.restaurante_id, restaurante: nombre, firma_perfil: h.firma_perfil, veces_elegido: h.contador_selecciones, coincidencia };
      })
      .filter(Boolean);

    return { firma_consultada: firma_perfil, resultados };
  },
});

// ---------------------------------------------------------------------------
// 4. registrar_feedback_eleccion
// ---------------------------------------------------------------------------
export const registrar_feedback_eleccion = tool({
  description:
    "Registra que el grupo ha confirmado este restaurante (memoria colectiva). Úsala SOLO cuando el usuario confirme explícitamente su elección.",
  inputSchema: z.object({
    firma_perfil: z.string(),
    restaurante_id: z.string().uuid(),
    platos_elegidos: z.array(z.string().uuid()).describe("IDs de platos validados; puede ser vacío"),
  }),
  execute: async ({ firma_perfil, restaurante_id, platos_elegidos }) => {
    const { data, error } = await supabaseServer().rpc("registrar_eleccion", {
      p_firma_perfil: firma_perfil,
      p_restaurante_id: restaurante_id,
      p_platos: platos_elegidos,
    });
    if (error) return { error: error.message };
    return { ok: true, veces_elegido: data.contador_selecciones };
  },
});

export const herramientas = {
  buscar_candidatos,
  auditar_carta_grupo,
  consultar_experiencia_previa,
  registrar_feedback_eleccion,
};

export { firmaPerfil };
