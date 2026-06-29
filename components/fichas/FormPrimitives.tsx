import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardTypeOptions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
        placeholderTextColor="#C0CADB"
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
          activeOpacity={0.75}
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
    <TouchableOpacity style={s.toggleRow} onPress={() => onChange(!value)} activeOpacity={0.8}>
      <Text style={s.toggleLabel}>{label}</Text>
      <View style={[s.toggle, value && s.toggleOn]}>
        <View style={[s.toggleThumb, value && s.toggleThumbOn]} />
      </View>
    </TouchableOpacity>
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
        <TouchableOpacity
          style={s.removeBtn}
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close-circle" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

export function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.addBtn} onPress={onPress} activeOpacity={0.75}>
      <Ionicons name="add-circle-outline" size={18} color="#1565C0" />
      <Text style={s.addBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function SectionContainer({ children }: { children: React.ReactNode }) {
  return <View style={s.section}>{children}</View>;
}

const s = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 14,
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#F8FAFC',
    color: '#0D1B2A',
  },
  textarea: { height: 88, textAlignVertical: 'top' },

  optionGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  optionSelected:     { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  optionText:         { fontSize: 13, color: '#64748B', fontWeight: '600' },
  optionTextSelected: { color: '#fff', fontWeight: '700' },

  toggleRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 10 },
  toggleLabel:    { fontSize: 14, color: '#0D1B2A', flex: 1, fontWeight: '500' },
  toggle:         { width: 48, height: 28, borderRadius: 14, backgroundColor: '#E2E8F0', justifyContent: 'center', paddingHorizontal: 3 },
  toggleOn:       { backgroundColor: '#1565C0' },
  toggleThumb:    { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, elevation: 2 },
  toggleThumbOn:  { alignSelf: 'flex-end' },

  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemTitle:  { fontSize: 14, fontWeight: '700', color: '#1565C0' },
  removeBtn:  { padding: 2 },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#1565C0',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 14,
    marginTop: 4,
    marginBottom: 16,
    backgroundColor: '#EFF6FF',
  },
  addBtnText: { color: '#1565C0', fontWeight: '700', fontSize: 14 },

  section: { padding: 16 },
});
