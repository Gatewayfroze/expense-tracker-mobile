import dayjs from 'dayjs';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { StackedBarChart } from '@/components/ui/bar-chart';
import { AppText, Card, Chips, IconButton, Screen } from '@/components/ui/primitives';
import { Sheet } from '@/components/ui/sheet';
import {
  buildSummary,
  drillDownRange,
  expensesInRangeQuery,
  groupedTotalsQuery,
  monthLabel,
  yearRange,
  type CategorySummary,
  type PeriodKind,
} from '@/features/summary/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatSatang } from '@/lib/money';

const YEARS_BACK = 5;
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

type Selection = { key: number; label: string; category: CategorySummary };

export default function SummaryScreen() {
  const theme = useTheme();
  const currentYear = dayjs().year();
  const [kind, setKind] = useState<PeriodKind>('month');
  const [year, setYear] = useState(currentYear);
  const [tab, setTab] = useState(0);
  const [selection, setSelection] = useState<Selection | null>(null);

  // 'month' = one year broken down by month; 'year' = last N years broken down by year.
  const fromYear = currentYear - (YEARS_BACK - 1);
  const range = kind === 'month' ? yearRange(year) : { from: `${fromYear}-01-01`, to: `${currentYear}-12-31` };
  const periodKeys = kind === 'month' ? MONTHS : Array.from({ length: YEARS_BACK }, (_, i) => fromYear + i);
  const labelOf = kind === 'month' ? monthLabel : (y: number) => String(y);

  const { data: rows } = useLiveQuery(groupedTotalsQuery(kind, range.from, range.to), [kind, range.from, range.to]);
  const { totals, tabs } = buildSummary(rows, periodKeys, labelOf, kind === 'year');
  const grandTotal = totals.reduce((sum, t) => sum + t.totalAmount, 0);
  const activeTab = tabs.find((t) => t.key === tab) ?? tabs[0];
  // Tapping a bar selects that period's tab; tapping it again goes back to "All".
  const selectedIndex = totals.findIndex((t) => t.key === activeTab.key);
  const selectedTotal = selectedIndex >= 0 ? totals[selectedIndex] : null;

  function switchKind(next: PeriodKind) {
    setKind(next);
    setTab(0);
  }

  return (
    <Screen>
      <FlatList
        data={activeTab.categories}
        keyExtractor={(c) => String(c.categoryId ?? -1)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.titleRow}>
              <AppText variant="title" style={styles.flex}>
                {kind === 'month' ? `Summary ${year}` : `Last ${YEARS_BACK} years`}
              </AppText>
              {kind === 'month' ? (
                <View style={[styles.yearNav, { borderColor: theme.border }]}>
                  <IconButton glyph="‹" label="Previous year" onPress={() => setYear((y) => y - 1)} />
                  <IconButton glyph="›" label="Next year" onPress={() => setYear((y) => y + 1)} />
                </View>
              ) : null}
            </View>

            <Chips
              items={[
                { key: 'month' as PeriodKind, label: 'Yearly' },
                { key: 'year' as PeriodKind, label: 'All years' },
              ]}
              value={kind}
              onChange={switchKind}
            />

            <Card style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <AppText variant="heading" style={styles.flex}>
                  {kind === 'month' ? 'Monthly' : 'Yearly'}
                </AppText>
                <View style={styles.alignEnd}>
                  <AppText variant="caption" tone="secondary">
                    {selectedTotal ? `Total ${selectedTotal.label}` : 'Total'}
                  </AppText>
                  <AppText variant="amount">{formatSatang(selectedTotal ? selectedTotal.totalAmount : grandTotal)}</AppText>
                  {selectedTotal && selectedTotal.totalDiscount > 0 ? (
                    <AppText variant="caption" tone="success">
                      -{formatSatang(selectedTotal.totalDiscount)} discount
                    </AppText>
                  ) : null}
                </View>
              </View>
              <StackedBarChart
                data={totals.map((t) => ({ label: t.label, amount: t.totalAmount, discount: t.totalDiscount }))}
                selectedIndex={selectedIndex}
                onSelect={(i) => setTab(totals[i].key === activeTab.key ? 0 : totals[i].key)}
              />
            </Card>

            <View style={styles.tabsWrap}>
              <Chips items={tabs.map((t) => ({ key: t.key, label: t.label }))} value={activeTab.key} onChange={setTab} />
            </View>
          </View>
        }
        ListEmptyComponent={
          <AppText tone="secondary" style={styles.emptyText}>
            No expense data for this {kind === 'month' ? 'month' : 'year'}
          </AppText>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item: c }) => (
          <Pressable
            onPress={() => setSelection({ key: activeTab.key, label: activeTab.label, category: c })}
            android_ripple={{ color: theme.muted }}
            style={[styles.categoryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.flex}>
              <AppText style={styles.categoryName}>{c.categoryName}</AppText>
              <AppText variant="caption" tone="secondary">
                {c.count} {c.count === 1 ? 'expense' : 'expenses'}
              </AppText>
            </View>
            <View style={styles.alignEnd}>
              <AppText variant="amount" tone="primary">
                {formatSatang(c.totalAmount)}
              </AppText>
              {c.changeAmount !== undefined && c.changePercent !== undefined ? (
                <AppText variant="caption" tone={c.changeAmount >= 0 ? 'danger' : 'success'}>
                  {c.changeAmount >= 0 ? '▲' : '▼'} {formatSatang(Math.abs(c.changeAmount))} (
                  {c.changePercent >= 0 ? '+' : ''}
                  {c.changePercent.toFixed(1)}%)
                </AppText>
              ) : null}
            </View>
          </Pressable>
        )}
      />

      {selection ? (
        <DrillDownSheet
          kind={kind}
          year={kind === 'month' ? year : currentYear}
          fromYear={fromYear}
          selection={selection}
          onClose={() => setSelection(null)}
        />
      ) : null}
    </Screen>
  );
}

function DrillDownSheet({
  kind,
  year,
  fromYear,
  selection,
  onClose,
}: {
  kind: PeriodKind;
  year: number;
  fromYear: number;
  selection: Selection;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { from, to } = drillDownRange(kind, { year, key: selection.key, fromYear });
  const { data: rows } = useLiveQuery(expensesInRangeQuery(from, to, selection.category.categoryId), [
    from,
    to,
    selection.category.categoryId,
  ]);

  return (
    <Sheet
      visible
      fullHeight
      onClose={onClose}
      title={`${selection.category.categoryName} (${selection.label})`}
      subtitle={`${rows.length} expenses · ${formatSatang(selection.category.totalAmount)}`}>
      {rows.length === 0 ? (
        <AppText tone="secondary">No expenses found</AppText>
      ) : (
        rows.map((e) => (
          <View key={e.id} style={[styles.drillRow, { borderColor: theme.border }]}>
            <View style={styles.flex}>
              <AppText style={styles.categoryName} numberOfLines={2}>
                {e.description}
              </AppText>
              <AppText variant="caption" tone="secondary">
                {dayjs(e.date).format('MMM DD, YYYY')}
                {e.isBasic ? '  ·  Basic' : ''}
              </AppText>
            </View>
            <View style={styles.alignEnd}>
              <AppText variant="amount" tone="primary">
                {formatSatang(e.amountSatang)}
              </AppText>
              {e.discountSatang > 0 ? (
                <AppText variant="caption" tone="success">
                  -{formatSatang(e.discountSatang)}
                </AppText>
              ) : null}
            </View>
          </View>
        ))
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  alignEnd: { alignItems: 'flex-end' },
  content: { paddingBottom: 24 },
  headerBlock: { gap: 12, paddingTop: 12, paddingBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  yearNav: { flexDirection: 'row', borderWidth: 1, borderRadius: 20 },
  chartCard: { marginHorizontal: 16, gap: 12 },
  chartHeader: { flexDirection: 'row', alignItems: 'center' },
  tabsWrap: { marginTop: 4 },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  categoryName: { fontWeight: '500' },
  emptyText: { textAlign: 'center', padding: 32 },
  drillRow: { flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: 12, padding: 12 },
});
