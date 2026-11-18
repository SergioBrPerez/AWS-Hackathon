// Calcula y guarda los embeddings (gte-small, 384 dim.) de restaurantes y platos.
// Uso: npm run embeddings            (solo los que no tienen)
//      npm run embeddings -- --todos (recalcula todos, p.ej. si cambian las cartas)
import { aVector, embeber, textoPlato, textoRestaurante } from "@/lib/embeddings";
import { supabaseServer } from "@/lib/supabase/server";
import type { Plato, Restaurante } from "@/lib/supabase/types";

const todos = process.argv.includes("--todos");
const db = supabaseServer();
const [{ data: rs }, { data: ps }] = await Promise.all([
  db.from("restaurantes").select("*"),
  db.from("platos").select("*"),
]);
const restaurantes = (rs ?? []) as (Restaurante & { embedding: string | null })[];
const platos = (ps ?? []) as (Plato & { embedding: string | null })[];

const pendR = restaurantes.filter((r) => todos || !r.embedding);
const pendP = platos.filter((p) => todos || !p.embedding);
console.log(`🧮 ${pendR.length} restaurantes y ${pendP.length} platos por calcular`);

const t = Date.now();
const vR = await embeber(pendR.map((r) => textoRestaurante(r, platos.filter((p) => p.restaurante_id === r.id))), 60_000);
const vP = await embeber(pendP.map(textoPlato), 60_000);
console.log(`✅ Embeddings calculados en ${((Date.now() - t) / 1000).toFixed(1)} s (dimensión ${vR[0]?.length ?? vP[0]?.length ?? "?"})`);

let errores = 0;
await Promise.all([
  ...pendR.map(async (r, i) => { const { error } = await db.from("restaurantes").update({ embedding: aVector(vR[i]) }).eq("id", r.id); if (error) { errores++; console.error(r.nombre, error.message); } }),
  ...pendP.map(async (p, i) => { const { error } = await db.from("platos").update({ embedding: aVector(vP[i]) }).eq("id", p.id); if (error) { errores++; console.error(p.nombre, error.message); } }),
]);
console.log(errores ? `⚠️ ${errores} errores al guardar` : "💾 Guardados en Supabase");
