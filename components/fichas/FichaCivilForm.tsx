import React from 'react';
import { FichaCivilData, AreaCivil } from '../../lib/types/ficha-civil.types';
import { Label, Field, OptionGroup, ItemCard, AddButton, BooleanToggle, SectionContainer } from './FormPrimitives';

type Step = 'general' | 'areas' | 'estructura' | 'materiales';
export const CIVIL_STEPS: Step[] = ['general', 'areas', 'estructura', 'materiales'];
export const CIVIL_STEP_LABELS: Record<Step, string> = {
  general: 'Info general', areas: 'Áreas', estructura: 'Estructura', materiales: 'Materiales',
};

export function defaultCivilData(): FichaCivilData {
  return { tipoTrabajo: 'obra_nueva', areas: [], materiales: [], estructura: { estadoGeneral: 'bueno' } };
}

interface Props { step: Step; data: FichaCivilData; onChange: (d: FichaCivilData) => void; gpsText?: string; }

export default function FichaCivilForm({ step, data, onChange, gpsText }: Props) {
  function upd(patch: Partial<FichaCivilData>) { onChange({ ...data, ...patch }); }

  function addArea() {
    const a: AreaCivil = { nombre: '', largo: 0, ancho: 0, alto: 0, pisoMaterial: '', paredesMaterial: '', techMaterial: '', estado: 'bueno' };
    upd({ areas: [...data.areas, a] });
  }
  function updArea(i: number, p: Partial<AreaCivil>) { const a = [...data.areas]; a[i] = { ...a[i], ...p }; upd({ areas: a }); }
  function remArea(i: number) { upd({ areas: data.areas.filter((_, idx) => idx !== i) }); }

  function addMaterial() { upd({ materiales: [...data.materiales, { descripcion: '', unidad: 'unidad', cantidad: 1 }] }); }
  function updMaterial(i: number, p: Partial<{ descripcion: string; unidad: string; cantidad: number }>) {
    const a = [...data.materiales]; a[i] = { ...a[i], ...p }; upd({ materiales: a });
  }
  function remMaterial(i: number) { upd({ materiales: data.materiales.filter((_, idx) => idx !== i) }); }

  if (step === 'general') return (
    <SectionContainer>
      <Label>Tipo de trabajo</Label>
      <OptionGroup options={[{ label: 'Obra nueva', value: 'obra_nueva' }, { label: 'Remodelación', value: 'remodelacion' }, { label: 'Reparación', value: 'reparacion' }, { label: 'Diagnóstico', value: 'diagnostico' }]} selected={data.tipoTrabajo} onSelect={(v) => upd({ tipoTrabajo: v as FichaCivilData['tipoTrabajo'] })} />
      {gpsText ? <Label>📍 {gpsText}</Label> : null}
    </SectionContainer>
  );

  if (step === 'areas') return (
    <SectionContainer>
      {data.areas.map((a, idx) => (
        <ItemCard key={idx} title={`Área: ${a.nombre || `#${idx + 1}`}`} onRemove={() => remArea(idx)}>
          <Field label="Nombre del área" value={a.nombre} onChange={(v) => updArea(idx, { nombre: v })} placeholder="Ej: Sala, Cocina, Baño" />
          <Field label="Largo (m)" value={a.largo ? String(a.largo) : ''} onChange={(v) => updArea(idx, { largo: parseFloat(v) || 0 })} keyboardType="numeric" />
          <Field label="Ancho (m)" value={a.ancho ? String(a.ancho) : ''} onChange={(v) => updArea(idx, { ancho: parseFloat(v) || 0 })} keyboardType="numeric" />
          <Field label="Alto (m)" value={a.alto ? String(a.alto) : ''} onChange={(v) => updArea(idx, { alto: parseFloat(v) || 0 })} keyboardType="numeric" />
          <Field label="Material de piso" value={a.pisoMaterial} onChange={(v) => updArea(idx, { pisoMaterial: v })} placeholder="Ej: Cerámica, Granito, Cemento" />
          <Field label="Material de paredes" value={a.paredesMaterial} onChange={(v) => updArea(idx, { paredesMaterial: v })} placeholder="Ej: Bloque, Yeso, Concreto" />
          <Field label="Material de techo" value={a.techMaterial} onChange={(v) => updArea(idx, { techMaterial: v })} placeholder="Ej: Loseta, Zinc, Concreto" />
          <Label>Estado</Label>
          <OptionGroup options={[{ label: 'Bueno', value: 'bueno' }, { label: 'Regular', value: 'regular' }, { label: 'Malo', value: 'malo' }]} selected={a.estado} onSelect={(v) => updArea(idx, { estado: v as AreaCivil['estado'] })} />
          <Field label="Observaciones" value={a.observaciones ?? ''} onChange={(v) => updArea(idx, { observaciones: v })} multiline />
        </ItemCard>
      ))}
      <AddButton label="+ Agregar área" onPress={addArea} />
    </SectionContainer>
  );

  if (step === 'estructura') return (
    <SectionContainer>
      <Field label="Tipo de fundación" value={data.estructura.tipoFundacion ?? ''} onChange={(v) => upd({ estructura: { ...data.estructura, tipoFundacion: v } })} placeholder="Ej: Zapata corrida, Pilotes" />
      <Field label="Tipo de columnas" value={data.estructura.tipoColumnas ?? ''} onChange={(v) => upd({ estructura: { ...data.estructura, tipoColumnas: v } })} placeholder="Ej: Concreto armado, Metálicas" />
      <Label>Estado general de la estructura</Label>
      <OptionGroup options={[{ label: 'Bueno', value: 'bueno' }, { label: 'Regular', value: 'regular' }, { label: 'Malo', value: 'malo' }, { label: 'Crítico', value: 'critico' }]} selected={data.estructura.estadoGeneral} onSelect={(v) => upd({ estructura: { ...data.estructura, estadoGeneral: v as typeof data.estructura.estadoGeneral } })} />
      <Field label="Observaciones estructurales" value={data.estructura.observaciones ?? ''} onChange={(v) => upd({ estructura: { ...data.estructura, observaciones: v } })} multiline />
    </SectionContainer>
  );

  return (
    <SectionContainer>
      {data.materiales.map((m, idx) => (
        <ItemCard key={idx} title={`Material #${idx + 1}`} onRemove={() => remMaterial(idx)}>
          <Field label="Descripción" value={m.descripcion} onChange={(v) => updMaterial(idx, { descripcion: v })} />
          <Field label="Cantidad" value={String(m.cantidad)} onChange={(v) => updMaterial(idx, { cantidad: parseFloat(v) || 0 })} keyboardType="numeric" />
          <Label>Unidad</Label>
          <OptionGroup options={[{ label: 'Unidad', value: 'unidad' }, { label: 'Metro', value: 'metro' }, { label: 'M²', value: 'm2' }, { label: 'Bolsa', value: 'bolsa' }, { label: 'Galón', value: 'galon' }]} selected={m.unidad} onSelect={(v) => updMaterial(idx, { unidad: v })} />
        </ItemCard>
      ))}
      <AddButton label="+ Agregar material" onPress={addMaterial} />
    </SectionContainer>
  );
}
