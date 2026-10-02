import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { api } from './api';

const QUEUE_KEY = 'stp_offline_queue';

export interface QueuedFicha {
  id: string;
  type: string;
  projectId: string;
  data: Record<string, unknown>;
  latitude: number | null;
  longitude: number | null;
  photos: string[];
  signature: string;
  submit: boolean;
  createdAt: string;
  /** Id de la ficha ya creada en el servidor: si el envío falló después de
   *  crearla, el reintento solo repite el envío y no la duplica. */
  fichaId?: string;
}

// Todas las escrituras de la cola pasan por esta cadena: son leer-modificar-
// escribir sobre una sola clave, y sin serializarlas una ficha guardada
// mientras se sincroniza (o dos escrituras a la vez) se pisaba y se perdía.
let writeChain: Promise<unknown> = Promise.resolve();
function withQueueLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.catch(() => undefined);
  return run;
}

async function saveQueue(queue: QueuedFicha[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueue(item: Omit<QueuedFicha, 'id' | 'createdAt'>): Promise<string> {
  return withQueueLock(async () => {
    const queue = await getQueue();
    const entry: QueuedFicha = {
      ...item,
      id: Math.random().toString(36).slice(2, 11),
      createdAt: new Date().toISOString(),
    };
    queue.push(entry);
    await saveQueue(queue);
    return entry.id;
  });
}

function patchItem(id: string, patch: Partial<QueuedFicha>): Promise<void> {
  return withQueueLock(async () => {
    const queue = await getQueue();
    const i = queue.findIndex((q) => q.id === id);
    if (i < 0) return;
    queue[i] = { ...queue[i], ...patch };
    await saveQueue(queue);
  });
}

function removeItem(id: string): Promise<void> {
  return withQueueLock(async () => {
    const queue = await getQueue();
    await saveQueue(queue.filter((q) => q.id !== id));
  });
}

export async function getQueue(): Promise<QueuedFicha[]> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedFicha[]) : [];
  } catch {
    // Cola ilegible: se guarda una copia antes de seguir, porque la próxima
    // ficha que se encole escribiría encima y se perdería para siempre.
    if (raw) {
      try {
        await AsyncStorage.setItem(`${QUEUE_KEY}_corrupta_${Date.now()}`, raw);
      } catch {
        // sin espacio: no hay nada más que hacer
      }
    }
    return [];
  }
}

export async function getPendingCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.stpsoluciones.com';

const esRemota = (uri: string) => uri.startsWith('http://') || uri.startsWith('https://');

/**
 * Sube las fotos locales y devuelve las URLs. Si una subida falla LANZA el
 * error: antes se ignoraba en silencio, la ficha se creaba sin esa foto y se
 * sacaba de la cola, así que la foto se perdía para siempre. Cada foto
 * subida se guarda en la cola al momento, para que un reintento no las suba
 * otra vez.
 */
async function uploadLocalPhotos(item: QueuedFicha): Promise<string[]> {
  const fotos = [...item.photos];
  for (let i = 0; i < fotos.length; i++) {
    const uri = fotos[i];
    if (esRemota(uri)) continue;

    // Si el archivo ya no existe (el sistema limpió la caché) reintentar no
    // lo va a recuperar: se descarta esa foto en vez de trabar la ficha.
    const info = await FileSystem.getInfoAsync(uri).catch(() => null);
    if (info && !info.exists) {
      fotos.splice(i, 1);
      i--;
      await patchItem(item.id, { photos: fotos });
      continue;
    }

    const formData = new FormData();
    formData.append('file', { uri, name: 'foto.jpg', type: 'image/jpeg' } as unknown as Blob);
    const { data } = await api.post<{ id: string; url: string }>(
      `/files/fichas-photo?projectId=${item.projectId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    fotos[i] = `${API_URL}${data.url}`;
    await patchItem(item.id, { photos: fotos });
  }
  return fotos;
}

/**
 * Un reintento de "enviar" puede chocar con que el servidor ya la envió (la
 * respuesta se perdió) o con que la ficha ya no existe: en ambos casos no hay
 * nada más que hacer, y tratarlo como fallo dejaba el elemento atascado en
 * la cola para siempre.
 */
function yaResuelta(err: unknown): boolean {
  const r = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
  if (!r) return false;
  if (r.status === 404) return true;
  return r.status === 400 && /ya fue enviada/i.test(String(r.data?.message ?? ''));
}

// Lock a nivel de MÓDULO: garantiza que solo una sincronización corra a la vez
// aunque el hook useNetworkStatus esté montado en varias pantallas y cada una
// dispare runSync (evita fichas duplicadas por read-modify-write concurrente).
let syncing = false;

export async function syncQueue(
  onProgress?: (done: number, total: number) => void,
): Promise<{ synced: number; failed: number }> {
  if (syncing) return { synced: 0, failed: 0 };
  syncing = true;
  try {
    return await runSync(onProgress);
  } finally {
    syncing = false;
  }
}

async function runSync(
  onProgress?: (done: number, total: number) => void,
): Promise<{ synced: number; failed: number }> {
  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  const total = queue.length;
  let synced = 0;
  let failed = 0;
  let done = 0;

  for (const item of queue) {
    try {
      let fichaId = item.fichaId;

      if (!fichaId) {
        const photoUrls = item.photos.length > 0 ? await uploadLocalPhotos(item) : [];
        const { data: ficha } = await api.post('/fichas', {
          type: item.type,
          projectId: item.projectId,
          data: item.data,
          latitude: item.latitude,
          longitude: item.longitude,
          photos: photoUrls,
          signature: item.signature || undefined,
        });
        fichaId = ficha.id as string;
        // Se anota ya: si el envío de abajo falla, el reintento no vuelve a
        // crear la ficha (salía duplicada).
        await patchItem(item.id, { fichaId });
      }

      if (item.submit) {
        try {
          await api.post(`/fichas/${fichaId}/submit`);
        } catch (err) {
          if (!yaResuelta(err)) throw err;
        }
      }

      // Se saca de la cola al terminar CADA una (no al final de todas): si la
      // app se cierra a mitad, las ya enviadas no se reenvían. Y solo se
      // quita esta: lo que se haya encolado mientras tanto se conserva.
      await removeItem(item.id);
      synced++;
    } catch {
      failed++;
    }
    done++;
    onProgress?.(done, total);
  }

  return { synced, failed };
}

export async function clearQueue() {
  await withQueueLock(() => AsyncStorage.removeItem(QUEUE_KEY));
}
