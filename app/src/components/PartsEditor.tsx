import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Part } from '@/domain/types';
import { colors } from '@/theme';
import { Button } from './ui';

interface Props {
  parts: Part[];
  onChange: (parts: Part[]) => void;
  disabled?: boolean;
}

export function PartsEditor({ parts, onChange, disabled }: Props) {
  const set = (i: number, patch: Partial<Part>) => onChange(parts.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  return (
    <View style={{ gap: 8 }}>
      {parts.length > 0 && (
        <View style={styles.row}>
          <Text style={[styles.head, { flex: 2 }]}>Referencia</Text>
          <Text style={[styles.head, { flex: 4 }]}>Descripción</Text>
          <Text style={[styles.head, { width: 80 }]}>Cant.</Text>
          <View style={{ width: 36 }} />
        </View>
      )}
      {parts.map((p, i) => (
        <View key={i} style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 2 }]}
            value={p.reference}
            editable={!disabled}
            onChangeText={(reference) => set(i, { reference })}
            placeholder="Ref."
            autoCapitalize="characters"
          />
          <TextInput
            style={[styles.input, { flex: 4 }]}
            value={p.description}
            editable={!disabled}
            onChangeText={(description) => set(i, { description })}
            placeholder="Descripción"
          />
          <TextInput
            style={[styles.input, { width: 80, textAlign: 'right' }]}
            value={p.quantity ? String(p.quantity) : ''}
            editable={!disabled}
            onChangeText={(t) => set(i, { quantity: Number(t.replace(/[^0-9]/g, '')) || 0 })}
            keyboardType="number-pad"
            placeholder="0"
          />
          {!disabled ? (
            <Pressable onPress={() => onChange(parts.filter((_, j) => j !== i))} style={styles.remove} hitSlop={8}>
              <Text style={{ color: colors.danger, fontSize: 20 }}>×</Text>
            </Pressable>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>
      ))}
      {!parts.length && <Text style={{ color: colors.muted }}>No se usaron piezas</Text>}
      {!disabled && (
        <View style={{ alignSelf: 'flex-start' }}>
          <Button
            small
            variant="secondary"
            title="+ Agregar pieza"
            onPress={() => onChange([...parts, { reference: '', description: '', quantity: 1 }])}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  head: { fontSize: 12, color: colors.muted, textTransform: 'uppercase' },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  remove: { width: 36, alignItems: 'center' },
});
