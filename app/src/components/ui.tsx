import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import type { VisitStatus } from '@/domain/types';
import { STATUS, colors } from '@/theme';

export function Screen({ children, scrollEnabled = true }: { children: ReactNode; scrollEnabled?: boolean }) {
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior="padding">
      <ScrollView
        contentContainerStyle={styles.screen}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={scrollEnabled}
      >
        <View style={styles.inner}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

/** Lays children side by side on tablets and stacks them on narrow screens. */
export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

interface FieldProps extends TextInputProps {
  label: string;
  required?: boolean;
  error?: boolean;
  style?: ViewStyle;
  right?: ReactNode;
}

export function Field({ label, required, error, style, right, multiline, editable = true, ...input }: FieldProps) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
      </Text>
      <View style={styles.inputRow}>
        <TextInput
          {...input}
          editable={editable}
          multiline={multiline}
          placeholderTextColor="#a0a0a0"
          style={[
            styles.input,
            multiline && styles.multiline,
            error && { borderColor: colors.danger },
            !editable && styles.readonly,
          ]}
        />
        {right}
      </View>
    </View>
  );
}

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading, small }: ButtonProps) {
  const v = buttonVariants[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: v.bg, borderColor: v.border },
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.75 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <Text style={[styles.buttonText, small && { fontSize: 14 }, { color: v.fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const buttonVariants = {
  primary: { bg: colors.primary, fg: colors.white, border: colors.primary },
  secondary: { bg: colors.white, fg: colors.ink, border: colors.line },
  danger: { bg: colors.white, fg: colors.danger, border: colors.danger },
};

export function Chips<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string }[];
  value: T | '';
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            disabled={disabled}
            onPress={() => onChange(o.value)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && { color: colors.white }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function StatusBadge({ status }: { status: VisitStatus }) {
  const s = STATUS[status];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

export function Issues({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <View style={styles.issues}>
      <Text style={styles.issuesTitle}>Falta completar:</Text>
      {items.map((i) => (
        <Text key={i} style={styles.issuesItem}>
          • {i}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 48, alignItems: 'center' },
  inner: { width: '100%', maxWidth: 960, gap: 16 },
  section: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 12,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.ink,
    borderLeftWidth: 3,
    borderLeftColor: colors.brand,
    paddingLeft: 8,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { flexGrow: 1, flexBasis: 220, gap: 4 },
  label: { fontSize: 12, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  readonly: { backgroundColor: colors.soft, color: colors.muted },
  button: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: { minHeight: 38, paddingHorizontal: 14 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: 15, color: colors.ink },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  issues: { backgroundColor: '#fff6f6', borderColor: '#f3c6c6', borderWidth: 1, borderRadius: 8, padding: 12, gap: 2 },
  issuesTitle: { fontWeight: '700', color: colors.danger },
  issuesItem: { color: colors.danger },
});
