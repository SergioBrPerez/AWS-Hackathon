import { buscarSemantico } from "@/lib/busqueda/semantica";

/**
 * Margen respecto al mejor resultado: gte-small da puntuaciones muy juntas
 * (0,80-0,90), así que solo mostramos lo que está casi igual de cerca que el
 * primero. Evita "relleno" como Hummus al buscar "ramen".
 */
const MARGEN = 0.025;

/** Búsqueda por significado para el buscador del Modo 2: GET /api/buscar?q=algo+asiatico */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 200) ?? "";
  if (q.length < 3) return Response.json({ disponible: true, resultados: [] });
  const resultados = await buscarSemantico(q, 3, 5);
  if (!resultados) return Response.json({ disponible: false, resultados: [] });
  const mejor = resultados[0]?.similitud ?? 0;
  return Response.json({ disponible: true, resultados: resultados.filter((r) => r.similitud >= mejor - MARGEN).slice(0, 3) });
}
