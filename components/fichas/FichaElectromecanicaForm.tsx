import React from 'react';
import { FichaElectromecanicaData, Equipo } from '../../lib/types/ficha-electromecanica.types';
import { Label, Field, OptionGroup, ItemCard, AddButton, SectionContainer } from './FormPrimitives';

type Step = 'general' | 'equipos' | 'materiales' | 'mediciones';
export const ELECTROMECANICA_STEPS: Step[] = ['general', 'equipos', 'materiales', 'mediciones'];
export const ELECTROMECANICA_STEP_LABELS: Record<Step, string> = {
  general: 'Info general', equipos: 'Equipos', materiales: 'Materiales', mediciones: 'Mediciones',
};

export function defaultElectromecanicaData(): FichaElectromecanicaData {
  return { tipoTrabajo: 'mantenimiento', equipos: [], materiales: [], mediciones: {} };
}

interface Props { step: Step; data: FichaElectromecanicaData; onChange: (d: FichaElectromecanicaData) => void; gpsText?: string; }

export default function FichaElectromecanicaForm({ step, data, onChange, gpsText }: Props) {
  function upd(patch: Partial<FichaElectromecanicaData>) { onChange({ ...data, ...patch }); }

  function addEquipo() {
    const e: Equipo = { nombre: '', marca: '', voltaje: '240V', estado: 'bueno' };
    upd({ equipos: [...data.equipos, e] });
  }
  function updEquipo(i: number, p: Partial<Equipo>) { const a = [...data.equipos]; a[i] = { ...a[i], ...p }; upd({ equipos: a }); }
  function remEquipo(i: number) { upd({ equipos: data.equipos.filter((_, idx) => idx !== i) }); }

  function addMaterial() { upd({ materiales: [...data.materiales, { descripcion: '', unidad: 'unidad', cantidad: 1 }] }); }
  function updMaterial(i: number, p: Partial<{ descripcion: string; unidad: string; cantidad: number }>) {
    const a = [...data.materiales]; a[i] = { ...a[i], ...p }; upd({ materiales: a });
  }
  function remMaterial(i: number) { upd({ materiales: data.materiales.filter((_, idx) => idx !== i) }); }

  if (step === 'general') return (
    <SectionContainer>
      <Label>Tipo de trabajo</Label>
      <OptionGroup options={[{ label: 'Instalación nueva', value: 'instalacion_nueva' }, { label: 'Mantenimiento', value: 'mantenimiento' }, { label: 'Reparación', value: 'reparacion' }, { label: 'Diagnóstico', value: 'diagnostico' }]} selected={data.tipoTrabajo} onSelect={(v) => upd({ tipoTrabajo: v as FichaElectromecanicaData['tipoTrabajo'] })} />
      {gpsText ? <Label>📍 {gpsText}</Label> : null}
    </SectionContainer>
  );

  if (step === 'equipos') return (
    <SectionContainer>
      {data.equipos.map((e, idx) => (
        <ItemCard key={idx} title={`Equipo: ${e.nombre || `#${idx + 1}`}`} onRemove={() => remEquipo(idx)}>
          <Field label="Nombre del equipo" value={e.nombre} onChange={(v) => updEquipo(idx, { nombre: v })} placeholder="Ej: Bomba de agua, Motor, A/C" />
          <Field label="Marca" value={e.marca} onChange={(v) => updEquipo(idx, { marca: v })} />
          <Field label="Modelo" value={e.modelo ?? ''} onChange={(v) => updEquipo(idx, { modelo: v })} />
          <Field label="Serial" value={e.serial ?? ''} onChange={(v) => updEquipo(idx, { serial: v })} />
          <Field label="Potencia (HP)" value={e.potenciaHP ? String(e.potenciaHP) : ''} onChange={(v) => updEquipo(idx, { potenciaHP: parseFloat(v) || undefined })} keyboardType="numeric" />
          <Field label="Voltaje" value={e.voltaje} onChange={(v) => updEquipo(idx, { voltaje: v })} placeholder="Ej: 120V, 240V" />
          <Field label="Corriente (A)" value={e.corrienteA ? String(e.corrienteA) : ''} onChange={(v) => updEquipo(idx, { corrienteA: parseFloat(v) || undefined })} keyboardType="numeric" />
          <Label>Estado</Label>
          <OptionGroup options={[{ label: 'Bueno', value: 'bueno' }, { label: 'Regular', value: 'regular' }, { label: 'Malo', value: 'malo' }, { label: 'Inoperante', value: 'inoperante' }]} selected={e.estado} onSelect={(v) => updEquipo(idx, { estado: v as Equipo['estado'] })} />
          <Field label="Observaciones" value={e.observaciones ?? ''} onChange={(v) => updEquipo(idx, { observaciones: v })} multiline />
        </ItemCard>
      ))}
      <AddButton label="+ Agregar equipo" onPress={addEquipo} />
    </SectionContainer>
  );

  if (step === 'materiales') return (
    <SectionContainer>
      {data.materiales.map((m, idx) => (
        <ItemCard key={idx} title={`Material #${idx + 1}`} onRemove={() => remMaterial(idx)}>
          <Field label="Descripción" value={m.descripcion} onChange={(v) => updMaterial(idx, { descripcion: v })} />
          <Field label="Cantidad" value={String(m.cantidad)} onChange={(v) => updMaterial(idx, { cantidad: parseFloat(v) || 0 })} keyboardType="numeric" />
          <Label>Unidad</Label>
          <OptionGroup options={[{ label: 'Unidad', value: 'unidad' }, { label: 'Metro', value: 'metro' }, { label: 'Caja', value: 'caja' }, { label: 'Litro', value: 'litro' }]} selected={m.unidad} onSelect={(v) => updMaterial(idx, { unidad: v })} />
        </ItemCard>
      ))}
      <AddButton label="+ Agregar material" onPress={addMaterial} />
    </SectionContainer>
  );

  // mediciones
  const med = data.mediciones ?? {};
  return (
    <SectionContainer>
      <Field label="Presión (PSI)" value={med.presionPSI ? String(med.presionPSI) : ''} onChange={(v) => upd({ mediciones: { ...med, presionPSI: parseFloat(v) || undefined } })} keyboardType="numeric" />
      <Field label="Temperatura (°C)" value={med.temperaturaCelsius ? String(med.temperaturaCelsius) : ''} onChange={(v) => upd({ mediciones: { ...med, temperaturaCelsius: parseFloat(v) || undefined } })} keyboardType="numeric" />
      <Field label="Vibración" value={med.vibracion ?? ''} onChange={(v) => upd({ mediciones: { ...med, vibracion: v } })} placeholder="Ej: Normal, Elevada, Alta" />
      <Field label="Nivel de ruido" value={med.ruido ?? ''} onChange={(v) => upd({ mediciones: { ...med, ruido: v } })} placeholder="Ej: Normal, Elevado, Anormal" />
    </SectionContainer>
  );
}
