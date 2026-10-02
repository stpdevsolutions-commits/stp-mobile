import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile, login as apiLogin, loginWithGoogle as apiLoginWithGoogle, logout as apiLogout, onSessionExpired, User } from './api';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Último perfil conocido, para poder abrir la app SIN señal: antes el arranque
// pedía el perfil, fallaba por falta de red y borraba los tokens, así que un
// técnico en campo sin cobertura no podía ni abrir la app para llenar fichas.
const USER_CACHE_KEY = 'stp_cached_user';

async function cacheUser(user: User | null) {
  try {
    if (user) await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    else await AsyncStorage.removeItem(USER_CACHE_KEY);
  } catch {
    // la caché es una comodidad: si falla, no se bloquea nada
  }
}

async function readCachedUser(): Promise<User | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

/** El servidor respondió que la sesión no vale (≠ no pude hablar con él). */
function sesionRechazada(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === 401 || status === 403;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  login: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Si el refresh automático falla (sesión realmente vencida/revocada),
    // lib/api.ts avisa aquí: soltar el user hace que RootGuard mande al login.
    onSessionExpired(() => {
      setUser(null);
      void cacheUser(null);
    });

    void (async () => {
      try {
        const token = await SecureStore.getItemAsync('access_token');
        if (token) {
          // Si el access token expiró, el interceptor de api.ts intenta el
          // refresh automáticamente antes de rendirse.
          const profile = await getProfile();
          setUser(profile);
          void cacheUser(profile);
        }
      } catch (err) {
        if (sesionRechazada(err)) {
          await SecureStore.deleteItemAsync('access_token');
          await SecureStore.deleteItemAsync('refresh_token');
          await cacheUser(null);
        } else {
          // Sin señal, timeout o error del servidor: la sesión sigue siendo
          // válida. Se entra con el último perfil conocido y la cola offline
          // sincroniza cuando vuelva la red.
          const cached = await readCachedUser();
          if (cached) setUser(cached);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => onSessionExpired(null);
  }, []);

  async function login(email: string, password: string) {
    await apiLogin(email, password);
    const profile = await getProfile();
    setUser(profile);
    void cacheUser(profile);
  }

  async function loginWithGoogle(accessToken: string) {
    await apiLoginWithGoogle(accessToken);
    const profile = await getProfile();
    setUser(profile);
    void cacheUser(profile);
  }

  async function logout() {
    await apiLogout();
    setUser(null);
    await cacheUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
