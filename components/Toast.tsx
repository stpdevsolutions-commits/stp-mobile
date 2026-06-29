import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ToastType = 'offline' | 'sync' | 'pending' | 'success' | 'error';

const CONFIG: Record<ToastType, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  offline: { icon: 'cloud-offline-outline',     color: '#DC2626', bg: '#FEF2F2' },
  sync:    { icon: 'sync-outline',               color: '#1D4ED8', bg: '#EFF6FF' },
  pending: { icon: 'cloud-upload-outline',       color: '#B45309', bg: '#FFFBEB' },
  success: { icon: 'checkmark-circle-outline',   color: '#065F46', bg: '#ECFDF5' },
  error:   { icon: 'alert-circle-outline',       color: '#DC2626', bg: '#FEF2F2' },
};

interface Props {
  type: ToastType;
  message: string;
  action?: { label: string; onPress: () => void };
  spinning?: boolean;
}

export default function Toast({ type, message, action, spinning }: Props) {
  const translateY = useRef(new Animated.Value(-72)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const spin       = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 22, bounciness: 5 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!spinning) return;
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ).start();
  }, [spinning]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const { icon, color, bg } = CONFIG[type];

  return (
    <Animated.View style={[s.wrap, { transform: [{ translateY }], opacity }]}>
      <View style={[s.card, { backgroundColor: bg }]}>
        <View style={[s.strip, { backgroundColor: color }]} />
        <View style={s.body}>
          <Animated.View style={spinning ? { transform: [{ rotate }] } : undefined}>
            <Ionicons name={icon} size={17} color={color} />
          </Animated.View>
          <Text style={[s.msg, { color }]} numberOfLines={2}>{message}</Text>
          {action && (
            <TouchableOpacity
              style={[s.actionBtn, { borderColor: color + '60' }]}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <Text style={[s.actionText, { color }]}>{action.label}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  strip: {
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  msg: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
