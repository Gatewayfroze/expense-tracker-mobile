import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/ui/primitives';
import { dotColor } from '@/constants/theme';
import type { Category } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

/** Wrapping grid of category pills — one tap to choose, faster than a dropdown on mobile. */
export function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: number | null;
  onChange: (id: number) => void;
}) {
  const theme = useTheme();

  if (categories.length === 0) {
    return (
      <AppText variant="caption" tone="secondary">
        No categories yet — add some in Settings, or import a backup.
      </AppText>
    );
  }

  return (
    <View>
      <AppText variant="label">Category</AppText>
      <View style={styles.wrap}>
        {categories.map((c) => {
          const active = c.id === value;
          return (
            <Pressable
              key={c.id}
              onPress={() => onChange(c.id)}
              style={[
                styles.pill,
                {
                  borderColor: active ? theme.primary : theme.border,
                  backgroundColor: active ? theme.primary : 'transparent',
                },
              ]}>
              <View style={[styles.dot, { backgroundColor: active ? theme.primaryText : dotColor(c.name) }]} />
              <Text style={{ color: active ? theme.primaryText : theme.text }}>{c.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
