import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialPicker, { MaterialElegido } from '../fichas/MaterialPicker';
import { CalcLink, deleteLink, rd, setLink } from '../../lib/calc-api';
import { LineaMaterial } from '../../lib/calc';

/**
 * Enlaza un insumo de la calculadora ("Cemento (funda 42.5 kg)") con un
 * material del catálogo del ERP, que es de donde sale su precio. Se hace una
 * sola vez: el enlace vale para todos los cálculos y todos los técnicos.
 */
export default function LinkMaterialModal({ linea, actual, onClose, onChanged }: {
  linea: LineaMaterial | null;
  actual: CalcLink | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function elegir(m: MaterialElegido) {
    if (!linea) return;
    setSaving(true);
    try {
      await setLink(linea.clave, m.materialId);
      onChanged();
      onClose();
    } catch {
      Alert.alert('No se pudo enlazar', 'Revisa la conexión o la VPN e intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  async function quitar() {
    if (!linea) return;
    setSaving(true);
    try {
      await deleteLink(linea.clave);
      onChanged();
      onClose();
    } catch {
      Alert.alert('No se pudo quitar el enlace', 'Revisa la conexión o la VPN e intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={!!linea} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.head}>
            <Text style={s.title}>Precio del catálogo</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <Text style={s.insumo}>{linea?.descripcion}</Text>
          <Text style={s.hint}>
            Busca el material del catálogo del ERP que corresponde a este insumo. Su unidad debe ser{' '}
            <Text style={{ fontWeight: '700' }}>{linea?.unidad}</Text>. El enlace queda para todos los cálculos.
          </Text>

          {actual ? (
            <View style={s.actual}>
              <Text style={s.actualLbl}>Enlazado a</Text>
              <Text style={s.actualName}>{actual.code} · {actual.name}</Text>
              <Text style={s.actualMeta}>
                {actual.precio != null ? `${rd(actual.precio)} / ${actual.unit ?? 'unidad'}` : 'Sin precio vigente en el catálogo'}
              </Text>
              <TouchableOpacity onPress={quitar} disabled={saving}>
                <Text style={s.quitar}>Quitar enlace</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <MaterialPicker onSelect={elegir} placeholder="Buscar en el catálogo (ej. cemento, block)..." />
          {saving ? <ActivityIndicator color="#1565C0" style={{ marginTop: 8 }} /> : null}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(13,27,42,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 28, minHeight: '55%' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '800', color: '#0D1B2A' },
  insumo: { fontSize: 15, fontWeight: '700', color: '#1565C0', marginBottom: 4 },
  hint: { fontSize: 12, color: '#64748B', lineHeight: 17, marginBottom: 12 },
  actual: { backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12, marginBottom: 12 },
  actualLbl: { fontSize: 11, fontWeight: '700', color: '#16A34A', textTransform: 'uppercase' },
  actualName: { fontSize: 14, fontWeight: '700', color: '#0D1B2A', marginTop: 2 },
  actualMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  quitar: { fontSize: 13, fontWeight: '700', color: '#EF4444', marginTop: 8 },
});
