// Prueba la búsqueda por significado con varias consultas.
// Uso: npm run semantica                      (consultas de ejemplo)
//      npm run semantica -- "algo para celebrar un cumpleaños"
import { buscarSemantico } from "@/lib/busqueda/semantica";
import { supabaseServer } from "@/lib/supabase/server";

const consultas = process.argv.slice(2).length ? [process.argv.slice(2).join(" ")] : [
  "algo ligero y asiático", "comida de cuchara de la abuela", "pasta", "picante", "un buen trozo de carne",
  "vegano", "postre con chocolate", "pescado crudo", "quesos franceses", "ramen",
];
const { data } = await supabaseServer().from("restaurantes").select("id, nombre");
const nombre = new Map((data ?? []).map((r) => [r.id, r.nombre]));

for (const q of consultas) {
  const res = await buscarSemantico(q, 3, 3);
  if (!res) { console.log(`❌ "${q}": búsqueda semántica no disponible`); continue; }
  console.log(`\n🔎 "${q}"`);
  for (const r of res) console.log(`   ${r.similitud.toFixed(3)}  ${nombre.get(r.restaurante_id)}${r.plato_coincidente ? `  (por: ${r.plato_coincidente})` : ""}`);
}
