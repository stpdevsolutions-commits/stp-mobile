import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, Project } from '../../lib/api';

export interface ProyectoElegido {
  id: string;
  code: string;
  name: string;
}

/** Hoja para elegir a qué proyecto va el cálculo (solo proyectos activos). */
export default function ProjectPicker({ visible, onClose, onSelect }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (p: ProyectoElegido) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setError(false);
    api.get<{ data: Project[] }>('/projects', { params: { limit: 100 } })
      .then(({ data }) => setProjects((data.data ?? []).filter((p) => p.status === 'active')))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [visible]);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return projects;
    return projects.filter((p) => `${p.code} ${p.name} ${p.client?.name ?? ''}`.toLowerCase().includes(t));
  }, [projects, q]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.head}>
            <Text style={s.title}>Enlazar a un proyecto</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={s.search}
            value={q}
            onChangeText={setQ}
            placeholder="Buscar por código, nombre o cliente"
            placeholderTextColor="#C0CADB"
          />
          {loading ? <ActivityIndicator color="#1565C0" style={{ marginTop: 24 }} /> : null}
          {error ? (
            <Text style={s.msg}>No se pudieron cargar los proyectos. Revisa la conexión o la VPN.</Text>
          ) : null}
          <FlatList
            data={filtrados}
            keyExtractor={(p) => p.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.row}
                activeOpacity={0.7}
                onPress={() => onSelect({ id: item.id, code: item.code, name: item.name })}
              >
                <Text style={s.code}>{item.code}</Text>
                <Text style={s.name} numberOfLines={2}>{item.name}</Text>
                {item.client?.name ? <Text style={s.client}>{item.client.name}</Text> : null}
              </TouchableOpacity>
            )}
            ListEmptyComponent={!loading && !error ? <Text style={s.msg}>Sin proyectos activos.</Text> : null}
          />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(13,27,42,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '80%' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '800', color: '#0D1B2A' },
  search: {
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, fontSize: 15,
    backgroundColor: '#F8FAFC', color: '#0D1B2A', marginBottom: 8,
  },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  code: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#0D1B2A', marginTop: 2 },
  client: { fontSize: 12, color: '#64748B', marginTop: 2 },
  msg: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 20 },
});
