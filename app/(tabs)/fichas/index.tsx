import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, FlatList, RefreshControl, StyleSheet,
  Text, TouchableOpacity, View, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, Ficha } from '../../../lib/api';

const STATUS_LABEL: Record<string, string> = {
  borrador:    'Borrador',
  en_progreso: 'En progreso',
  enviada:     'Enviada',
};

const STATUS_COLOR: Record<string, string> = {
  borrador:    '#F59E0B',
  en_progreso: '#2196F3',
  enviada:     '#10B981',
};

const TYPE_LABEL: Record<string, string> = {
  electrico:        'Eléctrica',
  civil:            'Civil',
  electromecanico:  'Electromecánica',
  levantamiento:    'Levantamiento',
  evaluacion_danos: 'Evaluación de daños',
};

const TYPE_ICON: Record<string, string> = {
  electrico:        'flash-outline',
  civil:            'construct-outline',
  electromecanico:  'cog-outline',
  levantamiento:    'cube-outline',
  evaluacion_danos: 'warning-outline',
};

function FichaCard({ item, onPress }: { item: Ficha; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 0 }).start();

  const statusColor = STATUS_COLOR[item.status] ?? '#94A3B8';
  const icon = TYPE_ICON[item.type] ?? 'document-outline';

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[s.card, { borderLeftColor: statusColor }]}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={1}
      >
        <View style={s.cardTop}>
          <View style={s.typeChip}>
            <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={14} color="#1565C0" />
            <Text style={s.typeText}> {TYPE_LABEL[item.type] ?? item.type}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: statusColor + '22' }]}>
            <Text style={[s.statusText, { color: statusColor }]}>
              {STATUS_LABEL[item.status]}
            </Text>
          </View>
        </View>

        <Text style={s.code}>{item.code}</Text>

        <View style={s.cardBottom}>
          <View style={s.metaRow}>
            <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
            <Text style={s.metaText}>
              {' '}{new Date(item.createdAt).toLocaleDateString('es-DO')}
            </Text>
          </View>
          {item.photos?.length > 0 && (
            <View style={s.metaRow}>
              <Ionicons name="camera-outline" size={13} color="#94A3B8" />
              <Text style={s.metaText}> {item.photos.length} foto{item.photos.length !== 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

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
  const onRefresh = useCallback(() => { setRefreshing(true); void load(); }, [load]);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#1565C0" /></View>;
  }

  return (
    <View style={s.container}>
      {projectName ? (
        <View style={s.header}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={s.headerText}>
            <Text style={s.headerTitle} numberOfLines={1}>{decodeURIComponent(projectName)}</Text>
            <Text style={s.headerSub}>{fichas.length} ficha{fichas.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>
      ) : null}

      <FlatList
        data={fichas}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1565C0" />
        }
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <FichaCard
            item={item}
            onPress={() => router.push(`/(tabs)/fichas/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="document-text-outline" size={52} color="#CBD5E1" />
            <Text style={s.emptyTitle}>Sin fichas</Text>
            <Text style={s.emptySub}>Crea la primera ficha para este proyecto</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={s.fab}
        onPress={() => router.push(`/(tabs)/fichas/nueva?projectId=${projectId ?? ''}`)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={s.fabText}>Nueva Ficha</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header:      { backgroundColor: '#1565C0', paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn:     { padding: 4 },
  headerText:  { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  headerSub:   { fontSize: 12, color: '#BBDEFB', marginTop: 2 },

  list: { padding: 16, gap: 12, paddingBottom: 100 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeChip:    { flexDirection: 'row', alignItems: 'center' },
  typeText:    { fontSize: 13, fontWeight: '700', color: '#1565C0' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText:  { fontSize: 11, fontWeight: '700' },
  code:        { fontSize: 14, fontWeight: '700', color: '#0D1B2A', marginBottom: 10 },
  cardBottom:  { flexDirection: 'row', gap: 16 },
  metaRow:     { flexDirection: 'row', alignItems: 'center' },
  metaText:    { fontSize: 12, color: '#94A3B8' },

  empty:      { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#94A3B8', marginTop: 8 },
  emptySub:   { fontSize: 14, color: '#CBD5E1', textAlign: 'center', paddingHorizontal: 32 },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    left: 24,
    height: 52,
    backgroundColor: '#1565C0',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#1565C0',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
