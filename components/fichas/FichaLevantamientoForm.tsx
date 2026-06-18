import React from 'react';
import { FichaLevantamientoData, ItemLevantamiento } from '../../lib/types/ficha-levantamiento.types';
import { Label, Field, OptionGroup, ItemCard, AddButton, SectionContainer } from './FormPrimitives';

type Step = 'general' | 'items';
export const LEVANTAMIENTO_STEPS: Step[] = ['general', 'items'];
export const LEVANTAMIENTO_STEP_LABELS: Record<Step, string> = { general: 'Info general', items: 'Inventario' };

export function defaultLevantamientoData(): FichaLevantamientoData {
  return { proposito: 'presupuesto', items: [] };
}

interface Props { step: Step; data: FichaLevantamientoData; onChange: (d: FichaLevantamientoData) => void; gpsText?: string; }

export default function FichaLevantamientoForm({ step, data, onChange, gpsText }: Props) {
  function upd(patch: Partial<FichaLevantamientoData>) { onChange({ ...data, ...patch }); }

  function addItem() {
    const item: ItemLevantamiento = { descripcion: '', ubicacion: '', cantidad: 1, unidad: 'unidad', estado: 'bueno' };
    upd({ items: [...data.items, item] });
  }
  function updItem(i: number, p: Partial<ItemLevantamiento>) { const a = [...data.items]; a[i] = { ...a[i], ...p }; upd({ items: a }); }
  function remItem(i: number) { upd({ items: data.items.filter((_, idx) => idx !== i) }); }

  if (step === 'general') return (
    <SectionContainer>
      <Label>Propósito del levantamiento</Label>
      <OptionGroup options={[{ label: 'Presupuesto', value: 'presupuesto' }, { label: 'Inventario', value: 'inventario' }, { label: 'Diagnóstico', value: 'diagnostico' }, { label: 'Otro', value: 'otro' }]} selected={data.proposito} onSelect={(v) => upd({ proposito: v as FichaLevantamientoData['proposito'] })} />
      <Field label="Observaciones generales" value={data.observacionesGenerales ?? ''} onChange={(v) => upd({ observacionesGenerales: v })} multiline />
      {gpsText ? <Label>📍 {gpsText}</Label> : null}
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
