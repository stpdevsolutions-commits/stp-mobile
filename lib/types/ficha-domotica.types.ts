/**
 * Ficha de domótica — instalación de casa inteligente (STP Smart Home).
 * Separada del levantamiento general: un levantamiento normal (cajitas,
 * tomas, interruptores, luminarias, materiales) no necesariamente incluye
 * nada de esto, y viceversa.
 */

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

export interface ConectividadDomotica {
  proveedorInternet?: string;
  tipoConexion?: 'fibra' | 'cable' | 'dsl' | 'satelital' | 'otro';
  velocidadMbps?: number;
  ubicacionRouter?: string;
  requiereRepetidor?: boolean;
  observaciones?: string;
}

export interface ElectricoDomotica {
  capacidadPanelA?: number;
  breakersLibres?: number;
  tieneNeutroInterruptores?: 'si' | 'no' | 'revisar';
  tomasCercaDePuntos?: boolean;
  observaciones?: string;
}

export interface AmbienteDomotica {
  nombre: string;
  dispositivos: DispositivoDomotica[];
  tipoPuerta?: string;
  tipoVentana?: string;
  alturaTechoM?: number;
  materialPared?: string;
  senalWifi?: SenalWifi;
  observaciones?: string;
}

export interface EquipoDomotica {
  descripcion: string;
  cantidad: number;
  precioUnitarioRD?: number;
}

export interface FichaDomoticaData {
  proposito: 'presupuesto' | 'inventario' | 'diagnostico' | 'otro';
  conectividad: ConectividadDomotica;
  electrico: ElectricoDomotica;
  ambientes: AmbienteDomotica[];
  equiposCotizacion: EquipoDomotica[];
  observacionesGenerales?: string;
}
