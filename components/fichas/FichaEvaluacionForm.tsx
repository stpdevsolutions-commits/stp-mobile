import React from 'react';
import { FichaEvaluacionData, AreaDano } from '../../lib/types/ficha-evaluacion.types';
import { Label, Field, OptionGroup, ItemCard, AddButton, BooleanToggle, SectionContainer } from './FormPrimitives';

type Step = 'general' | 'areas';
export const EVALUACION_STEPS: Step[] = ['general', 'areas'];
export const EVALUACION_STEP_LABELS: Record<Step, string> = { general: 'Evaluación', areas: 'Áreas dañadas' };

export function defaultEvaluacionData(): FichaEvaluacionData {
  return { causaDano: 'deterioro', urgencia: 'media', areas: [], estructuraAfectada: false, riesgoPersonas: false };
}

interface Props { step: Step; data: FichaEvaluacionData; onChange: (d: FichaEvaluacionData) => void; gpsText?: string; }

export default function FichaEvaluacionForm({ step, data, onChange, gpsText }: Props) {
  function upd(patch: Partial<FichaEvaluacionData>) { onChange({ ...data, ...patch }); }

  function addArea() {
    const a: AreaDano = { nombre: '', descripcionDano: '', severidad: 'leve', accionRecomendada: '' };
    upd({ areas: [...data.areas, a] });
  }
  function updArea(i: number, p: Partial<AreaDano>) { const a = [...data.areas]; a[i] = { ...a[i], ...p }; upd({ areas: a }); }
  function remArea(i: number) { upd({ areas: data.areas.filter((_, idx) => idx !== i) }); }

  if (step === 'general') return (
    <SectionContainer>
      <Label>Causa del daño</Label>
      <OptionGroup options={[{ label: 'Humedad', value: 'humedad' }, { label: 'Sismo', value: 'sismo' }, { label: 'Viento', value: 'viento' }, { label: 'Incendio', value: 'incendio' }, { label: 'Vandalismo', value: 'vandalismo' }, { label: 'Deterioro', value: 'deterioro' }, { label: 'Otro', value: 'otro' }]} selected={data.causaDano} onSelect={(v) => upd({ causaDano: v as FichaEvaluacionData['causaDano'] })} />
      <Label>Urgencia de intervención</Label>
      <OptionGroup options={[{ label: '🔴 Inmediata', value: 'inmediata' }, { label: '🟠 Alta', value: 'alta' }, { label: '🟡 Media', value: 'media' }, { label: '🟢 Baja', value: 'baja' }]} selected={data.urgencia} onSelect={(v) => upd({ urgencia: v as FichaEvaluacionData['urgencia'] })} />
      <BooleanToggle label="¿Estructura afectada?" value={data.estructuraAfectada} onChange={(v) => upd({ estructuraAfectada: v })} />
      <BooleanToggle label="¿Riesgo para personas?" value={data.riesgoPersonas} onChange={(v) => upd({ riesgoPersonas: v })} />
      <Field label="Costo estimado (RD$)" value={data.costoEstimado ? String(data.costoEstimado) : ''} onChange={(v) => upd({ costoEstimado: parseFloat(v) || undefined })} keyboardType="numeric" />
      <Field label="Observaciones generales" value={data.observacionesGenerales ?? ''} onChange={(v) => upd({ observacionesGenerales: v })} multiline />
      {gpsText ? <Label>📍 {gpsText}</Label> : null}
    </SectionContainer>
  );

  return (
    <SectionContainer>
      {data.areas.map((a, idx) => (
        <ItemCard key={idx} title={`Área: ${a.nombre || `#${idx + 1}`}`} onRemove={() => remArea(idx)}>
          <Field label="Nombre del área" value={a.nombre} onChange={(v) => updArea(idx, { nombre: v })} placeholder="Ej: Techo, Fachada, Cuarto" />
          <Field label="Descripción del daño" value={a.descripcionDano} onChange={(v) => updArea(idx, { descripcionDano: v })} multiline placeholder="Describe detalladamente el daño observado" />
          <Label>Severidad</Label>
          <OptionGroup options={[{ label: '🟡 Leve', value: 'leve' }, { label: '🟠 Moderado', value: 'moderado' }, { label: '🔴 Grave', value: 'grave' }, { label: '⬛ Total', value: 'total' }]} selected={a.severidad} onSelect={(v) => updArea(idx, { severidad: v as AreaDano['severidad'] })} />
          <Field label="Acción recomendada" value={a.accionRecomendada} onChange={(v) => updArea(idx, { accionRecomendada: v })} multiline placeholder="Ej: Reparar inmediatamente, Reemplazar, Monitorear" />
        </ItemCard>
      ))}
      <AddButton label="+ Agregar área dañada" onPress={addArea} />
    </SectionContainer>
  );
}
