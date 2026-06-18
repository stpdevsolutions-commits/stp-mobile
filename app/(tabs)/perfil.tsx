import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../../lib/auth-context';

export default function PerfilScreen() {
  const { user, logout } = useAuth();

  function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Estás seguro que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </Text>
      </View>

      <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>{roleLabel(user?.role)}</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

function roleLabel(role?: string) {
  const map: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    user: 'Técnico',
  };
  return map[role ?? ''] ?? role ?? '';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', alignItems: 'center', paddingTop: 48 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1565C0', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  name: { fontSize: 22, fontWeight: '700', color: '#1A1A2E' },
  email: { fontSize: 14, color: '#666', marginTop: 4 },
  badge: { marginTop: 12, backgroundColor: '#E3F2FD', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  badgeText: { color: '#1565C0', fontWeight: '600', fontSize: 13 },
  logoutBtn: { marginTop: 48, backgroundColor: '#F44336', borderRadius: 10, paddingHorizontal: 32, paddingVertical: 14 },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
