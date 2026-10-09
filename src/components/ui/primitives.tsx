import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }, style]}>
      {children}
    </SafeAreaView>
  );
}

type AppTextProps = TextProps & {
  variant?: 'body' | 'title' | 'heading' | 'label' | 'caption' | 'amount';
  tone?: 'default' | 'secondary' | 'primary' | 'success' | 'danger';
};

export function AppText({ variant = 'body', tone = 'default', style, ...rest }: AppTextProps) {
  const theme = useTheme();
  const color = {
    default: theme.text,
    secondary: theme.textSecondary,
    primary: theme.primary,
    success: theme.success,
    danger: theme.danger,
  }[tone];
  return <Text style={[styles[variant], { color }, style]} {...rest} />;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
};

export function Button({ label, onPress, variant = 'primary', disabled, loading, style, compact }: ButtonProps) {
  const theme = useTheme();
  const bg = {
    primary: theme.primary,
    danger: theme.danger,
    outline: 'transparent',
    ghost: 'transparent',
  }[variant];
  const fg = variant === 'primary' || variant === 'danger' ? theme.primaryText : theme.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      android_ripple={{ color: theme.border }}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === 'outline' && { borderWidth: 1, borderColor: theme.border },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonLabel, { color: fg }]}>{label}</Text>}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, style]}>{children}</View>
  );
}

export function TextField({ label, style, ...rest }: TextInputProps & { label?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <TextInput
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }, style]}
        {...rest}
      />
    </View>
  );
}

export function CheckboxRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={() => onChange(!value)} style={styles.checkboxRow} hitSlop={8}>
      <View
        style={[
          styles.checkbox,
          { borderColor: value ? theme.primary : theme.border, backgroundColor: value ? theme.primary : 'transparent' },
        ]}>
        {value ? <Text style={{ color: theme.primaryText, fontSize: 12, fontWeight: '700' }}>✓</Text> : null}
      </View>
      <AppText>{label}</AppText>
    </Pressable>
  );
}

/** Horizontally scrolling pill tabs (replaces the web Tabs component). */
export function Chips<T extends string | number>({
  items,
  value,
  onChange,
}: {
  items: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  const theme = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {items.map((item) => {
        const active = item.key === value;
        return (
          <Pressable
            key={String(item.key)}
            onPress={() => onChange(item.key)}
            style={[
              styles.chip,
              { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primary : 'transparent' },
            ]}>
            <Text style={{ color: active ? theme.primaryText : theme.text, fontWeight: '500' }}>{item.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function IconButton({ glyph, onPress, label }: { glyph: string; onPress: () => void; label: string }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={6}
      android_ripple={{ color: theme.border, borderless: true }}
      style={styles.iconButton}>
      <Text style={{ color: theme.text, fontSize: 20, lineHeight: 22 }}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { fontSize: 15 },
  title: { fontSize: 26, fontWeight: '700' },
  heading: { fontSize: 17, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  caption: { fontSize: 12 },
  amount: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  button: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buttonCompact: { minHeight: 36, paddingHorizontal: 12, borderRadius: 18 },
  buttonLabel: { fontSize: 15, fontWeight: '600' },
  card: { borderWidth: 1, borderRadius: 14, padding: 12 },
  field: { flex: 1 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  chips: { gap: 8, paddingHorizontal: 16, paddingVertical: 4 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
});
