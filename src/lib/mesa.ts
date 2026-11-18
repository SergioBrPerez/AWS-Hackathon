/**
 * Configuración de la "mesa" (grupo) en el cliente: tipos, persistencia en
 * localStorage (perfiles recientes) y conversión a mensaje para el agente.
 */
import { ETIQUETAS, type Restriccion } from "@/lib/restricciones";

export type Comensal = { id: string; nombre: string; restricciones: Restriccion[] };
export type Mesa = { comensales: Comensal[]; presupuesto: 1 | 2 | 3; preferencias: string };

const CLAVE = "agent-locally:ultima-mesa";

export const nuevoComensal = (n: number): Comensal => ({
  id: crypto.randomUUID(),
  nombre: n === 1 ? "Yo" : `Comensal ${n}`,
  restricciones: [],
});

export const mesaInicial = (): Mesa => ({ comensales: [nuevoComensal(1)], presupuesto: 2, preferencias: "" });

export function guardarMesa(m: Mesa) {
  try { localStorage.setItem(CLAVE, JSON.stringify(m)); } catch { /* sin almacenamiento: no pasa nada */ }
}

export function cargarMesa(): Mesa | null {
  try {
    const raw = localStorage.getItem(CLAVE);
    return raw ? (JSON.parse(raw) as Mesa) : null;
  } catch { return null; }
}

export const PRECIO = ["", "€", "€€", "€€€"] as const;

/** Resumen corto, p.ej. "3 comensales · Sin gluten, Embarazo · €€" */
export function resumenMesa(m: Mesa) {
  const r = [...new Set(m.comensales.flatMap((c) => c.restricciones))].map((x) => ETIQUETAS[x]);
  const n = m.comensales.length;
  return `${n} ${n === 1 ? "comensal" : "comensales"}${r.length ? ` · ${r.join(", ")}` : ""} · ${PRECIO[m.presupuesto]}`;
}

/** Mensaje en lenguaje natural + datos exactos para el agente. */
export function mesaAPrompt(m: Mesa) {
  const lineas = m.comensales.map((c) =>
    `- ${c.nombre}: ${c.restricciones.length ? c.restricciones.join(", ") : "sin restricciones"}`);
  return [
    `Somos ${m.comensales.length} ${m.comensales.length === 1 ? "persona" : "personas"}:`,
    ...lineas,
    `Presupuesto máximo: ${m.presupuesto} (${PRECIO[m.presupuesto]}).`,
    m.preferencias.trim() ? `Preferencias: ${m.preferencias.trim()}` : "Sin preferencias concretas de cocina.",
    "Recomiéndanos dónde ir.",
  ].join("\n");
}
