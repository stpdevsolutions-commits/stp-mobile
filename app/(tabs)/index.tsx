import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, FlatList, RefreshControl, StyleSheet,
  Text, TouchableOpacity, View, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, Project } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import Toast from '../../components/Toast';

const TYPE_ACCENT: Record<string, string> = {
  electrical:   '#F59E0B',
  mechanical:   '#10B981',
  construction: '#EF4444',
  maintenance:  '#8B5CF6',
  other:        '#94A3B8',
};

const TYPE_LABEL: Record<string, string> = {
  electrical:   'Eléctrico',
  mechanical:   'Mecánico',
  construction: 'Construcción',
  maintenance:  'Mantenimiento',
  other:        'Otro',
};

function ProjectCard({ item, onPress }: { item: Project; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const accent = TYPE_ACCENT[item.type] ?? '#94A3B8';

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[s.card, { borderLeftColor: accent }]}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={1}
      >
        <View style={s.cardTop}>
          <Text style={s.code}>{item.code}</Text>
          <View style={[s.badge, { backgroundColor: accent + '22' }]}>
            <Text style={[s.badgeText, { color: accent }]}>
              {TYPE_LABEL[item.type] ?? item.type}
            </Text>
          </View>
        </View>

        <Text style={s.name}>{item.name}</Text>

        {item.location ? (
          <View style={s.metaRow}>
            <Ionicons name="location-outline" size={13} color="#94A3B8" />
            <Text style={s.metaText}> {item.location}</Text>
          </View>
        ) : null}
        {item.client?.name ? (
          <View style={s.metaRow}>
            <Ionicons name="business-outline" size={13} color="#94A3B8" />
            <Text style={s.metaText}> {item.client.name}</Text>
          </View>
        ) : null}

        <View style={s.cardFooter}>
          <Text style={s.footerAction}>Ver fichas</Text>
          <Ionicons name="chevron-forward" size={16} color="#1565C0" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

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
      // Silently skip 401 — the auth guard will redirect to login
      if (status !== 401) {
        Alert.alert('Error', 'No se pudieron cargar los proyectos');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Guard: only fetch when authenticated to prevent errors during auth redirect
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    void load();
  }, [load, user]);

  const onRefresh = useCallback(() => { setRefreshing(true); void load(); }, [load]);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#1565C0" /></View>;
  }

  const n = projects.length;

  return (
    <View style={s.container}>
      <View style={s.greeting}>
        <View>
          <Text style={s.greetingName}>Hola, {user?.firstName} 👋</Text>
          <Text style={s.greetingSub}>
            {n} proyecto{n !== 1 ? 's' : ''} activo{n !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={s.avatar}>
          <Text style={s.avatarInitial}>{user?.firstName?.[0]}</Text>
        </View>
      </View>

      {/* Notifications */}
      {!isOnline && (
        <Toast type="offline" message="Sin conexión — trabajando en modo offline" />
      )}
      {syncing && (
        <Toast
          type="sync"
          message={syncProgress
            ? `Sincronizando ${syncProgress.done} de ${syncProgress.total} fichas...`
            : 'Sincronizando fichas pendientes...'}
          spinning
        />
      )}
      {!syncing && pendingCount > 0 && (
        <Toast
          type="pending"
          message={`${pendingCount} ficha${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''} de envío`}
          action={isOnline ? { label: 'Enviar ahora', onPress: () => void triggerSync() } : undefined}
        />
      )}

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1565C0" />
        }
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <ProjectCard
            item={item}
            onPress={() =>
              router.push(
                `/(tabs)/fichas?projectId=${item.id}&projectName=${encodeURIComponent(item.name)}`,
              )
            }
          />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="folder-open-outline" size={52} color="#CBD5E1" />
            <Text style={s.emptyTitle}>Sin proyectos activos</Text>
            <Text style={s.emptySub}>Los proyectos asignados aparecerán aquí</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  greeting:      { backgroundColor: '#1565C0', paddingHorizontal: 20, paddingVertical: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greetingName:  { fontSize: 22, fontWeight: '800', color: '#fff' },
  greetingSub:   { fontSize: 13, color: '#BBDEFB', marginTop: 2 },
  avatar:        { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  avatarInitial: { fontSize: 20, fontWeight: '700', color: '#fff' },

  list: { padding: 16, gap: 12, paddingBottom: 24 },

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
  code:        { fontSize: 11, color: '#94A3B8', fontWeight: '700', letterSpacing: 0.8 },
  badge:       { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:   { fontSize: 11, fontWeight: '700' },
  name:        { fontSize: 17, fontWeight: '700', color: '#0D1B2A', marginBottom: 8, lineHeight: 22 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  metaText:    { fontSize: 13, color: '#64748B' },
  cardFooter:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  footerAction:{ fontSize: 13, color: '#1565C0', fontWeight: '700' },

  empty:      { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#94A3B8', marginTop: 8 },
  emptySub:   { fontSize: 14, color: '#CBD5E1', textAlign: 'center', paddingHorizontal: 32 },
});
