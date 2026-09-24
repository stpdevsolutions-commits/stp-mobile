import React, { useEffect, useRef } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';

// No revisar más de una vez cada 15 min al volver del segundo plano: el
// técnico entra y sale de la app muchas veces en una obra, y cada chequeo es
// una petición a u.expo.dev.
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Actualizaciones OTA (EAS Update). Revisa al abrir y al volver a primer
 * plano; si hay una versión nueva la descarga en segundo plano y muestra un
 * aviso para reiniciar. Nunca reinicia sola: el técnico podría estar a mitad
 * de una ficha. Si no reinicia, la versión nueva se aplica en el próximo
 * arranque en frío de todas formas.
 *
 * En desarrollo (expo start) expo-updates está deshabilitado y esto no hace nada.
 */
export default function UpdateBanner() {
  const { isUpdatePending } = Updates.useUpdates();
  const lastCheck = useRef(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;

    async function check() {
      const now = Date.now();
      if (now - lastCheck.current < CHECK_INTERVAL_MS) return;
      lastCheck.current = now;
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) await Updates.fetchUpdateAsync();
      } catch {
        // Sin conexión o u.expo.dev caído: se reintenta en el próximo foco.
      }
    }

    check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, []);

  if (!isUpdatePending) return null;

  return (
    <View style={[s.wrap, { bottom: insets.bottom + 72 }]} pointerEvents="box-none">
      <View style={s.banner}>
        <Ionicons name="cloud-download-outline" size={20} color="#fff" />
        <Text style={s.text}>Hay una versión nueva de la app.</Text>
        <TouchableOpacity style={s.btn} onPress={() => Updates.reloadAsync()} activeOpacity={0.8}>
          <Text style={s.btnText}>Reiniciar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** Texto de versión para Perfil: "1.0.0 · act. 24/09/2026". */
export function versionLabel(appVersion: string): string {
  if (Updates.isEmbeddedLaunch || !Updates.createdAt) return `${appVersion} · de fábrica`;
  return `${appVersion} · act. ${Updates.createdAt.toLocaleDateString('es-DO')}`;
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0D1B2A',
    borderRadius: 12,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  text: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },
  btn: { backgroundColor: '#1565C0', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
