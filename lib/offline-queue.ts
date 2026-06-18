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

export async function syncQueue(): Promise<{ synced: number; failed: number }> {
  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: QueuedFicha[] = [];

  for (const item of queue) {
    try {
      const { data: ficha } = await api.post('/fichas', {
        type: item.type,
        projectId: item.projectId,
        data: item.data,
        latitude: item.latitude,
        longitude: item.longitude,
        photos: item.photos,
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
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return { synced, failed };
}

export async function clearQueue() {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
