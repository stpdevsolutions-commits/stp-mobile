import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { api, Ficha, FichaElectricaData } from '../../../lib/api';

const STATUS_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  en_progreso: 'En progreso',
  enviada: 'Enviada',
};
const STATUS_COLOR: Record<string, string> = {
  borrador: '#FF9800',
  en_progreso: '#2196F3',
  enviada: '#4CAF50',
};

export default function FichaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<Ficha>(`/fichas/${id}`);
      setFicha(data);
    } catch {
      Alert.alert('Error', 'No se pudo cargar la ficha');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function addPhoto(fromCamera: boolean) {
    const { status } = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', fromCamera ? 'Necesitamos acceso a la cámara.' : 'Necesitamos acceso a la galería.');
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled) return;

    setUploading(true);
    try {
      const uri = result.assets[0].uri;
      const formData = new FormData();
      formData.append('file', { uri, name: 'foto.jpg', type: 'image/jpeg' } as unknown as Blob);
      const { data: uploaded } = await api.post<{ url: string }>('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newPhotos = [...(ficha?.photos ?? []), uploaded.url];
      await api.patch(`/fichas/${id}`, { photos: newPhotos });
      void load();
    } catch {
      Alert.alert('Error', 'No se pudo subir la foto');
    } finally {
      setUploading(false);
    }
  }

  function confirmAddPhoto() {
    Alert.alert('Agregar foto', '¿De dónde deseas agregar la foto?', [
      { text: 'Cámara', onPress: () => addPhoto(true) },
      { text: 'Galería', onPress: () => addPhoto(false) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function handleSubmit() {
    Alert.alert(
      'Enviar ficha',
      '¿Estás seguro? Una vez enviada no podrás editarla.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          style: 'default',
          onPress: async () => {
            setSubmitting(true);
            try {
              await api.post(`/fichas/${id}/submit`);
              void load();
            } catch {
              Alert.alert('Error', 'No se pudo enviar la ficha');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1565C0" /></View>;
  }
  if (!ficha) return null;

  const electricData = ficha.data as unknown as FichaElectricaData;
  const canEdit = ficha.status !== 'enviada';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.code}>{ficha.code}</Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[ficha.status] }]}>
          <Text style={styles.statusText}>{STATUS_LABEL[ficha.status]}</Text>
        </View>
        <Text style={styles.headerSub}>
          {new Date(ficha.createdAt).toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' })}
        </Text>
        {ficha.project && <Text style={styles.headerSub}>📋 {ficha.project.name}</Text>}
        {ficha.latitude !== null && (
          <Text style={styles.gps}>📍 {ficha.latitude}, {ficha.longitude}</Text>
        )}
      </View>

      {/* General */}
      <Section title="Información general">
        <Row label="Tipo de trabajo" value={tipoLabel(electricData.tipoTrabajo)} />
        <Row label="Voltaje de servicio" value={electricData.voltajeServicio} />
        <Row label="Fases" value={fasesLabel(electricData.fases)} />
      </Section>

      {/* Tableros */}
      {electricData.tableros?.length > 0 && (
        <Section title={`Tableros (${electricData.tableros.length})`}>
          {electricData.tableros.map((t) => (
            <View key={t.id} style={styles.subCard}>
              <Text style={styles.subCardTitle}>{t.nombre || 'Sin nombre'}</Text>
              <Row label="Tipo" value={t.tipo} />
              <Row label="Amperaje" value={`${t.amperaje}A`} />
              <Row label="Estado" value={t.estado} />
              {t.observaciones ? <Row label="Obs." value={t.observaciones} /> : null}
            </View>
          ))}
        </Section>
      )}

      {/* Circuitos */}
      {electricData.circuitos?.length > 0 && (
        <Section title={`Circuitos (${electricData.circuitos.length})`}>
          {electricData.circuitos.map((c, i) => (
            <View key={i} style={styles.subCard}>
              <Text style={styles.subCardTitle}>#{c.numero} — {c.descripcion}</Text>
              <Row label="Breaker" value={`${c.breakerA}A`} />
              <Row label="Calibre" value={`AWG #${c.calibreAWG}`} />
              <Row label="Tipo" value={c.tipo} />
              <Row label="Estado" value={c.estado} />
            </View>
          ))}
        </Section>
      )}

      {/* Materiales */}
      {electricData.materiales?.length > 0 && (
        <Section title={`Materiales (${electricData.materiales.length})`}>
          {electricData.materiales.map((m, i) => (
            <Row key={i} label={m.descripcion} value={`${m.cantidad} ${m.unidad}`} />
          ))}
        </Section>
      )}

      {/* Observaciones */}
      {(electricData.observacionesGenerales || electricData.recomendaciones) && (
        <Section title="Observaciones">
          {electricData.observacionesGenerales ? (
            <Text style={styles.obs}>{electricData.observacionesGenerales}</Text>
          ) : null}
          {electricData.recomendaciones ? (
            <>
              <Text style={styles.obsLabel}>Recomendaciones:</Text>
              <Text style={styles.obs}>{electricData.recomendaciones}</Text>
            </>
          ) : null}
        </Section>
      )}

      {/* Fotos */}
      <Section title="Fotos">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          {ficha.photos?.map((url, i) => (
            <Image key={i} source={{ uri: url }} style={styles.photo} />
          ))}
        </ScrollView>
        {canEdit && (
          <TouchableOpacity style={styles.addPhotoBtn} onPress={confirmAddPhoto} disabled={uploading}>
            {uploading
              ? <ActivityIndicator color="#1565C0" />
              : <Text style={styles.addPhotoBtnText}>📷 Agregar foto</Text>
            }
          </TouchableOpacity>
        )}
      </Section>

      {/* Actions */}
      {canEdit && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitBtnText}>Enviar ficha ✓</Text>
            }
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function tipoLabel(tipo: string) {
  const map: Record<string, string> = {
    instalacion_nueva: 'Instalación nueva',
    remodelacion: 'Remodelación',
    mantenimiento: 'Mantenimiento',
    diagnostico: 'Diagnóstico',
  };
  return map[tipo] ?? tipo;
}

function fasesLabel(fases: string) {
  const map: Record<string, string> = {
    monofasico: 'Monofásico',
    bifasico: 'Bifásico',
    trifasico: 'Trifásico',
  };
  return map[fases] ?? fases;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#1565C0', padding: 20 },
  code: { fontSize: 14, fontWeight: '700', color: '#BBDEFB' },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, marginVertical: 6 },
  statusText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  headerSub: { fontSize: 13, color: '#BBDEFB', marginTop: 2 },
  gps: { fontSize: 12, color: '#81D4FA', marginTop: 4 },
  section: { backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1565C0', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E3F2FD', paddingBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  rowLabel: { fontSize: 13, color: '#666', flex: 1 },
  rowValue: { fontSize: 13, color: '#222', fontWeight: '600', flex: 1, textAlign: 'right' },
  subCard: { backgroundColor: '#F9FBFF', borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#E3F2FD' },
  subCardTitle: { fontSize: 13, fontWeight: '700', color: '#1565C0', marginBottom: 6 },
  obs: { fontSize: 14, color: '#333', lineHeight: 20 },
  obsLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 10, marginBottom: 4 },
  photo: { width: 120, height: 90, borderRadius: 8, marginRight: 8 },
  addPhotoBtn: { borderWidth: 1, borderColor: '#1565C0', borderStyle: 'dashed', borderRadius: 8, padding: 12, alignItems: 'center' },
  addPhotoBtnText: { color: '#1565C0', fontWeight: '600' },
  actions: { margin: 12 },
  submitBtn: { backgroundColor: '#1565C0', borderRadius: 10, padding: 16, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
