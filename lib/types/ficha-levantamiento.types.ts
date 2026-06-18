export interface ItemLevantamiento {
  descripcion: string;
  ubicacion: string;
  cantidad: number;
  unidad: string;
  estado: 'bueno' | 'regular' | 'malo';
  observaciones?: string;
}

export interface FichaLevantamientoData {
  proposito: 'presupuesto' | 'inventario' | 'diagnostico' | 'otro';
  items: ItemLevantamiento[];
  observacionesGenerales?: string;
}
