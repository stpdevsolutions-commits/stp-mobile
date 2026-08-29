import React from 'react';
import {
  FichaLevantamientoData, ItemLevantamiento, AmbienteLevantamiento, EquipoCotizacion,
  DispositivoDomotica, DISPOSITIVOS_DOMOTICA,
} from '../../lib/types/ficha-levantamiento.types';
import { Label, Field, Hint, OptionGroup, MultiOptionGroup, ItemCard, AddButton, BooleanToggle, SectionContainer } from './FormPrimitives';

type Step = 'general' | 'conectividad' | 'electrico' | 'ambientes' | 'cotizacion' | 'items';
export const LEVANTAMIENTO_STEPS: Step[] = ['general', 'conectividad', 'electrico', 'ambientes', 'cotizacion', 'items'];
export const LEVANTAMIENTO_STEP_LABELS: Record<Step, string> = {
  general: 'Info general',
  conectividad: 'Conectividad',
  electrico: 'Eléctrico',
  ambientes: 'Ambientes',
  cotizacion: 'Cotización',
  items: 'Inventario',
};

/** Etiquetas de dispositivo, compartidas con el PDF del backend (mantener en sincronía). */
export const DISPOSITIVO_LABEL: Record<DispositivoDomotica, string> = {
  camara: 'Cámara',
  sensor_movimiento: 'Sensor de movimiento',
  sensor_puerta_ventana: 'Sensor puerta/ventana',
  cerradura_inteligente: 'Cerradura inteligente',
  switch_inteligente: 'Switch inteligente',
  foco_inteligente: 'Foco inteligente',
  sirena: 'Sirena',
  panel_control: 'Panel de control',
  medidor_energia: 'Medidor de energía',
  otro: 'Otro',
};
const DISPOSITIVO_OPTIONS = DISPOSITIVOS_DOMOTICA.map((v) => ({ label: DISPOSITIVO_LABEL[v], value: v }));

export function defaultLevantamientoData(): FichaLevantamientoData {
  return {
    proposito: 'presupuesto',
    items: [],
    conectividad: {},
    electrico: {},
    ambientes: [],
    equiposCotizacion: [],
  };
}

interface Props { step: Step; data: FichaLevantamientoData; onChange: (d: FichaLevantamientoData) => void; gpsText?: string; }

export default function FichaLevantamientoForm({ step, data, onChange, gpsText }: Props) {
  // Fichas creadas antes de este cambio no traen estas secciones — se rellenan al vuelo.
  const conectividad = data.conectividad ?? {};
  const electrico = data.electrico ?? {};
  const ambientes = data.ambientes ?? [];
  const equiposCotizacion = data.equiposCotizacion ?? [];

  function upd(patch: Partial<FichaLevantamientoData>) { onChange({ ...data, ...patch }); }

  function addItem() {
    const item: ItemLevantamiento = { descripcion: '', ubicacion: '', cantidad: 1, unidad: 'unidad', estado: 'bueno' };
    upd({ items: [...data.items, item] });
  }
  function updItem(i: number, p: Partial<ItemLevantamiento>) { const a = [...data.items]; a[i] = { ...a[i], ...p }; upd({ items: a }); }
  function remItem(i: number) { upd({ items: data.items.filter((_, idx) => idx !== i) }); }

  function addAmbiente() {
    const a: AmbienteLevantamiento = { nombre: '', dispositivos: [] };
    upd({ ambientes: [...ambientes, a] });
  }
  function updAmbiente(i: number, p: Partial<AmbienteLevantamiento>) { const a = [...ambientes]; a[i] = { ...a[i], ...p }; upd({ ambientes: a }); }
  function remAmbiente(i: number) { upd({ ambientes: ambientes.filter((_, idx) => idx !== i) }); }
  function toggleDispositivo(i: number, dispositivo: DispositivoDomotica) {
    const actual = ambientes[i].dispositivos;
    const next = actual.includes(dispositivo) ? actual.filter((d) => d !== dispositivo) : [...actual, dispositivo];
    updAmbiente(i, { dispositivos: next });
  }

  function addEquipo() {
    const e: EquipoCotizacion = { descripcion: '', cantidad: 1 };
    upd({ equiposCotizacion: [...equiposCotizacion, e] });
  }
  function updEquipo(i: number, p: Partial<EquipoCotizacion>) { const a = [...equiposCotizacion]; a[i] = { ...a[i], ...p }; upd({ equiposCotizacion: a }); }
  function remEquipo(i: number) { upd({ equiposCotizacion: equiposCotizacion.filter((_, idx) => idx !== i) }); }

  if (step === 'general') return (
    <SectionContainer>
      <Label>Propósito del levantamiento</Label>
      <OptionGroup options={[{ label: 'Presupuesto', value: 'presupuesto' }, { label: 'Inventario', value: 'inventario' }, { label: 'Diagnóstico', value: 'diagnostico' }, { label: 'Otro', value: 'otro' }]} selected={data.proposito} onSelect={(v) => upd({ proposito: v as FichaLevantamientoData['proposito'] })} />
      <Field label="Observaciones generales" value={data.observacionesGenerales ?? ''} onChange={(v) => upd({ observacionesGenerales: v })} multiline />
      {gpsText ? <Label>📍 {gpsText}</Label> : null}
    </SectionContainer>
  );

  if (step === 'conectividad') return (
    <SectionContainer>
      <Field label="Proveedor de internet" value={conectividad.proveedorInternet ?? ''} onChange={(v) => upd({ conectividad: { ...conectividad, proveedorInternet: v } })} placeholder="Ej: Claro, Altice" />
      <Label>Tipo de conexión</Label>
      <OptionGroup options={[{ label: 'Fibra', value: 'fibra' }, { label: 'Cable', value: 'cable' }, { label: 'DSL', value: 'dsl' }, { label: 'Satelital', value: 'satelital' }, { label: 'Otro', value: 'otro' }]} selected={conectividad.tipoConexion ?? ''} onSelect={(v) => upd({ conectividad: { ...conectividad, tipoConexion: v as typeof conectividad.tipoConexion } })} />
      <Field label="Velocidad contratada (Mbps)" value={conectividad.velocidadMbps ? String(conectividad.velocidadMbps) : ''} onChange={(v) => upd({ conectividad: { ...conectividad, velocidadMbps: parseFloat(v) || undefined } })} keyboardType="numeric" />
      <Field label="Ubicación del router" value={conectividad.ubicacionRouter ?? ''} onChange={(v) => upd({ conectividad: { ...conectividad, ubicacionRouter: v } })} placeholder="Ej: Sala, closet de telecom" />
      <BooleanToggle label="Requiere repetidor / access point adicional" value={conectividad.requiereRepetidor ?? false} onChange={(v) => upd({ conectividad: { ...conectividad, requiereRepetidor: v } })} />
      <Field label="Observaciones de conectividad" value={conectividad.observaciones ?? ''} onChange={(v) => upd({ conectividad: { ...conectividad, observaciones: v } })} multiline />
    </SectionContainer>
  );

  if (step === 'electrico') return (
    <SectionContainer>
      <Field label="Capacidad del panel principal (A)" value={electrico.capacidadPanelA ? String(electrico.capacidadPanelA) : ''} onChange={(v) => upd({ electrico: { ...electrico, capacidadPanelA: parseFloat(v) || undefined } })} keyboardType="numeric" placeholder="Ej: 100, 150, 200" />
      <Field label="Breakers libres en el panel" value={electrico.breakersLibres != null ? String(electrico.breakersLibres) : ''} onChange={(v) => upd({ electrico: { ...electrico, breakersLibres: parseFloat(v) || undefined } })} keyboardType="numeric" />
      <Label>¿Hay neutro en los interruptores de pared?</Label>
      <OptionGroup options={[{ label: 'Sí', value: 'si' }, { label: 'No', value: 'no' }, { label: 'Revisar en sitio', value: 'revisar' }]} selected={electrico.tieneNeutroInterruptores ?? ''} onSelect={(v) => upd({ electrico: { ...electrico, tieneNeutroInterruptores: v as typeof electrico.tieneNeutroInterruptores } })} />
      <Hint>Clave para instalar switches inteligentes de pared — sin neutro hacen falta módulos especiales.</Hint>
      <BooleanToggle label="Hay tomas eléctricas cerca de los puntos a instalar" value={electrico.tomasCercaDePuntos ?? false} onChange={(v) => upd({ electrico: { ...electrico, tomasCercaDePuntos: v } })} />
      <Field label="Observaciones eléctricas" value={electrico.observaciones ?? ''} onChange={(v) => upd({ electrico: { ...electrico, observaciones: v } })} multiline />
    </SectionContainer>
  );

  if (step === 'ambientes') return (
    <SectionContainer>
      {ambientes.map((a, idx) => (
        <ItemCard key={idx} title={`Ambiente: ${a.nombre || `#${idx + 1}`}`} onRemove={() => remAmbiente(idx)}>
          <Field label="Nombre del ambiente" value={a.nombre} onChange={(v) => updAmbiente(idx, { nombre: v })} placeholder="Ej: Sala, Cocina, Habitación principal" />
          <Label>Dispositivos planificados</Label>
          <MultiOptionGroup options={DISPOSITIVO_OPTIONS} selected={a.dispositivos} onToggle={(v) => toggleDispositivo(idx, v as DispositivoDomotica)} />
          <Field label="Tipo de puerta" value={a.tipoPuerta ?? ''} onChange={(v) => updAmbiente(idx, { tipoPuerta: v })} placeholder="Ej: Madera sólida, Vidrio" />
          <Field label="Tipo de ventana" value={a.tipoVentana ?? ''} onChange={(v) => updAmbiente(idx, { tipoVentana: v })} placeholder="Ej: Corrediza, Abatible" />
          <Field label="Altura de techo (m)" value={a.alturaTechoM ? String(a.alturaTechoM) : ''} onChange={(v) => updAmbiente(idx, { alturaTechoM: parseFloat(v) || undefined })} keyboardType="numeric" />
          <Field label="Material de pared" value={a.materialPared ?? ''} onChange={(v) => updAmbiente(idx, { materialPared: v })} placeholder="Ej: Bloque, Concreto, Yeso" />
          <Label>Señal WiFi en este ambiente</Label>
          <OptionGroup options={[{ label: 'Excelente', value: 'excelente' }, { label: 'Buena', value: 'buena' }, { label: 'Débil', value: 'debil' }, { label: 'Sin señal', value: 'sin_senal' }]} selected={a.senalWifi ?? ''} onSelect={(v) => updAmbiente(idx, { senalWifi: v as typeof a.senalWifi })} />
          <Field label="Observaciones" value={a.observaciones ?? ''} onChange={(v) => updAmbiente(idx, { observaciones: v })} multiline />
        </ItemCard>
      ))}
      <AddButton label="+ Agregar ambiente" onPress={addAmbiente} />
    </SectionContainer>
  );

  if (step === 'cotizacion') return (
    <SectionContainer>
      {equiposCotizacion.map((e, idx) => (
        <ItemCard key={idx} title={`Equipo #${idx + 1}: ${e.descripcion || '—'}`} onRemove={() => remEquipo(idx)}>
          <Field label="Descripción" value={e.descripcion} onChange={(v) => updEquipo(idx, { descripcion: v })} placeholder="Ej: Cámara exterior 2MP" />
          <Field label="Cantidad" value={String(e.cantidad)} onChange={(v) => updEquipo(idx, { cantidad: parseFloat(v) || 0 })} keyboardType="numeric" />
          <Field label="Precio unitario (RD$)" value={e.precioUnitarioRD != null ? String(e.precioUnitarioRD) : ''} onChange={(v) => updEquipo(idx, { precioUnitarioRD: parseFloat(v) || undefined })} keyboardType="numeric" />
        </ItemCard>
      ))}
      <AddButton label="+ Agregar equipo" onPress={addEquipo} />
      {equiposCotizacion.length > 0 ? (
        <Label>
          Total estimado: RD$ {equiposCotizacion.reduce((sum, e) => sum + e.cantidad * (e.precioUnitarioRD ?? 0), 0).toLocaleString('es-DO')}
        </Label>
      ) : null}
    </SectionContainer>
  );

  return (
    <SectionContainer>
      {data.items.map((item, idx) => (
        <ItemCard key={idx} title={`Item #${idx + 1}: ${item.descripcion || '—'}`} onRemove={() => remItem(idx)}>
          <Field label="Descripción" value={item.descripcion} onChange={(v) => updItem(idx, { descripcion: v })} placeholder="Ej: Tubería PVC 2 pulgadas" />
          <Field label="Ubicación" value={item.ubicacion} onChange={(v) => updItem(idx, { ubicacion: v })} placeholder="Ej: Cocina, Pasillo norte" />
          <Field label="Cantidad" value={String(item.cantidad)} onChange={(v) => updItem(idx, { cantidad: parseFloat(v) || 0 })} keyboardType="numeric" />
          <Label>Unidad</Label>
          <OptionGroup options={[{ label: 'Unidad', value: 'unidad' }, { label: 'Metro', value: 'metro' }, { label: 'M²', value: 'm2' }, { label: 'Otro', value: 'otro' }]} selected={item.unidad} onSelect={(v) => updItem(idx, { unidad: v })} />
          <Label>Estado</Label>
          <OptionGroup options={[{ label: 'Bueno', value: 'bueno' }, { label: 'Regular', value: 'regular' }, { label: 'Malo', value: 'malo' }]} selected={item.estado} onSelect={(v) => updItem(idx, { estado: v as ItemLevantamiento['estado'] })} />
          <Field label="Observaciones" value={item.observaciones ?? ''} onChange={(v) => updItem(idx, { observaciones: v })} multiline />
        </ItemCard>
      ))}
      <AddButton label="+ Agregar item" onPress={addItem} />
    </SectionContainer>
  );
}
