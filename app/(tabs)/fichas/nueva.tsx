import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { api, FichaType } from '../../../lib/api';
import { enqueue } from '../../../lib/offline-queue';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';
import SignaturePad from '../../../components/fichas/SignaturePad';
import PhotoPicker from '../../../components/fichas/PhotoPicker';
import { Label, SectionContainer, OptionGroup } from '../../../components/fichas/FormPrimitives';

import FichaElectricaForm, {
  ELECTRICA_STEPS, ELECTRICA_STEP_LABELS, defaultElectricaData,
} from '../../../components/fichas/FichaElectricaForm';
import { FichaElectricaData } from '../../../lib/api';

import FichaCivilForm, {
  CIVIL_STEPS, CIVIL_STEP_LABELS, defaultCivilData,
} from '../../../components/fichas/FichaCivilForm';
import { FichaCivilData } from '../../../lib/types/ficha-civil.types';

import FichaElectromecanicaForm, {
  ELECTROMECANICA_STEPS, ELECTROMECANICA_STEP_LABELS, defaultElectromecanicaData,
} from '../../../components/fichas/FichaElectromecanicaForm';
import { FichaElectromecanicaData } from '../../../lib/types/ficha-electromecanica.types';

import FichaLevantamientoForm, {
  LEVANTAMIENTO_STEPS, LEVANTAMIENTO_STEP_LABELS, defaultLevantamientoData,
} from '../../../components/fichas/FichaLevantamientoForm';
import { FichaLevantamientoData } from '../../../lib/types/ficha-levantamiento.types';

import FichaEvaluacionForm, {
  EVALUACION_STEPS, EVALUACION_STEP_LABELS, defaultEvaluacionData,
} from '../../../components/fichas/FichaEvaluacionForm';
import { FichaEvaluacionData } from '../../../lib/types/ficha-evaluacion.types';

type AnyData = FichaElectricaData | FichaCivilData | FichaElectromecanicaData | FichaLevantamientoData | FichaEvaluacionData;

const TYPE_OPTIONS = [
  { label: '⚡ Eléctrico', value: 'electrico' },
  { label: '🏗️ Civil', value: 'civil' },
  { label: '⚙️ Electromecánico', value: 'electromecanico' },
  { label: '📦 Levantamiento', value: 'levantamiento' },
  { label: '🔍 Evaluación de daños', value: 'evaluacion_danos' },
];

function getSteps(type: FichaType): string[] {
  switch (type) {
    case 'electrico': return ELECTRICA_STEPS;
    case 'civil': return CIVIL_STEPS;
    case 'electromecanico': return ELECTROMECANICA_STEPS;
    case 'levantamiento': return LEVANTAMIENTO_STEPS;
    case 'evaluacion_danos': return EVALUACION_STEPS;
  }
}

function getStepLabel(type: FichaType, step: string): string {
  switch (type) {
    case 'electrico': return ELECTRICA_STEP_LABELS[step as keyof typeof ELECTRICA_STEP_LABELS] ?? step;
    case 'civil': return CIVIL_STEP_LABELS[step as keyof typeof CIVIL_STEP_LABELS] ?? step;
    case 'electromecanico': return ELECTROMECANICA_STEP_LABELS[step as keyof typeof ELECTROMECANICA_STEP_LABELS] ?? step;
    case 'levantamiento': return LEVANTAMIENTO_STEP_LABELS[step as keyof typeof LEVANTAMIENTO_STEP_LABELS] ?? step;
    case 'evaluacion_danos': return EVALUACION_STEP_LABELS[step as keyof typeof EVALUACION_STEP_LABELS] ?? step;
  }
}

function defaultData(type: FichaType): AnyData {
  switch (type) {
    case 'electrico': return defaultElectricaData();
    case 'civil': return defaultCivilData();
    case 'electromecanico': return defaultElectromecanicaData();
    case 'levantamiento': return defaultLevantamientoData();
    case 'evaluacion_danos': return defaultEvaluacionData();
  }
}

export default function NuevaFichaScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const { isOnline } = useNetworkStatus();

  const [fichaType, setFichaType] = useState<FichaType | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [data, setData] = useState<AnyData | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [signature, setSignature] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setLatitude(loc.coords.latitude);
          setLongitude(loc.coords.longitude);
          setGpsAccuracy(loc.coords.accuracy);
        }
      } catch {}
    })();
  }, []);

  function selectType(type: FichaType) {
    setFichaType(type);
    setData(defaultData(type));
    setStepIdx(0);
  }

  const steps = fichaType ? [...getSteps(fichaType), 'resumen'] : [];
  const currentStep = steps[stepIdx] ?? '';
  const isLast = stepIdx === steps.length - 1;
  const gpsText = latitude !== null
    ? `${latitude.toFixed(5)}, ${longitude?.toFixed(5)}${gpsAccuracy !== null ? ` · ±${Math.round(gpsAccuracy)}m` : ''}`
    : undefined;
  const gpsQuality = gpsAccuracy === null ? 'none'
    : gpsAccuracy <= 10 ? 'good'
    : gpsAccuracy <= 30 ? 'fair'
    : 'poor';

  const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.stpsoluciones.com';

  async function uploadPhotos(uris: string[]): Promise<string[]> {
    if (!projectId) return [];
    const urls: string[] = [];
    for (const uri of uris) {
      const formData = new FormData();
      formData.append('file', { uri, name: 'foto.jpg', type: 'image/jpeg' } as unknown as Blob);
      const { data: uploaded } = await api.post<{ id: string; url: string }>(
        `/files/fichas-photo?projectId=${projectId}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      urls.push(`${API_URL}${uploaded.url}`);
    }
    return urls;
  }

  function validateForSubmit(): string | null {
    if (!fichaType || !data) return null;
    const d = data as unknown as Record<string, unknown>;
    if (fichaType === 'electrico' && !d.tipoTrabajo) return 'Selecciona el tipo de trabajo eléctrico.';
    if (fichaType === 'civil' && !d.tipoTrabajo) return 'Selecciona el tipo de trabajo civil.';
    if (fichaType === 'electromecanico' && !d.tipoTrabajo) return 'Selecciona el tipo de trabajo.';
    if (fichaType === 'levantamiento' && !d.proposito) return 'Selecciona el propósito del levantamiento.';
    if (fichaType === 'evaluacion_danos') {
      if (!d.causaDano) return 'Selecciona la causa del daño.';
      if (!d.urgencia) return 'Selecciona la urgencia de intervención.';
    }
    return null;
  }

  async function save(submit: boolean) {
    if (!fichaType || !data) return;

    if (submit) {
      const validationError = validateForSubmit();
      if (validationError) {
        Alert.alert('Campos requeridos', validationError);
        return;
      }
    }

    setSaving(true);
    try {
      const fichaData = { ...(data as unknown as Record<string, unknown>), observacionesGenerales: observaciones };

      if (isOnline) {
        const photoUrls = photos.length > 0 ? await uploadPhotos(photos) : [];
        const { data: ficha } = await api.post('/fichas', {
          type: fichaType,
          projectId,
          data: fichaData,
          latitude,
          longitude,
          photos: photoUrls,
          signature: signature || undefined,
        });
        if (submit) await api.post(`/fichas/${ficha.id}/submit`);
        Alert.alert('✓', submit ? 'Ficha enviada correctamente' : 'Ficha guardada como borrador', [{ text: 'OK', onPress: () => router.back() }]);
      } else {
        await enqueue({
          type: fichaType,
          projectId: projectId ?? '',
          data: fichaData,
          latitude,
          longitude,
          photos, // URIs locales; syncQueue los sube al recuperar señal
          signature: signature || '',
          submit,
        });
        Alert.alert('Sin conexión', 'Ficha guardada localmente. Se enviará automáticamente cuando recuperes la señal.', [{ text: 'OK', onPress: () => router.back() }]);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err as { message?: string })?.message
        ?? 'No se pudo guardar la ficha';
      Alert.alert('Error al guardar', msg);
    } finally {
      setSaving(false);
    }
  }

  // ── Type selector ──
  if (!fichaType) {
    return (
      <View style={s.container}>
        <View style={s.typeHeader}>
          <Text style={s.typeTitle}>¿Qué tipo de ficha vas a llenar?</Text>
        </View>
        <ScrollView contentContainerStyle={s.typeList}>
          {TYPE_OPTIONS.map((opt) => (
            <TouchableOpacity key={opt.value} style={s.typeCard} onPress={() => selectType(opt.value as FichaType)}>
              <Text style={s.typeLabel}>{opt.label}</Text>
              <Text style={s.typeArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // ── Step progress bar ──
  const typeSteps = getSteps(fichaType);

  return (
    <View style={s.container}>
      {!isOnline && (
        <View style={s.offlineBanner}>
          <Text style={s.offlineText}>⚠️ Sin conexión — se guardará localmente</Text>
        </View>
      )}

      <View style={s.progress}>
        {steps.map((_, i) => (
          <TouchableOpacity
            key={i}
            style={[s.dot, i <= stepIdx && s.dotActive]}
            onPress={() => i < stepIdx && setStepIdx(i)}
          >
            <Text style={[s.dotText, i <= stepIdx && s.dotTextActive]}>{i + 1}</Text>
          </TouchableOpacity>
        ))}
        <View style={[s.gpsChip, s[`gpsChip_${gpsQuality}`]]}>
          <Text style={s.gpsChipText}>
            {gpsQuality === 'none' ? '📍 GPS…' : gpsQuality === 'good' ? `📍 ±${Math.round(gpsAccuracy!)}m` : gpsQuality === 'fair' ? `📍 ±${Math.round(gpsAccuracy!)}m` : `📍 ±${Math.round(gpsAccuracy!)}m`}
          </Text>
        </View>
      </View>
      <Text style={s.stepTitle}>{getStepLabel(fichaType, currentStep)}</Text>

      <ScrollView style={s.content} contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        {/* Type-specific form steps */}
        {currentStep !== 'resumen' && fichaType === 'electrico' && data && (
          <FichaElectricaForm
            step={currentStep as Parameters<typeof FichaElectricaForm>[0]['step']}
            data={data as FichaElectricaData}
            onChange={setData}
            gpsText={gpsText}
          />
        )}
        {currentStep !== 'resumen' && fichaType === 'civil' && data && (
          <FichaCivilForm
            step={currentStep as Parameters<typeof FichaCivilForm>[0]['step']}
            data={data as FichaCivilData}
            onChange={setData}
            gpsText={gpsText}
          />
        )}
        {currentStep !== 'resumen' && fichaType === 'electromecanico' && data && (
          <FichaElectromecanicaForm
            step={currentStep as Parameters<typeof FichaElectromecanicaForm>[0]['step']}
            data={data as FichaElectromecanicaData}
            onChange={setData}
            gpsText={gpsText}
          />
        )}
        {currentStep !== 'resumen' && fichaType === 'levantamiento' && data && (
          <FichaLevantamientoForm
            step={currentStep as Parameters<typeof FichaLevantamientoForm>[0]['step']}
            data={data as FichaLevantamientoData}
            onChange={setData}
            gpsText={gpsText}
          />
        )}
        {currentStep !== 'resumen' && fichaType === 'evaluacion_danos' && data && (
          <FichaEvaluacionForm
            step={currentStep as Parameters<typeof FichaEvaluacionForm>[0]['step']}
            data={data as FichaEvaluacionData}
            onChange={setData}
            gpsText={gpsText}
          />
        )}

        {/* Final step: resumen (photos, signature, observations) */}
        {currentStep === 'resumen' && (
          <SectionContainer>
            <Label>Observaciones generales</Label>
            <TextInput
              style={[s.input, s.textarea]}
              value={observaciones}
              onChangeText={setObservaciones}
              placeholder="Estado general, hallazgos, condiciones del sitio..."
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <Label>Fotos ({photos.length})</Label>
            <PhotoPicker photos={photos} onChange={setPhotos} />

            <Label>Firma del técnico</Label>
            <SignaturePad
              onSave={setSignature}
              onClear={() => setSignature('')}
            />
          </SectionContainer>
        )}
      </ScrollView>

      {/* Navigation */}
      <View style={s.nav}>
        {stepIdx > 0 ? (
          <TouchableOpacity style={s.navBtn} onPress={() => setStepIdx((i) => i - 1)}>
            <Text style={s.navBtnText}>← Atrás</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.navBtn} onPress={() => setFichaType(null)}>
            <Text style={s.navBtnText}>← Tipo</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={() => save(false)} disabled={saving}>
          {saving ? <ActivityIndicator color="#1565C0" size="small" /> : <Text style={s.saveBtnText}>Guardar</Text>}
        </TouchableOpacity>

        {!isLast ? (
          <TouchableOpacity style={s.nextBtn} onPress={() => setStepIdx((i) => i + 1)}>
            <Text style={s.nextBtnText}>Siguiente →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[s.nextBtn, saving && { opacity: 0.6 }]} onPress={() => save(true)} disabled={saving}>
            <Text style={s.nextBtnText}>Enviar ✓</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  offlineBanner: { backgroundColor: '#F59E0B', padding: 8, alignItems: 'center' },
  offlineText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  typeHeader: { backgroundColor: '#1565C0', padding: 20 },
  typeTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  typeList: { padding: 16, gap: 10 },
  typeCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  typeLabel: { fontSize: 17, fontWeight: '700', color: '#0D1B2A' },
  typeArrow: { fontSize: 20, color: '#1565C0' },
  progress: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    gap: 6,
    justifyContent: 'center',
    flexWrap: 'wrap',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  gpsChip: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#E2E8F0' },
  gpsChip_none: { backgroundColor: '#F1F5F9' },
  gpsChip_good: { backgroundColor: '#DCFCE7' },
  gpsChip_fair: { backgroundColor: '#FEF9C3' },
  gpsChip_poor: { backgroundColor: '#FFEDD5' },
  gpsChipText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  dot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  dotActive: { backgroundColor: '#1565C0' },
  dotText: { color: '#94A3B8', fontWeight: '700', fontSize: 11 },
  dotTextActive: { color: '#fff' },
  stepTitle: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    paddingVertical: 10,
    backgroundColor: '#fff',
    letterSpacing: 0.3,
  },
  content: { flex: 1 },
  input: { borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: '#F8FAFC', color: '#0D1B2A' },
  textarea: { height: 100, textAlignVertical: 'top' },
  nav: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0', gap: 8 },
  navBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#F8FAFC' },
  navBtnText: { color: '#64748B', fontWeight: '700' },
  saveBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', borderWidth: 1.5, borderColor: '#BFDBFE' },
  saveBtnText: { color: '#1565C0', fontWeight: '700' },
  nextBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#1565C0', alignItems: 'center' },
  nextBtnText: { color: '#fff', fontWeight: '700' },
});
