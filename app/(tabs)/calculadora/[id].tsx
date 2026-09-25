import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  BooleanToggle, Hint, Label, OptionGroup,
} from '../../../components/fichas/FormPrimitives';
import {
  Calculadora, Campo, fmt, getCalculadora, LineaMaterial, listaCompra, Resultado, Valores,
  valoresIniciales,
} from '../../../lib/calc';
import {
  CalcGuardado, CalcLink, fetchLinks, LineaValorada, openCalcPdf, rd, saveCalc, valorar,
} from '../../../lib/calc-api';
import ProjectPicker, { ProyectoElegido } from '../../../components/calc/ProjectPicker';
import LinkMaterialModal from '../../../components/calc/LinkMaterialModal';

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

/** Los datos de entrada visibles, ya formateados, para el PDF ("Largo del muro" → "5 m"). */
function datosDelFormulario(calc: Calculadora, v: Valores): { label: string; valor: string }[] {
  const out: { label: string; valor: string }[] = [];
  for (const c of calc.campos) {
    if (c.tipo === 'seccion' || (c.visibleSi && !c.visibleSi(v))) continue;
    const raw = v[c.clave];
    if (c.tipo === 'numero') out.push({ label: c.label, valor: `${raw || '0'}${c.unidad ? ` ${c.unidad}` : ''}` });
    else if (c.tipo === 'opcion') out.push({ label: c.label, valor: c.opciones.find((o) => o.value === raw)?.label ?? String(raw) });
    else out.push({ label: c.label, valor: raw === true ? 'Sí' : 'No' });
  }
  return out;
}

/** La lista de compra con precios del catálogo del ERP. */
function ListaPrecios({ lineas, total, offline, onEnlazar }: {
  lineas: LineaValorada[];
  total: number | null;
  offline: boolean;
  onEnlazar: (l: LineaValorada) => void;
}) {
  const sinPrecio = lineas.filter((l) => l.subtotal == null).length;
  return (
    <View style={[s.card, s.cardTotal]}>
      <Text style={s.grupoTitulo}>Lista de materiales</Text>
      <Text style={s.filaDet}>
        Precios vigentes del catálogo del ERP{offline ? ' (sin conexión: últimos precios guardados)' : ''}.
        Toca un material para enlazarlo o cambiarlo.
      </Text>
      {lineas.map((l) => (
        <TouchableOpacity key={`${l.clave}-${l.unidad}`} style={s.fila} activeOpacity={0.7} onPress={() => onEnlazar(l)}>
          <View style={{ flex: 1 }}>
            <Text style={s.filaDesc}>{l.descripcion}</Text>
            <Text style={s.filaDet}>
              {fmt(l.cantidad)} {l.unidad}
              {l.link?.precio != null ? ` × ${rd(l.link.precio)}` : ''}
            </Text>
          </View>
          {l.subtotal != null ? (
            <Text style={s.precio}>{rd(l.subtotal)}</Text>
          ) : (
            <Text style={s.sinPrecio}>{l.link ? 'Sin precio' : 'Poner precio'}</Text>
          )}
        </TouchableOpacity>
      ))}
      <View style={[s.fila, s.filaTotal]}>
        <Text style={[s.filaDesc, { flex: 1 }]}>
          Total{sinPrecio > 0 && total != null ? ` (${sinPrecio} sin precio)` : ''}
        </Text>
        <Text style={s.precioTotal}>{total != null ? rd(total) : '—'}</Text>
      </View>
    </View>
  );
}

export default function CalcularScreen() {
  const { id, projectId, projectCode, projectName } = useLocalSearchParams<{
    id: string; projectId?: string; projectCode?: string; projectName?: string;
  }>();
  const calc = getCalculadora(id ?? '');
  const [valores, setValores] = useState<Valores>(() => (calc ? valoresIniciales(calc.campos) : {}));
  const [proyecto, setProyecto] = useState<ProyectoElegido | null>(
    projectId ? { id: projectId, code: projectCode ?? '', name: projectName ?? '' } : null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [links, setLinks] = useState<CalcLink[]>([]);
  const [linksOffline, setLinksOffline] = useState(false);
  const [enlazando, setEnlazando] = useState<LineaValorada | null>(null);
  const [saving, setSaving] = useState(false);
  const [guardado, setGuardado] = useState<CalcGuardado | null>(null);
  const [abriendoPdf, setAbriendoPdf] = useState(false);

  const cargarLinks = useCallback(async () => {
    const r = await fetchLinks();
    setLinks(r.links);
    setLinksOffline(r.offline);
  }, []);
  useEffect(() => { void cargarLinks(); }, [cargarLinks]);

  // Si cambian los datos o el proyecto, lo guardado ya no corresponde a lo que se ve.
  useEffect(() => { setGuardado(null); }, [valores, proyecto]);

  const resultado = useMemo(() => {
    if (!calc) return null;
    try {
      return calc.calcular(valores);
    } catch {
      return null;
    }
  }, [calc, valores]);

  const valorada = useMemo(
    () => (resultado ? valorar(listaCompra(resultado.grupos), links) : null),
    [resultado, links],
  );

  if (!calc) {
    return <View style={s.center}><Text style={s.filaDesc}>Calculadora no encontrada.</Text></View>;
  }

  async function guardar() {
    if (!calc || !resultado) return;
    if (!proyecto) {
      setPickerOpen(true);
      return;
    }
    setSaving(true);
    try {
      const r = await saveCalc({
        projectId: proyecto.id,
        calculatorId: calc.id,
        title: calc.titulo,
        inputs: valores,
        result: { ...resultado, datos: datosDelFormulario(calc, valores) },
      });
      setGuardado(r);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      Alert.alert(
        'No se pudo guardar',
        status === 403
          ? 'No tienes acceso a ese proyecto.'
          : 'Revisa la conexión o la VPN. El cálculo sigue en pantalla: puedes intentarlo de nuevo.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function verPdf() {
    if (!guardado) return;
    setAbriendoPdf(true);
    try {
      await openCalcPdf(guardado.id, `${calc?.titulo ?? 'Cálculo'} - ${proyecto?.code ?? ''}`);
    } catch {
      Alert.alert('No se pudo abrir el PDF', 'Revisa la conexión o la VPN.');
    } finally {
      setAbriendoPdf(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: calc.titulo }} />
      <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={s.proyecto} activeOpacity={0.75} onPress={() => setPickerOpen(true)}>
          <Ionicons name="folder-open-outline" size={20} color="#1565C0" />
          <View style={{ flex: 1 }}>
            <Text style={s.proyectoLbl}>Proyecto</Text>
            <Text style={s.proyectoNombre} numberOfLines={1}>
              {proyecto ? `${proyecto.code ? `${proyecto.code} · ` : ''}${proyecto.name}` : 'Sin enlazar — toca para elegir'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>

        <Formulario
          campos={calc.campos}
          valores={valores}
          set={(cambios) => setValores((prev) => ({ ...prev, ...cambios }))}
        />
        <Text style={s.resultadoTitulo}>Resultado</Text>
        {resultado ? <Resultados r={resultado} /> : <Text style={s.filaDet}>Revisa los datos.</Text>}

        {valorada && valorada.lineas.length > 0 ? (
          <ListaPrecios
            lineas={valorada.lineas}
            total={valorada.total}
            offline={linksOffline}
            onEnlazar={(l) => setEnlazando(l)}
          />
        ) : null}

        {guardado ? (
          <View style={s.guardado}>
            <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
            <View style={{ flex: 1 }}>
              <Text style={s.guardadoTitulo}>Guardado en {proyecto?.code || 'el proyecto'}</Text>
              <Text style={s.filaDet}>El PDF quedó en los documentos del proyecto en el ERP.</Text>
            </View>
            <TouchableOpacity style={s.btnPdf} onPress={verPdf} disabled={abriendoPdf}>
              {abriendoPdf ? <ActivityIndicator color="#1565C0" size="small" /> : <Text style={s.btnPdfText}>Ver PDF</Text>}
            </TouchableOpacity>
          </View>
        ) : resultado ? (
          <TouchableOpacity style={[s.btnGuardar, saving && { opacity: 0.6 }]} onPress={guardar} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name="document-attach-outline" size={20} color="#fff" />}
            <Text style={s.btnGuardarText}>
              {proyecto ? 'Guardar en el proyecto y generar PDF' : 'Elegir proyecto para guardar'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <ProjectPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(p) => { setProyecto(p); setPickerOpen(false); }}
      />
      <LinkMaterialModal
        linea={enlazando}
        actual={enlazando?.link ?? null}
        onClose={() => setEnlazando(null)}
        onChanged={() => void cargarLinks()}
      />
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

  precio: { fontSize: 14, fontWeight: '800', color: '#0D1B2A', marginLeft: 8, fontVariant: ['tabular-nums'] },
  precioTotal: { fontSize: 17, fontWeight: '800', color: '#1565C0', fontVariant: ['tabular-nums'] },
  sinPrecio: { fontSize: 12, fontWeight: '700', color: '#F59E0B', marginLeft: 8 },

  proyecto: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14,
    padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: '#BFDBFE',
  },
  proyectoLbl: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  proyectoNombre: { fontSize: 15, fontWeight: '700', color: '#0D1B2A', marginTop: 1 },

  btnGuardar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1565C0', borderRadius: 14, height: 52, marginTop: 4, marginBottom: 12,
  },
  btnGuardarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  guardado: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F0FDF4', borderRadius: 14,
    padding: 14, marginTop: 4, marginBottom: 12, borderWidth: 1, borderColor: '#BBF7D0',
  },
  guardadoTitulo: { fontSize: 14, fontWeight: '800', color: '#166534' },
  btnPdf: {
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1.5, borderColor: '#1565C0', minWidth: 84, alignItems: 'center',
  },
  btnPdfText: { color: '#1565C0', fontWeight: '800', fontSize: 13 },

  nota: { flexDirection: 'row', gap: 6, marginBottom: 8, paddingHorizontal: 4 },
  notaText: { flex: 1, fontSize: 12, color: '#64748B', lineHeight: 17 },
});
