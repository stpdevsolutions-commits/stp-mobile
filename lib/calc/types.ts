/**
 * Calculadora de materiales (MOB-1).
 *
 * Cada calculadora se DECLARA (campos + función de cálculo) y una sola
 * pantalla genérica (`app/(tabs)/calculadora/[id].tsx`) la dibuja — igual
 * idea que las fichas, pero sin escribir un formulario a mano por cada una.
 * Todo es cálculo local: funciona sin conexión.
 */

export type Valores = Record<string, string | boolean>;

interface CampoBase {
  clave: string;
  label: string;
  hint?: string;
  /** Mostrar el campo solo si se cumple (p. ej. "peso de funda" solo con cemento "otro"). */
  visibleSi?: (v: Valores) => boolean;
}

export type Campo =
  | (CampoBase & { tipo: 'numero'; unidad?: string; defecto: number })
  | (CampoBase & {
      tipo: 'opcion';
      opciones: { label: string; value: string }[];
      defecto: string;
      /** Prellena otros campos al elegir (p. ej. "Block 6"" → largo/alto/ancho), que siguen editables. */
      alElegir?: (value: string) => Valores;
    })
  | (CampoBase & { tipo: 'toggle'; defecto: boolean })
  | { tipo: 'seccion'; label: string; clave?: undefined; visibleSi?: (v: Valores) => boolean };

/** Una línea de material del resultado. */
export interface LineaMaterial {
  /**
   * Identificador estable del insumo ("cemento_gris", "block_6"). Sirve para
   * enlazarlo con el catálogo del ERP y ponerle precio (fase de precios).
   */
  clave: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  /** Aclaración corta: "8.6 fundas/m³", "incluye 10% desperdicio". */
  detalle?: string;
  /**
   * Cantidad sin redondear, cuando `cantidad` va redondeada a la unidad de
   * compra (fundas). El total suma los exactos y redondea una sola vez: 1.6 +
   * 3.7 + 3.7 fundas son 9, no 2 + 4 + 4 = 10.
   */
  exacto?: number;
}

/** Grupo de materiales: "Muro", "Terminación (pañete)", "Estructura"... */
export interface GrupoMateriales {
  titulo: string;
  lineas: LineaMaterial[];
}

/** Cuadrilla: quiénes, a qué rendimiento, cuántos días. */
export interface LineaManoObra {
  actividad: string;
  cuadrilla: string;
  rendimiento: string;
  dias: number;
}

export interface Resultado {
  /** Cifras clave arriba del resultado: "Área neta 24.5 m²", "Volumen 3.2 m³". */
  resumen: { label: string; valor: string }[];
  grupos: GrupoMateriales[];
  manoObra: LineaManoObra[];
  notas: string[];
}

export interface Calculadora {
  id: string;
  titulo: string;
  descripcion: string;
  /** Nombre de Ionicons. */
  icono: string;
  campos: Campo[];
  calcular: (v: Valores) => Resultado;
}
