export interface Equipo {
  nombre: string;
  marca: string;
  modelo?: string;
  serial?: string;
  potenciaHP?: number;
  voltaje: string;
  corrienteA?: number;
  estado: 'bueno' | 'regular' | 'malo' | 'inoperante';
  observaciones?: string;
}

export interface FichaElectromecanicaData {
  tipoTrabajo: 'instalacion_nueva' | 'mantenimiento' | 'reparacion' | 'diagnostico';
  equipos: Equipo[];
  materiales: { descripcion: string; unidad: string; cantidad: number }[];
  mediciones?: {
    presionPSI?: number;
    temperaturaCelsius?: number;
    vibracion?: string;
    ruido?: string;
  };
  observacionesGenerales?: string;
  recomendaciones?: string;
}
