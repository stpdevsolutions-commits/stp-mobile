import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { api, FichaElectricaData, Tablero, Circuito, Material } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

type Step = 'general' | 'tableros' | 'circuitos' | 'materiales' | 'observaciones';

const STEPS: Step[] = ['general', 'tableros', 'circuitos', 'materiales', 'observaciones'];
const STEP_LABELS: Record<Step, string> = {
  general: 'Info general',
  tableros: 'Tableros',
  circuitos: 'Circuitos',
  materiales: 'Materiales',
  observaciones: 'Observaciones',
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function NuevaFichaScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('general');
  const [saving, setSaving] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [data, setData] = useState<FichaElectricaData>({
    tipoTrabajo: 'instalacion_nueva',
    voltajeServicio: '120V',
    fases: 'monofasico',
    tableros: [],
    circuitos: [],
    materiales: [],
    observacionesGenerales: '',
    recomendaciones: '',
  });

  useEffect(() => {
    void (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setLatitude(loc.coords.latitude);
          setLongitude(loc.coords.longitude);
        }
      } catch {}
    })();
  }, []);

  function updateData(patch: Partial<FichaElectricaData>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  // --- Tableros ---
  function addTablero() {
    const t: Tablero = {
      id: uid(),
      nombre: '',
      tipo: 'principal',
      amperaje: 100,
      voltaje: data.voltajeServicio,
      fases: data.fases,
      estado: 'bueno',
    };
    updateData({ tableros: [...data.tableros, t] });
  }

  function updateTablero(id: string, patch: Partial<Tablero>) {
    updateData({
      tableros: data.tableros.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    });
  }

  function removeTablero(id: string) {
    updateData({ tableros: data.tableros.filter((t) => t.id !== id) });
  }

  // --- Circuitos ---
  function addCircuito() {
    const c: Circuito = {
      numero: String(data.circuitos.length + 1),
      descripcion: '',
      breakerA: 20,
      calibreAWG: '12',
      tipo: 'tomacorriente',
      estado: 'nuevo',
    };
    updateData({ circuitos: [...data.circuitos, c] });
  }

  function updateCircuito(idx: number, patch: Partial<Circuito>) {
    const arr = [...data.circuitos];
    arr[idx] = { ...arr[idx], ...patch };
    updateData({ circuitos: arr });
  }

  function removeCircuito(idx: number) {
    updateData({ circuitos: data.circuitos.filter((_, i) => i !== idx) });
  }

  // --- Materiales ---
  function addMaterial() {
    const m: Material = { descripcion: '', unidad: 'unidad', cantidad: 1 };
    updateData({ materiales: [...data.materiales, m] });
  }

  function updateMaterial(idx: number, patch: Partial<Material>) {
    const arr = [...data.materiales];
    arr[idx] = { ...arr[idx], ...patch };
    updateData({ materiales: arr });
  }

  function removeMaterial(idx: number) {
    updateData({ materiales: data.materiales.filter((_, i) => i !== idx) });
  }

  // --- Submit ---
  async function save(submit = false) {
    setSaving(true);
    try {
      const { data: ficha } = await api.post('/fichas', {
        type: 'electrico',
        projectId,
        data,
        latitude,
        longitude,
      });

      if (submit) {
        await api.post(`/fichas/${ficha.id}/submit`);
      }

      Alert.alert(
        'Guardado',
        submit ? 'Ficha enviada correctamente' : 'Ficha guardada como borrador',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch {
      Alert.alert('Error', 'No se pudo guardar la ficha');
    } finally {
      setSaving(false);
    }
  }

  const currentIdx = STEPS.indexOf(step);
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === STEPS.length - 1;

  return (
    <View style={styles.container}>
      {/* Step progress */}
      <View style={styles.progress}>
        {STEPS.map((s, i) => (
          <TouchableOpacity
            key={s}
            style={[styles.progressStep, i <= currentIdx && styles.progressStepActive]}
            onPress={() => setStep(s)}
          >
            <Text style={[styles.progressText, i <= currentIdx && styles.progressTextActive]}>
              {i + 1}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.stepTitle}>{STEP_LABELS[step]}</Text>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 120 }}>
        {step === 'general' && (
          <GeneralStep data={data} updateData={updateData} latitude={latitude} longitude={longitude} />
        )}
        {step === 'tableros' && (
          <TablerosStep
            tableros={data.tableros}
            onAdd={addTablero}
            onUpdate={updateTablero}
            onRemove={removeTablero}
          />
        )}
        {step === 'circuitos' && (
          <CircuitosStep
            circuitos={data.circuitos}
            tableros={data.tableros}
            onAdd={addCircuito}
            onUpdate={updateCircuito}
            onRemove={removeCircuito}
          />
        )}
        {step === 'materiales' && (
          <MaterialesStep
            materiales={data.materiales}
            onAdd={addMaterial}
            onUpdate={updateMaterial}
            onRemove={removeMaterial}
          />
        )}
        {step === 'observaciones' && (
          <ObservacionesStep data={data} updateData={updateData} />
        )}
      </ScrollView>

      {/* Navigation buttons */}
      <View style={styles.nav}>
        {!isFirst && (
          <TouchableOpacity style={styles.navBtn} onPress={() => setStep(STEPS[currentIdx - 1])}>
            <Text style={styles.navBtnText}>← Anterior</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.navBtnSave, saving && { opacity: 0.6 }]}
          onPress={() => save(false)}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#1565C0" /> : <Text style={styles.navBtnSaveText}>Guardar</Text>}
        </TouchableOpacity>
        {!isLast ? (
          <TouchableOpacity style={styles.navBtnPrimary} onPress={() => setStep(STEPS[currentIdx + 1])}>
            <Text style={styles.navBtnPrimaryText}>Siguiente →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navBtnPrimary, saving && { opacity: 0.6 }]}
            onPress={() => save(true)}
            disabled={saving}
          >
            <Text style={styles.navBtnPrimaryText}>Enviar ✓</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Sub-components ──────────────────────────────────────────

function GeneralStep({
  data, updateData, latitude, longitude,
}: {
  data: FichaElectricaData;
  updateData: (p: Partial<FichaElectricaData>) => void;
  latitude: number | null;
  longitude: number | null;
}) {
  return (
    <View style={s.section}>
      <Label>Tipo de trabajo</Label>
      <OptionGroup
        options={[
          { label: 'Instalación nueva', value: 'instalacion_nueva' },
          { label: 'Remodelación', value: 'remodelacion' },
          { label: 'Mantenimiento', value: 'mantenimiento' },
          { label: 'Diagnóstico', value: 'diagnostico' },
        ]}
        selected={data.tipoTrabajo}
        onSelect={(v) => updateData({ tipoTrabajo: v as FichaElectricaData['tipoTrabajo'] })}
      />

      <Label>Voltaje de servicio</Label>
      <OptionGroup
        options={[
          { label: '120V', value: '120V' },
          { label: '240V', value: '240V' },
          { label: '480V', value: '480V' },
          { label: 'Otro', value: 'otro' },
        ]}
        selected={data.voltajeServicio}
        onSelect={(v) => updateData({ voltajeServicio: v as FichaElectricaData['voltajeServicio'] })}
      />

      <Label>Fases</Label>
      <OptionGroup
        options={[
          { label: 'Monofásico', value: 'monofasico' },
          { label: 'Bifásico', value: 'bifasico' },
          { label: 'Trifásico', value: 'trifasico' },
        ]}
        selected={data.fases}
        onSelect={(v) => updateData({ fases: v as FichaElectricaData['fases'] })}
      />

      {latitude !== null && (
        <Text style={s.gps}>📍 GPS: {latitude.toFixed(5)}, {longitude?.toFixed(5)}</Text>
      )}
    </View>
  );
}

function TablerosStep({ tableros, onAdd, onUpdate, onRemove }: {
  tableros: Tablero[];
  onAdd: () => void;
  onUpdate: (id: string, p: Partial<Tablero>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <View style={s.section}>
      {tableros.map((t) => (
        <View key={t.id} style={s.itemCard}>
          <View style={s.itemHeader}>
            <Text style={s.itemTitle}>Tablero</Text>
            <TouchableOpacity onPress={() => onRemove(t.id)}>
              <Text style={s.removeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <Field label="Nombre" value={t.nombre} onChange={(v) => onUpdate(t.id, { nombre: v })} placeholder="Ej: Tablero principal" />
          <Label>Tipo</Label>
          <OptionGroup
            options={[
              { label: 'Principal', value: 'principal' },
              { label: 'Secundario', value: 'secundario' },
              { label: 'Distribución', value: 'distribucion' },
              { label: 'Otro', value: 'otro' },
            ]}
            selected={t.tipo}
            onSelect={(v) => onUpdate(t.id, { tipo: v as Tablero['tipo'] })}
          />
          <Field label="Amperaje (A)" value={String(t.amperaje)} onChange={(v) => onUpdate(t.id, { amperaje: parseFloat(v) || 0 })} keyboardType="numeric" />
          <Label>Estado</Label>
          <OptionGroup
            options={[
              { label: 'Bueno', value: 'bueno' },
              { label: 'Regular', value: 'regular' },
              { label: 'Malo', value: 'malo' },
              { label: 'Nuevo', value: 'nuevo' },
            ]}
            selected={t.estado}
            onSelect={(v) => onUpdate(t.id, { estado: v as Tablero['estado'] })}
          />
          <Field label="Observaciones" value={t.observaciones ?? ''} onChange={(v) => onUpdate(t.id, { observaciones: v })} multiline />
        </View>
      ))}
      <TouchableOpacity style={s.addBtn} onPress={onAdd}>
        <Text style={s.addBtnText}>+ Agregar tablero</Text>
      </TouchableOpacity>
    </View>
  );
}

function CircuitosStep({ circuitos, tableros, onAdd, onUpdate, onRemove }: {
  circuitos: Circuito[];
  tableros: Tablero[];
  onAdd: () => void;
  onUpdate: (idx: number, p: Partial<Circuito>) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <View style={s.section}>
      {circuitos.map((c, idx) => (
        <View key={idx} style={s.itemCard}>
          <View style={s.itemHeader}>
            <Text style={s.itemTitle}>Circuito #{c.numero}</Text>
            <TouchableOpacity onPress={() => onRemove(idx)}>
              <Text style={s.removeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <Field label="Descripción" value={c.descripcion} onChange={(v) => onUpdate(idx, { descripcion: v })} placeholder="Ej: Tomacorrientes sala" />
          <Field label="Breaker (A)" value={String(c.breakerA)} onChange={(v) => onUpdate(idx, { breakerA: parseFloat(v) || 0 })} keyboardType="numeric" />
          <Field label="Calibre AWG" value={c.calibreAWG} onChange={(v) => onUpdate(idx, { calibreAWG: v })} placeholder="Ej: 12, 10, 8" />
          <Field label="Longitud (m)" value={c.longitud ? String(c.longitud) : ''} onChange={(v) => onUpdate(idx, { longitud: parseFloat(v) || undefined })} keyboardType="numeric" />
          <Label>Tipo</Label>
          <OptionGroup
            options={[
              { label: 'Iluminación', value: 'iluminacion' },
              { label: 'Tomacorriente', value: 'tomacorriente' },
              { label: 'HVAC', value: 'hvac' },
              { label: 'Motor', value: 'motor' },
            ]}
            selected={c.tipo}
            onSelect={(v) => onUpdate(idx, { tipo: v as Circuito['tipo'] })}
          />
          <Label>Estado</Label>
          <OptionGroup
            options={[
              { label: 'Activo', value: 'activo' },
              { label: 'Nuevo', value: 'nuevo' },
              { label: 'Inactivo', value: 'inactivo' },
              { label: 'Reemplazar', value: 'reemplazar' },
            ]}
            selected={c.estado}
            onSelect={(v) => onUpdate(idx, { estado: v as Circuito['estado'] })}
          />
          {tableros.length > 0 && (
            <>
              <Label>Tablero</Label>
              <OptionGroup
                options={tableros.map((t) => ({ label: t.nombre || 'Sin nombre', value: t.id }))}
                selected={c.tableroId ?? ''}
                onSelect={(v) => onUpdate(idx, { tableroId: v })}
              />
            </>
          )}
        </View>
      ))}
      <TouchableOpacity style={s.addBtn} onPress={onAdd}>
        <Text style={s.addBtnText}>+ Agregar circuito</Text>
      </TouchableOpacity>
    </View>
  );
}

function MaterialesStep({ materiales, onAdd, onUpdate, onRemove }: {
  materiales: Material[];
  onAdd: () => void;
  onUpdate: (idx: number, p: Partial<Material>) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <View style={s.section}>
      {materiales.map((m, idx) => (
        <View key={idx} style={s.itemCard}>
          <View style={s.itemHeader}>
            <Text style={s.itemTitle}>Material #{idx + 1}</Text>
            <TouchableOpacity onPress={() => onRemove(idx)}>
              <Text style={s.removeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <Field label="Descripción" value={m.descripcion} onChange={(v) => onUpdate(idx, { descripcion: v })} placeholder="Ej: Cable THHN #12" />
          <Field label="Cantidad" value={String(m.cantidad)} onChange={(v) => onUpdate(idx, { cantidad: parseFloat(v) || 0 })} keyboardType="numeric" />
          <Label>Unidad</Label>
          <OptionGroup
            options={[
              { label: 'Unidad', value: 'unidad' },
              { label: 'Metro', value: 'metro' },
              { label: 'Caja', value: 'caja' },
              { label: 'Rollo', value: 'rollo' },
            ]}
            selected={m.unidad}
            onSelect={(v) => onUpdate(idx, { unidad: v as Material['unidad'] })}
          />
        </View>
      ))}
      <TouchableOpacity style={s.addBtn} onPress={onAdd}>
        <Text style={s.addBtnText}>+ Agregar material</Text>
      </TouchableOpacity>
    </View>
  );
}

function ObservacionesStep({ data, updateData }: {
  data: FichaElectricaData;
  updateData: (p: Partial<FichaElectricaData>) => void;
}) {
  return (
    <View style={s.section}>
      <Label>Observaciones generales</Label>
      <TextInput
        style={[s.input, s.textarea]}
        value={data.observacionesGenerales}
        onChangeText={(v) => updateData({ observacionesGenerales: v })}
        placeholder="Describe el estado general, hallazgos y condiciones del sitio..."
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />
      <Label>Recomendaciones</Label>
      <TextInput
        style={[s.input, s.textarea]}
        value={data.recomendaciones}
        onChangeText={(v) => updateData({ recomendaciones: v })}
        placeholder="Acciones recomendadas, próximos pasos..."
        multiline
        numberOfLines={5}
        textAlignVertical="top"
      />
    </View>
  );
}

// ── Shared UI primitives ─────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

function Field({
  label, value, onChange, placeholder, multiline, keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address';
}) {
  return (
    <>
      <Label>{label}</Label>
      <TextInput
        style={[s.input, multiline && s.textarea]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#BBB"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType ?? 'default'}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </>
  );
}

function OptionGroup({
  options, selected, onSelect,
}: {
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <View style={s.optionGroup}>
      {options.map((o) => (
        <TouchableOpacity
          key={o.value}
          style={[s.option, selected === o.value && s.optionSelected]}
          onPress={() => onSelect(o.value)}
        >
          <Text style={[s.optionText, selected === o.value && s.optionTextSelected]}>
            {o.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  progress: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', gap: 8, justifyContent: 'center' },
  progressStep: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#E0E0E0',
    justifyContent: 'center', alignItems: 'center',
  },
  progressStepActive: { backgroundColor: '#1565C0' },
  progressText: { color: '#888', fontWeight: '700', fontSize: 13 },
  progressTextActive: { color: '#fff' },
  stepTitle: { textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#333', paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  content: { flex: 1 },
  nav: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#EEE', gap: 8 },
  navBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#DDD', alignItems: 'center' },
  navBtnText: { color: '#555', fontWeight: '600' },
  navBtnSave: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#E3F2FD', alignItems: 'center' },
  navBtnSaveText: { color: '#1565C0', fontWeight: '600' },
  navBtnPrimary: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#1565C0', alignItems: 'center' },
  navBtnPrimaryText: { color: '#fff', fontWeight: '700' },
});

const s = StyleSheet.create({
  section: { padding: 16, gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, fontSize: 15, backgroundColor: '#fff', color: '#222' },
  textarea: { height: 90, textAlignVertical: 'top' },
  optionGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  option: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6, borderWidth: 1, borderColor: '#DDD', backgroundColor: '#fff' },
  optionSelected: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  optionText: { fontSize: 13, color: '#555' },
  optionTextSelected: { color: '#fff', fontWeight: '600' },
  itemCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#EEE' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#1565C0' },
  removeBtn: { fontSize: 16, color: '#F44336', padding: 4 },
  addBtn: { borderWidth: 1.5, borderColor: '#1565C0', borderStyle: 'dashed', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 4 },
  addBtnText: { color: '#1565C0', fontWeight: '600', fontSize: 14 },
  gps: { fontSize: 12, color: '#4CAF50', marginTop: 12, fontWeight: '600' },
});
