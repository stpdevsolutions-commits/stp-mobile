import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.stpsoluciones.com';

export const api = axios.create({
  baseURL: API_URL,
  // 60s: las subidas multipart de fotos desde el campo (redes móviles lentas)
  // superan con frecuencia los 15s originales y fallaban por timeout.
  timeout: 60000,
});

// ---------------------------------------------------------------------------
// Refresh token automático
//
// El backend (POST /auth/refresh) recibe { refresh_token } y devuelve un par
// nuevo { access_token, refresh_token, user } con ROTACIÓN: el refresh token
// usado queda revocado, así que siempre hay que persistir el nuevo.
//
// Ante un 401 en cualquier petición, renovamos el token y reintentamos la
// petición original de forma transparente. Solo si el refresh también falla
// cerramos sesión (se notifica a auth-context vía onSessionExpired para que
// el RootGuard mande al login).
// ---------------------------------------------------------------------------

// Un solo refresh en vuelo: si varias peticiones reciben 401 a la vez (p. ej.
// la cola de sync subiendo varias fotos), la primera dispara el refresh y las
// demás esperan la misma promesa. Nunca se piden refreshes en paralelo — con
// la rotación del backend, el segundo fallaría por token ya revocado.
let refreshInFlight: Promise<string | null> | null = null;

// Callback que registra auth-context para reaccionar (setUser(null) → login).
let sessionExpiredListener: (() => void) | null = null;
export function onSessionExpired(listener: (() => void) | null) {
  sessionExpiredListener = listener;
}

async function clearSession() {
  await SecureStore.deleteItemAsync('access_token');
  await SecureStore.deleteItemAsync('refresh_token');
}

async function saveSession(body: { access_token: string; refresh_token?: string }) {
  await SecureStore.setItemAsync('access_token', body.access_token);
  if (typeof body.refresh_token === 'string' && body.refresh_token) {
    await SecureStore.setItemAsync('refresh_token', body.refresh_token);
  }
}

/**
 * Renueva el access token usando el refresh token guardado. Devuelve el nuevo
 * access token, o null si no se pudo (sin refresh token, revocado o expirado).
 * Usa axios "pelado" (no `api`) para no pasar por los interceptores.
 */
async function refreshSession(): Promise<string | null> {
  try {
    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    if (!refreshToken) return null;
    const { data } = await axios.post<{ access_token: string; refresh_token: string }>(
      `${API_URL}/auth/refresh`,
      { refresh_token: refreshToken },
      { timeout: 30000 },
    );
    if (typeof data?.access_token !== 'string' || !data.access_token) return null;
    await saveSession(data);
    return data.access_token;
  } catch {
    return null;
  }
}

function getRefreshedToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = refreshSession().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/**
 * Devuelve un access token válido para usos fuera de axios (p. ej. la descarga
 * de fotos con FileSystem.downloadAsync en lib/image-cache.ts). Si hay un
 * refresh en vuelo, espera a que termine para no usar un token recién vencido.
 */
export async function getAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  return SecureStore.getItemAsync('access_token');
}

/** Renovación explícita para quien reciba un 401 fuera de axios. */
export function refreshAccessToken(): Promise<string | null> {
  return getRefreshedToken();
}

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const config = err.config as RetriableConfig | undefined;
    const isAuthCall =
      typeof config?.url === 'string' &&
      (config.url.includes('/auth/login') ||
        config.url.includes('/auth/google') ||
        config.url.includes('/auth/refresh'));

    if (err.response?.status === 401 && config && !config._retried && !isAuthCall) {
      const newToken = await getRefreshedToken();
      if (newToken) {
        config._retried = true;
        config.headers.Authorization = `Bearer ${newToken}`;
        return api.request(config);
      }
      // Refresh fallido: sesión realmente vencida → cerrar sesión.
      await clearSession();
      sessionExpiredListener?.();
    }
    return Promise.reject(err as Error);
  },
);

export async function login(email: string, password: string) {
  const response = await api.post('/auth/login', { email, password });
  const body = response.data as Record<string, unknown>;
  const token = body?.access_token;
  if (typeof token !== 'string' || !token) {
    throw new Error(`El servidor no devolvió un token válido. Respuesta: ${JSON.stringify(body)}`);
  }
  await saveSession(body as { access_token: string; refresh_token?: string });
  return body as { access_token: string; refresh_token?: string; user: User };
}

export async function loginWithGoogle(accessToken: string) {
  const response = await api.post('/auth/google', { accessToken });
  const body = response.data as Record<string, unknown>;
  const token = body?.access_token;
  if (typeof token !== 'string' || !token) {
    throw new Error('El servidor no devolvió un token válido');
  }
  await saveSession(body as { access_token: string; refresh_token?: string });
  return body as { access_token: string; refresh_token?: string; user: User };
}

export async function logout() {
  // Revocar el refresh token en el servidor (best-effort: si no hay red o el
  // token ya expiró, igual limpiamos localmente).
  try {
    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    if (refreshToken) {
      await axios.post(`${API_URL}/auth/logout`, { refresh_token: refreshToken }, { timeout: 10000 });
    }
  } catch {}
  await clearSession();
}

export async function getProfile() {
  const { data } = await api.get('/auth/profile');
  return data as User;
}

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'user';
}

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  status: string;
  type: string;
  location: string;
  clientId: string;
  client?: { id: string; name: string };
}

export type FichaStatus = 'borrador' | 'en_progreso' | 'enviada';
export type FichaType = 'electrico' | 'civil' | 'electromecanico' | 'levantamiento' | 'evaluacion_danos' | 'domotica';

export interface Ficha {
  id: string;
  code: string;
  type: FichaType;
  status: FichaStatus;
  projectId: string;
  project?: Project;
  technicianId: string;
  technician?: User;
  data: Record<string, unknown>;
  latitude: number | null;
  longitude: number | null;
  photos: string[];
  signature: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FichaElectricaData {
  tipoTrabajo: 'instalacion_nueva' | 'remodelacion' | 'mantenimiento' | 'diagnostico';
  voltajeServicio: '120V' | '240V' | '480V' | 'otro';
  fases: 'monofasico' | 'bifasico' | 'trifasico';
  tableros: Tablero[];
  circuitos: Circuito[];
  materiales: Material[];
  observacionesGenerales?: string;
  recomendaciones?: string;
}

export interface Tablero {
  id: string;
  nombre: string;
  tipo: 'principal' | 'secundario' | 'distribucion' | 'otro';
  amperaje: number;
  voltaje: '120V' | '240V' | '480V' | 'otro';
  fases: 'monofasico' | 'bifasico' | 'trifasico';
  estado: 'bueno' | 'regular' | 'malo' | 'nuevo';
  observaciones?: string;
}

export interface Circuito {
  numero: string;
  descripcion: string;
  tableroId?: string;
  breakerA: number;
  calibreAWG: string;
  longitud?: number;
  tipo: 'iluminacion' | 'tomacorriente' | 'hvac' | 'motor' | 'especial' | 'otro';
  estado: 'activo' | 'inactivo' | 'nuevo' | 'reemplazar';
  observaciones?: string;
}

export interface Material {
  descripcion: string;
  unidad: 'unidad' | 'metro' | 'caja' | 'rollo' | 'par' | 'otro';
  cantidad: number;
  observaciones?: string;
}
