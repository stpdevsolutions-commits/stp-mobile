import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { api, API_URL, getAccessToken } from './api';
import { LineaMaterial, Resultado } from './calc';

/**
 * Backend de la calculadora (MOB-1, `stp-api/src/material-calcs`).
 *
 * Los cálculos se hacen en el teléfono (funcionan sin conexión). El servidor
 * solo entra para: saber qué insumo tiene precio en el catálogo (enlaces),
 * guardar el cálculo en un proyecto — que le pone precio y archiva el PDF en
 * los documentos del proyecto — y servir ese PDF.
 */

/** Insumo de la calculadora enlazado a un material del catálogo del ERP. */
export interface CalcLink {
  clave: string;
  materialId: string;
  code: string;
  name: string;
  unit: string | null;
  precio: number | null;
  precioFecha: string | null;
}

export interface CalcGuardado {
  id: string;
  calculatorId: string;
  title: string;
  totalMaterials: number | null;
  fileId: string | null;
  createdAt: string;
  createdBy: string | null;
}

const LINKS_KEY = 'calc_links_v1';

/** Enlaces con precio vigente; sin conexión devuelve los últimos guardados. */
export async function fetchLinks(): Promise<{ links: CalcLink[]; offline: boolean }> {
  try {
    const { data } = await api.get<CalcLink[]>('/material-calcs/links', { timeout: 15000 });
    await AsyncStorage.setItem(LINKS_KEY, JSON.stringify(data));
    return { links: data, offline: false };
  } catch {
    const raw = await AsyncStorage.getItem(LINKS_KEY);
    return { links: raw ? (JSON.parse(raw) as CalcLink[]) : [], offline: true };
  }
}

export async function setLink(clave: string, materialId: string): Promise<CalcLink> {
  const { data } = await api.put<CalcLink>(`/material-calcs/links/${clave}`, { materialId });
  return data;
}

export async function deleteLink(clave: string): Promise<void> {
  await api.delete(`/material-calcs/links/${clave}`);
}

export async function saveCalc(payload: {
  projectId: string;
  calculatorId: string;
  title: string;
  inputs: Record<string, unknown>;
  result: Resultado & { datos: { label: string; valor: string }[] };
}): Promise<CalcGuardado & { project: { code: string; name: string } }> {
  // Generar el PDF en el servidor puede tardar unos segundos con red lenta.
  const { data } = await api.post('/material-calcs', payload, { timeout: 60000 });
  return data;
}

export async function listCalcs(projectId: string): Promise<CalcGuardado[]> {
  const { data } = await api.get<CalcGuardado[]>('/material-calcs', { params: { projectId } });
  return data;
}

/** Descarga el PDF archivado y abre el selector del sistema (ver, compartir por WhatsApp...). */
export async function openCalcPdf(calcId: string, title: string): Promise<void> {
  const token = await getAccessToken();
  const safe = title.replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 60) || 'calculo';
  const dest = `${FileSystem.cacheDirectory ?? ''}Calculo - ${safe}.pdf`;
  const res = await FileSystem.downloadAsync(`${API_URL}/material-calcs/${calcId}/pdf`, dest, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(res.uri, { mimeType: 'application/pdf', dialogTitle: title, UTI: 'com.adobe.pdf' });
  }
}

/** Línea de la lista de compra con su precio (si el insumo está enlazado). */
export interface LineaValorada extends LineaMaterial {
  link: CalcLink | null;
  subtotal: number | null;
}

export function valorar(lineas: LineaMaterial[], links: CalcLink[]): { lineas: LineaValorada[]; total: number | null } {
  const porClave = new Map(links.map((l) => [l.clave, l]));
  let total = 0;
  let alguno = false;
  const out = lineas.map((l) => {
    const link = porClave.get(l.clave) ?? null;
    const subtotal = link?.precio != null ? Math.round(link.precio * l.cantidad * 100) / 100 : null;
    if (subtotal != null) {
      total += subtotal;
      alguno = true;
    }
    return { ...l, link, subtotal };
  });
  return { lineas: out, total: alguno ? Math.round(total * 100) / 100 : null };
}

export function rd(n: number): string {
  return `RD$ ${n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
