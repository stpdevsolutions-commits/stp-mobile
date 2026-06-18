export interface AreaCivil {
  nombre: string;
  largo: number;
  ancho: number;
  alto: number;
  pisoMaterial: string;
  paredesMaterial: string;
  techMaterial: string;
  estado: 'bueno' | 'regular' | 'malo';
  observaciones?: string;
}

export interface MaterialCivil {
  descripcion: string;
  unidad: string;
  cantidad: number;
}

export interface FichaCivilData {
  tipoTrabajo: 'obra_nueva' | 'remodelacion' | 'reparacion' | 'diagnostico';
  areas: AreaCivil[];
  materiales: MaterialCivil[];
  estructura: {
    tipoFundacion?: string;
    tipoColumnas?: string;
    estadoGeneral: 'bueno' | 'regular' | 'malo' | 'critico';
    observaciones?: string;
  };
  observacionesGenerales?: string;
  recomendaciones?: string;
}
