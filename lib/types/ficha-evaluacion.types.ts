export interface AreaDano {
  nombre: string;
  descripcionDano: string;
  severidad: 'leve' | 'moderado' | 'grave' | 'total';
  accionRecomendada: string;
}

export interface FichaEvaluacionData {
  causaDano: 'humedad' | 'sismo' | 'viento' | 'incendio' | 'vandalismo' | 'deterioro' | 'otro';
  urgencia: 'inmediata' | 'alta' | 'media' | 'baja';
  areas: AreaDano[];
  estructuraAfectada: boolean;
  riesgoPersonas: boolean;
  costoEstimado?: number;
  observacionesGenerales?: string;
}
