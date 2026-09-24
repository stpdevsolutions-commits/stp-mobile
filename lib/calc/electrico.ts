import { ELEC, PIES_POR_M } from './constantes';
import { Calculadora, LineaMaterial } from './types';
import { arriba, fmt, manoObra, num, str } from './util';

const cant = (v: Parameters<typeof num>[0], clave: string) => Math.round(num(v, clave));

/**
 * Salidas eléctricas → cajas, tubería, alambre, dispositivos, tapas y
 * breakers. Es una estimación de obra: supone que cada salida queda a
 * `distancia` de la anterior y que cada circuito arranca en el panel.
 */
export const electrico: Calculadora = {
  id: 'electrico',
  titulo: 'Instalación eléctrica',
  descripcion: 'Cajas, tubería, alambre, tapas y breakers por salida',
  icono: 'flash-outline',
  campos: [
    { tipo: 'seccion', label: 'Salidas' },
    { tipo: 'numero', clave: 'luminarias', label: 'Luminarias', defecto: 6 },
    { tipo: 'numero', clave: 'tomas', label: 'Tomacorrientes dobles 120 V', defecto: 8 },
    { tipo: 'numero', clave: 'tomas240', label: 'Tomacorrientes 240 V (A/A, estufa)', defecto: 0 },
    { tipo: 'numero', clave: 'int_sencillo', label: 'Interruptores sencillos', defecto: 3 },
    { tipo: 'numero', clave: 'int_doble', label: 'Interruptores dobles', defecto: 0 },
    { tipo: 'numero', clave: 'int_triple', label: 'Interruptores triples', defecto: 0 },
    { tipo: 'numero', clave: 'int_3vias', label: 'Interruptores de 3 vías', defecto: 0, hint: 'Cuenta cada interruptor (un par controla una luz desde dos puntos).' },
    { tipo: 'seccion', label: 'Recorridos' },
    { tipo: 'numero', clave: 'techo', label: 'Altura del techo', unidad: 'm', defecto: 2.6 },
    { tipo: 'numero', clave: 'distancia', label: 'Distancia promedio entre salidas', unidad: 'm', defecto: 3 },
    { tipo: 'numero', clave: 'panel', label: 'Distancia del panel al primer punto', unidad: 'm', defecto: 10 },
    {
      tipo: 'opcion', clave: 'tuberia', label: 'Tubería', defecto: 'pvc',
      opciones: [{ value: 'pvc', label: 'PVC ½"' }, { value: 'emt', label: 'EMT ½"' }],
    },
  ],
  calcular(v) {
    const lum = cant(v, 'luminarias');
    const tomas = cant(v, 'tomas');
    const t240 = cant(v, 'tomas240');
    const s1 = cant(v, 'int_sencillo');
    const s2 = cant(v, 'int_doble');
    const s3 = cant(v, 'int_triple');
    const s3v = cant(v, 'int_3vias');
    const interruptores = s1 + s2 + s3 + s3v;
    const techo = num(v, 'techo');
    const d = num(v, 'distancia');
    const panel = num(v, 'panel');
    const tubo = str(v, 'tuberia') === 'emt' ? 'EMT' : 'PVC';

    const circLuces = lum > 0 ? arriba(lum / ELEC.salidasPorCircuitoLuces) : 0;
    const circTomas = tomas > 0 ? arriba(tomas / ELEC.salidasPorCircuitoTomas) : 0;
    const circ240 = t240;

    // Tubería: horizontal entre salidas + bajadas a interruptores/tomas + arranque desde el panel.
    const bajadaInt = Math.max(0, techo - ELEC.alturaInterruptorM);
    const bajadaToma = Math.max(0, techo - ELEC.alturaTomaM);
    const tubLuces = lum * d + interruptores * bajadaInt + circLuces * panel;
    const tubTomas = tomas * (d + bajadaToma) + circTomas * panel;
    const tub240 = t240 * (panel + d + bajadaToma);
    const tuberiaM = (tubLuces + tubTomas + tub240) * (1 + ELEC.desperdicioTuberia);
    const tubos = arriba(tuberiaM / ELEC.tuboLargoM);

    const cajasOct = lum;
    const cajas2x4 = tomas + interruptores;
    const cajas4x4 = t240;
    const cajas = cajasOct + cajas2x4 + cajas4x4;

    // Alambre: 3 conductores (fase, neutro, tierra) por recorrido + punta en cada caja.
    const fa = (1 + ELEC.desperdicioAlambre) * PIES_POR_M;
    const punta = ELEC.puntaAlambreCajaM * 3;
    const a14 = arriba((tubLuces * 3 + (lum + interruptores) * punta) * fa);
    const a12 = arriba((tubTomas * 3 + tomas * punta) * fa);
    const a10 = arriba((tub240 * 3 + t240 * punta) * fa);
    const rollos = (pies: number) => `${fmt(pies / ELEC.rolloAlambrePies, 1)} rollos de ${ELEC.rolloAlambrePies}'`;

    const canalizacion: LineaMaterial[] = [
      { clave: `tubo_${tubo.toLowerCase()}_1_2`, descripcion: `Tubo ${tubo} ½" × 10'`, cantidad: tubos, unidad: 'unidades', detalle: `${fmt(tuberiaM, 0)} m` },
      { clave: `union_${tubo.toLowerCase()}_1_2`, descripcion: `Unión ${tubo} ½"`, cantidad: tubos, unidad: 'unidades' },
      { clave: `conector_${tubo.toLowerCase()}_1_2`, descripcion: `Conector ${tubo} ½"`, cantidad: cajas * 2, unidad: 'unidades', detalle: '2 por caja' },
      { clave: `curva_${tubo.toLowerCase()}_1_2`, descripcion: `Curva 90° ${tubo} ½"`, cantidad: interruptores + tomas + t240, unidad: 'unidades', detalle: '1 por bajada' },
      { clave: 'caja_octagonal_4', descripcion: 'Caja octagonal 4"', cantidad: cajasOct, unidad: 'unidades' },
      { clave: 'caja_2x4', descripcion: 'Caja rectangular 2×4', cantidad: cajas2x4, unidad: 'unidades' },
      { clave: 'caja_4x4', descripcion: 'Caja 4×4 con reductor', cantidad: cajas4x4, unidad: 'unidades' },
    ];

    const alambrado: LineaMaterial[] = [
      { clave: 'thhn_14', descripcion: 'Alambre THHN #14 (luces)', cantidad: a14, unidad: 'pies', detalle: rollos(a14) },
      { clave: 'thhn_12', descripcion: 'Alambre THHN #12 (tomas)', cantidad: a12, unidad: 'pies', detalle: rollos(a12) },
      { clave: 'thhn_10', descripcion: 'Alambre THHN #10 (240 V)', cantidad: a10, unidad: 'pies', detalle: rollos(a10) },
      { clave: 'wirenut', descripcion: 'Conectores de cable (wirenuts)', cantidad: cajas * ELEC.wirenutsPorCaja, unidad: 'unidades' },
      { clave: 'cinta_aislante', descripcion: 'Cinta aislante', cantidad: arriba(cajas / ELEC.cajasPorCintaAislante), unidad: 'rollos' },
    ];

    const dispositivos: LineaMaterial[] = [
      { clave: 'plafonera', descripcion: 'Plafonera / base de luminaria', cantidad: lum, unidad: 'unidades' },
      { clave: 'toma_doble_120', descripcion: 'Tomacorriente doble 15 A', cantidad: tomas, unidad: 'unidades' },
      { clave: 'tapa_toma_doble', descripcion: 'Tapa de tomacorriente doble', cantidad: tomas, unidad: 'unidades' },
      { clave: 'toma_240', descripcion: 'Tomacorriente 240 V', cantidad: t240, unidad: 'unidades' },
      { clave: 'tapa_toma_240', descripcion: 'Tapa de tomacorriente 240 V', cantidad: t240, unidad: 'unidades' },
      { clave: 'int_sencillo', descripcion: 'Interruptor sencillo', cantidad: s1, unidad: 'unidades' },
      { clave: 'int_doble', descripcion: 'Interruptor doble', cantidad: s2, unidad: 'unidades' },
      { clave: 'int_triple', descripcion: 'Interruptor triple', cantidad: s3, unidad: 'unidades' },
      { clave: 'int_3vias', descripcion: 'Interruptor de 3 vías', cantidad: s3v, unidad: 'unidades' },
      { clave: 'tapa_interruptor', descripcion: 'Tapa de interruptor', cantidad: interruptores, unidad: 'unidades' },
    ];

    const protecciones: LineaMaterial[] = [
      { clave: 'breaker_1p_15', descripcion: 'Breaker 1 polo 15 A (luces)', cantidad: circLuces, unidad: 'unidades', detalle: `hasta ${ELEC.salidasPorCircuitoLuces} luces por circuito` },
      { clave: 'breaker_1p_20', descripcion: 'Breaker 1 polo 20 A (tomas)', cantidad: circTomas, unidad: 'unidades', detalle: `hasta ${ELEC.salidasPorCircuitoTomas} tomas por circuito` },
      { clave: 'breaker_2p_30', descripcion: 'Breaker 2 polos 30 A (240 V)', cantidad: circ240, unidad: 'unidades' },
    ];

    const soloConCantidad = (l: LineaMaterial[]) => l.filter((x) => x.cantidad > 0);

    return {
      resumen: [
        { label: 'Salidas', valor: String(cajas) },
        { label: 'Circuitos', valor: String(circLuces + circTomas + circ240) },
        { label: 'Tubería', valor: `${fmt(tuberiaM, 0)} m` },
      ],
      grupos: [
        { titulo: 'Canalización y cajas', lineas: soloConCantidad(canalizacion) },
        { titulo: 'Alambrado', lineas: soloConCantidad(alambrado) },
        { titulo: 'Dispositivos y tapas', lineas: soloConCantidad(dispositivos) },
        { titulo: 'Protecciones', lineas: soloConCantidad(protecciones) },
      ].filter((g) => g.lineas.length > 0),
      manoObra: [manoObra('Canalizar, alambrar y conectar', 'electrico', cajas)],
      notas: [
        'Estimación de obra: supone salidas a distancia pareja y cada circuito saliendo del panel. Para una instalación grande, conviene el plano.',
        'El 3 vías lleva un conductor extra entre los dos interruptores: si hay muchos, súbele un 10% al #14.',
      ],
    };
  },
};
