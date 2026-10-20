import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { newCustomParam } from '@/domain/factory';
import type { MachineReport } from '@/domain/types';
import { colors } from '@/theme';
import { Button } from './ui';

type Rows = MachineReport['finalAdjustments'];

/** Free "parameter name + value" rows, for technologies without a predefined parameter list. */
export function CustomParams({
  rows,
  onChange,
  disabled,
}: {
  rows: Rows;
  onChange: (rows: Rows) => void;
  disabled?: boolean;
}) {
  const set = (key: string, patch: Partial<Rows[number]>) =>
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.muted, fontSize: 13 }}>Escriba el nombre de cada parámetro y su valor.</Text>
      {rows.map((r) => (
        <View key={r.key} style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 3 }]}
            value={r.label}
            editable={!disabled}
            onChangeText={(label) => set(r.key, { label })}
            placeholder="Parámetro"
          />
          <TextInput
            style={[styles.input, { flex: 2 }]}
            value={r.value}
            editable={!disabled}
            onChangeText={(value) => set(r.key, { value })}
            placeholder="Valor"
          />
          {!disabled ? (
            <Pressable onPress={() => onChange(rows.filter((x) => x.key !== r.key))} style={styles.remove} hitSlop={8}>
              <Text style={{ color: colors.danger, fontSize: 20 }}>×</Text>
            </Pressable>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>
      ))}
      {!disabled && (
        <View style={{ alignSelf: 'flex-start' }}>
          <Button
            small
            variant="secondary"
            title="+ Agregar parámetro"
            onPress={() => onChange([...rows, newCustomParam()])}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
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
