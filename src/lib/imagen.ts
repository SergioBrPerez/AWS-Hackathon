/**
 * Comprime una foto en el navegador antes de enviarla (las de móvil pesan
 * 3-8 MB; el modelo lee igual de bien una de ~1600 px en JPEG).
 */
export type ImagenCarta = { base64: string; mediaType: "image/jpeg"; preview: string };

const LADO_MAX = 1600;

export async function comprimirImagen(file: File): Promise<ImagenCarta> {
  const bitmap = await createImageBitmap(file);
  const escala = Math.min(1, LADO_MAX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const preview = canvas.toDataURL("image/jpeg", 0.82);
  return { base64: preview.split(",")[1], mediaType: "image/jpeg", preview };
}
