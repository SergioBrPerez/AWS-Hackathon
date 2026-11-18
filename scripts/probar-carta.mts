// Lee una carta (foto o texto) y muestra el semáforo para un grupo de prueba.
// Uso: npm run carta -- ruta/a/foto.jpg [otra-pagina.jpg]
//      npm run carta -- ruta/a/carta.txt
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { extraerCarta } from "@/lib/semaforo/extraer";
import { auditarCarta } from "@/lib/semaforo/auditoria";
import type { Perfil } from "@/lib/restricciones";

const rutas = process.argv.slice(2);
if (!rutas.length) { console.log("Uso: npm run carta -- foto.jpg | carta.txt"); process.exit(1); }

const tipos: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const imagenes = rutas.filter((r) => tipos[extname(r).toLowerCase()]).map((r) => ({ base64: readFileSync(r).toString("base64"), mediaType: tipos[extname(r).toLowerCase()] }));
const texto = rutas.filter((r) => !tipos[extname(r).toLowerCase()]).map((r) => readFileSync(r, "utf8")).join("\n");

const perfiles: Perfil[] = [
  { nombre: "Ana", restricciones: ["sin_gluten"] },
  { nombre: "Bea", restricciones: ["embarazo", "vegetariano"] },
];

let t = Date.now();
const carta = await extraerCarta({ imagenes, texto });
console.log(`\n📷 Leída en ${((Date.now() - t) / 1000).toFixed(1)} s · ${carta.platos.length} platos · restaurante: ${carta.restaurante_nombre ?? "?"}${carta.aviso ? ` · aviso: ${carta.aviso}` : ""}`);
for (const p of carta.platos) console.log(`   - [${p.categoria}] ${p.nombre}${p.precio ? ` (${p.precio} €)` : ""}${p.ingredientes.length ? ` · ${p.ingredientes.join(", ")}` : ""}${p.alergenos_declarados.length ? ` · alérgenos: ${p.alergenos_declarados.join(", ")}` : ""}`);

t = Date.now();
const a = await auditarCarta(carta.platos, perfiles);
console.log(`\n🚦 Auditada en ${((Date.now() - t) / 1000).toFixed(1)} s · encaje ${a.encaje_pct}%`);
for (const c of a.comensales) {
  console.log(`\n👤 ${c.nombre} (${c.restricciones.join(", ")})`);
  for (const v of c.verdes) console.log(`   🟢 ${v.plato}${v.fuente === "ia" ? " · IA" : ""}`);
  for (const v of c.amarillos) console.log(`   🟡 ${v.plato} → ${v.instruccion}`);
  for (const v of c.rojos) console.log(`   🔴 ${v.plato}: ${v.motivo}`);
}
