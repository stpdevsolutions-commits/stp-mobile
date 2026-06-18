import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.0.86:3000';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await SecureStore.deleteItemAsync('access_token');
    }
    return Promise.reject(err as Error);
  },
);

export async function login(email: string, password: string) {
  const { data } = await api.post<{ access_token: string }>('/auth/login', { email, password });
  await SecureStore.setItemAsync('access_token', data.access_token);
  return data;
}

export async function logout() {
  await SecureStore.deleteItemAsync('access_token');
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
export type FichaType = 'electrico' | 'civil' | 'electromecanico' | 'levantamiento' | 'evaluacion_danos';

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
