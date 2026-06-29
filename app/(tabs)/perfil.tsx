import React from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';

function roleLabel(role?: string) {
  const map: Record<string, string> = { admin: 'Administrador', manager: 'Gerente', user: 'Técnico' };
  return map[role ?? ''] ?? role ?? '';
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoIcon}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color="#1565C0" />
      </View>
      <View style={s.infoText}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function PerfilScreen() {
  const { user, logout } = useAuth();

  function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Estás seguro que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ]);
  }

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.banner}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
      </View>

      <View style={s.nameBlock}>
        <Text style={s.name}>{user?.firstName} {user?.lastName}</Text>
        <View style={s.roleBadge}>
          <Ionicons name="shield-checkmark-outline" size={13} color="#1565C0" />
          <Text style={s.roleText}> {roleLabel(user?.role)}</Text>
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Información de cuenta</Text>
        <InfoRow icon="mail-outline"       label="Correo"   value={user?.email ?? '—'} />
        <InfoRow icon="person-outline"     label="Nombre"   value={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} />
        <InfoRow icon="briefcase-outline"  label="Rol"      value={roleLabel(user?.role)} />
      </View>

      <View style={s.card}>
        <Image
          source={require('../../assets/logo.png')}
          style={s.logo}
          resizeMode="contain"
        />
        <Text style={s.companyName}>Soluciones Técnicas Profesionales</Text>
        <Text style={s.companyTag}>STP Tecnicos v1.0</Text>
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={s.logoutText}> Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  content:   { paddingBottom: 40 },

  banner: {
    height: 120,
    backgroundColor: '#1565C0',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 0,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: -40,
  },
  avatarText: { fontSize: 30, fontWeight: '800', color: '#1565C0' },

  nameBlock: { alignItems: 'center', marginTop: 52, marginBottom: 20, paddingHorizontal: 24 },
  name:      { fontSize: 22, fontWeight: '800', color: '#0D1B2A' },
  roleBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginTop: 8 },
  roleText:  { color: '#1565C0', fontWeight: '700', fontSize: 13 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 },

  infoRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  infoIcon:  { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoText:  { flex: 1 },
  infoLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 15, color: '#0D1B2A', fontWeight: '600', marginTop: 1 },

  logo:        { width: 140, height: 80, alignSelf: 'center', marginBottom: 8 },
  companyName: { textAlign: 'center', fontSize: 14, fontWeight: '700', color: '#334155' },
  companyTag:  { textAlign: 'center', fontSize: 12, color: '#94A3B8', marginTop: 4 },

  logoutBtn:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginHorizontal: 16, backgroundColor: '#EF4444', borderRadius: 12, height: 50 },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
