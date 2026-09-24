import {
  CEMENTOS, CUADRILLAS, ClaveCuadrilla, HORMIGONES, MORTEROS,
} from './constantes';
import { Campo, LineaManoObra, LineaMaterial, Valores } from './types';

/** Lee un número del formulario. Acepta coma decimal ("2,5"); vacío o inválido = 0. */
export function num(v: Valores, clave: string): number {
  const raw = v[clave];
  if (typeof raw !== 'string') return 0;
  const n = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function str(v: Valores, clave: string): string {
  const raw = v[clave];
  return typeof raw === 'string' ? raw : '';
}

export function bool(v: Valores, clave: string): boolean {
  return v[clave] === true;
}

/** % del formulario (10) → fracción (0.10). */
export function pct(v: Valores, clave: string): number {
  return num(v, clave) / 100;
}

/** Redondea hacia arriba evitando que el error de coma flotante sume una unidad (12.0000001 → 12). */
export function arriba(n: number): number {
  return Math.ceil(n - 1e-9);
}

export function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function fmt(n: number, dec = 2): string {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: dec });
}

/** Valores iniciales de un formulario a partir de los defectos de sus campos. */
export function valoresIniciales(campos: Campo[]): Valores {
  const v: Valores = {};
  for (const c of campos) {
    if (c.tipo === 'seccion') continue;
    v[c.clave] = c.tipo === 'numero' ? String(c.defecto) : c.defecto;
  }
  return v;
}

export function manoObra(
  actividad: string,
  clave: ClaveCuadrilla,
  cantidad: number,
): LineaManoObra {
  const c = CUADRILLAS[clave];
  return {
    actividad,
    cuadrilla: c.cuadrilla,
    rendimiento: `${fmt(c.rinde)} ${c.unidad}/día`,
    dias: cantidad > 0 ? r2(cantidad / c.rinde) : 0,
  };
}

// ---------------------------------------------------------------------------
// Campos y cálculos compartidos: cemento, mortero y hormigón los usan varias
// calculadoras (block usa mortero; losa usa hormigón).
// ---------------------------------------------------------------------------

export const campoCemento = (clave = 'cemento'): Campo[] => [
  {
    tipo: 'opcion', clave, label: 'Tipo de cemento', defecto: 'gris_general',
    opciones: Object.entries(CEMENTOS).map(([value, c]) => ({
      value, label: value === 'otro' ? c.label : `${c.label} · ${c.kg} kg`,
    })),
  },
  {
    tipo: 'numero', clave: `${clave}_kg`, label: 'Peso de la funda', unidad: 'kg', defecto: 42.5,
    visibleSi: (v) => v[clave] === 'otro',
  },
];

export function funda(v: Valores, clave = 'cemento'): { kg: number; label: string; claveMat: string } {
  const tipo = CEMENTOS[str(v, clave)] ?? CEMENTOS.gris_general;
  const kg = str(v, clave) === 'otro' ? num(v, `${clave}_kg`) || 42.5 : tipo.kg;
  return { kg, label: tipo.label, claveMat: tipo.clave };
}

/** Materiales de `m3` de mortero, ya con desperdicio incluido en `m3`. */
export function lineasMortero(
  m3: number, proporcion: string, cemento: { kg: number; claveMat: string },
): LineaMaterial[] {
  const d = MORTEROS[proporcion] ?? MORTEROS['1:4'];
  const fundas = (m3 * d.cementoKg) / cemento.kg;
  return [
    {
      clave: cemento.claveMat, descripcion: `Cemento (funda ${fmt(cemento.kg, 1)} kg)`,
      cantidad: arriba(fundas), exacto: fundas, unidad: 'fundas', detalle: `${fmt(fundas, 1)} exactas`,
    },
    { clave: 'arena', descripcion: 'Arena', cantidad: r2(m3 * d.arenaM3), unidad: 'm³' },
    { clave: 'agua', descripcion: 'Agua', cantidad: arriba(m3 * d.aguaL), unidad: 'L' },
  ];
}

export type MetodoHormigon = 'manual' | 'trompo' | 'premezclado';

/** Materiales de `m3` de hormigón, ya con desperdicio incluido en `m3`. */
export function lineasHormigon(
  m3: number, fc: string, metodo: MetodoHormigon, cemento: { kg: number; claveMat: string },
): LineaMaterial[] {
  if (metodo === 'premezclado') {
    return [{
      clave: `hormigon_premezclado_${fc}`, descripcion: `Hormigón premezclado f'c ${fc} kg/cm²`,
      cantidad: Math.ceil(m3 * 2) / 2, unidad: 'm³', detalle: 'redondeado a ½ m³',
    }];
  }
  const d = HORMIGONES[fc] ?? HORMIGONES['210'];
  const fundas = (m3 * d.cementoKg) / cemento.kg;
  return [
    {
      clave: cemento.claveMat, descripcion: `Cemento (funda ${fmt(cemento.kg, 1)} kg)`,
      cantidad: arriba(fundas), exacto: fundas, unidad: 'fundas',
      detalle: `${fmt(d.cementoKg / cemento.kg, 1)} fundas/m³`,
    },
    { clave: 'arena', descripcion: 'Arena', cantidad: r2(m3 * d.arenaM3), unidad: 'm³' },
    { clave: 'grava', descripcion: 'Grava', cantidad: r2(m3 * d.gravaM3), unidad: 'm³' },
    {
      clave: 'agua', descripcion: 'Agua', cantidad: arriba(m3 * d.aguaL), unidad: 'L',
      detalle: `≈ ${fmt((m3 * d.aguaL) / 208, 1)} tanques de 55 gal`,
    },
  ];
}

export const opcionesFc = Object.keys(HORMIGONES).map((fc) => ({ value: fc, label: `f'c ${fc}` }));

export const opcionesMetodo = [
  { value: 'manual', label: 'Ligado a mano' },
  { value: 'trompo', label: 'Mezcladora (trompo)' },
  { value: 'premezclado', label: 'Premezclado (bomba)' },
];

export function claveVaciado(metodo: MetodoHormigon): ClaveCuadrilla {
  if (metodo === 'premezclado') return 'vaciadoBomba';
  if (metodo === 'trompo') return 'vaciadoTrompo';
  return 'vaciadoManual';
}
