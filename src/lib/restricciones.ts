import { z } from "zod";

/** Restricciones que ofrece la UI como chips (pantalla 2 del diseño). */
export const RESTRICCIONES = [
  "vegetariano",
  "vegano",
  "sin_gluten",
  "sin_lactosa",
  "embarazo",
  "frutos_secos",
  "marisco",
] as const;

export type Restriccion = (typeof RESTRICCIONES)[number];

export const ETIQUETAS: Record<Restriccion, string> = {
  vegetariano: "Vegetariano",
  vegano: "Vegano",
  sin_gluten: "Sin gluten",
  sin_lactosa: "Sin lactosa",
  embarazo: "Embarazo",
  frutos_secos: "Alergia frutos secos",
  marisco: "Alergia marisco",
};

export const perfilSchema = z.object({
  nombre: z.string().describe("Nombre o alias del comensal, p.ej. 'Ana' o 'Comensal 1'"),
  restricciones: z.array(z.enum(RESTRICCIONES)),
});

export type Perfil = z.infer<typeof perfilSchema>;

/**
 * Firma normalizada del grupo para la memoria colectiva:
 * restricciones únicas, ordenadas y unidas con '+'. Ej: "embarazo+sin_gluten".
 */
export function firmaPerfil(perfiles: Pick<Perfil, "restricciones">[]): string {
  const todas = new Set(perfiles.flatMap((p) => p.restricciones));
  return todas.size ? [...todas].sort().join("+") : "sin_restricciones";
}
