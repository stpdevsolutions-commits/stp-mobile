import {
  BLOCK_PARED_CM, BLOCKS, CALZOS_POR_M2, MORTERO_PEGA_EXTRA, MORTEROS,
  PANETE_DESPERDICIO, PUNTALES_POR_M2, RECUBRIMIENTOS, VARILLA_ANCLAJE_M, VARILLA_LARGO_M,
} from './constantes';
import { Calculadora, Campo, GrupoMateriales, LineaManoObra, Valores } from './types';
import {
  arriba, bool, campoCemento, claveVaciado, fmt, funda, lineasHormigon, lineasMortero,
  manoObra, MetodoHormigon, num, opcionesFc, opcionesMetodo, pct, r2, str,
} from './util';

const opcionesProporcion = Object.keys(MORTEROS).map((p) => ({ value: p, label: p }));

const opcionesRecubrimiento = Object.entries(RECUBRIMIENTOS).map(([value, r]) => ({
  value, label: `${r.label} · ${r.cm} cm`,
}));

// ---------------------------------------------------------------------------
// Block: medidas por tipo, prellenadas pero editables (L, junta, ancho, alto).
// ---------------------------------------------------------------------------

function camposBlock(conJunta = true): Campo[] {
  return [
    {
      tipo: 'opcion', clave: 'block', label: 'Tipo de block', defecto: '6',
      opciones: [
        ...Object.entries(BLOCKS).map(([value, b]) => ({ value, label: b.label })),
        { value: 'otro', label: 'Otra medida' },
      ],
      alElegir: (value): Valores => {
        const b = BLOCKS[value];
        return b ? { block_l: String(b.largo), block_alt: String(b.alto), block_anch: String(b.ancho) } : {};
      },
    },
    { tipo: 'numero', clave: 'block_l', label: 'Largo del block (L)', unidad: 'cm', defecto: BLOCKS['6'].largo },
    { tipo: 'numero', clave: 'block_alt', label: 'Alto del block', unidad: 'cm', defecto: BLOCKS['6'].alto },
    { tipo: 'numero', clave: 'block_anch', label: 'Ancho del block', unidad: 'cm', defecto: BLOCKS['6'].ancho },
    ...(conJunta
      ? [{ tipo: 'numero', clave: 'junta', label: 'Junta de mortero', unidad: 'cm', defecto: 1 } as Campo]
      : []),
  ];
}

/** Geometría de un block en metros y cuántos van por m². */
function geometriaBlock(v: Valores) {
  const l = num(v, 'block_l') / 100;
  const h = num(v, 'block_alt') / 100;
  const a = num(v, 'block_anch') / 100;
  const j = num(v, 'junta') / 100;
  const porM2 = l > 0 && h > 0 ? 1 / ((l + j) * (h + j)) : 0;
  // Volumen de juntas por m² de muro = (1 − área de caras de block) × espesor.
  const morteroM3PorM2 = porM2 > 0 ? Math.max(0, 1 - porM2 * l * h) * a : 0;
  return { l, h, a, j, porM2, morteroM3PorM2 };
}

// ---------------------------------------------------------------------------
// 1. Mortero de pega
// ---------------------------------------------------------------------------

export const mortero: Calculadora = {
  id: 'mortero',
  titulo: 'Mortero de pega',
  descripcion: 'Cemento, arena y agua para pegar block',
  icono: 'color-fill-outline',
  campos: [
    {
      tipo: 'opcion', clave: 'modo', label: 'Calcular a partir de', defecto: 'muro',
      opciones: [{ value: 'muro', label: 'm² de muro' }, { value: 'volumen', label: 'Volumen (m³)' }],
    },
    { tipo: 'numero', clave: 'area', label: 'Área de muro', unidad: 'm²', defecto: 10, visibleSi: (v) => v.modo === 'muro' },
    ...camposBlock().map((c) => ({ ...c, visibleSi: (v: Valores) => v.modo === 'muro' }) as Campo),
    { tipo: 'numero', clave: 'volumen', label: 'Volumen de mortero', unidad: 'm³', defecto: 0.5, visibleSi: (v) => v.modo === 'volumen' },
    { tipo: 'seccion', label: 'Mezcla' },
    { tipo: 'opcion', clave: 'proporcion', label: 'Proporción cemento : arena', defecto: '1:4', opciones: opcionesProporcion },
    ...campoCemento(),
    { tipo: 'numero', clave: 'desperdicio', label: 'Desperdicio', unidad: '%', defecto: 5 },
  ],
  calcular(v) {
    const desp = pct(v, 'desperdicio');
    const porMuro = v.modo === 'muro';
    const g = geometriaBlock(v);
    const area = num(v, 'area');
    const m3 = porMuro
      ? area * g.morteroM3PorM2 * (1 + MORTERO_PEGA_EXTRA) * (1 + desp)
      : num(v, 'volumen') * (1 + desp);
    const c = funda(v);
    return {
      resumen: [
        { label: 'Volumen de mortero', valor: `${fmt(m3, 3)} m³` },
        ...(porMuro ? [{ label: 'Mortero por m²', valor: `${fmt(g.morteroM3PorM2 * (1 + MORTERO_PEGA_EXTRA), 4)} m³` }] : []),
      ],
      grupos: [{ titulo: `Mortero ${str(v, 'proporcion')}`, lineas: lineasMortero(m3, str(v, 'proporcion'), c) }],
      manoObra: porMuro ? [manoObra('Levantar block', 'block', area)] : [],
      notas: [
        ...(porMuro ? [`Incluye ${fmt(MORTERO_PEGA_EXTRA * 100)}% extra por el mortero que cae dentro de las celdas del block.`] : []),
        ...(porMuro ? [] : ['Sin cuadrilla: el mortero solo no tiene rendimiento propio. Usa la calculadora de Block para la mano de obra.']),
      ],
    };
  },
};

// ---------------------------------------------------------------------------
// 2. Hormigón
// ---------------------------------------------------------------------------

export const hormigon: Calculadora = {
  id: 'hormigon',
  titulo: 'Hormigón',
  descripcion: "Cemento, arena, grava y agua por f'c",
  icono: 'cube-outline',
  campos: [
    {
      tipo: 'opcion', clave: 'modo', label: 'Calcular a partir de', defecto: 'medidas',
      opciones: [{ value: 'medidas', label: 'Medidas' }, { value: 'volumen', label: 'Volumen (m³)' }],
    },
    { tipo: 'numero', clave: 'largo', label: 'Largo', unidad: 'm', defecto: 1, visibleSi: (v) => v.modo === 'medidas' },
    { tipo: 'numero', clave: 'ancho', label: 'Ancho', unidad: 'm', defecto: 1, visibleSi: (v) => v.modo === 'medidas' },
    { tipo: 'numero', clave: 'alto', label: 'Alto / espesor', unidad: 'm', defecto: 1, visibleSi: (v) => v.modo === 'medidas' },
    { tipo: 'numero', clave: 'piezas', label: 'Cantidad de elementos iguales', defecto: 1, visibleSi: (v) => v.modo === 'medidas' },
    { tipo: 'numero', clave: 'volumen', label: 'Volumen', unidad: 'm³', defecto: 1, visibleSi: (v) => v.modo === 'volumen' },
    { tipo: 'seccion', label: 'Mezcla' },
    { tipo: 'opcion', clave: 'fc', label: "Resistencia f'c (kg/cm²)", defecto: '210', opciones: opcionesFc },
    { tipo: 'opcion', clave: 'metodo', label: 'Cómo se prepara', defecto: 'trompo', opciones: opcionesMetodo },
    ...campoCemento().map((c) => ({ ...c, visibleSi: (v: Valores) => v.metodo !== 'premezclado' && (c.visibleSi?.(v) ?? true) }) as Campo),
    { tipo: 'numero', clave: 'desperdicio', label: 'Desperdicio', unidad: '%', defecto: 5 },
    { tipo: 'opcion', clave: 'exposicion', label: 'Recubrimiento del acero', defecto: 'interior', opciones: opcionesRecubrimiento },
  ],
  calcular(v) {
    const neto = v.modo === 'medidas'
      ? num(v, 'largo') * num(v, 'ancho') * num(v, 'alto') * (num(v, 'piezas') || 1)
      : num(v, 'volumen');
    const m3 = neto * (1 + pct(v, 'desperdicio'));
    const metodo = str(v, 'metodo') as MetodoHormigon;
    const rec = RECUBRIMIENTOS[str(v, 'exposicion')] ?? RECUBRIMIENTOS.interior;
    return {
      resumen: [
        { label: 'Volumen neto', valor: `${fmt(neto, 3)} m³` },
        { label: 'Con desperdicio', valor: `${fmt(m3, 3)} m³` },
        { label: 'Recubrimiento', valor: `${fmt(rec.cm, 1)} cm` },
      ],
      grupos: [{ titulo: `Hormigón f'c ${str(v, 'fc')}`, lineas: lineasHormigon(m3, str(v, 'fc'), metodo, funda(v)) }],
      manoObra: [manoObra('Vaciado', claveVaciado(metodo), neto)],
      notas: [`Recubrimiento mínimo del acero: ${fmt(rec.cm, 1)} cm (${rec.label.toLowerCase()}).`],
    };
  },
};

// ---------------------------------------------------------------------------
// 3. Muro de block
// ---------------------------------------------------------------------------

export const block: Calculadora = {
  id: 'block',
  titulo: 'Muro de block',
  descripcion: 'Block, mortero, relleno, varilla y pañete',
  icono: 'grid-outline',
  campos: [
    { tipo: 'seccion', label: 'Muro' },
    { tipo: 'numero', clave: 'largo', label: 'Largo del muro', unidad: 'm', defecto: 5 },
    { tipo: 'numero', clave: 'alto', label: 'Alto del muro', unidad: 'm', defecto: 2.6 },
    { tipo: 'numero', clave: 'huecos', label: 'Huecos (puertas, ventanas)', unidad: 'm²', defecto: 0 },
    { tipo: 'seccion', label: 'Block' },
    ...camposBlock(),
    { tipo: 'numero', clave: 'desperdicio', label: 'Desperdicio', unidad: '%', defecto: 5 },
    { tipo: 'seccion', label: 'Mortero de pega' },
    { tipo: 'opcion', clave: 'proporcion', label: 'Proporción cemento : arena', defecto: '1:4', opciones: opcionesProporcion },
    ...campoCemento(),
    { tipo: 'seccion', label: 'Relleno de celdas y varilla' },
    { tipo: 'toggle', clave: 'relleno', label: 'Rellenar celdas con hormigón y varilla', defecto: true },
    { tipo: 'numero', clave: 'separacion', label: 'Separación de celdas rellenas', unidad: 'cm', defecto: 60, visibleSi: (v) => v.relleno === true },
    { tipo: 'opcion', clave: 'fc_relleno', label: "f'c del relleno", defecto: '180', opciones: opcionesFc, visibleSi: (v) => v.relleno === true },
    { tipo: 'seccion', label: 'Terminación (pañete)' },
    {
      tipo: 'opcion', clave: 'caras', label: 'Caras a pañetar', defecto: '2',
      opciones: [{ value: '0', label: 'Ninguna' }, { value: '1', label: '1 cara' }, { value: '2', label: '2 caras' }],
    },
    { tipo: 'numero', clave: 'espesor_panete', label: 'Espesor del pañete', unidad: 'cm', defecto: 1.5, visibleSi: (v) => v.caras !== '0' },
    { tipo: 'opcion', clave: 'proporcion_panete', label: 'Proporción del pañete', defecto: '1:4', opciones: opcionesProporcion, visibleSi: (v) => v.caras !== '0' },
  ],
  calcular(v) {
    const largo = num(v, 'largo');
    const alto = num(v, 'alto');
    const bruta = largo * alto;
    const neta = Math.max(0, bruta - num(v, 'huecos'));
    const desp = pct(v, 'desperdicio');
    const g = geometriaBlock(v);
    const c = funda(v);

    const blocks = arriba(neta * g.porM2 * (1 + desp));
    const pegaM3 = neta * g.morteroM3PorM2 * (1 + MORTERO_PEGA_EXTRA) * (1 + desp);

    const grupos: GrupoMateriales[] = [
      {
        titulo: 'Block',
        lineas: [{
          clave: `block_${str(v, 'block')}`, descripcion: `Block ${fmt(g.l * 100)}×${fmt(g.h * 100)}×${fmt(g.a * 100)} cm`,
          cantidad: blocks, unidad: 'unidades', detalle: `${fmt(g.porM2, 2)} por m² + ${fmt(desp * 100)}%`,
        }],
      },
      { titulo: `Mortero de pega ${str(v, 'proporcion')} (${fmt(pegaM3, 3)} m³)`, lineas: lineasMortero(pegaM3, str(v, 'proporcion'), c) },
    ];
    const mo: LineaManoObra[] = [manoObra('Levantar block', 'block', neta)];
    const notas: string[] = [];

    if (bool(v, 'relleno') && num(v, 'separacion') > 0) {
      const lineas = arriba((largo * 100) / num(v, 'separacion')) + 1;
      // Sección de una celda: (ancho − 2 paredes) × (medio block − 1.5 paredes).
      const p = BLOCK_PARED_CM / 100;
      const celdaM2 = Math.max(0, g.a - 2 * p) * Math.max(0, g.l / 2 - 1.5 * p);
      const rellenoM3 = lineas * alto * celdaM2 * (1 + desp);
      const largoVarilla = alto + VARILLA_ANCLAJE_M;
      const porVarilla = Math.floor(VARILLA_LARGO_M / largoVarilla);
      const varillas = porVarilla >= 1 ? arriba(lineas / porVarilla) : lineas * arriba(largoVarilla / VARILLA_LARGO_M);
      grupos.push({
        titulo: `Relleno de celdas (${lineas} celdas, ${fmt(rellenoM3, 3)} m³)`,
        lineas: [
          ...lineasHormigon(rellenoM3, str(v, 'fc_relleno'), 'manual', c),
          {
            clave: 'varilla_3_8', descripcion: 'Varilla 3/8" × 20\'', cantidad: varillas, unidad: 'unidades',
            detalle: `${lineas} verticales de ${fmt(largoVarilla)} m`,
          },
        ],
      });
      notas.push('La varilla es una estimación de refuerzo vertical típico (3/8" en cada celda rellena). El diseño estructural manda.');
    }

    const caras = parseInt(str(v, 'caras'), 10) || 0;
    if (caras > 0) {
      const areaPanete = neta * caras;
      const paneteM3 = areaPanete * (num(v, 'espesor_panete') / 100) * (1 + PANETE_DESPERDICIO);
      grupos.push({
        titulo: `Terminación: pañete ${str(v, 'proporcion_panete')} (${fmt(areaPanete)} m², ${fmt(paneteM3, 3)} m³)`,
        lineas: lineasMortero(paneteM3, str(v, 'proporcion_panete'), c),
      });
      mo.push(manoObra(`Pañete (${caras} ${caras === 1 ? 'cara' : 'caras'})`, 'panete', areaPanete));
    }

    return {
      resumen: [
        { label: 'Área neta', valor: `${fmt(neta)} m²` },
        { label: 'Block por m²', valor: fmt(g.porM2, 2) },
        { label: 'Total de block', valor: String(blocks) },
      ],
      grupos,
      manoObra: mo,
      notas,
    };
  },
};

// ---------------------------------------------------------------------------
// 5. Losa de hormigón
// ---------------------------------------------------------------------------

export const losa: Calculadora = {
  id: 'losa',
  titulo: 'Losa de hormigón',
  descripcion: 'Hormigón, encofrado, puntales y recubrimiento',
  icono: 'layers-outline',
  campos: [
    { tipo: 'seccion', label: 'Losa' },
    { tipo: 'numero', clave: 'largo', label: 'Largo', unidad: 'm', defecto: 5 },
    { tipo: 'numero', clave: 'ancho', label: 'Ancho', unidad: 'm', defecto: 4 },
    { tipo: 'numero', clave: 'espesor', label: 'Espesor', unidad: 'cm', defecto: 12 },
    { tipo: 'numero', clave: 'huecos', label: 'Huecos (escalera, ductos)', unidad: 'm²', defecto: 0 },
    { tipo: 'toggle', clave: 'encofrado', label: 'Lleva encofrado (losa aérea)', defecto: true },
    { tipo: 'seccion', label: 'Hormigón' },
    { tipo: 'opcion', clave: 'fc', label: "Resistencia f'c (kg/cm²)", defecto: '210', opciones: opcionesFc },
    { tipo: 'opcion', clave: 'metodo', label: 'Cómo se prepara', defecto: 'trompo', opciones: opcionesMetodo },
    ...campoCemento().map((c) => ({ ...c, visibleSi: (v: Valores) => v.metodo !== 'premezclado' && (c.visibleSi?.(v) ?? true) }) as Campo),
    { tipo: 'numero', clave: 'desperdicio', label: 'Desperdicio', unidad: '%', defecto: 5 },
    { tipo: 'seccion', label: 'Recubrimiento del acero' },
    { tipo: 'opcion', clave: 'exposicion', label: 'Exposición', defecto: 'interior', opciones: opcionesRecubrimiento },
  ],
  calcular(v) {
    const largo = num(v, 'largo');
    const ancho = num(v, 'ancho');
    const area = Math.max(0, largo * ancho - num(v, 'huecos'));
    const e = num(v, 'espesor') / 100;
    const neto = area * e;
    const m3 = neto * (1 + pct(v, 'desperdicio'));
    const metodo = str(v, 'metodo') as MetodoHormigon;
    const rec = RECUBRIMIENTOS[str(v, 'exposicion')] ?? RECUBRIMIENTOS.interior;

    const grupos: GrupoMateriales[] = [
      { titulo: `Hormigón f'c ${str(v, 'fc')}`, lineas: lineasHormigon(m3, str(v, 'fc'), metodo, funda(v)) },
      {
        titulo: `Recubrimiento del acero: ${fmt(rec.cm, 1)} cm`,
        lineas: [{
          clave: `calzo_${String(rec.cm).replace('.', '_')}`, descripcion: `Separadores (calzos) de ${fmt(rec.cm, 1)} cm`,
          cantidad: arriba(area * CALZOS_POR_M2), unidad: 'unidades', detalle: `${CALZOS_POR_M2} por m²`,
        }],
      },
    ];
    const mo: LineaManoObra[] = [];

    if (bool(v, 'encofrado')) {
      const encofradoM2 = area + 2 * (largo + ancho) * e;
      grupos.push({
        titulo: 'Encofrado',
        lineas: [
          { clave: 'encofrado', descripcion: 'Encofrado (fondo + bordes)', cantidad: r2(encofradoM2), unidad: 'm²' },
          { clave: 'puntal', descripcion: 'Puntales', cantidad: arriba(area * PUNTALES_POR_M2), unidad: 'unidades', detalle: `${PUNTALES_POR_M2} por m²` },
        ],
      });
      mo.push(manoObra('Encofrado', 'encofrado', encofradoM2));
    }
    mo.push(manoObra('Vaciado', claveVaciado(metodo), neto));

    return {
      resumen: [
        { label: 'Área', valor: `${fmt(area)} m²` },
        { label: 'Volumen', valor: `${fmt(neto, 3)} m³` },
        { label: 'Recubrimiento', valor: `${fmt(rec.cm, 1)} cm` },
      ],
      grupos,
      manoObra: mo,
      notas: ['El acero de refuerzo no se calcula aquí: depende del diseño estructural de la losa.'],
    };
  },
};
