import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Image, KeyboardAvoidingView, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
  ActivityIndicator, Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from '../../lib/auth-context';

// Necesario para que la pestaña del navegador de autenticación se cierre sola
// al volver de Google — sin esto queda "colgada" tras completar el login.
WebBrowser.maybeCompleteAuthSession();

function isNetworkError(err: unknown): boolean {
  const e = err as { response?: unknown; code?: string; message?: string };
  return !e.response || e.code === 'ERR_NETWORK' || e.code === 'ECONNABORTED';
}

function serverErrorMessage(err: unknown, fallback: string): string {
  const status = (err as { response?: { status?: number } })?.response?.status;
  const serverMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  if (isNetworkError(err)) {
    return 'No se pudo conectar al servidor.\n\nVerifica que estás en la red Wi-Fi de STP o que el VPN está activo.';
  }
  if (serverMsg) return serverMsg;
  if (status === 401) return fallback;
  return `Error del servidor (${status ?? 'desconocido'}). Contacta al administrador.`;
}

export default function LoginScreen() {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const btnScale = useRef(new Animated.Value(1)).current;

  // Client IDs del mismo proyecto de Google Cloud que usa el ERP web
  // (861368211735). El Android client ya tiene su intent-filter de retorno
  // configurado en app.json — no hace falta redirectUri manual.
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const accessToken = response.authentication?.accessToken;
      if (accessToken) void handleGoogleToken(accessToken);
    } else if (response?.type === 'error') {
      Alert.alert('No se pudo iniciar sesión con Google', response.error?.message ?? 'Intenta de nuevo.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  async function handleGoogleToken(accessToken: string) {
    setGoogleLoading(true);
    try {
      await loginWithGoogle(accessToken);
    } catch (err: unknown) {
      Alert.alert('No se pudo iniciar sesión', serverErrorMessage(err, 'Tu cuenta de Google no está autorizada para acceder al sistema.'));
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Ingresa tu correo y contraseña');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: unknown) {
      Alert.alert('No se pudo iniciar sesión', serverErrorMessage(err, 'Correo o contraseña incorrectos.'));
    } finally {
      setLoading(false);
    }
  }

  const pressIn = () =>
    Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const pressOut = () =>
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 0 }).start();

  const anyLoading = loading || googleLoading;

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={s.card}>
        <Image
          source={require('../../assets/logo.png')}
          style={s.logo}
          resizeMode="contain"
        />
        <Text style={s.tagline}>Portal de Técnicos</Text>

        <TextInput
          style={[s.input, emailFocused && s.inputActive]}
          placeholder="Correo electrónico"
          placeholderTextColor="#B0BEC5"
          value={email}
          onChangeText={setEmail}
          onFocus={() => setEmailFocused(true)}
          onBlur={() => setEmailFocused(false)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!anyLoading}
        />

        <View style={[s.passRow, passwordFocused && s.inputActive]}>
          <TextInput
            style={s.passInput}
            placeholder="Contraseña"
            placeholderTextColor="#B0BEC5"
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            secureTextEntry={!showPassword}
            editable={!anyLoading}
            onSubmitEditing={handleLogin}
          />
          <TouchableOpacity
            style={s.eyeBtn}
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.eye}>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={[s.btnWrapper, { transform: [{ scale: btnScale }] }]}>
          <TouchableOpacity
            style={[s.btn, anyLoading && s.btnDisabled]}
            onPress={handleLogin}
            onPressIn={pressIn}
            onPressOut={pressOut}
            disabled={anyLoading}
            activeOpacity={1}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Iniciar sesión</Text>}
          </TouchableOpacity>
        </Animated.View>

        <View style={s.divider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>o</Text>
          <View style={s.dividerLine} />
        </View>

        <TouchableOpacity
          style={[s.googleBtn, anyLoading && s.btnDisabled]}
          onPress={() => promptAsync()}
          disabled={anyLoading || !request}
          activeOpacity={0.85}
        >
          {googleLoading ? (
            <ActivityIndicator color="#1565C0" />
          ) : (
            <>
              <View style={s.googleBadge}>
                <Text style={s.googleBadgeText}>G</Text>
              </View>
              <Text style={s.googleBtnText}>Continuar con Google</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1565C0',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  logo: { width: 190, height: 110, marginBottom: 2 },
  tagline: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 28,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#0D1B2A',
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
  },
  inputActive: { borderColor: '#1565C0', backgroundColor: '#fff' },
  passRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    marginBottom: 20,
  },
  passInput: { flex: 1, height: 50, paddingHorizontal: 16, fontSize: 15, color: '#0D1B2A' },
  eyeBtn: { paddingHorizontal: 14, height: 50, justifyContent: 'center' },
  eye: { fontSize: 18 },
  btnWrapper: { width: '100%' },
  btn: {
    height: 50,
    backgroundColor: '#1565C0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  divider: { flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: 20, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: { marginHorizontal: 10, fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  googleBtn: {
    width: '100%',
    height: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1565C0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleBadgeText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  googleBtnText: { color: '#334155', fontSize: 15, fontWeight: '700' },
});
