// Comprueba la conexión con Supabase y que la Fase 1 está cargada.
// Uso: npm run db:check
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const pub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const sec = process.env.SUPABASE_SECRET_KEY ?? "";

const ok = (b, msg, fix) => { console.log(`${b ? "✅" : "❌"} ${msg}`); if (!b && fix) console.log(`   → ${fix}`); return b; };

let good = true;
good &= ok(/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url), "NEXT_PUBLIC_SUPABASE_URL con formato https://<id>.supabase.co", "Settings > General > Project ID  →  https://<ID>.supabase.co");
good &= ok(pub.startsWith("sb_publishable_"), "Publishable key empieza por sb_publishable_", "Settings > API Keys > Publishable key");
good &= ok(sec.startsWith("sb_secret_"), "Secret key empieza por sb_secret_", "Settings > API Keys > Secret keys");
if (!good) process.exit(1);

const db = createClient(url, pub);
for (const [tabla, min] of [["restaurantes", 12], ["platos", 70], ["historial_elecciones", 1]]) {
  const { count, error } = await db.from(tabla).select("*", { count: "exact", head: true });
  if (error) { ok(false, `Tabla ${tabla}: ${error.message}`, "¿Has ejecutado supabase/migrations/0001_esquema_inicial.sql en el SQL Editor?"); good = false; continue; }
  good &= ok(count >= min, `Tabla ${tabla}: ${count} filas`, "Ejecuta supabase/seed.sql en el SQL Editor");
}

const admin = createClient(url, sec, { auth: { persistSession: false } });
const { error: rpcErr } = await admin.rpc("registrar_eleccion", { p_firma_perfil: "__test__", p_restaurante_id: "00000000-0000-4000-a000-000000000001", p_platos: [] });
good &= ok(!rpcErr, "Función registrar_eleccion (escritura con clave secreta)", rpcErr?.message);
await admin.from("historial_elecciones").delete().eq("firma_perfil", "__test__");

console.log(good ? "\n🎉 Fase 1 lista" : "\n⚠️  Revisa los puntos marcados con ❌");
process.exit(good ? 0 : 1);
