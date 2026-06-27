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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, Ficha } from '../../../lib/api';

const STATUS_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  en_progreso: 'En progreso',
  enviada: 'Enviada',
};

const TYPE_LABEL: Record<string, string> = {
  electrico: 'Eléctrica',
  civil: 'Civil',
  electromecanico: 'Electromecánica',
  levantamiento: 'Levantamiento',
  evaluacion_danos: 'Evaluación de daños',
};

const STATUS_COLOR: Record<string, string> = {
  borrador: '#FF9800',
  en_progreso: '#2196F3',
  enviada: '#4CAF50',
};

export default function FichasScreen() {
  const { projectId, projectName } = useLocalSearchParams<{ projectId: string; projectName: string }>();
  const router = useRouter();
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = projectId ? { projectId } : {};
      const { data } = await api.get<Ficha[]>('/fichas', { params });
      setFichas(data);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar las fichas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId]);

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
      {projectName ? (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{decodeURIComponent(projectName)}</Text>
          <Text style={styles.headerSub}>{fichas.length} ficha(s)</Text>
        </View>
      ) : null}

      <FlatList
        data={fichas}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/(tabs)/fichas/${item.id}`)}
          >
            <View style={styles.row}>
              <Text style={styles.code}>{item.code}</Text>
              <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] + '22' }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}>
                  {STATUS_LABEL[item.status]}
                </Text>
              </View>
            </View>
            <Text style={styles.type}>Ficha {TYPE_LABEL[item.type] ?? item.type}</Text>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString('es-DO')}</Text>
            {item.photos?.length > 0 && (
              <Text style={styles.photos}>📷 {item.photos.length} foto(s)</Text>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No hay fichas para este proyecto</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push(`/(tabs)/fichas/nueva?projectId=${projectId ?? ''}`)}
      >
        <Text style={styles.fabText}>+ Nueva Ficha</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, backgroundColor: '#1565C0' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 13, color: '#BBDEFB', marginTop: 2 },
  list: { padding: 16, gap: 12, paddingBottom: 100 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  code: { fontSize: 13, fontWeight: '700', color: '#555' },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  type: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  date: { fontSize: 12, color: '#999' },
  photos: { fontSize: 12, color: '#666', marginTop: 4 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 16, color: '#888' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    left: 24,
    backgroundColor: '#1565C0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#1565C0',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
