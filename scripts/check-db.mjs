// Comprueba la conexión con Supabase y que todo lo que usa la app está en su sitio:
// claves, tablas con datos, funciones SQL, Edge Function "embed" y embeddings.
// Uso: npm run db:check
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const pub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const sec = process.env.SUPABASE_SECRET_KEY ?? "";

let ok = true;
const check = (bien, msg, arreglo, obligatorio = true) => {
  console.log(`${bien ? "✅" : obligatorio ? "❌" : "⚪"} ${msg}`);
  if (!bien && arreglo) console.log(`   → ${arreglo}`);
  if (!bien && obligatorio) ok = false;
};

// 1. Claves
check(/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url), "NEXT_PUBLIC_SUPABASE_URL con formato https://<id>.supabase.co", "Settings > General > Project ID  →  https://<ID>.supabase.co");
check(pub.startsWith("sb_publishable_"), "Publishable key empieza por sb_publishable_", "Settings > API Keys > Publishable key");
check(sec.startsWith("sb_secret_"), "Secret key empieza por sb_secret_", "Settings > API Keys > Secret keys");
if (!ok) process.exit(1);

// 2. Tablas (lectura pública)
const db = createClient(url, pub);
for (const [tabla, min] of [["restaurantes", 1], ["platos", 1], ["historial_elecciones", 0]]) {
  const { count, error } = await db.from(tabla).select("*", { count: "exact", head: true });
  if (error) check(false, `Tabla ${tabla}: ${error.message}`, "Ejecuta supabase/migrations/0001_esquema_inicial.sql en el SQL Editor");
  else check(count >= min, `Tabla ${tabla}: ${count} filas`, "Ejecuta supabase/seed.sql en el SQL Editor");
}

// 3. Escritura de la memoria colectiva (clave secreta)
const admin = createClient(url, sec, { auth: { persistSession: false } });
const { data: uno } = await admin.from("restaurantes").select("id").limit(1).single();
if (uno) {
  const { error } = await admin.rpc("registrar_eleccion", { p_firma_perfil: "__test__", p_restaurante_id: uno.id, p_platos: [] });
  check(!error, "Función registrar_eleccion (memoria colectiva)", error?.message);
  await admin.from("historial_elecciones").delete().eq("firma_perfil", "__test__");
}

// 4. Búsqueda semántica (opcional: sin ella la app busca por palabras)
console.log("\nBúsqueda semántica (opcional):");
const r = await fetch(`${url.replace(/\/$/, "")}/functions/v1/embed`, {
  method: "POST",
  headers: { "Content-Type": "application/json", apikey: sec, Authorization: `Bearer ${sec}` },
  body: JSON.stringify({ textos: ["prueba"] }),
}).catch(() => null);
const vector = r?.ok ? (await r.json()).embeddings?.[0] : null;
check(vector?.length === 384, "Edge Function \"embed\" responde", "Crea la Edge Function (ver README, Puesta en marcha)", false);

const [{ count: conR }, { count: totalR }, { count: conP }, { count: totalP }] = await Promise.all([
  admin.from("restaurantes").select("*", { count: "exact", head: true }).not("embedding", "is", null),
  admin.from("restaurantes").select("*", { count: "exact", head: true }),
  admin.from("platos").select("*", { count: "exact", head: true }).not("embedding", "is", null),
  admin.from("platos").select("*", { count: "exact", head: true }),
]);
check(conR === totalR && conP === totalP, `Embeddings: ${conR}/${totalR} restaurantes y ${conP}/${totalP} platos`, "Ejecuta npm run embeddings", false);

if (vector) {
  const { error } = await admin.rpc("buscar_semantico", { consulta: `[${vector.join(",")}]`, presupuesto_max: 3, limite: 1 });
  check(!error, "Función SQL buscar_semantico", error ? `${error.message} → ejecuta supabase/migrations/0002_busqueda_semantica.sql` : undefined, false);
}

console.log(ok ? "\n🎉 Base de datos lista" : "\n⚠️  Revisa los puntos marcados con ❌");
process.exit(ok ? 0 : 1);
