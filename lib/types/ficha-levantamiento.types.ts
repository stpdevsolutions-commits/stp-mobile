export interface ItemLevantamiento {
  descripcion: string;
  ubicacion: string;
  cantidad: number;
  unidad: string;
  estado: 'bueno' | 'regular' | 'malo';
  observaciones?: string;
}

/** Puntos eléctricos a instalar/verificar: cajitas, tomacorrientes, interruptores, luminarias. */
export type CategoriaPuntoElectrico = 'cajita' | 'tomacorriente' | 'interruptor' | 'luminaria';

export const CATEGORIA_PUNTO_LABEL: Record<CategoriaPuntoElectrico, string> = {
  cajita: 'Cajita',
  tomacorriente: 'Tomacorriente',
  interruptor: 'Interruptor',
  luminaria: 'Luminaria',
};

export const TIPOS_POR_CATEGORIA: Record<CategoriaPuntoElectrico, string[]> = {
  cajita: ['Rectangular (1 dispositivo)', 'Cuadrada (2 dispositivos)', 'Octagonal (techo)', 'Otro'],
  tomacorriente: ['Normal 110V', 'GFCI (baño/cocina/exterior)', 'USB', '220V', 'Otro'],
  interruptor: ['Sencillo', 'Doble', 'Triple', 'Tres vías (conmutable)', 'Dimmer', 'Otro'],
  luminaria: ['Plafón', 'Spot/ojo de buey', 'Tira LED', 'Lámpara colgante', 'Reflector', 'Otro'],
};

export interface PuntoElectrico {
  categoria: CategoriaPuntoElectrico;
  tipo: string;
  cantidad: number;
  ubicacion?: string;
  observaciones?: string;
}

/** Material tomado del catálogo del ERP (o cargado manualmente si no está en el catálogo). */
export interface MaterialSeleccionado {
  /** id del Material en el ERP; ausente si se cargó manualmente. */
  materialId?: string;
  /** código del ERP (p. ej. MAT-00001), solo informativo. */
  codigo?: string;
  descripcion: string;
  unidad?: string;
  cantidad: number;
  precioUnitarioRD?: number;
}

export interface FichaLevantamientoData {
  proposito: 'presupuesto' | 'inventario' | 'diagnostico' | 'otro';
  items: ItemLevantamiento[];
  /** Opcional: fichas creadas antes de este cambio no la traen. */
  puntosElectricos?: PuntoElectrico[];
  /** Opcional: fichas creadas antes de este cambio no la traen. */
  materiales?: MaterialSeleccionado[];
  observacionesGenerales?: string;
}
