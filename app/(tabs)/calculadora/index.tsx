import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CALCULADORAS } from '../../../lib/calc';

export default function CalculadoraMenu() {
  const router = useRouter();

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.intro}>
        Elige qué vas a construir. Calcula materiales, cuadrilla y días de trabajo, también sin conexión.
      </Text>
      {CALCULADORAS.map((c) => (
        <TouchableOpacity
          key={c.id}
          style={s.card}
          activeOpacity={0.75}
          onPress={() => router.push(`/(tabs)/calculadora/${c.id}`)}
        >
          <View style={s.icon}>
            <Ionicons name={c.icono as keyof typeof Ionicons.glyphMap} size={22} color="#1565C0" />
          </View>
          <View style={s.text}>
            <Text style={s.title}>{c.titulo}</Text>
            <Text style={s.desc}>{c.descripcion}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  content: { padding: 16, paddingBottom: 32 },
  intro: { fontSize: 13, color: '#64748B', marginBottom: 14, lineHeight: 19 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  text: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: '#0D1B2A' },
  desc: { fontSize: 12, color: '#64748B', marginTop: 2 },
});
