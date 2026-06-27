import AsyncStorage from '@react-native-async-storage/async-storage';
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
}

export async function enqueue(item: Omit<QueuedFicha, 'id' | 'createdAt'>) {
  const queue = await getQueue();
  const entry: QueuedFicha = {
    ...item,
    id: Math.random().toString(36).slice(2, 11),
    createdAt: new Date().toISOString(),
  };
  queue.push(entry);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return entry.id;
}

export async function getQueue(): Promise<QueuedFicha[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedFicha[]) : [];
  } catch {
    return [];
  }
}

export async function getPendingCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

async function uploadLocalPhotos(uris: string[]): Promise<string[]> {
  const results: string[] = [];
  for (const uri of uris) {
    // Already a remote URL — keep it
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      results.push(uri);
      continue;
    }
    try {
      const formData = new FormData();
      formData.append('file', { uri, name: 'foto.jpg', type: 'image/jpeg' } as unknown as Blob);
      const { data } = await api.post<{ url: string }>('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      results.push(data.url);
    } catch {
      // Foto individual falla — no bloqueamos la creación de la ficha
    }
  }
  return results;
}

export async function syncQueue(
  onProgress?: (done: number, total: number) => void,
): Promise<{ synced: number; failed: number }> {
  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  const total = queue.length;
  let synced = 0;
  let failed = 0;
  let done = 0;
  const remaining: QueuedFicha[] = [];

  for (const item of queue) {
    try {
      const photoUrls = item.photos.length > 0 ? await uploadLocalPhotos(item.photos) : [];

      const { data: ficha } = await api.post('/fichas', {
        type: item.type,
        projectId: item.projectId,
        data: item.data,
        latitude: item.latitude,
        longitude: item.longitude,
        photos: photoUrls,
        signature: item.signature || undefined,
      });
      if (item.submit) {
        await api.post(`/fichas/${ficha.id}/submit`);
      }
      synced++;
    } catch {
      failed++;
      remaining.push(item);
    }
    done++;
    onProgress?.(done, total);
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return { synced, failed };
}

export async function clearQueue() {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
