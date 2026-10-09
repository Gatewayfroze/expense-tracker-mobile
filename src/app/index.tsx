import dayjs from 'dayjs';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ExpenseFormSheet } from '@/components/expense-form-sheet';
import { AppText, Button, IconButton, Screen } from '@/components/ui/primitives';
import { dotColor } from '@/constants/theme';
import { categoriesQuery, deleteExpense, expensesByDateQuery, type ExpenseRow } from '@/features/expenses/queries';
import { useTheme } from '@/hooks/use-theme';
import { pickDate, shiftDate, today } from '@/lib/dates';
import { formatSatang } from '@/lib/money';

export default function ExpensesScreen() {
  const theme = useTheme();
  const [date, setDate] = useState(today());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [formKey, setFormKey] = useState(0);

  const { data: rows } = useLiveQuery(expensesByDateQuery(date), [date]);
  const { data: categoryList } = useLiveQuery(categoriesQuery());

  const total = rows.reduce((acc, e) => acc + e.amountSatang - e.discountSatang, 0);
  const isToday = date === today();
  const isYesterday = date === shiftDate(today(), -1);

  function openAdd() {
    setEditing(null);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  function openEdit(expense: ExpenseRow) {
    setEditing(expense);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  function showActions(expense: ExpenseRow) {
    Alert.alert(expense.description || 'Expense', formatSatang(expense.amountSatang - expense.discountSatang), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteExpense(expense.id);
        },
      },
      { text: 'Edit', onPress: () => openEdit(expense) },
    ]);
  }

  return (
    <Screen>
      {/* Header: date + total */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.flex}>
          <AppText variant="caption" tone="secondary" style={styles.upper}>
            {isToday ? 'Today' : isYesterday ? 'Yesterday' : dayjs(date).format('dddd')}
          </AppText>
          <AppText variant="title">{dayjs(date).format('MMM D, YYYY')}</AppText>
        </View>
        <View style={[styles.totalBox, { backgroundColor: theme.muted, borderColor: theme.border }]}>
          <AppText variant="caption" tone="secondary" style={styles.upper}>
            Total
          </AppText>
          <AppText variant="amount" style={styles.totalAmount}>
            {formatSatang(total)}
          </AppText>
        </View>
      </View>

      {/* Date navigation + add */}
      <View style={[styles.nav, { borderBottomColor: theme.border }]}>
        <View style={[styles.navPill, { borderColor: theme.border }]}>
          <IconButton glyph="‹" label="Previous day" onPress={() => setDate((d) => shiftDate(d, -1))} />
          <Pressable onPress={() => pickDate(date, setDate)} style={styles.navDate}>
            <AppText>{dayjs(date).format('ddd, MMM D')}</AppText>
          </Pressable>
          <IconButton glyph="›" label="Next day" onPress={() => setDate((d) => shiftDate(d, 1))} />
        </View>
        {!isToday ? <Button label="Today" variant="ghost" compact onPress={() => setDate(today())} /> : null}
        <View style={styles.flex} />
        <Button label="+ Add" compact onPress={openAdd} />
      </View>

      {/* Expense list — tap to edit, long-press for delete */}
      <FlatList
        data={rows}
        keyExtractor={(e) => String(e.id)}
        contentContainerStyle={rows.length === 0 ? styles.emptyContainer : styles.list}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppText variant="heading">No expenses yet</AppText>
            <AppText variant="caption" tone="secondary">
              Track your first expense for {dayjs(date).format('MMM D')}
            </AppText>
            <Button label="+ Add expense" variant="outline" compact onPress={openAdd} style={{ marginTop: 8 }} />
          </View>
        }
        ListFooterComponent={
          rows.length > 0 ? (
            <AppText variant="caption" tone="secondary" style={styles.count}>
              {rows.length} {rows.length === 1 ? 'entry' : 'entries'} · long-press to delete
            </AppText>
          ) : null
        }
        renderItem={({ item: e }) => (
          <Pressable
            onPress={() => openEdit(e)}
            onLongPress={() => showActions(e)}
            android_ripple={{ color: theme.muted }}
            style={styles.row}>
            <View style={[styles.dot, { backgroundColor: dotColor(e.categoryName) }]} />
            <View style={styles.flex}>
              <AppText numberOfLines={1} style={styles.description}>
                {e.description}
              </AppText>
              <AppText variant="caption" tone="secondary" numberOfLines={1}>
                {e.categoryName ?? 'Uncategorized'}
                {e.isBasic ? '  ·  Basic' : ''}
              </AppText>
            </View>
            <View style={styles.amounts}>
              {e.discountSatang > 0 ? (
                <AppText variant="caption" tone="secondary" style={styles.strike}>
                  {formatSatang(e.amountSatang)}
                </AppText>
              ) : null}
              <AppText variant="amount">{formatSatang(e.amountSatang - e.discountSatang)}</AppText>
            </View>
          </Pressable>
        )}
      />

      <ExpenseFormSheet
        key={formKey}
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        categories={categoryList}
        initialDate={date}
        expense={editing}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  upper: { textTransform: 'uppercase', letterSpacing: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  totalBox: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'flex-end' },
  totalAmount: { fontSize: 20 },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navPill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20 },
  navDate: { paddingHorizontal: 8, paddingVertical: 6 },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  emptyContainer: { flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 24 },
  separator: { height: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  description: { fontWeight: '500' },
  amounts: { alignItems: 'flex-end' },
  strike: { textDecorationLine: 'line-through' },
  count: { textAlign: 'center', paddingTop: 16 },
});
