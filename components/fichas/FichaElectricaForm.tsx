import React from 'react';
import { View, TextInput, ScrollView, StyleSheet } from 'react-native';
import { FichaElectricaData, Tablero, Circuito, Material } from '../../lib/api';
import { Label, Field, OptionGroup, ItemCard, AddButton, SectionContainer } from './FormPrimitives';

function uid() { return Math.random().toString(36).slice(2, 9); }

type Step = 'general' | 'tableros' | 'circuitos' | 'materiales';

interface Props {
  step: Step;
  data: FichaElectricaData;
  onChange: (d: FichaElectricaData) => void;
  gpsText?: string;
}

export const ELECTRICA_STEPS: Step[] = ['general', 'tableros', 'circuitos', 'materiales'];
export const ELECTRICA_STEP_LABELS: Record<Step, string> = {
  general: 'Info general',
  tableros: 'Tableros',
  circuitos: 'Circuitos',
  materiales: 'Materiales',
};

export function defaultElectricaData(): FichaElectricaData {
  return { tipoTrabajo: 'instalacion_nueva', voltajeServicio: '120V', fases: 'monofasico', tableros: [], circuitos: [], materiales: [] };
}

export default function FichaElectricaForm({ step, data, onChange, gpsText }: Props) {
  function upd(patch: Partial<FichaElectricaData>) { onChange({ ...data, ...patch }); }

  function addTablero() {
    const t: Tablero = { id: uid(), nombre: '', tipo: 'principal', amperaje: 100, voltaje: data.voltajeServicio, fases: data.fases, estado: 'bueno' };
    upd({ tableros: [...data.tableros, t] });
  }
  function updTablero(id: string, p: Partial<Tablero>) { upd({ tableros: data.tableros.map((t) => t.id === id ? { ...t, ...p } : t) }); }
  function remTablero(id: string) { upd({ tableros: data.tableros.filter((t) => t.id !== id) }); }

  function addCircuito() {
    const c: Circuito = { numero: String(data.circuitos.length + 1), descripcion: '', breakerA: 20, calibreAWG: '12', tipo: 'tomacorriente', estado: 'nuevo' };
    upd({ circuitos: [...data.circuitos, c] });
  }
  function updCircuito(i: number, p: Partial<Circuito>) { const a = [...data.circuitos]; a[i] = { ...a[i], ...p }; upd({ circuitos: a }); }
  function remCircuito(i: number) { upd({ circuitos: data.circuitos.filter((_, idx) => idx !== i) }); }

  function addMaterial() { upd({ materiales: [...data.materiales, { descripcion: '', unidad: 'unidad', cantidad: 1 }] }); }
  function updMaterial(i: number, p: Partial<Material>) { const a = [...data.materiales]; a[i] = { ...a[i], ...p }; upd({ materiales: a }); }
  function remMaterial(i: number) { upd({ materiales: data.materiales.filter((_, idx) => idx !== i) }); }

  if (step === 'general') return (
    <SectionContainer>
      <Label>Tipo de trabajo</Label>
      <OptionGroup options={[{ label: 'Instalación nueva', value: 'instalacion_nueva' }, { label: 'Remodelación', value: 'remodelacion' }, { label: 'Mantenimiento', value: 'mantenimiento' }, { label: 'Diagnóstico', value: 'diagnostico' }]} selected={data.tipoTrabajo} onSelect={(v) => upd({ tipoTrabajo: v as FichaElectricaData['tipoTrabajo'] })} />
      <Label>Voltaje de servicio</Label>
      <OptionGroup options={[{ label: '120V', value: '120V' }, { label: '240V', value: '240V' }, { label: '480V', value: '480V' }, { label: 'Otro', value: 'otro' }]} selected={data.voltajeServicio} onSelect={(v) => upd({ voltajeServicio: v as FichaElectricaData['voltajeServicio'] })} />
      <Label>Fases</Label>
      <OptionGroup options={[{ label: 'Monofásico', value: 'monofasico' }, { label: 'Bifásico', value: 'bifasico' }, { label: 'Trifásico', value: 'trifasico' }]} selected={data.fases} onSelect={(v) => upd({ fases: v as FichaElectricaData['fases'] })} />
      {gpsText ? <Label>📍 {gpsText}</Label> : null}
    </SectionContainer>
  );

  if (step === 'tableros') return (
    <SectionContainer>
      {data.tableros.map((t) => (
        <ItemCard key={t.id} title="Tablero" onRemove={() => remTablero(t.id)}>
          <Field label="Nombre" value={t.nombre} onChange={(v) => updTablero(t.id, { nombre: v })} placeholder="Ej: Tablero principal" />
          <Label>Tipo</Label>
          <OptionGroup options={[{ label: 'Principal', value: 'principal' }, { label: 'Secundario', value: 'secundario' }, { label: 'Distribución', value: 'distribucion' }, { label: 'Otro', value: 'otro' }]} selected={t.tipo} onSelect={(v) => updTablero(t.id, { tipo: v as Tablero['tipo'] })} />
          <Field label="Amperaje (A)" value={String(t.amperaje)} onChange={(v) => updTablero(t.id, { amperaje: parseFloat(v) || 0 })} keyboardType="numeric" />
          <Label>Estado</Label>
          <OptionGroup options={[{ label: 'Bueno', value: 'bueno' }, { label: 'Regular', value: 'regular' }, { label: 'Malo', value: 'malo' }, { label: 'Nuevo', value: 'nuevo' }]} selected={t.estado} onSelect={(v) => updTablero(t.id, { estado: v as Tablero['estado'] })} />
          <Field label="Observaciones" value={t.observaciones ?? ''} onChange={(v) => updTablero(t.id, { observaciones: v })} multiline />
        </ItemCard>
      ))}
      <AddButton label="+ Agregar tablero" onPress={addTablero} />
    </SectionContainer>
  );

  if (step === 'circuitos') return (
    <SectionContainer>
      {data.circuitos.map((c, idx) => (
        <ItemCard key={idx} title={`Circuito #${c.numero}`} onRemove={() => remCircuito(idx)}>
          <Field label="Descripción" value={c.descripcion} onChange={(v) => updCircuito(idx, { descripcion: v })} placeholder="Ej: Tomacorrientes sala" />
          <Field label="Breaker (A)" value={String(c.breakerA)} onChange={(v) => updCircuito(idx, { breakerA: parseFloat(v) || 0 })} keyboardType="numeric" />
          <Field label="Calibre AWG" value={c.calibreAWG} onChange={(v) => updCircuito(idx, { calibreAWG: v })} placeholder="Ej: 12" />
          <Field label="Longitud (m)" value={c.longitud ? String(c.longitud) : ''} onChange={(v) => updCircuito(idx, { longitud: parseFloat(v) || undefined })} keyboardType="numeric" />
          <Label>Tipo</Label>
          <OptionGroup options={[{ label: 'Iluminación', value: 'iluminacion' }, { label: 'Tomacorriente', value: 'tomacorriente' }, { label: 'HVAC', value: 'hvac' }, { label: 'Motor', value: 'motor' }, { label: 'Otro', value: 'otro' }]} selected={c.tipo} onSelect={(v) => updCircuito(idx, { tipo: v as Circuito['tipo'] })} />
          <Label>Estado</Label>
          <OptionGroup options={[{ label: 'Activo', value: 'activo' }, { label: 'Nuevo', value: 'nuevo' }, { label: 'Inactivo', value: 'inactivo' }, { label: 'Reemplazar', value: 'reemplazar' }]} selected={c.estado} onSelect={(v) => updCircuito(idx, { estado: v as Circuito['estado'] })} />
        </ItemCard>
      ))}
      <AddButton label="+ Agregar circuito" onPress={addCircuito} />
    </SectionContainer>
  );

  return (
    <SectionContainer>
      {data.materiales.map((m, idx) => (
        <ItemCard key={idx} title={`Material #${idx + 1}`} onRemove={() => remMaterial(idx)}>
          <Field label="Descripción" value={m.descripcion} onChange={(v) => updMaterial(idx, { descripcion: v })} placeholder="Ej: Cable THHN #12" />
          <Field label="Cantidad" value={String(m.cantidad)} onChange={(v) => updMaterial(idx, { cantidad: parseFloat(v) || 0 })} keyboardType="numeric" />
          <Label>Unidad</Label>
          <OptionGroup options={[{ label: 'Unidad', value: 'unidad' }, { label: 'Metro', value: 'metro' }, { label: 'Caja', value: 'caja' }, { label: 'Rollo', value: 'rollo' }]} selected={m.unidad} onSelect={(v) => updMaterial(idx, { unidad: v as Material['unidad'] })} />
        </ItemCard>
      ))}
      <AddButton label="+ Agregar material" onPress={addMaterial} />
    </SectionContainer>
  );
}
