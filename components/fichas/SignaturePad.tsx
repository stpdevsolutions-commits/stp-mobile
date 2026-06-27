import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, PanResponder, GestureResponderEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Props {
  onSave: (pathData: string) => void;
  onClear?: () => void;
  initialValue?: string;
}

interface Point { x: number; y: number }

export default function SignaturePad({ onSave, onClear, initialValue }: Props) {
  const [paths, setPaths] = useState<string[]>(initialValue ? initialValue.split('|').filter(Boolean) : []);
  const [currentPath, setCurrentPath] = useState('');
  const currentPoints = useRef<Point[]>([]);

  function pointsToPath(pts: Point[]): string {
    if (pts.length === 0) return '';
    const [first, ...rest] = pts;
    const d = [`M${first.x.toFixed(1)},${first.y.toFixed(1)}`];
    for (const p of rest) {
      d.push(`L${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    }
    return d.join(' ');
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        const { locationX, locationY } = e.nativeEvent;
        currentPoints.current = [{ x: locationX, y: locationY }];
        setCurrentPath(pointsToPath(currentPoints.current));
      },
      onPanResponderMove: (e: GestureResponderEvent) => {
        const { locationX, locationY } = e.nativeEvent;
        currentPoints.current.push({ x: locationX, y: locationY });
        setCurrentPath(pointsToPath(currentPoints.current));
      },
      onPanResponderRelease: () => {
        if (currentPoints.current.length > 1) {
          const path = pointsToPath(currentPoints.current);
          setPaths((prev) => {
            const updated = [...prev, path];
            onSave(updated.join('|'));
            return updated;
          });
        }
        currentPoints.current = [];
        setCurrentPath('');
      },
    }),
  ).current;

  function clear() {
    setPaths([]);
    setCurrentPath('');
    currentPoints.current = [];
    onClear?.();
    onSave('');
  }

  const isEmpty = paths.length === 0 && !currentPath;

  return (
    <View style={s.container}>
      <View style={s.pad} {...panResponder.panHandlers}>
        <Svg width="100%" height="100%">
          {paths.map((d, i) => (
            <Path key={i} d={d} stroke="#1565C0" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {currentPath ? (
            <Path d={currentPath} stroke="#1565C0" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ) : null}
        </Svg>
        {isEmpty && (
          <Text style={s.placeholder}>Firme aquí</Text>
        )}
      </View>
      <TouchableOpacity style={s.clearBtn} onPress={clear}>
        <Text style={s.clearText}>Borrar firma</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginTop: 8 },
  pad: {
    height: 160,
    borderWidth: 1.5,
    borderColor: '#1565C0',
    borderRadius: 8,
    backgroundColor: '#FAFEFF',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: { position: 'absolute', color: '#CCC', fontSize: 16 },
  clearBtn: { alignSelf: 'flex-end', marginTop: 6, padding: 6 },
  clearText: { color: '#F44336', fontSize: 13, fontWeight: '600' },
});
