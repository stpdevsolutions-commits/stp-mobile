import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { syncQueue, getPendingCount } from '../lib/offline-queue';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  async function refreshPending() {
    const count = await getPendingCount();
    setPendingCount(count);
  }

  useEffect(() => {
    void refreshPending();

    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      setIsOnline(online);

      if (online) {
        const count = await getPendingCount();
        if (count > 0) {
          setSyncing(true);
          await syncQueue();
          await refreshPending();
          setSyncing(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return { isOnline, pendingCount, syncing, refreshPending };
}
