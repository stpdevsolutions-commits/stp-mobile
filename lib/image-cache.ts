import * as FileSystem from 'expo-file-system/legacy';
import { getAccessToken, refreshAccessToken } from './api';

/**
 * Cache de fotos de fichas.
 *
 * El servidor sirve las fotos en `GET /files/{id}/download`, protegido por
 * `JwtAuthGuard`. El componente `<Image>` de React Native NO envía el header
 * `Authorization`, así que la descarga directa falla (recuadros rotos) y el
 * PDF de `expo-print` tampoco puede cargarlas.
 *
 * Solución CLIENT-SIDE (sin tocar el backend): descargamos cada foto enviando
 * el token Bearer y la guardamos en el sistema de archivos local; luego se
 * renderiza el `file://` cacheado. Se reutiliza la caché entre montajes para
 * no volver a descargar.
 *
 * Nota: usamos `FileSystem.downloadAsync` con el header `Authorization` en vez
 * de axios porque descarga binario directo a disco (streaming) de forma
 * fiable; el token se obtiene del mismo `SecureStore` que usa el interceptor
 * de axios en `lib/api.ts`, de modo que la autenticación es equivalente.
 */

const CACHE_DIR = `${FileSystem.cacheDirectory ?? ''}ficha-photos/`;

let dirReady = false;
async function ensureDir() {
  if (dirReady) return;
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
  dirReady = true;
}

/** Deriva un nombre de archivo estable a partir de la URL remota. */
function cacheKey(url: string): string {
  const match = url.match(/\/files\/([^/?#]+)\/download/);
  if (match) return match[1];
  // Fallback: sanea la URL completa para usarla como nombre de archivo.
  return url.replace(/[^a-zA-Z0-9]/g, '_').slice(-120);
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Coalesce descargas concurrentes de la misma URL en una sola promesa.
const inFlight = new Map<string, Promise<string | null>>();

/**
 * Devuelve un `file://` local cacheado para una foto remota, descargándola
 * con el token si aún no existe. Devuelve `null` si la descarga falla.
 * Las URIs que ya son locales (`file://`) se devuelven tal cual.
 */
export async function getCachedPhotoUri(remoteUrl: string): Promise<string | null> {
  if (!remoteUrl) return null;
  if (remoteUrl.startsWith('file://') || remoteUrl.startsWith('data:')) return remoteUrl;

  const existing = inFlight.get(remoteUrl);
  if (existing) return existing;

  const task = (async (): Promise<string | null> => {
    try {
      await ensureDir();
      const localUri = `${CACHE_DIR}${cacheKey(remoteUrl)}.jpg`;

      const info = await FileSystem.getInfoAsync(localUri);
      if (info.exists && info.size > 0) return localUri;

      const headers = await authHeaders();
      let res = await FileSystem.downloadAsync(remoteUrl, localUri, { headers });

      // FileSystem.downloadAsync no pasa por el interceptor de axios: si el
      // access token expiró (401), renovamos con el refresh token (mismo mutex
      // que lib/api.ts) y reintentamos la descarga una vez.
      if (res.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          res = await FileSystem.downloadAsync(remoteUrl, localUri, {
            headers: { Authorization: `Bearer ${newToken}` },
          });
        }
      }
      if (res.status >= 200 && res.status < 300) return localUri;

      await FileSystem.deleteAsync(localUri, { idempotent: true });
      return null;
    } catch {
      return null;
    } finally {
      inFlight.delete(remoteUrl);
    }
  })();

  inFlight.set(remoteUrl, task);
  return task;
}

/**
 * Devuelve la foto como data URI base64 (`data:image/jpeg;base64,...`) para
 * poder embeberla en el HTML del PDF, donde `<img src>` remoto tampoco puede
 * autenticarse. Reutiliza la caché local. Devuelve `null` si falla.
 */
export async function getPhotoDataUri(remoteUrl: string): Promise<string | null> {
  if (remoteUrl.startsWith('data:')) return remoteUrl;
  const local = await getCachedPhotoUri(remoteUrl);
  if (!local) return null;
  try {
    const b64 = await FileSystem.readAsStringAsync(local, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/jpeg;base64,${b64}`;
  } catch {
    return null;
  }
}
