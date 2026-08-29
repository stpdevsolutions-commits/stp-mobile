import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../../lib/api';

/**
 * Material del catálogo del ERP, tal como lo devuelve GET /costs/materials
 * (ver src/costs/materials.service.ts). Nombrado distinto al `Material` de
 * lib/api.ts (que es la línea de materiales de la ficha eléctrica) para no
 * chocar con ese export.
 */
export interface MaterialCatalogo {
  id: string;
  code: string;
  name: string;
  unit?: { code: string; name: string } | null;
  priceSummary?: { current: number | null } | null;
}

export interface MaterialElegido {
  materialId: string;
  codigo: string;
  descripcion: string;
  unidad?: string;
  precioUnitarioRD?: number;
}

interface Props {
  onSelect: (m: MaterialElegido) => void;
  placeholder?: string;
}

/**
 * Buscador del catálogo de materiales del ERP (GET /costs/materials?search=).
 * Cualquier técnico autenticado puede leerlo (JwtAuthGuard, sin rol especial).
 * Al elegir un resultado, prellena descripción/unidad/precio vigente; si el
 * material buscado no existe en el catálogo, el técnico sigue el flujo de
 * carga manual que va justo debajo de este componente.
 */
export default function MaterialPicker({ onSelect, placeholder }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MaterialCatalogo[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onChangeText(text: string) {
    setQuery(text);
    setOpen(true);
    if (debounce.current) clearTimeout(debounce.current);
    if (text.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/costs/materials', {
          params: { search: text.trim(), withPrices: true, limit: 8 },
        });
        setResults(Array.isArray(data?.data) ? data.data : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  }

  function pick(m: MaterialCatalogo) {
    onSelect({
      materialId: m.id,
      codigo: m.code,
      descripcion: m.name,
      unidad: m.unit?.name ?? m.unit?.code,
      precioUnitarioRD: m.priceSummary?.current ?? undefined,
    });
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  const showEmpty = open && !loading && query.trim().length >= 2 && results.length === 0;

  return (
    <View style={s.wrap}>
      <View>
        <TextInput
          style={s.input}
          value={query}
          onChangeText={onChangeText}
          onFocus={() => setOpen(true)}
          placeholder={placeholder ?? 'Buscar en el catálogo de materiales...'}
          placeholderTextColor="#C0CADB"
        />
        {loading ? <ActivityIndicator size="small" color="#1565C0" style={s.spinner} /> : null}
      </View>
      {open && results.length > 0 ? (
        <View style={s.dropdown}>
          {results.map((m) => (
            <TouchableOpacity key={m.id} style={s.row} onPress={() => pick(m)} activeOpacity={0.7}>
              <Text style={s.rowName} numberOfLines={1}>{m.name}</Text>
              <Text style={s.rowMeta}>
                {m.code}
                {m.unit ? ` · ${m.unit.name}` : ''}
                {m.priceSummary?.current != null ? ` · RD$ ${m.priceSummary.current.toLocaleString('es-DO')}` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {showEmpty ? <Text style={s.empty}>Sin resultados en el catálogo — puedes cargarlo manual abajo.</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 8 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    paddingRight: 36,
    fontSize: 15,
    backgroundColor: '#F8FAFC',
    color: '#0D1B2A',
  },
  spinner: { position: 'absolute', right: 12, top: 13 },
  dropdown: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#fff',
    marginTop: 4,
    overflow: 'hidden',
  },
  row: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rowName: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  rowMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  empty: { fontSize: 12, color: '#94A3B8', marginTop: 6 },
});
