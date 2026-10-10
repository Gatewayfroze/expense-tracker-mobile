import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/primitives';
import { useTheme } from '@/hooks/use-theme';

export type StackedBar = { label: string; amount: number; discount: number };

/**
 * Simple stacked bar chart (amount + discount), drawn with plain Views so it
 * needs no native chart dependency. Pass `onSelect` to make bars tappable;
 * when `selectedIndex` is set, the other bars are dimmed.
 */
export function StackedBarChart({
  data,
  height = 140,
  selectedIndex,
  onSelect,
}: {
  data: StackedBar[];
  height?: number;
  selectedIndex?: number;
  onSelect?: (index: number) => void;
}) {
  const theme = useTheme();
  const max = Math.max(1, ...data.map((d) => d.amount + d.discount));
  const hasSelection = selectedIndex !== undefined && selectedIndex >= 0;

  return (
    <View>
      <View style={[styles.plot, { height, borderBottomColor: theme.border }]}>
        {data.map((d, i) => (
          <Pressable
            key={d.label}
            disabled={!onSelect}
            onPress={() => onSelect?.(i)}
            accessibilityRole="button"
            accessibilityLabel={d.label}
            style={[styles.column, hasSelection && i !== selectedIndex ? styles.dimmed : null]}>
            <View
              style={[
                styles.segment,
                styles.top,
                { height: (d.discount / max) * height, backgroundColor: theme.success },
              ]}
            />
            <View style={[styles.segment, { height: (d.amount / max) * height, backgroundColor: theme.primary }]} />
          </Pressable>
        ))}
      </View>
      <View style={styles.labels}>
        {data.map((d, i) => (
          <AppText
            key={d.label}
            variant="caption"
            tone={i === selectedIndex ? 'primary' : 'secondary'}
            style={[styles.label, i === selectedIndex ? styles.selectedLabel : null]}
            numberOfLines={1}>
            {d.label}
          </AppText>
        ))}
      </View>
      <View style={styles.legend}>
        <LegendDot color={theme.primary} label="Amount" />
        <LegendDot color={theme.success} label="Discount" />
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, borderBottomWidth: 1 },
  column: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  dimmed: { opacity: 0.35 },
  segment: { width: '100%' },
  top: { borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  labels: { flexDirection: 'row', gap: 4, marginTop: 4 },
  label: { flex: 1, textAlign: 'center', fontSize: 10 },
  selectedLabel: { fontWeight: '600' },
  legend: { flexDirection: 'row', gap: 16, marginTop: 8, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
