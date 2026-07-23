import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Compresión de fotos de fichas ANTES de subirlas.
 *
 * En campo hay poca señal: las fotos originales de las tablets (8-12MP,
 * varios MB) tardaban demasiado o fallaban por timeout. Redimensionamos al
 * lado mayor MAX_DIMENSION y recomprimimos a JPEG calidad JPEG_QUALITY —
 * suficiente para fotos de evaluación técnica y del PDF, y reduce el peso
 * típico a ~200-500KB.
 *
 * Se aplica en el punto de CAPTURA (PhotoPicker y detalle de ficha), de modo
 * que la URI que viaja por el flujo (subida online, cola offline en
 * offline-queue.ts) ya es la comprimida. El cache de imágenes remotas
 * (lib/image-cache.ts) no se toca: opera sobre URLs http del servidor.
 */

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.7;

/**
 * Devuelve la URI local de la foto comprimida. Si `width`/`height` están
 * disponibles (los assets de expo-image-picker los traen) y el lado mayor ya
 * es <= MAX_DIMENSION, no se redimensiona (solo se recomprime a JPEG).
 * Si algo falla, devuelve la URI original para no bloquear al técnico.
 */
export async function compressPhoto(
  uri: string,
  width?: number,
  height?: number,
): Promise<string> {
  try {
    const context = ImageManipulator.manipulate(uri);

    const largest = Math.max(width ?? 0, height ?? 0);
    if (largest === 0 || largest > MAX_DIMENSION) {
      // resize con un solo lado preserva la relación de aspecto.
      if ((width ?? 0) >= (height ?? 0)) {
        context.resize({ width: Math.min(largest || MAX_DIMENSION, MAX_DIMENSION) });
      } else {
        context.resize({ height: Math.min(largest, MAX_DIMENSION) });
      }
    }

    const image = await context.renderAsync();
    try {
      const result = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
      return result.uri;
    } finally {
      image.release();
    }
  } catch {
    // Mejor subir la foto original que perderla.
    return uri;
  }
}
