import React from 'react';
import { View, Image, TouchableOpacity, Text, Alert, StyleSheet, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface Props {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export default function PhotoPicker({ photos, onChange, maxPhotos = 10 }: Props) {
  async function pick(fromCamera: boolean) {
    if (photos.length >= maxPhotos) {
      Alert.alert('Límite', `Máximo ${maxPhotos} fotos por ficha`);
      return;
    }
    const { status } = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', fromCamera ? 'Necesitamos acceso a la cámara.' : 'Necesitamos acceso a la galería.');
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsMultipleSelection: true });
    if (result.canceled) return;
    const uris = result.assets.map((a) => a.uri);
    onChange([...photos, ...uris].slice(0, maxPhotos));
  }

  function remove(uri: string) {
    onChange(photos.filter((p) => p !== uri));
  }

  function showOptions() {
    Alert.alert('Agregar foto', '', [
      { text: '📷 Cámara', onPress: () => pick(true) },
      { text: '🖼️ Galería', onPress: () => pick(false) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.row}>
        {photos.map((uri) => (
          <View key={uri} style={s.thumb}>
            <Image source={{ uri }} style={s.img} />
            <TouchableOpacity style={s.removeBtn} onPress={() => remove(uri)}>
              <Text style={s.removeText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < maxPhotos && (
          <TouchableOpacity style={s.addThumb} onPress={showOptions}>
            <Text style={s.addIcon}>+</Text>
            <Text style={s.addLabel}>Foto</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 4 },
  thumb: { position: 'relative', marginRight: 8, width: 90, height: 90 },
  img: { width: 90, height: 90, borderRadius: 8 },
  removeBtn: { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(244,67,54,0.9)', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  removeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  addThumb: { width: 90, height: 90, borderWidth: 1.5, borderColor: '#1565C0', borderStyle: 'dashed', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  addIcon: { fontSize: 28, color: '#1565C0', lineHeight: 32 },
  addLabel: { fontSize: 11, color: '#1565C0', fontWeight: '600' },
});
