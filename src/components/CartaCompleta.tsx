import type { Plato } from "@/lib/supabase/types";

const CATEGORIAS: Plato["categoria"][] = ["Entrante", "Principal", "Postre", "Bebida"];
const TITULO: Record<Plato["categoria"], string> = { Entrante: "Entrantes", Principal: "Principales", Postre: "Postres", Bebida: "Bebidas" };

const ALERGENO: Record<string, string> = {
  gluten: "🌾 Gluten", crustaceos: "🦐 Crustáceos", huevo: "🥚 Huevo", pescado: "🐟 Pescado", cacahuete: "🥜 Cacahuete",
  soja: "🫘 Soja", lacteos: "🥛 Lácteos", frutos_secos: "🌰 Frutos secos", apio: "🥬 Apio", mostaza: "🟡 Mostaza",
  sesamo: "⚪ Sésamo", sulfitos: "🍷 Sulfitos", altramuces: "🫛 Altramuces", moluscos: "🐙 Moluscos",
};

/** La carta tal cual, sin filtrar: platos por categoría con precio, descripción y alérgenos declarados. */
export function CartaCompleta({ platos }: { platos: Plato[] }) {
  return (
    <div className="flex flex-col gap-4">
      {CATEGORIAS.map((cat) => {
        const lista = platos.filter((p) => p.categoria === cat);
        if (!lista.length) return null;
        return (
          <section key={cat} className="rounded-2xl border border-line bg-card">
            <h3 className="px-4 pb-2 pt-4 text-sm font-semibold uppercase tracking-wide text-muted">{TITULO[cat]}</h3>
            <ul className="divide-y divide-line">
              {lista.map((p) => (
                <li key={p.id} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 font-medium">{p.nombre}</p>
                    {p.precio != null && <span className="shrink-0 text-sm font-medium">{Number(p.precio).toFixed(2).replace(".", ",")} €</span>}
                  </div>
                  {p.descripcion && <p className="mt-0.5 text-sm text-muted">{p.descripcion}</p>}
                  {p.alergenos_declarados.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.alergenos_declarados.map((a) => (
                        <span key={a} className="rounded-full bg-background px-2 py-0.5 text-xs text-muted ring-1 ring-line">{ALERGENO[a] ?? a}</span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
