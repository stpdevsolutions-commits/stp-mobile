import { block, hormigon, losa, mortero } from './albanileria';
import { electrico } from './electrico';
import { ceramica, pintura, plafon, sheetrock } from './terminaciones';
import { Calculadora, GrupoMateriales, LineaMaterial } from './types';
import { arriba, fmt, r2 } from './util';

export * from './types';
export { valoresIniciales, fmt } from './util';

/** Orden en el menú de la calculadora. */
export const CALCULADORAS: Calculadora[] = [
  block, mortero, hormigon, losa, sheetrock, plafon, ceramica, pintura, electrico,
];

export function getCalculadora(id: string): Calculadora | undefined {
  return CALCULADORAS.find((c) => c.id === id);
}

/**
 * Suma las líneas iguales (misma clave y unidad) de todos los grupos — p. ej.
 * el cemento del mortero de pega + el del relleno + el del pañete. Devuelve
 * null si no hay nada que sumar (ningún insumo se repite).
 */
export function totales(grupos: GrupoMateriales[]): LineaMaterial[] | null {
  if (grupos.length < 2) return null;
  type Acum = LineaMaterial & { veces: number; sumaExacta: number | null };
  const mapa = new Map<string, Acum>();
  for (const g of grupos) {
    for (const l of g.lineas) {
      const k = `${l.clave}|${l.unidad}`;
      const prev = mapa.get(k);
      if (prev) {
        prev.cantidad = r2(prev.cantidad + l.cantidad);
        prev.sumaExacta = prev.sumaExacta != null && l.exacto != null ? prev.sumaExacta + l.exacto : null;
        prev.veces += 1;
      } else {
        mapa.set(k, { ...l, detalle: undefined, veces: 1, sumaExacta: l.exacto ?? null });
      }
    }
  }
  const lista = [...mapa.values()];
  if (!lista.some((l) => l.veces > 1)) return null;
  return lista.map(({ veces, sumaExacta, ...l }) =>
    veces > 1 && sumaExacta != null
      ? { ...l, cantidad: arriba(sumaExacta), exacto: sumaExacta, detalle: `${fmt(sumaExacta, 1)} exactas` }
      : l,
  );
}
