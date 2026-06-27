import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Alert, Image, Linking,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as ImagePicker from 'expo-image-picker';
import { api, Ficha } from '../../../lib/api';
import Svg, { Path } from 'react-native-svg';

const STATUS_LABEL: Record<string, string> = { borrador: 'Borrador', en_progreso: 'En progreso', enviada: 'Enviada' };
const STATUS_COLOR: Record<string, string> = { borrador: '#FF9800', en_progreso: '#2196F3', enviada: '#4CAF50' };
const TYPE_LABEL: Record<string, string> = {
  electrico: 'Eléctrica', civil: 'Civil', electromecanico: 'Electromecánica',
  levantamiento: 'Levantamiento', evaluacion_danos: 'Evaluación de daños',
};

export default function FichaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

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
    if (status !== 'granted') return;
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
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
    Alert.alert('Agregar foto', '', [
      { text: '📷 Cámara', onPress: () => addPhoto(true) },
      { text: '🖼️ Galería', onPress: () => addPhoto(false) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function handleSubmit() {
    Alert.alert('Enviar ficha', '¿Estás seguro? Una vez enviada no podrás editarla.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Enviar', onPress: async () => {
          setSubmitting(true);
          try { await api.post(`/fichas/${id}/submit`); void load(); }
          catch { Alert.alert('Error', 'No se pudo enviar la ficha'); }
          finally { setSubmitting(false); }
        },
      },
    ]);
  }

  async function handlePdf() {
    setDownloadingPdf(true);
    try {
      const { data: html } = await api.get<string>(`/fichas/${id}/pdf`);
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Ficha ${ficha?.code ?? ''}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF generado', 'El archivo se guardó en el dispositivo');
      }
    } catch {
      Alert.alert('Error', 'No se pudo generar el PDF');
    } finally {
      setDownloadingPdf(false);
    }
  }

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#1565C0" /></View>;
  if (!ficha) return null;

  const canEdit = ficha.status !== 'enviada';
  const d = ficha.data as Record<string, unknown>;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.code}>{ficha.code} · {TYPE_LABEL[ficha.type] ?? ficha.type}</Text>
        <View style={[s.statusBadge, { backgroundColor: STATUS_COLOR[ficha.status] }]}>
          <Text style={s.statusText}>{STATUS_LABEL[ficha.status]}</Text>
        </View>
        <Text style={s.headerSub}>{new Date(ficha.createdAt).toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' })}</Text>
        {ficha.project && <Text style={s.headerSub}>📋 {(ficha.project as unknown as { name: string }).name}</Text>}
        {ficha.latitude !== null && <Text style={s.gps}>📍 {ficha.latitude}, {ficha.longitude}</Text>}
      </View>

      {/* PDF button */}
      <TouchableOpacity style={s.pdfBtn} onPress={handlePdf} disabled={downloadingPdf}>
        {downloadingPdf
          ? <ActivityIndicator color="#1565C0" />
          : <Text style={s.pdfBtnText}>📄 Compartir PDF</Text>
        }
      </TouchableOpacity>

      {/* Data sections — rendered generically */}
      <DataSections data={d} type={ficha.type} />

      {/* Signature */}
      {ficha.signature ? (
        <Section title="Firma del técnico">
          <View style={s.sigBox}>
            <Svg width={280} height={110}>
              {String(ficha.signature).split('|').map((path, i) => (
                <Path key={i} d={path} stroke="#1565C0" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ))}
            </Svg>
          </View>
        </Section>
      ) : null}

      {/* Photos */}
      <Section title="Fotos">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          {ficha.photos?.map((url, i) => <Image key={i} source={{ uri: url }} style={s.photo} />)}
        </ScrollView>
        {canEdit && (
          <TouchableOpacity style={s.addPhotoBtn} onPress={confirmAddPhoto} disabled={uploading}>
            {uploading ? <ActivityIndicator color="#1565C0" /> : <Text style={s.addPhotoBtnText}>📷 Agregar foto</Text>}
          </TouchableOpacity>
        )}
      </Section>

      {/* Submit */}
      {canEdit && (
        <View style={s.actions}>
          <TouchableOpacity style={[s.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>Enviar ficha ✓</Text>}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function DataSections({ data, type }: { data: Record<string, unknown>; type: string }) {
  const SKIP = ['observacionesGenerales', 'recomendaciones'];

  const entries = Object.entries(data).filter(([k]) => !SKIP.includes(k));

  return (
    <>
      <Section title="Datos de la ficha">
        {entries.map(([key, value]) => {
          if (Array.isArray(value)) {
            return (
              <View key={key}>
                <Text style={s.subLabel}>{formatKey(key)} ({(value as unknown[]).length})</Text>
                {(value as Record<string, unknown>[]).map((item, i) => (
                  <View key={i} style={s.subCard}>
                    {Object.entries(item).filter(([k]) => k !== 'id').map(([k, v]) => (
                      typeof v !== 'object' && v !== undefined && v !== null && v !== ''
                        ? <Row key={k} label={formatKey(k)} value={String(v)} />
                        : null
                    ))}
                  </View>
                ))}
              </View>
            );
          }
          if (typeof value === 'object' && value !== null) {
            return (
              <View key={key}>
                <Text style={s.subLabel}>{formatKey(key)}</Text>
                {Object.entries(value as Record<string, unknown>).map(([k, v]) =>
                  v !== undefined && v !== null && v !== ''
                    ? <Row key={k} label={formatKey(k)} value={String(v)} />
                    : null
                )}
              </View>
            );
          }
          if (typeof value === 'boolean') {
            return <Row key={key} label={formatKey(key)} value={value ? 'Sí' : 'No'} />;
          }
          if (value !== undefined && value !== null && value !== '') {
            return <Row key={key} label={formatKey(key)} value={String(value)} />;
          }
          return null;
        })}
      </Section>

      {data.observacionesGenerales ? (
        <Section title="Observaciones"><Text style={s.obs}>{String(data.observacionesGenerales)}</Text></Section>
      ) : null}
      {data.recomendaciones ? (
        <Section title="Recomendaciones"><Text style={s.obs}>{String(data.recomendaciones)}</Text></Section>
      ) : null}
    </>
  );
}

function formatKey(key: string): string {
  const map: Record<string, string> = {
    tipoTrabajo: 'Tipo de trabajo', voltajeServicio: 'Voltaje', fases: 'Fases',
    tableros: 'Tableros', circuitos: 'Circuitos', materiales: 'Materiales',
    nombre: 'Nombre', tipo: 'Tipo', amperaje: 'Amperaje', estado: 'Estado',
    descripcion: 'Descripción', breakerA: 'Breaker (A)', calibreAWG: 'Calibre AWG',
    cantidad: 'Cantidad', unidad: 'Unidad', proposito: 'Propósito',
    causaDano: 'Causa del daño', urgencia: 'Urgencia', estructuraAfectada: 'Estructura afectada',
    riesgoPersonas: 'Riesgo para personas', costoEstimado: 'Costo estimado',
    areas: 'Áreas', equipos: 'Equipos', mediciones: 'Mediciones',
    marca: 'Marca', modelo: 'Modelo', voltaje: 'Voltaje', corrienteA: 'Corriente (A)',
    largo: 'Largo (m)', ancho: 'Ancho (m)', alto: 'Alto (m)',
    pisoMaterial: 'Material piso', paredesMaterial: 'Material paredes', techMaterial: 'Material techo',
    estadoGeneral: 'Estado general', tipoFundacion: 'Tipo fundación', tipoColumnas: 'Tipo columnas',
    severidad: 'Severidad', accionRecomendada: 'Acción recomendada',
    ubicacion: 'Ubicación', descripcionDano: 'Descripción del daño',
  };
  return map[key] ?? key.replace(/([A-Z])/g, ' $1').toLowerCase();
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#1565C0', padding: 20 },
  code: { fontSize: 13, fontWeight: '700', color: '#BBDEFB' },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, marginVertical: 6 },
  statusText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  headerSub: { fontSize: 13, color: '#BBDEFB', marginTop: 2 },
  gps: { fontSize: 11, color: '#81D4FA', marginTop: 4 },
  pdfBtn: { margin: 12, backgroundColor: '#fff', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#1565C0', flexDirection: 'row', justifyContent: 'center' },
  pdfBtnText: { color: '#1565C0', fontWeight: '700', fontSize: 15 },
  section: { backgroundColor: '#fff', margin: 12, marginTop: 0, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1565C0', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E3F2FD' },
  subLabel: { fontSize: 13, fontWeight: '700', color: '#444', marginTop: 10, marginBottom: 4 },
  subCard: { backgroundColor: '#F9FBFF', borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#E3F2FD' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  rowLabel: { fontSize: 13, color: '#666', flex: 1 },
  rowValue: { fontSize: 13, color: '#222', fontWeight: '600', flex: 1, textAlign: 'right' },
  obs: { fontSize: 14, color: '#333', lineHeight: 20 },
  sigBox: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 8, alignSelf: 'flex-start', backgroundColor: '#FAFEFF' },
  photo: { width: 120, height: 90, borderRadius: 8, marginRight: 8 },
  addPhotoBtn: { borderWidth: 1, borderColor: '#1565C0', borderStyle: 'dashed', borderRadius: 8, padding: 12, alignItems: 'center' },
  addPhotoBtnText: { color: '#1565C0', fontWeight: '600' },
  actions: { margin: 12 },
  submitBtn: { backgroundColor: '#1565C0', borderRadius: 10, padding: 16, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
