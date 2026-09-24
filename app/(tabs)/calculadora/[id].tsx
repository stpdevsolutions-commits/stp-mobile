import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  BooleanToggle, Hint, Label, OptionGroup,
} from '../../../components/fichas/FormPrimitives';
import {
  Campo, fmt, getCalculadora, LineaMaterial, Resultado, totales, Valores, valoresIniciales,
} from '../../../lib/calc';

/** Campo numérico con la unidad a la derecha ("2.6  m"). */
function NumeroField({ campo, value, onChange }: {
  campo: Extract<Campo, { tipo: 'numero' }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <>
      <Label>{campo.label}</Label>
      <View style={s.numRow}>
        <TextInput
          style={s.numInput}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          selectTextOnFocus
          placeholder="0"
          placeholderTextColor="#C0CADB"
        />
        {campo.unidad ? <Text style={s.unit}>{campo.unidad}</Text> : null}
      </View>
      {campo.hint ? <Hint>{campo.hint}</Hint> : null}
    </>
  );
}

function Formulario({ campos, valores, set }: {
  campos: Campo[];
  valores: Valores;
  set: (cambios: Valores) => void;
}) {
  return (
    <View style={s.card}>
      {campos.map((c, i) => {
        if (c.visibleSi && !c.visibleSi(valores)) return null;
        switch (c.tipo) {
          case 'seccion':
            return <Text key={`sec-${i}`} style={[s.seccion, i === 0 && { marginTop: 0 }]}>{c.label}</Text>;
          case 'numero':
            return (
              <NumeroField
                key={c.clave} campo={c}
                value={String(valores[c.clave] ?? '')}
                onChange={(t) => set({ [c.clave]: t })}
              />
            );
          case 'opcion':
            return (
              <View key={c.clave}>
                <Label>{c.label}</Label>
                <OptionGroup
                  options={c.opciones}
                  selected={String(valores[c.clave] ?? '')}
                  onSelect={(val) => set({ [c.clave]: val, ...(c.alElegir?.(val) ?? {}) })}
                />
                {c.hint ? <Hint>{c.hint}</Hint> : null}
              </View>
            );
          case 'toggle':
            return (
              <BooleanToggle
                key={c.clave} label={c.label}
                value={valores[c.clave] === true}
                onChange={(b) => set({ [c.clave]: b })}
              />
            );
        }
      })}
    </View>
  );
}

function FilaMaterial({ l }: { l: LineaMaterial }) {
  return (
    <View style={s.fila}>
      <View style={{ flex: 1 }}>
        <Text style={s.filaDesc}>{l.descripcion}</Text>
        {l.detalle ? <Text style={s.filaDet}>{l.detalle}</Text> : null}
      </View>
      <Text style={s.filaCant}>{fmt(l.cantidad)}</Text>
      <Text style={s.filaUnidad}>{l.unidad}</Text>
    </View>
  );
}

function Resultados({ r }: { r: Resultado }) {
  const tot = totales(r.grupos);
  const diasTotal = r.manoObra.reduce((acc, m) => acc + m.dias, 0);

  return (
    <>
      <View style={s.resumen}>
        {r.resumen.map((x) => (
          <View key={x.label} style={s.resumenItem}>
            <Text style={s.resumenValor}>{x.valor}</Text>
            <Text style={s.resumenLabel}>{x.label}</Text>
          </View>
        ))}
      </View>

      {r.grupos.map((g) => (
        <View key={g.titulo} style={s.card}>
          <Text style={s.grupoTitulo}>{g.titulo}</Text>
          {g.lineas.map((l) => <FilaMaterial key={`${l.clave}-${l.unidad}`} l={l} />)}
        </View>
      ))}

      {tot ? (
        <View style={[s.card, s.cardTotal]}>
          <Text style={s.grupoTitulo}>Total de materiales</Text>
          {tot.map((l) => <FilaMaterial key={`${l.clave}-${l.unidad}`} l={l} />)}
        </View>
      ) : null}

      {r.manoObra.length > 0 ? (
        <View style={s.card}>
          <Text style={s.grupoTitulo}>Cuadrilla y tiempo</Text>
          {r.manoObra.map((m) => (
            <View key={m.actividad} style={s.fila}>
              <View style={{ flex: 1 }}>
                <Text style={s.filaDesc}>{m.actividad}</Text>
                <Text style={s.filaDet}>{m.cuadrilla} · {m.rendimiento}</Text>
              </View>
              <Text style={s.filaCant}>{fmt(m.dias, 1)}</Text>
              <Text style={s.filaUnidad}>días</Text>
            </View>
          ))}
          {r.manoObra.length > 1 ? (
            <View style={[s.fila, s.filaTotal]}>
              <Text style={[s.filaDesc, { flex: 1 }]}>Total (una cuadrilla)</Text>
              <Text style={s.filaCant}>{fmt(diasTotal, 1)}</Text>
              <Text style={s.filaUnidad}>días</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {r.notas.map((n) => (
        <View key={n} style={s.nota}>
          <Ionicons name="information-circle-outline" size={16} color="#64748B" />
          <Text style={s.notaText}>{n}</Text>
        </View>
      ))}
    </>
  );
}

export default function CalcularScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const calc = getCalculadora(id ?? '');
  const [valores, setValores] = useState<Valores>(() => (calc ? valoresIniciales(calc.campos) : {}));

  const resultado = useMemo(() => {
    if (!calc) return null;
    try {
      return calc.calcular(valores);
    } catch {
      return null;
    }
  }, [calc, valores]);

  if (!calc) {
    return <View style={s.center}><Text style={s.filaDesc}>Calculadora no encontrada.</Text></View>;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: calc.titulo }} />
      <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Formulario
          campos={calc.campos}
          valores={valores}
          set={(cambios) => setValores((prev) => ({ ...prev, ...cambios }))}
        />
        <Text style={s.resultadoTitulo}>Resultado</Text>
        {resultado ? <Resultados r={resultado} /> : <Text style={s.filaDet}>Revisa los datos.</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  content: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTotal: { borderWidth: 1.5, borderColor: '#1565C0' },

  seccion: { fontSize: 15, fontWeight: '800', color: '#1565C0', marginTop: 22 },

  numRow: { flexDirection: 'row', alignItems: 'center' },
  numInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F8FAFC',
    color: '#0D1B2A',
  },
  unit: { width: 64, marginLeft: 10, fontSize: 14, color: '#64748B', fontWeight: '600' },

  resultadoTitulo: { fontSize: 18, fontWeight: '800', color: '#0D1B2A', marginTop: 8, marginBottom: 10 },

  resumen: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  resumenItem: {
    flex: 1,
    backgroundColor: '#1565C0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  resumenValor: { color: '#fff', fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  resumenLabel: { color: '#BFDBFE', fontSize: 11, fontWeight: '600', marginTop: 2, textAlign: 'center' },

  grupoTitulo: { fontSize: 13, fontWeight: '800', color: '#0D1B2A', marginBottom: 6 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  filaTotal: { borderTopColor: '#CBD5E1' },
  filaDesc: { fontSize: 14, color: '#0D1B2A', fontWeight: '600' },
  filaDet: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  filaCant: { fontSize: 16, fontWeight: '800', color: '#0D1B2A', marginLeft: 8, fontVariant: ['tabular-nums'] },
  filaUnidad: { width: 64, marginLeft: 6, fontSize: 12, color: '#64748B' },

  nota: { flexDirection: 'row', gap: 6, marginBottom: 8, paddingHorizontal: 4 },
  notaText: { flex: 1, fontSize: 12, color: '#64748B', lineHeight: 17 },
});
