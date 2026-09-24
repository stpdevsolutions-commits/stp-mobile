/**
 * Coeficientes de la calculadora de materiales — TODOS en este archivo.
 *
 * Valores base propuestos el 2026-09-24 (ticket MOB-1), pendientes de
 * revisión de Pedro. Si en obra un número no cuadra, se corrige AQUÍ y llega
 * a los teléfonos por actualización OTA (no hace falta APK nuevo).
 */

// ---------------------------------------------------------------------------
// Cemento. En RD el gris viene en fundas de 42.5 kg (94 lb) sin importar la
// marca (Cemex, Cibao, Argos, Santo Domingo, Panam); lo que cambia es el
// tipo. El blanco viene en fundas de 40 kg.
// ---------------------------------------------------------------------------
export const CEMENTOS: Record<string, { label: string; kg: number; clave: string }> = {
  gris_general:     { label: 'Gris uso general (CPM 27.5 / GU)',       kg: 42.5, clave: 'cemento_gris' },
  gris_estructural: { label: 'Gris estructural (CPM 35.0r / Tipo I)',  kg: 42.5, clave: 'cemento_gris_estructural' },
  blanco:           { label: 'Blanco',                                 kg: 40,   clave: 'cemento_blanco' },
  otro:             { label: 'Otro peso de funda',                     kg: 42.5, clave: 'cemento_gris' },
};

// ---------------------------------------------------------------------------
// Mortero por m³ (proporción volumétrica cemento:arena).
// ---------------------------------------------------------------------------
export const MORTEROS: Record<string, { cementoKg: number; arenaM3: number; aguaL: number }> = {
  '1:3': { cementoKg: 454, arenaM3: 1.10, aguaL: 250 },
  '1:4': { cementoKg: 364, arenaM3: 1.16, aguaL: 240 },
  '1:5': { cementoKg: 302, arenaM3: 1.20, aguaL: 240 },
};

// ---------------------------------------------------------------------------
// Hormigón por m³, según f'c (kg/cm²). Cemento en kg para que funcione con
// cualquier funda. ⚠️ Dosificación de tabla (conservadora) — REVISAR.
// ---------------------------------------------------------------------------
export const HORMIGONES: Record<string, { cementoKg: number; arenaM3: number; gravaM3: number; aguaL: number }> = {
  '180': { cementoKg: 366, arenaM3: 0.54, gravaM3: 0.55, aguaL: 185 },
  '200': { cementoKg: 395, arenaM3: 0.53, gravaM3: 0.54, aguaL: 185 },
  '210': { cementoKg: 412, arenaM3: 0.52, gravaM3: 0.53, aguaL: 186 },
  '250': { cementoKg: 502, arenaM3: 0.49, gravaM3: 0.51, aguaL: 188 },
  '300': { cementoKg: 604, arenaM3: 0.45, gravaM3: 0.50, aguaL: 190 },
};

// ---------------------------------------------------------------------------
// Block de hormigón. Medidas reales en cm (con junta de 1 cm dan el módulo
// de 40 × 20 → 12.5 blocks/m²).
// ---------------------------------------------------------------------------
export const BLOCKS: Record<string, { label: string; largo: number; alto: number; ancho: number }> = {
  '4': { label: 'Block 4"', largo: 39, alto: 19, ancho: 10 },
  '6': { label: 'Block 6"', largo: 39, alto: 19, ancho: 15 },
  '8': { label: 'Block 8"', largo: 39, alto: 19, ancho: 20 },
};
/** Extra de mortero de pega por lo que cae dentro de las celdas del block. */
export const MORTERO_PEGA_EXTRA = 0.25;
/** Pared de las celdas del block (cm), para calcular el volumen de relleno. */
export const BLOCK_PARED_CM = 2.5;

// ---------------------------------------------------------------------------
// Pañete (terminación de muros de block).
// ---------------------------------------------------------------------------
export const PANETE_ESPESOR_M = 0.015;
export const PANETE_DESPERDICIO = 0.10;

// ---------------------------------------------------------------------------
// Varilla. Largo comercial 20' = 6.10 m.
// ---------------------------------------------------------------------------
export const VARILLA_LARGO_M = 6.1;
/** Traslape / anclaje que se suma a cada varilla vertical de muro. */
export const VARILLA_ANCLAJE_M = 0.4;

// ---------------------------------------------------------------------------
// Sheetrock / Densglass.
// ---------------------------------------------------------------------------
export const PLANCHAS: Record<string, { label: string; m2: number }> = {
  '4x8':  { label: "4' × 8'",  m2: 1.22 * 2.44 },
  '4x10': { label: "4' × 10'", m2: 1.22 * 3.05 },
  '4x12': { label: "4' × 12'", m2: 1.22 * 3.66 },
};
export const PERFIL_LARGOS_M = [3.05, 3.66]; // parales y canales de 10' y 12'
export const TORNILLOS_PLANCHA_M2 = 11;      // por m² por cara
export const TORNILLOS_ESTRUCTURA_PARAL = 4;
export const CINTA_M_POR_M2 = 1.2;           // por cara
export const CINTA_PAPEL_ROLLO_M = 76;       // rollo de 250'
export const CINTA_MALLA_ROLLO_M = 91;       // rollo de 300'
export const MASILLA_KG_M2 = 0.7;            // por cara
export const MASILLA_CUBETA_KG = 28;         // cubeta 5 gal
export const BASECOAT_KG_M2 = 3;             // Densglass exterior, por cara ⚠️ revisar
export const BASECOAT_FUNDA_KG = 22.7;       // funda 50 lb

// ---------------------------------------------------------------------------
// Plafón (cielo falso) 2×2 y 2×4.
// ---------------------------------------------------------------------------
export const PLAFON = {
  mainTeeLargoM: 3.66,       // 12'
  mainTeeSeparacionM: 1.22,  // cada 4'
  crossTee4PorM2: 1.34,
  crossTee2PorM2: 1.34,      // solo en 2×2
  anguloLargoM: 3.05,        // 10'
  colgantesPorM2: 0.67,      // uno cada 4' × 4'
  alambreExtraM: 0.3,        // amarre en cada punta
  panelesPorM2: { '2x2': 1 / (0.61 * 0.61), '2x4': 1 / (0.61 * 1.22) } as Record<string, number>,
};

// ---------------------------------------------------------------------------
// Pintura.
// ---------------------------------------------------------------------------
export const PINTURA_M2_GALON = 30;     // por mano, superficie lisa
export const SELLADOR_M2_GALON = 35;
export const RUGOSA_FACTOR = 0.75;      // rinde 25% menos en superficie rugosa
export const CUBETA_GALONES = 5;

// ---------------------------------------------------------------------------
// Cerámica.
// ---------------------------------------------------------------------------
export const PEGAMENTO_FUNDA_KG = 22.7; // funda 50 lb
/** m² que rinde una funda de pegamento según el lado mayor de la pieza (cm). */
export function pegamentoRindeM2(ladoMayorCm: number): number {
  if (ladoMayorCm <= 33) return 4.5;
  if (ladoMayorCm <= 45) return 4;
  return 3;
}
export const PORCELANA_DENSIDAD = 1.6;  // kg/dm³
export const PORCELANA_BOLSA_KG = 2.27; // bolsa 5 lb

// ---------------------------------------------------------------------------
// Eléctrico.
// ---------------------------------------------------------------------------
export const ELEC = {
  tuboLargoM: 3.05,          // 10'
  alturaInterruptorM: 1.2,
  alturaTomaM: 0.3,
  salidasPorCircuitoLuces: 10,
  salidasPorCircuitoTomas: 8,
  desperdicioTuberia: 0.10,
  desperdicioAlambre: 0.10,
  puntaAlambreCajaM: 0.3,    // lo que se deja en cada caja para conectar
  rolloAlambrePies: 500,
  wirenutsPorCaja: 3,
  cajasPorCintaAislante: 15,
};
export const PIES_POR_M = 3.2808;

// ---------------------------------------------------------------------------
// Cuadrillas y rendimientos (unidad por día de cuadrilla).
// ---------------------------------------------------------------------------
export const CUADRILLAS = {
  block:        { cuadrilla: '1 albañil + 1 ayudante',     rinde: 10, unidad: 'm²' },
  panete:       { cuadrilla: '1 albañil + 1 ayudante',     rinde: 12, unidad: 'm²' },
  sheetrock:    { cuadrilla: '1 instalador + 1 ayudante',  rinde: 15, unidad: 'm²' },
  masillado:    { cuadrilla: '1 instalador + 1 ayudante',  rinde: 25, unidad: 'm²' },
  encofrado:    { cuadrilla: '1 carpintero + 1 ayudante',  rinde: 12, unidad: 'm²' },
  vaciadoManual:{ cuadrilla: '1 maestro + 6 ayudantes',    rinde: 8,  unidad: 'm³' },
  vaciadoTrompo:{ cuadrilla: '1 maestro + 4 ayudantes',    rinde: 12, unidad: 'm³' },
  vaciadoBomba: { cuadrilla: '1 maestro + 4 ayudantes',    rinde: 40, unidad: 'm³' },
  plafon:       { cuadrilla: '1 instalador + 1 ayudante',  rinde: 25, unidad: 'm²' },
  pintura:      { cuadrilla: '1 pintor + 1 ayudante',      rinde: 50, unidad: 'm²' },
  ceramica:     { cuadrilla: '1 ceramista + 1 ayudante',   rinde: 12, unidad: 'm²' },
  zocalo:       { cuadrilla: '1 ceramista + 1 ayudante',   rinde: 25, unidad: 'ml' },
  electrico:    { cuadrilla: '1 electricista + 1 ayudante', rinde: 8, unidad: 'salidas' },
};
export type ClaveCuadrilla = keyof typeof CUADRILLAS;

// ---------------------------------------------------------------------------
// Recubrimiento del acero (hormigón), cm.
// ---------------------------------------------------------------------------
export const RECUBRIMIENTOS: Record<string, { label: string; cm: number }> = {
  interior:   { label: 'Interior (no expuesta)', cm: 2 },
  intemperie: { label: 'A la intemperie',        cm: 4 },
  terreno:    { label: 'Contra el terreno',      cm: 7.5 },
};
/** Separadores (calzos) para garantizar el recubrimiento. */
export const CALZOS_POR_M2 = 4;
/** Puntales para encofrado de losa, uno por m². */
export const PUNTALES_POR_M2 = 1;
