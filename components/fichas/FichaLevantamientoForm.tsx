import React from 'react';
import {
  FichaLevantamientoData, ItemLevantamiento, PuntoElectrico, MaterialSeleccionado,
  CategoriaPuntoElectrico, CATEGORIA_PUNTO_LABEL, TIPOS_POR_CATEGORIA,
} from '../../lib/types/ficha-levantamiento.types';
import { Label, Field, OptionGroup, ItemCard, AddButton, SectionContainer } from './FormPrimitives';
import MaterialPicker, { MaterialElegido } from './MaterialPicker';

type Step = 'general' | 'puntos_electricos' | 'materiales' | 'items';
export const LEVANTAMIENTO_STEPS: Step[] = ['general', 'puntos_electricos', 'materiales', 'items'];
export const LEVANTAMIENTO_STEP_LABELS: Record<Step, string> = {
  general: 'Info general',
  puntos_electricos: 'Puntos eléctricos',
  materiales: 'Materiales',
  items: 'Inventario',
};

const CATEGORIA_OPTIONS = (Object.keys(CATEGORIA_PUNTO_LABEL) as CategoriaPuntoElectrico[]).map((v) => ({
  label: CATEGORIA_PUNTO_LABEL[v],
  value: v,
}));

export function defaultLevantamientoData(): FichaLevantamientoData {
  return {
    proposito: 'presupuesto',
    items: [],
    puntosElectricos: [],
    materiales: [],
  };
}

interface Props { step: Step; data: FichaLevantamientoData; onChange: (d: FichaLevantamientoData) => void; gpsText?: string; }

export default function FichaLevantamientoForm({ step, data, onChange, gpsText }: Props) {
  // Fichas creadas antes de este cambio no traen estas secciones — se rellenan al vuelo.
  const puntosElectricos = data.puntosElectricos ?? [];
  const materiales = data.materiales ?? [];

  function upd(patch: Partial<FichaLevantamientoData>) { onChange({ ...data, ...patch }); }

  function addItem() {
    const item: ItemLevantamiento = { descripcion: '', ubicacion: '', cantidad: 1, unidad: 'unidad', estado: 'bueno' };
    upd({ items: [...data.items, item] });
  }
  function updItem(i: number, p: Partial<ItemLevantamiento>) { const a = [...data.items]; a[i] = { ...a[i], ...p }; upd({ items: a }); }
  function remItem(i: number) { upd({ items: data.items.filter((_, idx) => idx !== i) }); }

  function addPunto() {
    const p: PuntoElectrico = { categoria: 'tomacorriente', tipo: TIPOS_POR_CATEGORIA.tomacorriente[0], cantidad: 1 };
    upd({ puntosElectricos: [...puntosElectricos, p] });
  }
  function updPunto(i: number, p: Partial<PuntoElectrico>) { const a = [...puntosElectricos]; a[i] = { ...a[i], ...p }; upd({ puntosElectricos: a }); }
  function remPunto(i: number) { upd({ puntosElectricos: puntosElectricos.filter((_, idx) => idx !== i) }); }
  function cambiarCategoria(i: number, categoria: CategoriaPuntoElectrico) {
    // Al cambiar de categoría, el tipo elegido deja de tener sentido — se resetea al primero de la nueva lista.
    updPunto(i, { categoria, tipo: TIPOS_POR_CATEGORIA[categoria][0] });
  }

  function addMaterialDesdeCatalogo(m: MaterialElegido) {
    const nuevo: MaterialSeleccionado = {
      materialId: m.materialId,
      codigo: m.codigo,
      descripcion: m.descripcion,
      unidad: m.unidad,
      cantidad: 1,
      precioUnitarioRD: m.precioUnitarioRD,
    };
    upd({ materiales: [...materiales, nuevo] });
  }
  function addMaterialManual() {
    const nuevo: MaterialSeleccionado = { descripcion: '', cantidad: 1 };
    upd({ materiales: [...materiales, nuevo] });
  }
  function updMaterial(i: number, p: Partial<MaterialSeleccionado>) { const a = [...materiales]; a[i] = { ...a[i], ...p }; upd({ materiales: a }); }
  function remMaterial(i: number) { upd({ materiales: materiales.filter((_, idx) => idx !== i) }); }

  if (step === 'general') return (
    <SectionContainer>
      <Label>Propósito del levantamiento</Label>
      <OptionGroup options={[{ label: 'Presupuesto', value: 'presupuesto' }, { label: 'Inventario', value: 'inventario' }, { label: 'Diagnóstico', value: 'diagnostico' }, { label: 'Otro', value: 'otro' }]} selected={data.proposito} onSelect={(v) => upd({ proposito: v as FichaLevantamientoData['proposito'] })} />
      <Field label="Observaciones generales" value={data.observacionesGenerales ?? ''} onChange={(v) => upd({ observacionesGenerales: v })} multiline />
      {gpsText ? <Label>📍 {gpsText}</Label> : null}
    </SectionContainer>
  );

  if (step === 'puntos_electricos') return (
    <SectionContainer>
      {puntosElectricos.map((p, idx) => (
        <ItemCard key={idx} title={`${CATEGORIA_PUNTO_LABEL[p.categoria]} #${idx + 1}`} onRemove={() => remPunto(idx)}>
          <Label>Categoría</Label>
          <OptionGroup options={CATEGORIA_OPTIONS} selected={p.categoria} onSelect={(v) => cambiarCategoria(idx, v as CategoriaPuntoElectrico)} />
          <Label>Tipo</Label>
          <OptionGroup options={TIPOS_POR_CATEGORIA[p.categoria].map((t) => ({ label: t, value: t }))} selected={p.tipo} onSelect={(v) => updPunto(idx, { tipo: v })} />
          <Field label="Cantidad" value={String(p.cantidad)} onChange={(v) => updPunto(idx, { cantidad: parseFloat(v) || 0 })} keyboardType="numeric" />
          <Field label="Ubicación" value={p.ubicacion ?? ''} onChange={(v) => updPunto(idx, { ubicacion: v })} placeholder="Ej: Sala, Habitación 1, Cocina" />
          <Field label="Observaciones" value={p.observaciones ?? ''} onChange={(v) => updPunto(idx, { observaciones: v })} multiline />
        </ItemCard>
      ))}
      <AddButton label="+ Agregar punto eléctrico" onPress={addPunto} />
    </SectionContainer>
  );

  if (step === 'materiales') return (
    <SectionContainer>
      <Label>Buscar en el catálogo del ERP</Label>
      <MaterialPicker onSelect={addMaterialDesdeCatalogo} />

      {materiales.map((m, idx) => (
        <ItemCard key={idx} title={`${m.codigo ? `[${m.codigo}] ` : ''}${m.descripcion || `Material #${idx + 1}`}`} onRemove={() => remMaterial(idx)}>
          <Field label="Descripción" value={m.descripcion} onChange={(v) => updMaterial(idx, { descripcion: v })} placeholder="Ej: Cable THHN #12" editable={!m.materialId} />
          <Field label="Unidad" value={m.unidad ?? ''} onChange={(v) => updMaterial(idx, { unidad: v })} placeholder="Ej: metro, unidad" editable={!m.materialId} />
          <Field label="Cantidad" value={String(m.cantidad)} onChange={(v) => updMaterial(idx, { cantidad: parseFloat(v) || 0 })} keyboardType="numeric" />
          <Field label="Precio unitario (RD$)" value={m.precioUnitarioRD != null ? String(m.precioUnitarioRD) : ''} onChange={(v) => updMaterial(idx, { precioUnitarioRD: parseFloat(v) || undefined })} keyboardType="numeric" />
        </ItemCard>
      ))}
      <AddButton label="+ Cargar material manual (no está en el catálogo)" onPress={addMaterialManual} />
      {materiales.length > 0 ? (
        <Label>
          Total estimado: RD$ {materiales.reduce((sum, m) => sum + m.cantidad * (m.precioUnitarioRD ?? 0), 0).toLocaleString('es-DO')}
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
