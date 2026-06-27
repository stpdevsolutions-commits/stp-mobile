import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api, Project } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export default function ProjectsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { isOnline, pendingCount, syncing, syncProgress, triggerSync } = useNetworkStatus();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<{ data: Project[] }>('/projects', { params: { limit: 100 } });
      setProjects((data.data ?? []).filter((p) => p.status === 'active'));
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status !== 401) Alert.alert('Error', 'No se pudieron cargar los proyectos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>⚠️ Sin conexión — modo offline activo</Text>
        </View>
      )}
      {syncing && (
        <View style={styles.syncBanner}>
          <ActivityIndicator color="#fff" size="small" />
          <Text style={styles.syncText}>
            {syncProgress
              ? ` Sincronizando ${syncProgress.done}/${syncProgress.total} fichas...`
              : ' Sincronizando fichas pendientes...'}
          </Text>
        </View>
      )}
      {!syncing && pendingCount > 0 && (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingText}>📤 {pendingCount} ficha(s) pendiente(s)</Text>
          {isOnline && (
            <TouchableOpacity onPress={() => void triggerSync()} style={styles.syncNowBtn}>
              <Text style={styles.syncNowText}>Sincronizar ahora</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>Hola, {user?.firstName} 👋</Text>
        <Text style={styles.greetingSubtext}>{projects.length} proyecto(s) activos</Text>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/(tabs)/fichas?projectId=${item.id}&projectName=${encodeURIComponent(item.name)}`)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.code}>{item.code}</Text>
              <View style={[styles.badge, badgeStyle(item.type)]}>
                <Text style={styles.badgeText}>{typeLabel(item.type)}</Text>
              </View>
            </View>
            <Text style={styles.name}>{item.name}</Text>
            {item.location ? <Text style={styles.location}>📍 {item.location}</Text> : null}
            {item.client?.name ? <Text style={styles.client}>👤 {item.client.name}</Text> : null}
            <Text style={styles.action}>Ver fichas →</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No tienes proyectos activos</Text>
          </View>
        }
      />
    </View>
  );
}

function badgeStyle(type: string) {
  const map: Record<string, object> = {
    electrical: { backgroundColor: '#FFF9C4' },
    mechanical: { backgroundColor: '#E8F5E9' },
    construction: { backgroundColor: '#FBE9E7' },
    maintenance: { backgroundColor: '#F3E5F5' },
  };
  return map[type] ?? { backgroundColor: '#ECEFF1' };
}

function typeLabel(type: string) {
  const map: Record<string, string> = {
    electrical: 'Eléctrico',
    mechanical: 'Mecánico',
    construction: 'Construcción',
    maintenance: 'Mantenimiento',
    other: 'Otro',
  };
  return map[type] ?? type;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  greeting: { padding: 16, backgroundColor: '#1565C0' },
  greetingText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  greetingSubtext: { fontSize: 13, color: '#BBDEFB', marginTop: 2 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  code: { fontSize: 12, color: '#888', fontWeight: '600' },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#E3F2FD' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#1565C0' },
  badge_electrical: { backgroundColor: '#FFF9C4' },
  badge_mechanical: { backgroundColor: '#E8F5E9' },
  badge_construction: { backgroundColor: '#FBE9E7' },
  badge_maintenance: { backgroundColor: '#F3E5F5' },
  badge_other: { backgroundColor: '#ECEFF1' },
  offlineBanner: { backgroundColor: '#F44336', padding: 8, alignItems: 'center' },
  offlineText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  syncBanner: { backgroundColor: '#2196F3', padding: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  syncText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  pendingBanner: { backgroundColor: '#FF9800', padding: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  pendingText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  syncNowBtn: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  syncNowText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  name: { fontSize: 17, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  location: { fontSize: 13, color: '#666', marginTop: 2 },
  client: { fontSize: 13, color: '#666', marginTop: 2 },
  action: { fontSize: 13, color: '#1565C0', fontWeight: '600', marginTop: 10, textAlign: 'right' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 16, color: '#888' },
});
