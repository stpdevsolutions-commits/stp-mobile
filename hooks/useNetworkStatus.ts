import { useCallback, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { syncQueue, getPendingCount } from '../lib/offline-queue';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ done: number; total: number } | null>(null);

  async function refreshPending() {
    const count = await getPendingCount();
    setPendingCount(count);
  }

  const runSync = useCallback(async () => {
    if (syncing) return;
    const count = await getPendingCount();
    if (count === 0) return;
    setSyncing(true);
    setSyncProgress({ done: 0, total: count });
    await syncQueue((done, total) => setSyncProgress({ done, total }));
    await refreshPending();
    setSyncing(false);
    setSyncProgress(null);
  }, [syncing]);

  useEffect(() => {
    void refreshPending();

    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      setIsOnline(online);
      if (online) void runSync();
    });

    return () => unsubscribe();
  }, [runSync]);

  return { isOnline, pendingCount, syncing, syncProgress, refreshPending, triggerSync: runSync };
}
