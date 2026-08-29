export interface ItemLevantamiento {
  descripcion: string;
  ubicacion: string;
  cantidad: number;
  unidad: string;
  estado: 'bueno' | 'regular' | 'malo';
  observaciones?: string;
}

export type SenalWifi = 'excelente' | 'buena' | 'debil' | 'sin_senal';

export const DISPOSITIVOS_DOMOTICA = [
  'camara',
  'sensor_movimiento',
  'sensor_puerta_ventana',
  'cerradura_inteligente',
  'switch_inteligente',
  'foco_inteligente',
  'sirena',
  'panel_control',
  'medidor_energia',
  'otro',
] as const;
export type DispositivoDomotica = (typeof DISPOSITIVOS_DOMOTICA)[number];

export interface ConectividadLevantamiento {
  proveedorInternet?: string;
  tipoConexion?: 'fibra' | 'cable' | 'dsl' | 'satelital' | 'otro';
  velocidadMbps?: number;
  ubicacionRouter?: string;
  requiereRepetidor?: boolean;
  observaciones?: string;
}

export interface ElectricoLevantamiento {
  capacidadPanelA?: number;
  breakersLibres?: number;
  tieneNeutroInterruptores?: 'si' | 'no' | 'revisar';
  tomasCercaDePuntos?: boolean;
  observaciones?: string;
}

export interface AmbienteLevantamiento {
  nombre: string;
  dispositivos: DispositivoDomotica[];
  tipoPuerta?: string;
  tipoVentana?: string;
  alturaTechoM?: number;
  materialPared?: string;
  senalWifi?: SenalWifi;
  observaciones?: string;
}

export interface EquipoCotizacion {
  descripcion: string;
  cantidad: number;
  precioUnitarioRD?: number;
}

export interface FichaLevantamientoData {
  proposito: 'presupuesto' | 'inventario' | 'diagnostico' | 'otro';
  items: ItemLevantamiento[];
  /** Opcional: fichas creadas antes de este cambio no la traen. */
  conectividad?: ConectividadLevantamiento;
  /** Opcional: fichas creadas antes de este cambio no la traen. */
  electrico?: ElectricoLevantamiento;
  /** Opcional: fichas creadas antes de este cambio no la traen. */
  ambientes?: AmbienteLevantamiento[];
  /** Opcional: fichas creadas antes de este cambio no la traen. */
  equiposCotizacion?: EquipoCotizacion[];
  observacionesGenerales?: string;
}
