import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardTypeOptions } from 'react-native';

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

export function Field({
  label, value, onChange, placeholder, multiline, keyboardType, editable = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  editable?: boolean;
}) {
  return (
    <>
      <Label>{label}</Label>
      <TextInput
        style={[s.input, multiline && s.textarea]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#BBB"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType ?? 'default'}
        textAlignVertical={multiline ? 'top' : 'center'}
        editable={editable}
      />
    </>
  );
}

export function OptionGroup({
  options, selected, onSelect,
}: {
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <View style={s.optionGroup}>
      {options.map((o) => (
        <TouchableOpacity
          key={o.value}
          style={[s.option, selected === o.value && s.optionSelected]}
          onPress={() => onSelect(o.value)}
        >
          <Text style={[s.optionText, selected === o.value && s.optionTextSelected]}>
            {o.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function BooleanToggle({
  label, value, onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={s.toggleRow}>
      <Text style={s.toggleLabel}>{label}</Text>
      <TouchableOpacity
        style={[s.toggle, value && s.toggleOn]}
        onPress={() => onChange(!value)}
      >
        <Text style={[s.toggleText, value && s.toggleTextOn]}>
          {value ? 'Sí' : 'No'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export function ItemCard({ title, onRemove, children }: {
  title: string;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={s.itemCard}>
      <View style={s.itemHeader}>
        <Text style={s.itemTitle}>{title}</Text>
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.removeBtn}>✕</Text>
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

export function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.addBtn} onPress={onPress}>
      <Text style={s.addBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function SectionContainer({ children }: { children: React.ReactNode }) {
  return <View style={s.section}>{children}</View>;
}

const s = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, fontSize: 15, backgroundColor: '#fff', color: '#222' },
  textarea: { height: 80, textAlignVertical: 'top' },
  optionGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  option: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6, borderWidth: 1, borderColor: '#DDD', backgroundColor: '#fff' },
  optionSelected: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  optionText: { fontSize: 13, color: '#555' },
  optionTextSelected: { color: '#fff', fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 },
  toggleLabel: { fontSize: 14, color: '#333', flex: 1 },
  toggle: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#DDD', backgroundColor: '#fff' },
  toggleOn: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  toggleText: { color: '#555', fontWeight: '600' },
  toggleTextOn: { color: '#fff' },
  itemCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#EEE' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#1565C0' },
  removeBtn: { fontSize: 16, color: '#F44336', padding: 4 },
  addBtn: { borderWidth: 1.5, borderColor: '#1565C0', borderStyle: 'dashed', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 4, marginBottom: 16 },
  addBtnText: { color: '#1565C0', fontWeight: '600', fontSize: 14 },
  section: { padding: 16 },
});
