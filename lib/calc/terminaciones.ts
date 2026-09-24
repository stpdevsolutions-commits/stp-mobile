import {
  BASECOAT_FUNDA_KG, BASECOAT_KG_M2, CINTA_M_POR_M2, CINTA_MALLA_ROLLO_M, CINTA_PAPEL_ROLLO_M,
  CUBETA_GALONES, MASILLA_CUBETA_KG, MASILLA_KG_M2, pegamentoRindeM2, PEGAMENTO_FUNDA_KG,
  PERFIL_LARGOS_M, PINTURA_M2_GALON, PLAFON, PLANCHAS, PORCELANA_BOLSA_KG, PORCELANA_DENSIDAD,
  RUGOSA_FACTOR, SELLADOR_M2_GALON, TORNILLOS_ESTRUCTURA_PARAL, TORNILLOS_PLANCHA_M2,
} from './constantes';
import { Calculadora, GrupoMateriales, LineaManoObra, LineaMaterial, Valores } from './types';
import { arriba, bool, fmt, manoObra, num, pct, r2, str } from './util';

// ---------------------------------------------------------------------------
// 4. Sheetrock / Densglass
// ---------------------------------------------------------------------------

const MATERIALES_PANEL: Record<string, string> = {
  regular: 'Sheetrock regular',
  mr: 'Sheetrock resistente a humedad (MR)',
  densglass: 'Densglass (exterior)',
};

/** Largo comercial de perfil (m) y piezas por paral para una altura dada. */
function perfilPara(alto: number): { largo: number; piezas: number } {
  const cabe = PERFIL_LARGOS_M.find((l) => l >= alto);
  if (cabe) return { largo: cabe, piezas: 1 };
  return { largo: PERFIL_LARGOS_M[0], piezas: arriba(alto / PERFIL_LARGOS_M[0]) };
}

export const sheetrock: Calculadora = {
  id: 'sheetrock',
  titulo: 'Sheetrock / Densglass',
  descripcion: 'Planchas, perfilería, tornillos y masillado',
  icono: 'albums-outline',
  campos: [
    { tipo: 'seccion', label: 'Muro' },
    { tipo: 'numero', clave: 'largo', label: 'Largo del muro', unidad: 'm', defecto: 5 },
    { tipo: 'numero', clave: 'alto', label: 'Alto del muro', unidad: 'm', defecto: 2.6 },
    { tipo: 'numero', clave: 'huecos', label: 'Área de huecos', unidad: 'm²', defecto: 0 },
    { tipo: 'numero', clave: 'n_huecos', label: 'Cantidad de huecos (puertas, ventanas)', defecto: 0 },
    {
      tipo: 'opcion', clave: 'caras', label: 'Caras', defecto: '2',
      opciones: [{ value: '1', label: '1 cara' }, { value: '2', label: '2 caras' }],
    },
    { tipo: 'seccion', label: 'Plancha' },
    {
      tipo: 'opcion', clave: 'material', label: 'Material', defecto: 'regular',
      opciones: Object.entries(MATERIALES_PANEL).map(([value, label]) => ({ value, label })),
    },
    {
      tipo: 'opcion', clave: 'plancha', label: 'Medida de plancha', defecto: '4x8',
      opciones: Object.entries(PLANCHAS).map(([value, p]) => ({ value, label: p.label })),
    },
    {
      tipo: 'opcion', clave: 'espesor', label: 'Espesor', defecto: '1/2',
      opciones: [{ value: '1/2', label: '½"' }, { value: '5/8', label: '⅝"' }],
    },
    { tipo: 'numero', clave: 'desperdicio', label: 'Desperdicio', unidad: '%', defecto: 10 },
    { tipo: 'seccion', label: 'Estructura' },
    {
      tipo: 'opcion', clave: 'perfil', label: 'Ancho de paral y canal', defecto: '3-5/8',
      opciones: [{ value: '2-1/2', label: '2½"' }, { value: '3-5/8', label: '3⅝"' }, { value: '6', label: '6"' }],
    },
    {
      tipo: 'opcion', clave: 'separacion', label: 'Separación de parales', defecto: '16',
      opciones: [{ value: '16', label: '16" (40.6 cm)' }, { value: '24', label: '24" (61 cm)' }],
    },
  ],
  calcular(v) {
    const largo = num(v, 'largo');
    const alto = num(v, 'alto');
    const neta = Math.max(0, largo * alto - num(v, 'huecos'));
    const nHuecos = Math.round(num(v, 'n_huecos'));
    const caras = parseInt(str(v, 'caras'), 10) || 1;
    const desp = pct(v, 'desperdicio');
    const plancha = PLANCHAS[str(v, 'plancha')] ?? PLANCHAS['4x8'];
    const densglass = str(v, 'material') === 'densglass';
    const material = MATERIALES_PANEL[str(v, 'material')] ?? MATERIALES_PANEL.regular;
    const perfil = str(v, 'perfil');

    const planchasCara = arriba((neta * (1 + desp)) / plancha.m2);
    const sep = str(v, 'separacion') === '24' ? 0.61 : 0.406;
    // Un paral cada `sep` + el de cierre + 2 jambas por hueco.
    const parales = (largo > 0 ? arriba(largo / sep) + 1 : 0) + 2 * nHuecos;
    const pp = perfilPara(alto);
    // Canal arriba y abajo + cabezal/antepecho aproximado por hueco.
    const canalM = 2 * largo + 1.2 * nHuecos;
    const areaCaras = neta * caras;

    const grupos: GrupoMateriales[] = [
      {
        titulo: 'Planchas',
        lineas: [{
          clave: `plancha_${str(v, 'material')}_${str(v, 'plancha')}`,
          descripcion: `${material} ${str(v, 'espesor')}" · ${plancha.label}`,
          cantidad: planchasCara * caras, unidad: 'planchas',
          detalle: `${planchasCara} por cara, incluye ${fmt(desp * 100)}%`,
        }],
      },
      {
        titulo: 'Estructura',
        lineas: [
          {
            clave: `paral_${perfil}`, descripcion: `Paral ${perfil}" × ${fmt(pp.largo / 0.3048, 0)}'`,
            cantidad: arriba(parales * pp.piezas * (1 + desp)), unidad: 'unidades',
            detalle: `${parales} parales cada ${str(v, 'separacion')}"`,
          },
          {
            clave: `canal_${perfil}`, descripcion: `Canal ${perfil}" × 10'`,
            cantidad: arriba((canalM * (1 + desp)) / PERFIL_LARGOS_M[0]), unidad: 'unidades',
            detalle: `${fmt(canalM)} ml`,
          },
          {
            clave: 'tornillo_estructura', descripcion: 'Tornillo de estructura (pan head 7/16")',
            cantidad: parales * pp.piezas * TORNILLOS_ESTRUCTURA_PARAL, unidad: 'unidades',
          },
          {
            clave: 'fijacion_canal', descripcion: 'Anclas / fulminantes para fijar el canal',
            cantidad: arriba((2 * largo) / 0.6), unidad: 'unidades', detalle: 'cada 60 cm',
          },
          {
            clave: `tornillo_plancha_${str(v, 'espesor') === '5/8' ? '1_1_4' : '1'}`,
            descripcion: `Tornillo de plancha ${str(v, 'espesor') === '5/8' ? '1¼"' : '1"'}`,
            cantidad: arriba(areaCaras * TORNILLOS_PLANCHA_M2), unidad: 'unidades',
            detalle: `${TORNILLOS_PLANCHA_M2} por m² por cara`,
          },
        ],
      },
    ];

    const cintaM = areaCaras * CINTA_M_POR_M2;
    grupos.push(densglass
      ? {
          titulo: `Terminación: cinta de malla y base coat (${fmt(areaCaras)} m²)`,
          lineas: [
            { clave: 'cinta_malla', descripcion: "Cinta de malla (rollo 300')", cantidad: arriba(cintaM / CINTA_MALLA_ROLLO_M), unidad: 'rollos', detalle: `${fmt(cintaM, 0)} ml` },
            {
              clave: 'basecoat', descripcion: `Base coat cementicio (funda ${fmt(BASECOAT_FUNDA_KG, 1)} kg)`,
              cantidad: arriba((areaCaras * BASECOAT_KG_M2) / BASECOAT_FUNDA_KG), unidad: 'fundas',
              detalle: `${BASECOAT_KG_M2} kg/m²`,
            },
          ],
        }
      : {
          titulo: `Terminación: cinta y masilla (${fmt(areaCaras)} m²)`,
          lineas: [
            { clave: 'cinta_papel', descripcion: "Cinta de papel (rollo 250')", cantidad: arriba(cintaM / CINTA_PAPEL_ROLLO_M), unidad: 'rollos', detalle: `${fmt(cintaM, 0)} ml` },
            {
              clave: 'masilla', descripcion: `Masilla (cubeta ${MASILLA_CUBETA_KG} kg)`,
              cantidad: arriba((areaCaras * MASILLA_KG_M2) / MASILLA_CUBETA_KG), unidad: 'cubetas',
              detalle: `${MASILLA_KG_M2} kg/m²`,
            },
          ],
        });

    const mo: LineaManoObra[] = [
      manoObra(`Estructura y planchas (${caras} ${caras === 1 ? 'cara' : 'caras'})`, 'sheetrock', areaCaras),
      manoObra(densglass ? 'Base coat' : 'Masillado', 'masillado', areaCaras),
    ];

    return {
      resumen: [
        { label: 'Área neta', valor: `${fmt(neta)} m²` },
        { label: 'Planchas', valor: String(planchasCara * caras) },
        { label: 'Parales', valor: String(parales) },
      ],
      grupos,
      manoObra: mo,
      notas: [
        'Esquineros, cantoneras y aislante no se incluyen: agrégalos según el muro.',
        ...(densglass ? ['Rendimiento del base coat pendiente de confirmar con el fabricante.'] : []),
      ],
    };
  },
};

// ---------------------------------------------------------------------------
// 6. Plafón 2×2 / 2×4
// ---------------------------------------------------------------------------

export const plafon: Calculadora = {
  id: 'plafon',
  titulo: 'Plafón 2×2 / 2×4',
  descripcion: 'Perfilería (cuadrícula), colgantes y paneles',
  icono: 'apps-outline',
  campos: [
    { tipo: 'seccion', label: 'Área' },
    { tipo: 'numero', clave: 'largo', label: 'Largo del área', unidad: 'm', defecto: 5 },
    { tipo: 'numero', clave: 'ancho', label: 'Ancho del área', unidad: 'm', defecto: 4 },
    { tipo: 'numero', clave: 'huecos', label: 'Huecos (columnas, ductos)', unidad: 'm²', defecto: 0 },
    { tipo: 'seccion', label: 'Plafón' },
    {
      tipo: 'opcion', clave: 'modulo', label: 'Módulo', defecto: '2x4',
      opciones: [{ value: '2x2', label: "2' × 2'" }, { value: '2x4', label: "2' × 4'" }],
    },
    { tipo: 'numero', clave: 'plenum', label: 'Distancia del techo al plafón', unidad: 'cm', defecto: 60 },
    { tipo: 'numero', clave: 'desperdicio', label: 'Desperdicio', unidad: '%', defecto: 5 },
  ],
  calcular(v) {
    const largo = num(v, 'largo');
    const ancho = num(v, 'ancho');
    const area = Math.max(0, largo * ancho - num(v, 'huecos'));
    const perimetro = 2 * (largo + ancho);
    const desp = pct(v, 'desperdicio');
    const modulo = str(v, 'modulo') === '2x2' ? '2x2' : '2x4';
    const f = 1 + desp;

    const mainTeeMl = area / PLAFON.mainTeeSeparacionM;
    const colgantes = arriba(area * PLAFON.colgantesPorM2);
    const alambreM = colgantes * (num(v, 'plenum') / 100 + PLAFON.alambreExtraM);
    const paneles = arriba(area * PLAFON.panelesPorM2[modulo] * f);

    const cuadricula = [
      {
        clave: 'main_tee', descripcion: "Main tee 12'", cantidad: arriba((mainTeeMl * f) / PLAFON.mainTeeLargoM),
        unidad: 'unidades', detalle: `${fmt(mainTeeMl)} ml, cada 4'`,
      },
      { clave: 'cross_tee_4', descripcion: "Cross tee 4'", cantidad: arriba(area * PLAFON.crossTee4PorM2 * f), unidad: 'unidades' },
      ...(modulo === '2x2'
        ? [{ clave: 'cross_tee_2', descripcion: "Cross tee 2'", cantidad: arriba(area * PLAFON.crossTee2PorM2 * f), unidad: 'unidades' }]
        : []),
      {
        clave: 'angulo_perimetral', descripcion: "Ángulo perimetral 10'", cantidad: arriba((perimetro * f) / PLAFON.anguloLargoM),
        unidad: 'unidades', detalle: `${fmt(perimetro)} ml de perímetro`,
      },
      { clave: 'alambre_colgante', descripcion: 'Alambre galvanizado #12 (colgantes)', cantidad: r2(alambreM), unidad: 'm', detalle: `${colgantes} colgantes` },
      { clave: 'ancla_colgante', descripcion: 'Anclas / clavos de fijación al techo', cantidad: colgantes, unidad: 'unidades' },
      { clave: 'clavo_angulo', descripcion: 'Clavos de acero para el ángulo', cantidad: arriba(perimetro / 0.4), unidad: 'unidades', detalle: 'cada 40 cm' },
    ];

    return {
      resumen: [
        { label: 'Área', valor: `${fmt(area)} m²` },
        { label: 'Perímetro', valor: `${fmt(perimetro)} m` },
        { label: 'Paneles', valor: String(paneles) },
      ],
      grupos: [
        { titulo: 'Cuadrícula (perfilería)', lineas: cuadricula },
        {
          titulo: 'Recubrimiento (paneles)',
          lineas: [{
            clave: `panel_plafon_${modulo}`, descripcion: `Panel de plafón ${modulo === '2x2' ? "2' × 2'" : "2' × 4'"}`,
            cantidad: paneles, unidad: 'unidades', detalle: `incluye ${fmt(desp * 100)}%`,
          }],
        },
      ],
      manoObra: [manoObra('Instalar plafón', 'plafon', area)],
      notas: [],
    };
  },
};

// ---------------------------------------------------------------------------
// 7. Pintura
// ---------------------------------------------------------------------------

/** 23.4 galones → "4 cubetas + 4 galones". */
function cubetasYGalones(galones: number): { cubetas: number; galones: number } {
  const total = arriba(galones);
  return { cubetas: Math.floor(total / CUBETA_GALONES), galones: total % CUBETA_GALONES };
}

export const pintura: Calculadora = {
  id: 'pintura',
  titulo: 'Pintura',
  descripcion: 'Cubetas y galones de pintura y sellador',
  icono: 'brush-outline',
  campos: [
    { tipo: 'seccion', label: 'Superficie' },
    { tipo: 'numero', clave: 'area', label: 'Área a pintar', unidad: 'm²', defecto: 50, hint: 'Suma de todas las paredes y techos (largo × alto).' },
    { tipo: 'numero', clave: 'huecos', label: 'Huecos (puertas, ventanas)', unidad: 'm²', defecto: 0 },
    {
      tipo: 'opcion', clave: 'superficie', label: 'Superficie', defecto: 'lisa',
      opciones: [{ value: 'lisa', label: 'Lisa (pañete fino, sheetrock)' }, { value: 'rugosa', label: 'Rugosa (pañete grueso, block)' }],
    },
    { tipo: 'seccion', label: 'Pintura' },
    { tipo: 'numero', clave: 'manos', label: 'Manos de pintura', defecto: 2 },
    { tipo: 'numero', clave: 'rendimiento', label: 'Rendimiento por mano', unidad: 'm²/galón', defecto: PINTURA_M2_GALON },
    { tipo: 'toggle', clave: 'sellador', label: 'Aplicar sellador (1 mano)', defecto: true },
  ],
  calcular(v) {
    const neta = Math.max(0, num(v, 'area') - num(v, 'huecos'));
    const factor = str(v, 'superficie') === 'rugosa' ? RUGOSA_FACTOR : 1;
    const manos = Math.round(num(v, 'manos')) || 1;
    const rend = (num(v, 'rendimiento') || PINTURA_M2_GALON) * factor;
    const galPintura = (neta * manos) / rend;
    const p = cubetasYGalones(galPintura);

    const lineas: LineaMaterial[] = [
      { clave: 'pintura_cubeta', descripcion: 'Pintura (cubeta 5 gal)', cantidad: p.cubetas, unidad: 'cubetas', detalle: `${fmt(galPintura, 1)} gal en total` },
      { clave: 'pintura_galon', descripcion: 'Pintura (galón)', cantidad: p.galones, unidad: 'galones' },
    ];
    const mo: LineaManoObra[] = [manoObra(`Pintura (${manos} ${manos === 1 ? 'mano' : 'manos'})`, 'pintura', neta * manos)];

    if (bool(v, 'sellador')) {
      const galSellador = neta / (SELLADOR_M2_GALON * factor);
      const s = cubetasYGalones(galSellador);
      lineas.push(
        { clave: 'sellador_cubeta', descripcion: 'Sellador (cubeta 5 gal)', cantidad: s.cubetas, unidad: 'cubetas', detalle: `${fmt(galSellador, 1)} gal en total` },
        { clave: 'sellador_galon', descripcion: 'Sellador (galón)', cantidad: s.galones, unidad: 'galones' },
      );
      mo.unshift(manoObra('Sellador (1 mano)', 'pintura', neta));
    }

    return {
      resumen: [
        { label: 'Área neta', valor: `${fmt(neta)} m²` },
        { label: 'Pintura', valor: `${fmt(galPintura, 1)} gal` },
        { label: 'Cubetas', valor: `${p.cubetas} + ${p.galones} gal` },
      ],
      grupos: [{ titulo: 'Pintura', lineas: lineas.filter((l) => l.cantidad > 0) }],
      manoObra: mo,
      notas: factor < 1 ? [`Superficie rugosa: rendimiento reducido ${fmt((1 - RUGOSA_FACTOR) * 100)}%.`] : [],
    };
  },
};

// ---------------------------------------------------------------------------
// Cerámica
// ---------------------------------------------------------------------------

const PIEZAS: Record<string, [number, number]> = {
  '30x30': [30, 30], '33x33': [33, 33], '45x45': [45, 45], '60x60': [60, 60],
  '20x60': [20, 60], '60x120': [60, 120],
};

export const ceramica: Calculadora = {
  id: 'ceramica',
  titulo: 'Piso de cerámica',
  descripcion: 'Piezas, cajas, pegamento, porcelana y zócalo',
  icono: 'grid',
  campos: [
    { tipo: 'seccion', label: 'Área' },
    { tipo: 'numero', clave: 'largo', label: 'Largo', unidad: 'm', defecto: 5 },
    { tipo: 'numero', clave: 'ancho', label: 'Ancho', unidad: 'm', defecto: 4 },
    { tipo: 'numero', clave: 'huecos', label: 'Áreas sin cerámica', unidad: 'm²', defecto: 0 },
    { tipo: 'seccion', label: 'Pieza' },
    {
      tipo: 'opcion', clave: 'pieza', label: 'Medida de la pieza (cm)', defecto: '60x60',
      opciones: [...Object.keys(PIEZAS).map((k) => ({ value: k, label: k.replace('x', ' × ') })), { value: 'otra', label: 'Otra' }],
      alElegir: (value): Valores => {
        const p = PIEZAS[value];
        return p ? { pieza_a: String(p[0]), pieza_b: String(p[1]) } : {};
      },
    },
    { tipo: 'numero', clave: 'pieza_a', label: 'Lado A', unidad: 'cm', defecto: 60 },
    { tipo: 'numero', clave: 'pieza_b', label: 'Lado B', unidad: 'cm', defecto: 60 },
    { tipo: 'numero', clave: 'espesor', label: 'Espesor de la pieza', unidad: 'mm', defecto: 8 },
    { tipo: 'numero', clave: 'junta', label: 'Junta', unidad: 'mm', defecto: 3 },
    { tipo: 'numero', clave: 'm2_caja', label: 'm² por caja', unidad: 'm²', defecto: 1.44 },
    {
      tipo: 'opcion', clave: 'colocacion', label: 'Colocación', defecto: 'recta',
      opciones: [{ value: 'recta', label: 'Recta' }, { value: 'diagonal', label: 'Diagonal' }],
      alElegir: (value) => ({ desperdicio: value === 'diagonal' ? '15' : '10' }),
    },
    { tipo: 'numero', clave: 'desperdicio', label: 'Desperdicio', unidad: '%', defecto: 10 },
    { tipo: 'seccion', label: 'Zócalo' },
    { tipo: 'toggle', clave: 'zocalo', label: 'Incluir zócalo (de la misma cerámica)', defecto: true },
    { tipo: 'numero', clave: 'zocalo_alto', label: 'Alto del zócalo', unidad: 'cm', defecto: 8, visibleSi: (v) => v.zocalo === true },
    { tipo: 'numero', clave: 'puertas', label: 'Ancho total de puertas (sin zócalo)', unidad: 'm', defecto: 0.9, visibleSi: (v) => v.zocalo === true },
  ],
  calcular(v) {
    const largo = num(v, 'largo');
    const ancho = num(v, 'ancho');
    const piso = Math.max(0, largo * ancho - num(v, 'huecos'));
    const zocaloMl = bool(v, 'zocalo') ? Math.max(0, 2 * (largo + ancho) - num(v, 'puertas')) : 0;
    const zocaloM2 = zocaloMl * (num(v, 'zocalo_alto') / 100);
    const total = piso + zocaloM2;
    const desp = pct(v, 'desperdicio');
    const a = num(v, 'pieza_a');
    const b = num(v, 'pieza_b');
    const piezaM2 = (a * b) / 10000;
    const piezas = piezaM2 > 0 ? arriba((total * (1 + desp)) / piezaM2) : 0;
    const m2Caja = num(v, 'm2_caja');

    // Porcelana (kg/m²) = (A + B) / (A × B) × espesor × junta × densidad, todo en mm.
    const amm = a * 10;
    const bmm = b * 10;
    const porcelanaKgM2 = amm > 0 && bmm > 0
      ? ((amm + bmm) / (amm * bmm)) * num(v, 'espesor') * num(v, 'junta') * PORCELANA_DENSIDAD
      : 0;
    const porcelanaKg = total * porcelanaKgM2 * 1.1;
    const rinde = pegamentoRindeM2(Math.max(a, b));

    const mo: LineaManoObra[] = [manoObra('Colocar piso', 'ceramica', piso)];
    if (zocaloMl > 0) mo.push(manoObra('Zócalo', 'zocalo', zocaloMl));

    return {
      resumen: [
        { label: 'Piso', valor: `${fmt(piso)} m²` },
        ...(zocaloMl > 0 ? [{ label: 'Zócalo', valor: `${fmt(zocaloMl)} ml` }] : []),
        { label: 'Piezas', valor: String(piezas) },
      ],
      grupos: [
        {
          titulo: 'Cerámica',
          lineas: [
            {
              clave: `ceramica_${a}x${b}`, descripcion: `Cerámica ${fmt(a)} × ${fmt(b)} cm`, cantidad: piezas, unidad: 'piezas',
              detalle: `${fmt(total * (1 + desp))} m² con ${fmt(desp * 100)}%`,
            },
            ...(m2Caja > 0
              ? [{ clave: `ceramica_${a}x${b}_caja`, descripcion: `Cajas de ${fmt(m2Caja)} m²`, cantidad: arriba((total * (1 + desp)) / m2Caja), unidad: 'cajas' }]
              : []),
          ],
        },
        {
          titulo: 'Colocación y terminación',
          lineas: [
            {
              clave: 'pegamento_ceramica', descripcion: `Pegamento (funda ${fmt(PEGAMENTO_FUNDA_KG, 1)} kg)`,
              cantidad: arriba(total / rinde), unidad: 'fundas', detalle: `rinde ${fmt(rinde, 1)} m²/funda`,
            },
            {
              clave: 'porcelana', descripcion: `Porcelana / lechada (bolsa ${fmt(PORCELANA_BOLSA_KG)} kg)`,
              cantidad: arriba(porcelanaKg / PORCELANA_BOLSA_KG), unidad: 'bolsas', detalle: `${fmt(porcelanaKg, 1)} kg`,
            },
            { clave: 'crucetas', descripcion: 'Crucetas / separadores (bolsa de 100)', cantidad: arriba(piezas / 100), unidad: 'bolsas' },
          ],
        },
      ],
      manoObra: mo,
      notas: [],
    };
  },
};
