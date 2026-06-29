import React, { useRef, useState } from 'react';
import {
  Animated, Image, KeyboardAvoidingView, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
  ActivityIndicator, Alert,
} from 'react-native';
import { useAuth } from '../../lib/auth-context';

function isNetworkError(err: unknown): boolean {
  const e = err as { response?: unknown; code?: string; message?: string };
  return !e.response || e.code === 'ERR_NETWORK' || e.code === 'ECONNABORTED';
}

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const btnScale = useRef(new Animated.Value(1)).current;

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Ingresa tu correo y contraseña');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;

      let msg: string;
      if (isNetworkError(err)) {
        msg = 'No se pudo conectar al servidor.\n\nVerifica que estás en la red Wi-Fi de STP o que el VPN está activo.';
      } else if (status === 401) {
        msg = 'Correo o contraseña incorrectos.';
      } else if (status === 429) {
        msg = 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
      } else {
        msg = `Error del servidor (${status ?? 'desconocido'}). Contacta al administrador.`;
      }
      Alert.alert('No se pudo iniciar sesión', msg);
    } finally {
      setLoading(false);
    }
  }

  const pressIn = () =>
    Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const pressOut = () =>
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 0 }).start();

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
          editable={!loading}
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
            editable={!loading}
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
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleLogin}
            onPressIn={pressIn}
            onPressOut={pressOut}
            disabled={loading}
            activeOpacity={1}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Iniciar sesión</Text>}
          </TouchableOpacity>
        </Animated.View>
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
});
